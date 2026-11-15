import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from "./router";
import { registerSW } from 'virtual:pwa-register'

createApp(App).use(router).mount('#app')

// Updates wait until the previous app windows close; never reload a user's
// event review or Calendar synchronization in progress.
registerSW({ immediate: true })
