import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')
    const base = env.VITE_BASE_PATH || '/'

    return {
        // Base path del front-end. In produzione: /decathlon/e2c/,
        // in sviluppo locale gira sulla root.
        // VITE_BASE_PATH e' letto da .env.development / .env.production.
        base,
        define: {
            __APP_VERSION__: JSON.stringify((process.env.BUILD_COMMIT_SHA || 'locale').slice(0, 7)),
        },
        plugins: [
            vue(),
            tailwindcss(),
            VitePWA({
                registerType: 'prompt',
                injectRegister: false,
                scope: base,
                manifest: {
                    id: base,
                    name: 'Effi2Cal',
                    short_name: 'Effi2Cal',
                    description: 'Trasforma il planning Effiplan in eventi Google Calendar.',
                    lang: 'it',
                    start_url: base,
                    scope: base,
                    display: 'standalone',
                    theme_color: '#0d1117',
                    background_color: '#0d1117',
                    icons: [
                        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                    ],
                },
                workbox: {
                    globPatterns: ['**/*.{js,css,html,png,jpeg,svg,ico,woff,woff2}'],
                    navigateFallback: 'index.html',
                    navigateFallbackDenylist: [/\/api(?:\/|$)/],
                    // Only the static app shell is cached. API requests and
                    // Google OAuth/Calendar responses always use the network.
                    runtimeCaching: [],
                    cleanupOutdatedCaches: true,
                    skipWaiting: false,
                },
            }),
            {
                name: 'disable-rocket-loader-for-modules',
                transformIndexHtml: {
                    order: 'post',
                    handler: (html) => html.replace(
                        /<script type="module"/g,
                        '<script data-cfasync="false" type="module"'
                    ),
                },
            },
        ],
    }
})
