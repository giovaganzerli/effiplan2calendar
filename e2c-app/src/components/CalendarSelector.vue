<template>
    <div>
        <label class="block mb-2"><b>Your Calendar:</b></label>

        <select v-model="selected" class="border p-2 rounded w-full" @change="onCalendarSelect(selected)">
            <option disabled value="">--</option>
            <option v-for="c in calendars" :key="c.id" :value="c.id">
                {{ c.summary }}
            </option>
        </select>

        <p v-if="error" class="mt-2 text-xs text-error">{{ error }}</p>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { autoLoginGoogle, getToken, getUserCalendars } from "../services/google.service.js";

const selected = defineModel();
const calendars = ref([]);
const error = ref('');

const emit = defineEmits(['on-selected'])

onMounted(async () => {
    let token = getToken();

    if (!token) {
        try {
            await autoLoginGoogle();
            token = getToken();
        } catch {
            return;
        }
    }

    if (!token) return;

    try {
        calendars.value = await getUserCalendars();
    } catch (err) {
        console.error("CalendarSelector: unable to load calendars:", err);
        error.value = "Impossibile caricare i calendari.";
    }
});

function onCalendarSelect() {
    const cal = calendars.value.find(
        (c) => c.id === selected.value
    );

    emit("on-selected", cal);
}
</script>
