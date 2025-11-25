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