import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3001);
const WEB_ROOT = path.resolve(process.env.WEB_ROOT || path.join(__dirname, "..", "e2c-app", "dist"));
const MAX_UPLOAD = process.env.MAX_UPLOAD || "20mb";

const app = express();

// Dietro nginx/Caddy: serve l'IP reale del client.
app.set("trust proxy", true);
app.disable("x-powered-by");

// In sviluppo il front-end gira su un'altra porta: servono gli header CORS.
// In produzione il front-end e' servito dallo stesso dominio (nessun CORS).
app.use(cors());

// multer per multipart/form-data
const upload = multer({
    limits: { fileSize: MAX_UPLOAD },
});

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

function getModels() {
    const configured = (process.env.GEMINI_MODEL || "")
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

    return [...new Set([...configured, ...DEFAULT_MODELS])];
}

/* ------------------------------------------------------------
   HEALTH CHECK
------------------------------------------------------------ */
app.get("/api/health", (req, res) => {
    res.json({
        ok: true,
        service: "e2c-server",
        web: fs.existsSync(WEB_ROOT) ? WEB_ROOT : null,
        models: getModels(),
    });
});

/* ------------------------------------------------------------
   POST /api/ia
   multipart/form-data:
   - file: immagine
   - prompt: testo prompt
------------------------------------------------------------ */
app.post("/api/ia", upload.single("file"), async (req, res) => {
    try {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: "Missing GEMINI_API_KEY. Impostala nel file .env.",
            });
        }

        const file = req.file;
        const prompt = req.body.prompt;

        if (!file) {
            return res.status(400).json({ error: "Missing file" });
        }

        const mimeType = file.mimetype || "image/jpeg";
        const base64 = file.buffer.toString("base64");

        // CHIAMATA A GEMINI
        const result = await callGemini({
            apiKey,
            prompt,
            mimeType,
            base64,
            models: getModels(),
        });

        if (!result.ok) {
            return res.status(result.status).json({ error: result.error });
        }

        return res.json({ events: parseEvents(result.rawText) });
    } catch (err) {
        console.error("SERVER ERROR:", err);
        return res.status(500).json({ error: err.toString() });
    }
});

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

        // Errori non recuperabili: chiave non valida o richiesta malformata.
        if (response.status === 400 || response.status === 401 || response.status === 403) {
            return { ok: false, status: response.status, error: `Gemini error: ${message}` };
        }

        // 404 = modello non erogabile, 429/503 = rate limit o domanda elevata.
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
   FRONT-END (statici + fallback SPA)
   Le richieste arrivano gia' private del prefisso del mount
   (nginx lo rimuove con proxy_pass .../): il server vede
   /, /assets/..., /api/ia e /privacy-policy.
------------------------------------------------------------ */
if (fs.existsSync(WEB_ROOT)) {
    app.use(
        express.static(WEB_ROOT, {
            index: false,
            setHeaders(res, filePath) {
                if (filePath.endsWith("sw.js") || filePath.endsWith("manifest.webmanifest")) {
                    // Prevent CDN caches from delaying PWA updates.
                    res.setHeader("Cache-Control", "no-store");
                } else if (filePath.endsWith("index.html")) {
                    // L'index non deve mai restare in cache: punta al bundle con hash.
                    res.setHeader("Cache-Control", "no-cache");
                } else {
                    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
                }
            },
        }),
    );

    // Fallback SPA: /privacy-policy, /terms-of-service, ecc.
    app.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD") return next();
        if (req.path.startsWith("/api/")) {
            return res.status(404).json({ error: "Not Found" });
        }

        // L'index non deve restare in cache: punta al bundle con hash.
        res.setHeader("Cache-Control", "no-cache");

        res.sendFile(path.join(WEB_ROOT, "index.html"), (err) => {
            if (err) next(err);
        });
    });
} else {
    app.use((req, res) => {
        res.status(404).json({
            error: "Front-end non trovato",
            web_root: WEB_ROOT,
        });
    });
}

/* ------------------------------------------------------------
   ERROR HANDLER
------------------------------------------------------------ */
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        const message =
            err.code === "LIMIT_FILE_SIZE"
                ? `File troppo grande (max ${MAX_UPLOAD})`
                : err.message;
        return res.status(400).json({ error: message });
    }

    console.error("UNHANDLED ERROR:", err);
    res.status(500).json({ error: err.toString() });
});

app.listen(PORT, "0.0.0.0", () =>
    console.log(`Effiplan2Calendar server running on http://0.0.0.0:${PORT}`)
);
