import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '')

    return {
        // Base path del front-end. In produzione l'app e' montata su /e2c,
        // in sviluppo locale gira sulla root.
        // VITE_BASE_PATH e' letto da .env.development / .env.production.
        base: env.VITE_BASE_PATH || '/',
        plugins: [
            vue(),
            tailwindcss()
        ],
    }
})
