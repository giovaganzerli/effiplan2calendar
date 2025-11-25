//const API_ENDPOINT = "http://localhost:8787";
const API_ENDPOINT = "https://e2c-worker.giovaganzerli.workers.dev";

async function askToIA(file, prompt = "") {
    const form = new FormData();
    form.append("file", file);
    form.append("prompt", prompt);

    const response = await fetch(API_ENDPOINT +"/api/ia", {
        method: "POST",
        body: form,
    });

    const data = await response.json();
    return data.events;
}

export async function parseImage(file) {
    const events = await askToIA(
        file,
        `
Extract ALL events from this Effiplan schedule screenshot.
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

No markdown. No explanation. No text outside the JSON.
`
    );
    return events;
}