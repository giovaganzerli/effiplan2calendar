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
				}
			});
		}

		// Route: POST /api/ia
		if (request.method === "POST" && url.pathname === "/api/ia") {
			return await handleIA(request, env);
		}

		return new Response("Not Found", { status: 404 });
	}
};

/* ------------------------------------------------------------
   HANDLE IA (OCR + AI)
------------------------------------------------------------ */

async function handleIA(request, env) {
	try {
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
		// 🚀 AUTO RESIZE (Cloudflare Image API)
		// ---------------------------------------
		const isLocal = !("AI" in env);
		const resizedBytes = await resizeImage(originalBytes, 800, isLocal);

		// Convert resized → base64
		const base64 = arrayBufferToBase64(resizedBytes.buffer);

		// -------------------------------------------------------
		//  CHIAMATA A GEMINI VIA REST
		// -------------------------------------------------------
		const payload = {
			contents: [
				{
					role: "user",
					parts: [
						{ text: prompt },
						{
							inline_data: {
								mime_type: file.type,
								data: base64
							}
						}
					]
				}
			]
		};

		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload)
			}
		);

		const data = await response.json();

		const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

		// Parse JSON
		let jsonEvents;
		try {
			jsonEvents = JSON.parse(rawText);
		} catch {
			jsonEvents = [];
		}

		return jsonResponse({ events: jsonEvents });

	} catch (err) {
		console.error("WORKER ERROR:", err);
		return jsonError(err.toString(), 500);
	}
}

/* ------------------------------------------------------------
   CLOUDLFARE IMAGE RESIZE
------------------------------------------------------------ */

async function resizeImage(bytes, maxSize = 1280, isLocal = false) {
	try {
		const url = `https://imagedelivery.net/undefined/public?width=${maxSize}&height=${maxSize}&fit=scale-down`;

		const resp = await fetch(url, {
			method: "POST",
			body: bytes
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
		}
	});
}

function jsonError(message, status = 500) {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Access-Control-Allow-Origin": "*",
		}
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
