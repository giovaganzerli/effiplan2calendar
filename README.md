# Effiplan2Calendar

## Installazione PWA (Effi2Cal)

Aprire `https://share.girovaganzo.bike/decathlon/e2c/` in Chrome su Android
e scegliere **Installa app**. Il nome installato è **Effi2Cal** e le icone
derivano da `e2c-app/public/appicon.png` (192, 512 e Apple touch 180 px).
Il manifest e il service worker sono generati da `vite-plugin-pwa` con lo
stesso prefisso di Vite. Solo i file statici sono salvati per l'avvio offline:
Google login, analisi IA e sincronizzazione Calendar richiedono la rete.
Gli aggiornamenti si attivano alla chiusura delle finestre precedenti,
senza ricaricare forzatamente una revisione o sincronizzazione in corso.
Quando c'è una versione in attesa, appare anche **Aggiorna app**: il pulsante
richiede conferma e non è utilizzabile durante analisi IA o sincronizzazione.
In fondo alla pagina è indicato il codice della versione per distinguere una
PWA aggiornata da una copia precedente ancora in memoria.

### Test del flusso Sync nel browser

In `e2c-app`, `npm run test:e2e` prova il sito pubblicato con viewport mobile,
intercettando tutte le chiamate Google: non crea eventi reali. Richiede Chromium
di Playwright (`npx playwright install chromium`), oppure `E2C_CHROME_PATH`
per usare un'installazione locale di Chrome. `E2C_TEST_URL` permette di provare
una build locale anziché il sito pubblico.

## Indirizzo principale

L'app è pubblicata su **https://share.girovaganzo.bike/decathlon/e2c/**.
Il gateway inoltra `/decathlon/e2c/` al percorso interno `/e2c/` di nginx;
frontend, router e API usano il nuovo prefisso pubblico. Il codice sul NAS
rimane in `/var/www/decathlon/e2c/`.
L'accesso pubblico non richiede Tailscale; il deploy via SSH continua a usarlo.
In Google Cloud, autorizzare l'origine JavaScript `https://share.girovaganzo.bike`
(senza percorso). Le descrizioni del dominio Decathlon sotto riportate si
riferiscono all'origine interna, non all'indirizzo principale pubblico.

Converte gli screenshot del planning Effiplan in eventi su Google Calendar, usando
l'analisi immagini di Gemini. La web app guida l'utente nell'accesso con Google,
nell'upload dello screenshot, nella revisione degli eventi estratti e nella
sincronizzazione sul calendario scelto.

L'applicazione gira **autonomamente sul tuo server** (NAS `g96-nas`), servita da
`https://decathlon.girovaganzo.bike/e2c`. Non dipende più da Cloudflare Workers.

## Struttura del repository

