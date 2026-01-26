# Effiplan2Calendar

Applicazione composta da tre pacchetti che converte gli screenshot del planning Effiplan in eventi su Google Calendar sfruttando l'analisi immagini di Gemini. La web app guida l'utente nell'accesso con Google, nell'upload dello screenshot, nell'estrazione degli eventi tramite IA e nella sincronizzazione sul calendario scelto.

## Struttura del repository
- **e2c-app**: front-end Vue 3 + Vite (mobile-first) che gestisce login Google, caricamento screenshot, revisione degli eventi estratti e sincronizzazione su Calendar.
- **e2c-proxy**: piccolo server Express che espone `POST /api/ia` per inoltrare l'immagine a Gemini 2.5 Flash; richiede la chiave `GEMINI_API_KEY` in `.env`.
- **e2c-worker**: Cloudflare Worker (Wrangler) con endpoint `POST /api/ia` che ridimensiona l'immagine, la invia a Gemini REST e restituisce gli eventi come JSON; usa la variabile `GEMINI_API_KEY` e l'API di Image Delivery per il resize.

## Requisiti
- Node.js 18+ e npm installati localmente.
- Chiave API Gemini (`GEMINI_API_KEY`).
- Client ID OAuth Google con permessi Calendar per l'app front-end (sostituire quello di esempio in `Home.vue`).
- (Opzionale) Account Cloudflare e Wrangler configurato per eseguire/deployare il Worker.

## Avvio rapido
### 1. Front-end (e2c-app)
```bash
cd e2c-app
npm install
npm run dev
```
L'app è configurata per contattare di default il Worker pubblico definito in `src/services/ocr.service.js`. Per usare un endpoint diverso, modifica `API_ENDPOINT` nello stesso file. Il Client ID Google è impostato in `Home.vue` nella funzione `initGoogle`.

### 2. Proxy Express locale (e2c-proxy)
```bash
cd e2c-proxy
npm install
GEMINI_API_KEY=<la_tua_chiave> node index.js
```
L'endpoint `POST http://localhost:3001/api/ia` accetta `multipart/form-data` con campi `file` (immagine) e `prompt` e restituisce `{ "events": [...] }` con gli eventi estratti da Gemini.

### 3. Worker Cloudflare (e2c-worker)
```bash
cd e2c-worker
npm install
GEMINI_API_KEY=<la_tua_chiave> npm run dev
# oppure deploy
# GEMINI_API_KEY=<la_tua_chiave> npm run deploy
```
L'endpoint `POST /api/ia` accetta `multipart/form-data` con `file` e `prompt`, effettua il resize tramite Image Delivery e invia la richiesta a Gemini. Il file `src/ocr.service.js` dell'app punta a un Worker pubblico di esempio (`https://e2c-worker.giovaganzerli.workers.dev`).

## Flusso applicativo
1. L'utente accede con Google (Google Identity Services) e seleziona/crea un calendario dedicato.
2. Carica o scatta uno screenshot del planning Effiplan.
3. L'immagine viene inviata al Worker/Proxy che la passa a Gemini 2.5 Flash per estrarre gli eventi in JSON.
4. L'utente può modificare/togliere gli eventi riconosciuti e avviare la sincronizzazione su Google Calendar con promemoria configurabili.

## Test
- Front-end: non sono presenti test automatici.
- Worker: eseguire `npm test` in `e2c-worker` per lanciare la suite Vitest (richiede Wrangler).
