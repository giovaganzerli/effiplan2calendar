<template>
    <div class="p-6 max-w-3xl mx-auto space-y-4">
        <h1 class="text-2xl font-bold mb-4">Termini di Servizio</h1>

        <p><strong>Ultimo aggiornamento:</strong> {{ new Date().toLocaleDateString() }}</p>

        <h2 class="text-xl font-semibold mt-6">1. Descrizione del Servizio</h2>
        <p>
            Effiplan2Calendar consente di estrarre eventi da immagini di planner e inserirli
            nel Calendario Google.
        </p>

        <h2 class="text-xl font-semibold mt-6">2. Requisiti di utilizzo</h2>
        <ul class="list-disc ml-5 space-y-2">
            <li>Età minima: 16 anni</li>
            <li>Account Google valido</li>
            <li>Uso non fraudolento dell’app</li>
        </ul>

        <h2 class="text-xl font-semibold mt-6">3. Limitazioni di responsabilità</h2>
        <p>
            L’app viene fornita “così com’è”. L’utente è responsabile della verifica
            degli eventi prima della sincronizzazione su Google Calendar.
        </p>

        <h2 class="text-xl font-semibold mt-6">4. Contenuti caricati</h2>
        <p>
            Le immagini vengono elaborate solo per il riconoscimento degli eventi
            e non vengono conservate.
        </p>

        <h2 class="text-xl font-semibold mt-6">5. Modifiche al Servizio</h2>
        <p>
            Possiamo modificare o aggiornare il servizio senza preavviso.
        </p>

        <h2 class="text-xl font-semibold mt-6">6. Contatti</h2>
        <p>Per informazioni: <strong>{{ ownerEmail }}</strong></p>
    </div>
</template>

<script setup>
const ownerEmail = "giovaganzerli@gmail.com";
</script>

<style scoped>
p { line-height: 1.6; }
</style>
