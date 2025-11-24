<template>
    <div class="p-3 rounded shadow space-y-2">

        <input v-model="local.title" class="w-full text-2xl m-0 font-bold" />

        <div class="grid grid-cols-2 gap-2">

            <div class="input border-0 p-0 m-0 col-span-1">
                <span class="icon-[solar--calendar-minimalistic-linear] text-base-content/80 my-auto me-1 size-4 shrink-0"></span>
                <flat-pickr
                    class="text-2 grow"
                    ref="flatPickrDate"
                    name="date"
                    placeholder="--"
                    v-model="local.date"
                    :config="flatPickrConfig.date"
                />
            </div>

            <div class="input border-0 p-0 m-0 col-span-1 flex items-center">
                <span class="icon-[solar--clock-square-broken] text-base-content/80 my-auto me-1 size-4 shrink-0"></span>
                <flat-pickr
                    class="basis-[50px] text-2 p-0"
                    ref="flatPickrTimeStart"
                    name="time"
                    placeholder="00:00"
                    v-model="local.startTime"
                    :config="flatPickrConfig.time.start"
                    @on-change="onTimeStartChange"
                />
                <span class="mx-2">-</span>
                <flat-pickr
                    class="basis-[50px] text-2 p-0"
                    ref="flatPickrTimeEnd"
                    name="time"
                    placeholder="00:00"
                    v-model="local.endTime"
                    :config="flatPickrConfig.time.end"
                    @on-change="onTimeEndChange"
                />
            </div>
        </div>

        <div class="flex justify-between items-center">

            <div class="flex items-center gap-1">
                <input type="checkbox" class="checkbox checkbox-primary" v-model="local.enabled"/>
                <label class="label-text text-base">Import</label>
            </div>

            <button class="btn btn-error" @click="$emit('delete')">Delete</button>
        </div>

    </div>
</template>

<script setup>
import { reactive, watch, ref } from "vue";
import flatPickr from 'vue-flatpickr-component';
import 'flatpickr/dist/flatpickr.css';

const model = defineModel();
const emit = defineEmits(['delete']);
const local = reactive({ ...model.value });

const flatPickrDate = ref(null);
const flatPickrTimeStart = ref(null);
const flatPickrTimeEnd = ref(null);

const flatPickrConfig = {
    date: {
        dateFormat: 'Y-m-d',
        altFormat: 'd/m/Y',
        altInput: true,
        monthSelectorType: 'static',
        allowInput: true
    },
    time: {
        start: {
            altFormat: 'H:i',
            dateFormat: 'H:i',
            altInput: true,
            enableTime: true,
            noCalendar: true,
            allowInput: true,
            time_24hr: true,
            clickOpens: false
        },
        end: {
            altFormat: 'H:i',
            dateFormat: 'H:i',
            altInput: true,
            enableTime: true,
            noCalendar: true,
            allowInput: true,
            time_24hr: true,
            clickOpens: false
        }
    }
}

function onTimeStartChange(selectedDates, dateStr, instance) {
    if(local.endTime) {
        const _start = dateStr.split(':');
        const _end = local.endTime.split(':');

        if(Number(_end[0]+_end[1]) < Number(_start[0]+_start[1])) {
            const d = new Date();
            d.setHours(Number(_start[0]) + 1);
            d.setMinutes(_start[1]);
            flatPickrTimeEnd.value.fp.setDate(d, true);
        }
    }
}

function onTimeEndChange(selectedDates, dateStr, instance) {
    if(local.startTime) {
        const _start = local.startTime.split(':');
        const _end = dateStr.split(':');

        if(Number(_end[0]+_end[1]) < Number(_start[0]+_start[1])) {
            const d = new Date();
            d.setHours(Number(_end[0]) - 1);
            d.setMinutes(_end[1]);
            flatPickrTimeStart.value.fp.setDate(d, true);
        }
    }
}

watch(local, () => {
    model.value = { ...local };
});

</script>