| Pacchetto | Ruolo |
|---|---|
| **e2c-app** | Front-end Vue 3 + Vite (mobile-first): login Google, caricamento screenshot, revisione eventi, sync su Calendar. |
| **e2c-server** | Server Express: espone `POST /api/ia` (Gemini) **e** serve il front-end compilato con fallback SPA. È il backend di produzione. |
| **e2c-worker** | Cloudflare Worker: backend *alternativo*, non più usato dal sito. Tenuto come opzione di sviluppo/emergenza. |
| **bin/** | Script di deploy installati sul NAS (`deploy-nas`, `deploy-nas-ssh`, `deploy-nas-env-set`) e il `docker-compose.yml`. |
| **docs/deploy-nas.md** | Procedura completa di deploy, con i comandi per configurare GitHub e il NAS. |
| **Dockerfile** | Multi-stage: build Vite + runtime Node con il front-end compilato. |

## Architettura di produzione

```
decathlon.girovaganzo.bike/e2c
        │
        ▼
   Caddy (TLS via Cloudflare DNS)  ──►  127.0.0.1:8080
        │
        ▼
   nginx  ── location ^~ /e2c/ ──►  127.0.0.1:3011 (container e2c-server)
        │                                  ├─ /            → front-end compilato
        │                                  ├─ /assets/...  → bundle con hash (cache 1y)
        │                                  ├─ /api/ia      → Gemini
        │                                  └─ /*           → fallback SPA
        ▼
  /var/www/decathlon/e2c/     (codice applicativo + compose + .env)
```

Il sito è **tailnet-only**: `decathlon.girovaganzo.bike` risolve all'IP Tailscale del
NAS, quindi è raggiungibile solo dai device connessi alla tua tailnet.

### Percorso `/e2c`

Il front-end è montato in un sotto-percorso, quindi:

- `e2c-app/.env.production` imposta `VITE_BASE_PATH=/e2c/`
- Vite lo usa come `base` (asset → `/e2c/assets/...`)
- Vue Router usa `createWebHistory(import.meta.env.BASE_URL)` → `/e2c/privacy-policy`
- L'API è **same-origin**: `/e2c/api/ia` (nessun CORS, nessun Worker)

nginx rimuove il prefisso `/e2c/` prima di inoltrare al container
(`proxy_pass http://127.0.0.1:3011/`), quindi il server vede `/`, `/assets/...`,
`/api/ia` e le rotte SPA.

## Requisiti

- Node.js 18+ e npm (solo per lo sviluppo locale e la build).
- Chiave API Gemini (`GEMINI_API_KEY`).
- Client ID OAuth Google con l'origine `https://decathlon.girovaganzo.bike/e2c`
  autorizzata tra le "Authorized JavaScript origins".

## Sviluppo locale

Servono il front-end e il server Express.

```bash
# 1. Backend (API + front-end, se gia' compilato)
cd e2c-server
npm install
cp .env.example .env          # inserire GEMINI_API_KEY
npm start                     # http://localhost:3001

# 2. Front-end
cd e2c-app
npm install
npm run dev                   # http://localhost:5173
```

In sviluppo `.env.development` punta l'API a `http://localhost:3001`.

Per il backend alternativo su Cloudflare Worker (opzionale, non usato dal sito):

```bash
cd e2c-worker
npm install
cp .dev.vars.example .dev.vars   # inserire GEMINI_API_KEY
npm run dev                       # http://localhost:8787
```

### Note sul modello Gemini

Google ruota rapidamente i nomi dei modelli: `gemini-2.5-flash` non è più erogabile
per gli account nuovi (HTTP 404 `This model is no longer available to new users`).

`e2c-server` e `e2c-worker` provano quindi una **catena di modelli** e usano il primo
che risponde:

1. `GEMINI_MODEL` (variabile d'ambiente, elenco separato da virgole)
2. `gemini-3-flash-preview`
3. `gemini-3.8-flash`
4. `gemini-flash-latest`

Un errore 404/429/503 fa passare al modello successivo; un 400/401/403 (chiave non
valida o richiesta malformata) viene invece restituito subito al client.

La risposta di Gemini viene richiesta in JSON puro (`responseMimeType: application/json`)
e il risultato viene ripulito da eventuali fence markdown prima del parsing.

## Deploy automatico (GitHub Actions → NAS)

`.github/workflows/deploy-nas.yml` fa tre cose a ogni push su `main`:

1. **build** — compila l'immagine Docker (Vite + server Express) su `linux/amd64`.
2. **deploy** — il runner entra nella **tailnet Tailscale**, poi:
   - scrive `GEMINI_API_KEY` in `/var/www/decathlon/e2c/.env` (mode 600);
   - invia l'immagine compressa via SSH (stdin) al NAS;
   - il NAS fa `docker load`, estrae il codice in `/var/www/decathlon/e2c/` e riavvia il container;
3. **health check** — verifica `https://decathlon.girovaganzo.bike/e2c/api/health`.

I secret vivono nell'**environment GitHub `nas`**, non a livello di repository.

| Secret | Contenuto |
|---|---|
| `TS_OAUTH_CLIENT_ID` | Tailscale OAuth client id (lo stesso di Dreeve/Wallet). |
| `TS_OAUTH_SECRET` | Tailscale OAuth client secret. |
| `NAS_SSH_KEY` | Chiave privata del deploy (`~/.ssh/g96-e2c-actions_ed25519`). |
| `NAS_SSH_KNOWN_HOSTS` | Chiave host SSH verificata per `100.115.48.28`. |
| `GEMINI_API_KEY` | Chiave API Gemini per il server. |

Procedura completa e comandi di setup: [`docs/deploy-nas.md`](docs/deploy-nas.md).

> **Nota**: il client OAuth Tailscale è condiviso con Dreeve e Wallet, ma i secret
> GitHub sono **per repository**: gli stessi valori vanno ripetuti anche qui.

### Perché serve Tailscale

Il NAS è raggiungibile **solo** via tailnet: la porta 22 pubblica è filtrata e la
443 pubblica risponde col router, non col server. Senza il passo Tailscale il runner
GitHub non arriverebbe al NAS.

### Sicurezza del deploy

La chiave SSH del deploy ha un **forced command**: può eseguire solo
`deploy <commit-sha>` (immagine su stdin) e `set-env` (`CHIAVE=valore` su stdin).
Nessun comando remoto viene mai eseguito. La chiave è inoltre ristretta alla
range Tailscale `100.64.0.0/10`.

Il forced command vive in `/usr/local/bin/e2c-deploy-ssh`, gli script root in
`/usr/local/sbin/e2c-deploy` ed `e2c-env-set`.

### Rollback

Ogni deploy salva in `/var/www/decathlon/e2c/deploy-backups/` il compose, il `.env` e
l'immagine precedente. Per tornare indietro:

```bash
sudo sed -i 's|^E2C_IMAGE=.*|E2C_IMAGE=<immagine precedente>|' /var/www/decathlon/e2c/.env
cd /var/www/decathlon/e2c && sudo docker compose up -d --no-build
```

## Struttura sul NAS

```
/var/www/decathlon/e2c/
├── src/                  ← sorgente completo del repository
├── web/                  ← front-end compilato (servito dal container)
├── server/               ← codice del server Express
├── docker-compose.yml
├── .env                  ← GEMINI_API_KEY + E2C_IMAGE (mode 600)
├── .deployed-commit      ← SHA attualmente in esercizio
└── deploy-backups/
```

## Test

- Front-end: non sono presenti test automatici.
- Worker: `npm test` in `e2c-worker` (suite Vitest).
- Server: nessuna suite automatica; verifica manuale con
  `curl -X POST -F file=@immagine.jpg -F prompt="..." http://localhost:3001/api/ia`.

## Note operative

- **Segreti**: `e2c-server/.env` ed `e2c-worker/.dev.vars` sono gitignorati.
  `wrangler.jsonc` non deve mai contenere chiavi (usare `wrangler secret put`).
- **Resize delle immagini**: il front-end ridimensiona lato client (canvas, lato
  massimo 1600px) prima dell'upload, quindi il resize server-side via Cloudflare
  Image Delivery non è necessario.
- **CORS**: `e2c-server` risponde con `Access-Control-Allow-Origin: *` (necessario
  solo in sviluppo locale; in produzione il front-end è same-origin).
