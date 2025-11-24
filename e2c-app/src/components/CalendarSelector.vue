<template>
    <div>
        <label class="block mb-2"><b>Your Calendar:</b></label>

        <select v-model="selected" class="border p-2 rounded w-full" @change="onCalendarSelect(selected)" disabled>
            <option disabled value="">--</option>
            <option v-for="c in calendars" :key="c.id" :value="c.id">
                {{ c.summary }}
            </option>
        </select>
    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { autoLoginGoogle, getToken } from "../services/google.service.js";

const selected = defineModel();
const calendars = ref([]);

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

    const res = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );

    const data = await res.json();
    calendars.value = data.items || [];
});

function onCalendarSelect() {
    const cal = calendars.value.find(
        (c) => c.id === selected.value
    );

    emit("on-selected", cal);
}
</script>
