<template>
    <div class="relative w-[100vw] h-[100vh] max-w-[550px] mx-auto overflow-auto">
        <div v-if="needRefresh" role="status" class="sticky top-0 z-50 bg-gray-800 p-3 text-sm border-b border-gray-600">
            <p>È disponibile una nuova versione di Effi2Cal.</p>
            <p class="text-xs">L'aggiornamento ricarica l'app: termina prima le operazioni in corso.</p>
            <button class="btn btn-primary btn-sm mt-2" :disabled="appBusy" @click="applyUpdate">
                Aggiorna app
            </button>
        </div>
        <router-view />
        <p class="px-4 pb-28 text-xs text-gray-500">Versione {{ appVersion }}</p>
    </div>
</template>

<script setup>
import { useRegisterSW } from 'virtual:pwa-register/vue';
import { appBusy } from './services/pwa.service.js';

const appVersion = __APP_VERSION__;
const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true });

function applyUpdate() {
    if (appBusy.value) return;
    if (window.confirm('Aggiornare Effi2Cal? Le modifiche non sincronizzate andranno perse.')) {
        updateServiceWorker(true);
    }
}
</script>
