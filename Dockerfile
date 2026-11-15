# syntax=docker/dockerfile:1

# =====================================================================
# Front-end: compilazione con Vite.
# In produzione VITE_BASE_PATH=/e2c/ (da e2c-app/.env.production).
# =====================================================================
FROM node:22-alpine AS frontend

WORKDIR /build

COPY e2c-app/package.json e2c-app/package-lock.json ./
RUN npm ci

COPY e2c-app/ ./
RUN npm run test:pwa


# =====================================================================
# Runtime: server Express + front-end compilato + sorgente completo.
# =====================================================================
FROM node:22-alpine AS runtime

ENV NODE_ENV=production \
    PORT=3000 \
    WEB_ROOT=/srv/app/web

WORKDIR /srv/app

COPY e2c-server/package.json e2c-server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY e2c-server/ ./server/
COPY --from=frontend /build/dist ./web

# Sorgente completo: il deploy script lo estrae su /var/www/decathlon/e2c/src
COPY . ./src

RUN chown -R node:node /srv/app
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.js"]
