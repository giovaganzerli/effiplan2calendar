# Effiplan2Calendar ✨

Vuoi trasformare gli screenshot del planning Effiplan in eventi ordinati su Google Calendar? Questo repo raccoglie tre piccoli
progetti che lavorano insieme: una web app Vue, un proxy Express e un Worker Cloudflare che usa Gemini per leggere l'immagine.

## Cosa c'è nel repo
- **e2c-app** (Vue 3 + Vite): interfaccia mobile-first con login Google, upload dello screenshot, revisione degli eventi e
  sincronizzazione sul calendario scelto.
- **e2c-proxy** (Express): endpoint `POST /api/ia` che inoltra l'immagine a Gemini 2.5 Flash. Richiede `GEMINI_API_KEY` in `.env`.
- **e2c-worker** (Cloudflare Worker): stesso endpoint `POST /api/ia`, ridimensiona l'immagine, la manda a Gemini e restituisce
  gli eventi in JSON. Usa `GEMINI_API_KEY` e Image Delivery per il resize.

## Prima di partire 🛠️
- Node.js 18+ e npm installati.
- Chiave API Gemini (`GEMINI_API_KEY`).
- Client ID OAuth Google con permessi Calendar (sostituisci quello d'esempio in `Home.vue`).
- (Facoltativo) Account Cloudflare con Wrangler se vuoi provare/deployare il Worker.

## Avvio rapido ⚡
### 1) Front-end (e2c-app)
```bash
cd e2c-app
npm install
npm run dev
```
Per cambiare l'endpoint IA modifica `API_ENDPOINT` in `src/services/ocr.service.js`. Il Client ID Google è impostato in
`Home.vue` dentro `initGoogle`.

### 2) Proxy Express locale (e2c-proxy)
```bash
cd e2c-proxy
npm install
GEMINI_API_KEY=<la_tua_chiave> node index.js
```
L'endpoint `POST http://localhost:3001/api/ia` accetta `multipart/form-data` con `file` (immagine) e `prompt` e restituisce
`{"events": [...]}` con gli eventi riconosciuti.

### 3) Worker Cloudflare (e2c-worker)
```bash
cd e2c-worker
npm install
GEMINI_API_KEY=<la_tua_chiave> npm run dev
# oppure
# GEMINI_API_KEY=<la_tua_chiave> npm run deploy
```
L'endpoint `POST /api/ia` accetta `multipart/form-data` con `file` e `prompt`, ridimensiona l'immagine con Image Delivery e la
invia a Gemini. L'app front-end è configurata per un Worker pubblico di esempio (`https://e2c-worker.giovaganzerli.workers.dev`).

## Come funziona il flusso 🚀
1. Login con Google (Google Identity Services) e scelta/creazione del calendario di lavoro.
2. Upload o scatto dello screenshot del planning Effiplan.
3. Il Worker/Proxy inoltra l'immagine a Gemini 2.5 Flash che estrae gli eventi in JSON.
4. Puoi modificare o togliere gli eventi proposti e sincronizzarli su Google Calendar (con promemoria).

## Test ✅
- Front-end: non ci sono test automatici.
- Worker: `npm test` in `e2c-worker` avvia la suite Vitest (richiede Wrangler attivo).
