export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// CORS Preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				},
			});
		}

		// Route: POST /api/ia
		if (request.method === "POST" && url.pathname === "/api/ia") {
			return await handleIA(request, env);
		}

		return new Response("Not Found", { status: 404 });
	},
};

/* ------------------------------------------------------------
   MODELLI GEMINI
   I nomi dei modelli vengono ruotati rapidamente da Google
   (es. "gemini-2.5-flash" non e' piu' erogabile per i nuovi
   account). Si prova una catena di fallback e si usa il primo
   modello che risponde.
------------------------------------------------------------ */
const DEFAULT_MODELS = [
	"gemini-3-flash-preview",
	"gemini-3.8-flash",
	"gemini-flash-latest",
];

function getModels(env) {
	const configured = (env.GEMINI_MODEL || "")
		.split(",")
		.map((m) => m.trim())
		.filter(Boolean);

	const all = [...configured, ...DEFAULT_MODELS];
	return [...new Set(all)];
}

/* ------------------------------------------------------------
   HANDLE IA (OCR + AI)
------------------------------------------------------------ */
async function handleIA(request, env) {
	try {
		if (!env.GEMINI_API_KEY) {
			return jsonError(
				"Missing GEMINI_API_KEY. Set it with `wrangler secret put GEMINI_API_KEY` (deploy) or in .dev.vars (local).",
				500,
			);
		}

		const form = await request.formData();
		const file = form.get("file");
		const prompt = form.get("prompt") || "Extract data";

		if (!file) {
			return jsonError("Missing file", 400);
		}

		// Convert original to bytes
		const arrayBuffer = await file.arrayBuffer();
		const originalBytes = new Uint8Array(arrayBuffer);

		// ---------------------------------------
		// RESIZE (opzionale, via Cloudflare Image Delivery)
		// Abilitato solo se IMAGEDELIVERY_HOST e' configurato.
		// ---------------------------------------
		const resizedBytes = await resizeImage(originalBytes, env, 800);
		const base64 = arrayBufferToBase64(resizedBytes);

		// -------------------------------------------------------
		//  CHIAMATA A GEMINI VIA REST
		// -------------------------------------------------------
		const result = await callGemini({
			apiKey: env.GEMINI_API_KEY,
			prompt,
			mimeType: file.type || "image/jpeg",
			base64,
			models: getModels(env),
		});

		if (!result.ok) {
			return jsonError(result.error, result.status);
		}

		const events = parseEvents(result.rawText);

		return jsonResponse({ events });

	} catch (err) {
		console.error("WORKER ERROR:", err);
		return jsonError(err.toString(), 500);
	}
}

/* ------------------------------------------------------------
   CHIAMATA GEMINI CON FALLBACK TRA MODELLI
------------------------------------------------------------ */
async function callGemini({ apiKey, prompt, mimeType, base64, models }) {
	const payload = {
		contents: [
			{
				role: "user",
				parts: [
					{ text: prompt },
					{
						inline_data: {
							mime_type: mimeType,
							data: base64,
						},
					},
				],
			},
		],
		generationConfig: {
			responseMimeType: "application/json",
			temperature: 0,
		},
	};

	let lastError = "Gemini request failed";

	for (const model of models) {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			},
		);

		if (response.ok) {
			const data = await response.json();
			const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

			if (rawText) {
				return { ok: true, model, rawText };
			}

			lastError = `Gemini (${model}) returned no content`;
			continue;
		}

		const data = await response.json().catch(() => ({}));
		const message = data?.error?.message || `HTTP ${response.status}`;

		// Errori non recuperabili: la chiave non e' valida o la richiesta e' malformata.
		// In questo caso non ha senso provare altri modelli.
		if (response.status === 400 || response.status === 401 || response.status === 403) {
			return { ok: false, status: response.status, error: `Gemini error: ${message}` };
		}

		// 404 = modello non erogabile, 429/503 = rate limit o domanda elevata.
		// In entrambi i casi si prova il modello successivo.
		console.warn(`Model ${model} failed (${response.status}): ${message}`);

		if (response.status === 404) {
			lastError = `Model ${model} is not available for this API key`;
		} else {
			lastError = `Gemini error (${model}): ${message}`;
		}
	}

	return { ok: false, status: 502, error: lastError };
}

/* ------------------------------------------------------------
   PARSING EVENTI
   Gemini puo' comunque racchiudere il JSON in un fence markdown
   o aggiungere testo: si estrae la prima lista JSON valida.
------------------------------------------------------------ */
function parseEvents(rawText) {
	const candidates = [rawText];

	const fenced = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fenced) candidates.push(fenced[1]);

	const first = rawText.indexOf("[");
	const last = rawText.lastIndexOf("]");
	if (first !== -1 && last > first) candidates.push(rawText.slice(first, last + 1));

	for (const candidate of candidates) {
		try {
			const parsed = JSON.parse(candidate.trim());
			if (Array.isArray(parsed)) return parsed;
		} catch {
			// si prova il candidato successivo
		}
	}

	console.warn("Unable to parse Gemini output as JSON array:", rawText.slice(0, 200));
	return [];
}

/* ------------------------------------------------------------
   CLOUDLFARE IMAGE RESIZE
   Richiede IMAGEDELIVERY_HOST (es. "imagedelivery.net/<ZONE_ID>").
   Senza questa variabile il resize viene saltato: l'immagine
   originale viene inviata a Gemini.
------------------------------------------------------------ */
async function resizeImage(bytes, env, maxSize = 1280) {
	const host = (env.IMAGEDELIVERY_HOST || "").trim();

	if (!host) {
		return bytes;
	}

	try {
		const url = `https://${host}/public?width=${maxSize}&height=${maxSize}&fit=scale-down`;

		const resp = await fetch(url, {
			method: "POST",
			body: bytes,
		});

		if (!resp.ok) {
			console.warn("Resize failed:", resp.status);
			return bytes;
		}

		return new Uint8Array(await resp.arrayBuffer());

	} catch (err) {
		console.error("Resize crash:", err);
		return bytes;
	}
}

/* ------------------------------------------------------------
   HELPERS
------------------------------------------------------------ */

function jsonResponse(data) {
	return new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
}

function jsonError(message, status = 500) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		},
	});
}

function arrayBufferToBase64(buffer) {
	let binary = "";
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;

	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}

	return btoa(binary);
}
