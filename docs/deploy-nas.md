# Deploy sul NAS

## URL pubblico

La home principale è `https://share.girovaganzo.bike/decathlon/e2c/`.
Il gateway pubblico esistente riscrive `/decathlon/e2c` in `/e2c` prima
di inoltrare a nginx. Il percorso sul disco resta `/var/www/decathlon/e2c`.
Il workflow verifica l'health check sul nuovo URL pubblico.
Autorizzare `https://share.girovaganzo.bike` come origine JavaScript in
Google Cloud (senza `/decathlon/e2c/`).

Il workflow `deploy-nas.yml` parte sui push a `main` o manualmente dallo stesso
branch. Compila un'immagine amd64 e la trasferisce via SSH nella rete Tailscale:
non richiede registry né porte pubbliche.

Destinazione: `g96admin@100.115.48.28`, progetto `/var/www/decathlon/e2c`.
Il Compose già presente sul NAS resta invariato, compresi i volumi `web/` e
`server/`. Viene aggiornato solo `E2C_IMAGE` nel `.env` remoto.

## GitHub e Tailscale

L'environment GitHub **nas** e i suoi secrets:

| Secret | Contenuto |
| --- | --- |
| `TS_OAUTH_CLIENT_ID` | Client ID OAuth Tailscale |
| `TS_OAUTH_SECRET` | Client secret OAuth Tailscale |
| `NAS_SSH_KEY` | Chiave privata dedicata al deploy |
| `NAS_SSH_KNOWN_HOSTS` | Chiave host SSH verificata per `100.115.48.28` |
| `GEMINI_API_KEY` | Chiave API Gemini scritta nel `.env` del NAS |

Il client OAuth Tailscale è lo stesso usato per Dreeve e Wallet: si usa con
permesso di scrittura sulle auth keys e tag `tag:github-deploy`. Configurare i
tag owner e consentire a quel tag **solo TCP 22 verso il NAS** nelle ACL/grants
della tailnet. Il client OAuth non si può ricavare dalla sessione Tailscale già
attiva sul NAS.

> I tag richiesti dal workflow devono corrispondere **esattamente** a quelli
> configurati sull'OAuth client, altrimenti Tailscale risponde
> `400: requested tags [...] are invalid or not permitted`.

Si usa OpenSSH con chiave dedicata, non la funzione Tailscale SSH.

## Configurazione (da questo Mac)

Gli script e la chiave pubblica limitata sono già installati sul NAS.
La chiave privata dedicata è in `~/.ssh/g96-e2c-actions_ed25519` e la chiave
host, letta tramite la connessione SSH già verificata, è in
`~/.ssh/g96-e2c-actions_known_hosts`. Non aggiungere questi file al repository.

```sh
gh api --method PUT repos/giovaganzerli/effiplan2calendar/environments/nas
gh secret set NAS_SSH_KEY         --repo giovaganzerli/effiplan2calendar --env nas < ~/.ssh/g96-e2c-actions_ed25519
gh secret set NAS_SSH_KNOWN_HOSTS --repo giovaganzerli/effiplan2calendar --env nas < ~/.ssh/g96-e2c-actions_known_hosts
gh secret set GEMINI_API_KEY      --repo giovaganzerli/effiplan2calendar --env nas
gh secret set TS_OAUTH_CLIENT_ID  --repo giovaganzerli/effiplan2calendar --env nas
gh secret set TS_OAUTH_SECRET     --repo giovaganzerli/effiplan2calendar --env nas
```

Gli ultimi tre comandi chiedono i valori senza inserirli nel codice o nella
cronologia della shell.

## Script da installare sul NAS

Gli script versionati in `bin/` vanno installati sul NAS, di proprietà root e non
scrivibili dall'utente SSH:

| Repository | NAS | Note |
| --- | --- | --- |
| `bin/deploy-nas` | `/usr/local/sbin/e2c-deploy` | root, modo 755 |
| `bin/deploy-nas-ssh` | `/usr/local/bin/e2c-deploy-ssh` | root, modo 755 |
| `bin/deploy-nas-env-set` | `/usr/local/sbin/e2c-env-set` | root, modo 755 |
| `bin/docker-compose.yml` | `/var/www/decathlon/e2c/docker-compose.yml` | `g96admin:www-data`, 644 |

Gli aggiornamenti futuri agli script richiedono la reinstallazione amministrativa
sul NAS: il workflow non può riscrivere gli script root tramite la chiave limitata.

La chiave di deploy deve avere in `~g96admin/.ssh/authorized_keys` l'opzione:

```text
restrict,from="100.64.0.0/10",command="/usr/local/bin/e2c-deploy-ssh" ssh-ed25519 ...
```

Il forced command accetta solo `deploy <commit-sha>` (immagine su stdin) e
`set-env` (`CHIAVE=valore` su stdin). L'utente SSH necessita di sudo non
interattivo per lo script di deploy; su questo NAS `g96admin` dispone già di
sudo non interattivo. Servono Python 3, gzip e flock.

La chiave dedicata non consente shell o forwarding, ma può distribuire immagini
e scrivere il `.env` del progetto: proteggere secrets, branch e workflow.

## Comportamento del deploy

1. Il runner entra nella tailnet Tailscale con un nodo *ephemeral* (scompare a
   fine job).
2. `set-env` scrive `GEMINI_API_KEY` in `/var/www/decathlon/e2c/.env` (mode 600),
   preservando le altre chiavi.
3. L'immagine viene inviata compressa su stdin; il NAS fa `docker load`.
4. Il codice applicativo viene estratto dall'immagine in
   `/var/www/decathlon/e2c/{web,server,src}`.
5. `E2C_IMAGE` viene aggiornato nel `.env` e `docker compose up -d --wait`
   riavvia il container.
6. Il workflow verifica `https://decathlon.girovaganzo.bike/e2c/api/health`.

Il deploy è serializzato con `flock` su `.deploy.lock`: un secondo deploy
concorrenzente viene rifiutato.

## Backup e recupero

Prima di cambiare versione vengono copiati `.env`, `docker-compose.yml` e
l'immagine precedente in `deploy-backups/<timestamp>-<sha>/`. Per tornare
indietro:

```sh
sudo cp -p /var/www/decathlon/e2c/deploy-backups/<backup>/env /var/www/decathlon/e2c/.env
cd /var/www/decathlon/e2c && sudo docker compose up -d --no-build
```

In caso di fallimento dopo il cambio immagine il servizio non viene riportato
automaticamente alla versione precedente: ispezionare i file di recovery e
ripristinarli manualmente.

## Note sul path `/e2c`

Il sito è montato in un sotto-percorso:

- `e2c-app/.env.production` imposta `VITE_BASE_PATH=/e2c/`
- nginx fa `location = /e2c` → 301 e `location ^~ /e2c/` → proxy a
  `127.0.0.1:3011` rimuovendo il prefisso
- il container serve front-end, asset e API (`/api/ia`) sullo stesso dominio

Modificare la configurazione di nginx richiede `sudo nginx -t` prima del reload.
