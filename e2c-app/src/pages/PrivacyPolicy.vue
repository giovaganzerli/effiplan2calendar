<template>
    <div class="p-6 max-w-3xl mx-auto space-y-4">
        <h1 class="text-2xl font-bold mb-4">Informativa sulla Privacy</h1>

        <p><strong>Ultimo aggiornamento:</strong> {{ new Date().toLocaleDateString() }}</p>

        <p>
            La presente Informativa sulla Privacy descrive come l’applicazione
            <strong>Effiplan2Calendar</strong> gestisce i dati quando utilizzi il servizio.
        </p>

        <h2 class="text-xl font-semibold mt-6">1. Titolare del trattamento</h2>
        <p>{{ ownerName }} — {{ ownerEmail }}</p>

        <h2 class="text-xl font-semibold mt-6">2. Dati raccolti</h2>
        <ul class="list-disc ml-5 space-y-2">
            <li>Dati Google (nome, email, foto, calendari accessibili)</li>
            <li>Immagini caricate per l’analisi tramite IA (non conservate)</li>
            <li>Eventi generati temporaneamente nell’app</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6">3. Finalità del trattamento</h2>
        <p>I dati vengono usati esclusivamente per:</p>
        <ul class="list-disc ml-5 space-y-2">
            <li>accedere ai calendari Google</li>
            <li>analizzare immagini di planner</li>
            <li>creare eventi su richiesta dell’utente</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6">4. Conservazione</h2>
        <p>
            Le immagini non vengono conservate. I dati dell’account rimangono sul dispositivo
            dell’utente. Nessun dato viene venduto o ceduto a terzi.
        </p>

        <h2 class="text-xl font-semibold mt-6">5. Contatti</h2>
        <p>Per richieste sulla privacy: <strong>{{ ownerEmail }}</strong></p>
    </div>
</template>

<script setup>
const ownerName = "Giovanni Ganzerli";
const ownerEmail = "giovaganzerli@gmail.com";
</script>

<style scoped>
p { line-height: 1.6; }
</style>
