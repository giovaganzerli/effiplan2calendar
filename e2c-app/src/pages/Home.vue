<template>
    <div class="p-4 space-y-6">

        <h1 class="text-2xl text-[9vw] text-center"><b>Effiplan2Calendar</b></h1>
        <hr>

        <!-- Step indicators -->
        <div class="flex justify-between text-sm text-gray-600">
            <span class="cursor-pointer hover:underline" :class="{'font-bold text-primary underline': formData.step === 1}" @click="goToStep(1)">Login</span> -
            <span class="cursor-pointer hover:underline" :class="{'font-bold text-primary underline': formData.step === 2}" @click="(formData.step > 2 && formData.step < 4) ? goToStep(2) : false">Upload</span> -
            <span class="cursor-pointer hover:underline" :class="{'font-bold text-primary underline': formData.step === 3}" @click="(formData.step > 3 && formData.step < 4) ? goToStep(3) : false">Events</span> -
            <span class="cursor-pointer hover:underline" :class="{'font-bold text-primary underline': formData.step === 4}">Sync</span>
        </div>

        <!-- STEP 1 -->
        <div v-if="formData.step === 1" class="space-y-4">

            <!-- UTENTE LOGGATO -->
            <div v-if="formData.user" class="space-y-4">
                <p class="mb-2"><b>Your Google Account:</b> (<button class="text-error hover:underline" @click="logout">Logout?</button>)</p>
                <div class="flex items-center gap-3 rounded p-3 shadow">
                    <img :src="formData.user.picture" class="w-10 h-10 rounded-full" />
                    <div>
                        <p class="font-semibold">{{ formData.user.name }}</p>
                        <p class="text-sm text-gray-500">{{ formData.user.email }}</p>
                    </div>
                </div>

                <CalendarSelector
                    v-model="formData.calendar.id"
                    @on-selected="onCalendarSelected"
                />

                <div class="w-full border-2 border-gray-600 rounded-2xl p-4 bg-gray-800">
                    <p v-for="(log, i) in formData.calendar.logs" :key="'log-'+ i">{{ log }}</p>
                </div>
            </div>

            <!-- UTENTE NON LOGGATO -->
            <div v-else>
                <p class="mb-2"><b>Your account:</b></p>
                <router-link
                    to="/request-access"
                    class="w-full btn btn-warning p-3 rounded mb-2"
                >
                    1. Request Access
                </router-link>
                <button
                    @click="loginManual"
                    class="w-full btn btn-primary p-3 rounded"
                >
                    2. Login with Google
                </button>
            </div>

            <div class="fixed w-full bottom-0 left-0 p-4 bg-black">
                <button
                    class="w-full btn btn-success p-3 rounded"
                    :disabled="!formData.calendar.id"
                    @click="goToStep(2)"
                >
                    Next >
                </button>
            </div>

        </div>

        <!-- STEP 2 -->
        <div v-if="formData.step===2" class="space-y-4">
            <p class="mb-5"><b>Upload/Take a picture:</b></p>

            <div class="select-floating">
                <select
                    id="select-file_input-capture"
                    class="select"
                    v-model="formData.file.source"
                    aria-label="floating label">
                    <option value="">Select from gallery</option>
                    <option value="enviroment">Capture with camera</option>
                </select>
                <label class="select-floating-label" for="select-file_input-capture">From where you want upload?</label>
            </div>

            <input
                v-if="formData.file.source==='enviroment'"
                class="input"
                type="file"
                accept="image/*"
                capture="environment"
                aria-label="file-input"
                @change="handleFile" />
            <input
                v-else
                class="input"
                type="file"
                accept="image/*"
                aria-label="file-input"
                @change="handleFile" />

            <div v-if="formData.file.obj" class="w-full border-dashed border-2 border-gray-600 rounded-2xl p-4 text-center bg-gray-800">
                <img :src="formData.file.preview" class="max-h-[150px] inline-block" />
            </div>

            <div class="fixed w-full bottom-0 left-0 p-4 bg-black">
                <button
                    class="w-full btn btn-success p-3 rounded"
                    @click="goToStep(3)"
                >
                    Next >
                </button>
            </div>
        </div>

        <!-- STEP 3 -->
        <div v-if="formData.step===3" class="space-y-4 mb-[90px]">

            <div v-if="formData.file.obj" class="w-full border-dashed border-2 border-gray-600 rounded-2xl p-4 text-center bg-gray-800">
                <img :src="formData.file.preview" class="max-h-[150px] inline-block" />
            </div>

            <div v-if="formData.processing.file">- ANALYZING IMAGE...</div>

            <div v-else>
                <hr class="mb-3 border-dashed border-[0.5px] border-gray-500">
                <div class="select-floating">
                    <select class="select select-xs max-w-sm" v-model="formData.calendar.reminders">
                        <option v-for="(opt, i) in appSettings.CALENDAR_REMINDER" :key="'remind-'+ i" :value="opt.value" :selected="i===0">{{ opt.label }}</option>
                    </select>
                    <label class="select-floating-label">Events Notification</label>
                </div>
                <hr class="mt-3 border-dashed border-[0.5px] border-gray-500">

                <EventRow
                    v-for="(ev,i) in formData.events"
                    :key="ev.id"
                    v-model="formData.events[i]"
                    @delete="removeEvent(i)"
                />
            </div>

            <div class="fixed w-full bottom-0 left-0 p-4 bg-black">
                <div class="grid grid-cols-2 gap-2">
                    <button class="btn btn-primary col-span-1 py-2 rounded"
                            @click="addEvent"
                            :disabled="formData.processing.file">
                        + Add Events
                    </button>

                    <button class="btn btn-success col-span-1 py-3 rounded"
                            @click="syncEvents"
                            :disabled="formData.processing.file">
                        Sync!
                    </button>
                </div>
            </div>
        </div>

        <!-- STEP 4 -->
        <div v-if="formData.step===4">

            <br>
            <div v-if="formData.processing.events" class="text-center">Syncing Events...</div>

            <div v-else class="space-y-6">
                <p class="text-success"><b>Imported Events:</b> {{formData.created.success.length}}</p>
                <div class="w-full max-h-[20vh] overflow-y-auto border-2 border-gray-600 rounded-2xl p-4 bg-gray-800">
                    <vue-json-pretty :data="formData.created.success"/>
                </div>
                <p class="text-error"><b>With Error:</b> {{formData.created.error.length}}</p>
                <div class="w-full max-h-[20vh] overflow-y-auto border-2 border-gray-600 rounded-2xl p-4 bg-gray-800">
                    <vue-json-pretty :data="formData.created.error"/>
                </div>

                <div class="fixed w-full bottom-0 left-0 p-4 bg-black">
                    <div class="grid grid-cols-2 gap-2">
                        <button class="btn btn-success col-span-2 py-2 rounded"
                                @click="goToStep(2, true)">
                            <span class="icon-[solar--refresh-linear] text-base-content/80 my-auto me-1 size-4 shrink-0"></span>
                            New Screenshot!
                        </button>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import CalendarSelector from "../components/CalendarSelector.vue";
