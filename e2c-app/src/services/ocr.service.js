/**
 * Endpoint del backend che esegue l'analisi IA.
 *
 * Priorita':
 *  1. variabile d'ambiente VITE_API_ENDPOINT (file .env.* nella root di e2c-app)
 *  2. stesso dominio dell'app: <BASE_URL>api/ia
 *     - sviluppo: /api/ia
 *     - produzione: /e2c/api/ia  -> nginx -> server Express
 */
const API_ENDPOINT =
    import.meta.env.VITE_API_ENDPOINT || `${import.meta.env.BASE_URL}api/ia`;

/**
 * Ridimensiona l'immagine lato client (canvas) prima dell'upload.
 * Sostituisce il resize server-side di Cloudflare Image Delivery, che
 * richiede uno zone id configurato e va in fallback silenzioso.
 * Se il canvas non e' disponibile si usa il file originale.
 */
async function resizeImage(file, maxSize = 1600) {
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));

        if (scale === 1) {
            bitmap.close();
            return file;
        }

        const width = Math.round(bitmap.width * scale);
        const height = Math.round(bitmap.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
        if (!blob) return file;

        return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
            type: "image/jpeg",
        });
    } catch (err) {
        console.warn("Client-side resize failed, using original file:", err);
        return file;
    }
}

async function askToIA(file, prompt = "") {
    const form = new FormData();
    form.append("file", file);
    form.append("prompt", prompt);

    const response = await fetch(API_ENDPOINT + "/api/ia", {
        method: "POST",
        body: form,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || `Analisi IA fallita (HTTP ${response.status})`);
    }

    if (!Array.isArray(data.events)) {
        throw new Error("Risposta inattesa dal servizio IA: campo 'events' mancante");
    }

    return data.events;
}

export async function parseImage(file) {
    const resized = await resizeImage(file);

    const events = await askToIA(
        resized,
        `
Extract ALL events from this Effiplan schedule screenshot. IMPORTANT:
- Use the current year by default if not specify in the screenshot with format YYYY (e.g. 2024.)
- Use the current month by default if not specify in the screenshot in a complete date format (e.g. DD/MM/YYYY) or in full text format (e.g. NOVEMBRE, or DECEMBER, or NOV, GEN,...).
- If day is past, month and year are not declared in screenshot, use the same day of the next month > if the final data is past, use the same data of the next year.

Return ONLY valid JSON array:

[
  {
    "id": "unique-id",
    "title": "",
    "date": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "enabled": true
  }
]

After generating the JSON, before printing it, double-check all events and if the date in the “date” field is past today's date, replace year and month with the current ones.
No markdown. No explanation. No text outside the JSON.
`
    );
    return events;
}
