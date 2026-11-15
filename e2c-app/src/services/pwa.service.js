import { ref } from 'vue';

// Shared with the update banner so a reload cannot interrupt OCR or Calendar.
export const appBusy = ref(false);