import EventRow from "../components/EventRow.vue";

import {
    getToken,
    initGoogle,
    autoLoginGoogle,
    loginWithGoogle,
    logoutWithGoogle,
    hasLoggedBefore,
    getUserProfile,
    getUserCalendars,
    createUserCalendar
} from "../services/google.service.js";

import { parseImage } from "../services/ocr.service.js";

import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

const appSettings = {
    CALENDAR_NAME: 'EFFIPLAN',
    CALENDAR_REMINDER: [
        { label: 'Default', value: 'default' },
        { label: 'None', value: 'none' },
        { label: '30min', value: 30 },
        { label: '1h', value: 60 },
        { label: '4h', value: 240 },
        { label: '1g', value: 1440 }
    ]
};

const formData = ref({
    step: 1,
    user: null,
    calendar: {
        id: '',
        obj: {},
        logs: [],
        reminders: 'default'
    },
    file: {
        obj: null,
        preview: null,
        source: ''
    },
    processing: {
        file: false,
        events: false
    },
    events: [],
    created: {
        success: [],
        error: [],
    }
});

onMounted(async () => {
    await initGoogle("584576150276-o3ruk12imhutt12c83q2gv5e54vn7690.apps.googleusercontent.com");
});

async function loginManual() {

    if (hasLoggedBefore()) {
        try {
            await autoLoginGoogle();
            formData.value.user = getUserProfile();
            await initUserCalendar();
        } catch {
            await loginWithGoogle();
            formData.value.user = getUserProfile();
            await initUserCalendar();
        }
    } else {
        await loginWithGoogle();
        formData.value.user = getUserProfile();
        await initUserCalendar();
    }
}

function logout() {
    logoutWithGoogle();
    initData(['all']);
}

