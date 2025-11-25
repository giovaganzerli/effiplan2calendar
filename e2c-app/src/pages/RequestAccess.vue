<template>
    <div class="p-4 space-y-6">

        <h1 class="text-2xl sm:text-[50px] max-sm:text-[9vw] text-center"><router-link to="/"><b>Effiplan2Calendar</b></router-link></h1>
        <hr>

        <iframe src="https://docs.google.com/forms/d/e/1FAIpQLSfm3sEhcQIBRbXKNaEcWG0N0LhQNFaHJSfu7d7Wek1qknu6JQ/viewform?embedded=true" width="100%" height="500px" frameborder="0" marginheight="0" marginwidth="0">Caricamento…</iframe>

        <div class="fixed z-100 w-full bottom-0 left-0 p-4 bg-black">
            <router-link
                to="/"
                class="w-full btn btn-primary p-3 rounded"
            >
                < Go to Home
            </router-link>
        </div>

        <!--
        <form @submit.prevent="sendRequest" class="space-y-6">

            <p class="mb-2"><b>Richiedi l'accesso per poter utilizzare quest'app!</b></p>
            <p class="text-xs"><i>Inserisci qui sotto l'indirizzo email dell'account Google dove sincronizzare i tuoi planning Effiplan</i></p>
            <div class="input">
                <span class="icon-[entypo--email] text-base-content/80 my-auto me-3 size-5 shrink-0"></span>
                <input
                    type="email"
                    class="grow"
                    v-model="formData.decathlonEmail"
                    placeholder="Decathlon Email"
                    @input="validateField('decathlonEmail')"
                    required />
            </div>
            <div class="input">
                <span class="icon-[entypo--email] text-base-content/80 my-auto me-3 size-5 shrink-0"></span>
                <input
                    type="email"
                    class="grow"
                    v-model="formData.personalEmail"
                    placeholder="Google Account Email"
                    @input="validateField('personalEmail')"
                    required />
            </div>

            <div v-if="!isFormValid && (formErrors.decathlonEmail || formErrors.personalEmail)" class="w-full border-2 border-gray-600 rounded-2xl p-4 bg-gray-800">
                <p v-if="formErrors.decathlonEmail" class="text-error">{{ formErrors.decathlonEmail }}</p>
                <p v-if="formErrors.personalEmail" class="text-error">{{ formErrors.personalEmail }}</p>
            </div>
            <div v-else-if="isFormValid" class="w-full border-2 border-gray-600 rounded-2xl p-4 bg-gray-800">
                <p v-if="formStatus.loading" class="text-success">Invio richiesta in corso...</p>
                <p v-else-if="formStatus.success" class="text-success">Richiesta inviata! Riceverai la conferma via mail.</p>
                <p v-else-if="formStatus.error" class="text-error">Si è verificato un errore imprevisto. Riprova.</p>
            </div>
        </form>

        <div class="fixed w-full bottom-0 left-0 p-4 bg-black">
            <button
                class="w-full btn btn-success p-3 rounded"
                :disabled="formStatus.loading"
                @click="sendRequest()"
            >
                Request Access!
            </button>
        </div>-->

    </div>
</template>

<script setup>
import { ref, computed } from "vue";
//import emailjs from "@emailjs/browser";

const formData = ref({
    decathlonEmail: "",
    personalEmail: ""
});

const formStatus = ref({
    loading: false,
    success: false,
    error: false
});

const formErrors = ref({
    decathlonEmail: '',
    personalEmail: ''
});

const isFormValid = computed(() => {
    return (
        formData.value.decathlonEmail.trim() &&
        formData.value.personalEmail.trim() &&
        !formErrors.value.decathlonEmail &&
        !formErrors.value.personalEmail
    );
});

function validateField(field) {
    const value = formData.value[field];

    switch(field) {
        case "decathlonEmail":
            if (!value.trim()) {
                formErrors.value.decathlonEmail = "Email Decathlon: obbligatoria.";
            } else if (!/^\S+@\S+\.\S+$/.test(value)) {
                formErrors.value.decathlonEmail = "Email Decathlon: non valida.";
            } else {
                formErrors.value.decathlonEmail = null;
            }
            break;

        case "personalEmail":
            if (!value.trim()) {
                formErrors.value.personalEmail = "Email Google: obbligatoria.";
            } else if (!/^\S+@\S+\.\S+$/.test(value)) {
                formErrors.value.personalEmail = "Email Google: non valida";
            } else {
                formErrors.value.personalEmail = null;
            }
            break;
    }
}

async function sendRequest() {

    validateField("personalEmail");
    validateField("decathlonEmail");

    if(!isFormValid.value) return;

    formStatus.value.loading = true;
    formStatus.value.success = false;
    formStatus.value.error = false;

    /*
    try {
        await emailjs.send(
            "YOUR_SERVICE_ID",
            "YOUR_TEMPLATE_ID",
            {
                user_name: form.value.name,
                user_email: form.value.email,
                message: form.value.message,
            },
            "YOUR_PUBLIC_KEY"
        );

        formStatus.value.success = true;
        formData.value = { store: "", email: "" };

    } catch (e) {
        console.error("EmailJS error:", e);
        formStatus.value.error = true;
    }
    */
    formStatus.value.loading = false;
}

</script>

<style scoped>
iframe {
    width: 100vw;
    height: calc(100vh - 180px);
    margin-left: -15px;
}
</style>