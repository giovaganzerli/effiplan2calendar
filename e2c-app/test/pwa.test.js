import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const read = (name) => readFileSync(new URL(name, dist), 'utf8');
const manifest = JSON.parse(read('manifest.webmanifest'));

test('Effi2Cal manifest uses the public installation scope', () => {
    assert.equal(manifest.name, 'Effi2Cal');
    assert.equal(manifest.short_name, 'Effi2Cal');
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.id, '/decathlon/e2c/');
    assert.equal(manifest.start_url, manifest.id);
    assert.equal(manifest.scope, manifest.id);
});

test('install icons have the declared PNG dimensions', () => {
    for (const size of [192, 512]) {
        const icon = manifest.icons.find((i) => i.sizes === `${size}x${size}`);
        assert.equal(icon.type, 'image/png');
        const bytes = readFileSync(new URL(icon.src, dist));
        assert.equal(bytes.readUInt32BE(16), size);
        assert.equal(bytes.readUInt32BE(20), size);
    }
});

test('HTML links the manifest and prevents Rocket Loader rewriting modules', () => {
    const html = read('index.html');
    assert.match(html, /rel="manifest" href="\/decathlon\/e2c\/manifest.webmanifest"/);
    assert.match(html, /data-cfasync="false" type="module"/);
    assert.match(html, /\/decathlon\/e2c\/apple-touch-icon\.png/);
});

test('worker excludes API navigations and does not force updates', () => {
    const sw = read('sw.js');
    assert.match(sw, /denylist:/);
    // Workbox exposes skipWaiting only behind an explicit update message.
    assert.match(sw, /"SKIP_WAITING"===\w+\.data\.type&&self\.skipWaiting\(\)/);
    assert.ok(!sw.includes('generativelanguage.googleapis.com'));
    assert.ok(!sw.includes('www.googleapis.com'));
});