async function initUserCalendar() {

    formData.value.calendar.logs.push('- Searching for "EFFIPLAN" calendar...');

    const token = getToken();
    const calendars = await getUserCalendars();
    let calendar = calendars.filter((e) => e.summary === appSettings.CALENDAR_NAME);

    if(!calendar.length) {

        formData.value.calendar.logs.push('- No "EFFIPLAN" calendar found :(');
        formData.value.calendar.logs.push('- Creating calendar...');

        calendar = await createUserCalendar(appSettings.CALENDAR_NAME);
        formData.value.calendar.id = calendar.id;
        formData.value.calendar.obj = calendar;

        formData.value.calendar.logs.push('- Calendar created succesfully!');
        formData.value.calendar.logs.push('- Well done :)');

        setTimeout(() => goToStep(2), 500);

    } else {

        formData.value.calendar.logs.push('- "EFFIPLAN" calendar found!');
        formData.value.calendar.logs.push('- Well done :)');

        formData.value.calendar.id = calendar[0].id;
        formData.value.calendar.obj = calendar[0];

        setTimeout(() => goToStep(2), 500);
    }
}

function initData(type = []) {

    if(type.includes('user') || type.includes('all')) {
        formData.value.user = null;
    }
    if(type.includes('calendar') || type.includes('all')) {
        formData.value.calendar.id = '';
        formData.value.calendar.obj = {};
        formData.value.calendar.logs = [];
        formData.value.calendar.reminders = 'default';
    }
    if(type.includes('file') || type.includes('all')) {
        formData.value.file = {
            obj: null,
            preview: null,
            source: ''
        };
    }
    if(type.includes('processing') || type.includes('all')) {
        formData.value.processing = {
            file: false,
            events: false
        };
    }
    if(type.includes('events') || type.includes('all')) {
        formData.value.events = [];
    }
    if(type.includes('created') || type.includes('all')) {
        formData.value.created = {
            success: [],
            error: [],
        };
    }
}

function goToStep(n, init=false) {
    if(formData.value.processing.file || formData.value.processing.file) return;

    formData.value.step = n;
    if(init) initData(['file', 'processing', 'events', 'created']);
    if(n === 3 && formData.value.file.obj && !formData.value.events.length) processingFile();
}

function onCalendarSelected(cal) {
    formData.value.calendar.obj = cal;
    goToStep(2);
}

function handleFile(e) {
    formData.value.file.obj = e.target.files[0];
    formData.value.file.preview = URL.createObjectURL(formData.value.file.obj);
    initData(['events'])
}

async function processingFile() {
    formData.value.processing.file = true;
    formData.value.events = await parseImage(formData.value.file.obj);
    formData.value.processing.file = false;
}

function removeEvent(i) {
    formData.value.events.splice(i, 1);
}

function addEvent() {
    formData.value.events.unshift({
        id: crypto.randomUUID(),
        title: "V-GENERAL",
        date: "",
        startTime: "",
        endTime: "",
        enabled: true
    });
}

async function syncEvents() {

    formData.value.processing.events = true;
    goToStep(4);

    const token = getToken();

    if (!token) {
        alert("You must login first.");
        goToStep(1);
        return;
    }

    const calendar = formData.value.calendar.obj;
    if (!calendar || !calendar.id) {
        alert("Please select a calendar.");
        goToStep(1);
        return;
    }

    const calId = calendar.id;

    for (const ev of formData.value.events) {
        if (!ev.enabled) continue; // skip non selezionati

        try {
            const googleEvent = buildGoogleEvent(ev);

            const res = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(googleEvent)
                }
            );

            if (!res.ok) {
                const errMsg = await res.text();
                console.error("Errore creazione evento:", errMsg);
                ev.error = errMsg;
                formData.value.created.error.push(ev);
                continue;
            }

            formData.value.created.success.push(googleEvent);

        } catch (err) {
            console.error("Errore sync:", err);
            formData.value.created.error.push(ev);
        }
    }

    formData.value.processing.events = false;
}

function buildGoogleEvent(ev) {
    const _ev = {
        summary: ev.title || "Evento",
        start: {
            dateTime: `${ev.date}T${ev.startTime}:00`,
            timeZone: "Europe/Rome"
        },
        end: {
            dateTime: `${ev.date}T${ev.endTime}:00`,
            timeZone: "Europe/Rome"
        },
        reminders: {
            useDefault: (formData.value.calendar.reminders === 'default'),
            overrides: []
        }
    };

    if(!formData.value.calendar.reminders!=='none' && formData.value.calendar.reminders !== 'default') {
        _ev.reminders.overrides = [{
            method: "popup",
            minutes: Number(formData.value.calendar.reminders)
        }];
    }

    return _ev;
}
</script>
