import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, vi, afterEach } from 'vitest';
import worker from '../src';

/**
 * Costruisce una richiesta multipart/form-data con un'immagine fittizia.
 */
function buildRequest(body = '', fileName = 'shot.jpg') {
	const form = new FormData();
	form.append('prompt', 'Extract events');
	form.append(
		'file',
		new File([new Uint8Array([1, 2, 3, 4])], fileName, { type: 'image/jpeg' }),
	);
	return new Request('http://example.com/api/ia', { method: 'POST', body: form });
}

/**
 * Risposta simulata di Gemini.
 */
function geminiReply(events) {
	return {
		candidates: [
			{
				content: {
					parts: [{ text: JSON.stringify(events) }],
				},
			},
		],
	};
}

describe('e2c-worker', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('risponde 404 su rotte sconosciute', async () => {
		const request = new Request('http://example.com/');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(404);
		expect(await response.text()).toBe('Not Found');
	});

	it('risponde 204 al preflight CORS', async () => {
		const request = new Request('http://example.com/api/ia', { method: 'OPTIONS' });
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
	});

	it('risponde 400 se manca il file', async () => {
		const form = new FormData();
		form.append('prompt', 'Extract events');
		const request = new Request('http://example.com/api/ia', { method: 'POST', body: form });

		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		expect((await response.json()).error).toBe('Missing file');
	});

	it('risponde 500 se manca GEMINI_API_KEY', async () => {
		const request = buildRequest();
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, {}, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(500);
		expect((await response.json()).error).toMatch(/GEMINI_API_KEY/);
	});

	it('estrae gli eventi dalla risposta di Gemini', async () => {
		const events = [
			{
				id: '1',
				title: 'WORKSHOP',
				date: '2025-12-15',
				startTime: '10:00',
				endTime: '14:00',
				enabled: true,
			},
		];

		const fetchMock = vi.fn(async () => new Response(JSON.stringify(geminiReply(events)), { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		const request = buildRequest();
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect((await response.json()).events).toEqual(events);
		expect(fetchMock).toHaveBeenCalled();
	});

	it('estrae gli eventi anche se Gemini li racchiude in un fence markdown', async () => {
		const events = [{ id: '1', title: 'SCARICO', date: '2025-12-17', startTime: '09:00', endTime: '13:00' }];
		const fenced = '```json\n' + JSON.stringify(events) + '\n```';

		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				new Response(
					JSON.stringify({ candidates: [{ content: { parts: [{ text: fenced }] } }] }),
					{ status: 200 },
				),
			),
		);

		const request = buildRequest();
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect((await response.json()).events).toEqual(events);
	});

	it('riporta l\'errore invece di restituire un array vuoto quando Gemini fallisce', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () =>
				new Response(
					JSON.stringify({
						error: { code: 404, message: 'This model is no longer available to new users.' },
					}),
					{ status: 404 },
				),
			),
		);

		const request = buildRequest();
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(502);
		const body = await response.json();
		expect(body.error).toMatch(/not available for this API key/);
		expect(body.events).toBeUndefined();
	});

	it('non riprova altri modelli se la chiave API non e\' valida', async () => {
		const fetchMock = vi.fn(async () =>
			new Response(
				JSON.stringify({ error: { code: 400, message: 'API key not valid.' } }),
				{ status: 400 },
			),
		);
		vi.stubGlobal('fetch', fetchMock);

		const request = buildRequest();
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(400);
		expect((await response.json()).error).toMatch(/API key not valid/);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('ripiega sul modello successivo quando il primo non e\' erogabile', async () => {
		const events = [{ id: '1', title: 'V-GENERAL', date: '2025-12-19', startTime: '09:00', endTime: '15:00' }];
		let call = 0;

		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				call += 1;
				if (call === 1) {
					return new Response(
						JSON.stringify({ error: { code: 404, message: 'Model not available.' } }),
						{ status: 404 },
					);
				}
				return new Response(JSON.stringify(geminiReply(events)), { status: 200 });
			}),
		);

		const request = buildRequest();
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect((await response.json()).events).toEqual(events);
		expect(call).toBe(2);
	});

	it('gestisce la richiesta anche in stile integrazione (SELF)', async () => {
		const response = await SELF.fetch('http://example.com/');
		expect(response.status).toBe(404);
		expect(await response.text()).toBe('Not Found');
	});
});
