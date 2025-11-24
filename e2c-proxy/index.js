import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());

// multer per multipart/form-data
const upload = multer();

// Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/*
POST /api/ia
multipart/form-data:
- file: immagine
- prompt: testo prompt
*/
app.post("/api/ia", upload.single("file"), async (req, res) => {
    try {
        const file = req.file;
        const prompt = req.body.prompt;

        if (!file) {
            return res.status(400).json({ error: "Missing file" });
        }

        const mimeType = file.mimetype;
        const base64 = file.buffer.toString("base64");

        // CHIAMATA A GEMINI
        const result = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType,
                                data: base64,
                            },
                        },
                    ],
                },
            ],
        });

        const output = result.response.text() || "[]";

        let json;
        try {
            json = JSON.parse(output);
        } catch {
            json = [];
        }

        return res.json({ events: json });
    } catch (err) {
        console.error("SERVER ERROR:", err);
        return res.status(500).json({ error: err.toString() });
    }
});

const PORT = 3001;
app.listen(PORT, () =>
    console.log(`Gemini server running on http://localhost:${PORT}`)
);
