import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse, compileScript } from '@vue/compiler-sfc';

// Exercise the actual component functions without Google credentials or writes
// to a real calendar. Vue's compiler locates the functions in <script setup>.
const source = readFileSync(new URL('../src/pages/Home.vue', import.meta.url), 'utf8');
const { descriptor } = parse(source);
const compiled = compileScript(descriptor, { id: 'sync-regression' });
const names = new Set(['syncEvents', 'goToStep', 'initData', 'buildGoogleEvent']);
const functions = compiled.scriptSetupAst
    .filter((node) => node.type === 'FunctionDeclaration' && names.has(node.id.name))
    .map((node) => descriptor.scriptSetup.content.slice(node.start, node.end))
    .join('\n');
assert.equal(compiled.scriptSetupAst.filter(
    (node) => node.type === 'FunctionDeclaration' && names.has(node.id.name)
).length, names.size);

function setup({ token = 'test-token', calendar = { id: 'test-calendar' }, fetchImpl } = {}) {
    const state = {
        step: 3,
        processing: { file: false, events: false },
        calendar: { obj: calendar, reminders: 'default' },
        events: [{ title: 'Turno', date: '2026-11-15', startTime: '09:00', endTime: '13:00' }],
        created: { success: [], error: [] },
    };
    const calls = [];
    const alerts = [];
    const context = vm.createContext({
        formData: { value: state },
        getToken: () => token,
        fetch: async (...args) => {
            calls.push(args);
            return fetchImpl ? fetchImpl(...args) : { ok: true };
        },
        alert: (message) => alerts.push(message),
        console: { error() {} },
    });
    vm.runInContext(functions, context);
    return { state, calls, alerts, sync: () => context.syncEvents(), context };
}

test('Sync opens the final screen before Calendar responds, then shows success', async () => {
    let finish;
    const app = setup({ fetchImpl: () => new Promise((resolve) => { finish = resolve; }) });
    const pending = app.sync();
    assert.equal(app.state.step, 4);
    assert.equal(app.state.processing.events, true);
    assert.equal(app.calls.length, 1);
    assert.equal(app.calls[0][1].method, 'POST');
    finish({ ok: true });
    await pending;
    assert.equal(app.state.step, 4);
    assert.equal(app.state.processing.events, false);
    assert.equal(app.state.created.success.length, 1);
});

test('a second Sync click does not insert events again during an active request', async () => {
    let finish;
    const app = setup({ fetchImpl: () => new Promise((resolve) => { finish = resolve; }) });
    const pending = app.sync();
    await app.sync();
    app.context.goToStep(1);
    assert.equal(app.calls.length, 1);
    assert.equal(app.state.step, 4);
    finish({ ok: true });
    await pending;
});

test('missing token or calendar returns to login without leaving the app busy', async () => {
    for (const options of [{ token: null }, { calendar: {} }]) {
        const app = setup(options);
        await app.sync();
        assert.equal(app.state.step, 1);
        assert.equal(app.state.processing.events, false);
        assert.equal(app.calls.length, 0);
        assert.equal(app.alerts.length, 1);
    }
});

test('Calendar errors and network failures appear in the final summary', async () => {
    for (const fetchImpl of [
        async () => ({ ok: false, text: async () => 'Calendar rejected event' }),
        async () => { throw new Error('Network unavailable'); },
    ]) {
        const app = setup({ fetchImpl });
        await app.sync();
        assert.equal(app.state.step, 4);
        assert.equal(app.state.processing.events, false);
        assert.equal(app.state.created.success.length, 0);
        assert.equal(app.state.created.error.length, 1);
    }
});

test('a new synchronization clears the previous summary', async () => {
    const app = setup();
    app.state.created.success.push({ title: 'Previous import' });
    app.state.created.error.push({ title: 'Previous error' });
    await app.sync();
    assert.equal(app.state.created.success.length, 1);
    assert.equal(app.state.created.error.length, 0);
});
