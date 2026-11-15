import { createRouter, createWebHistory } from "vue-router";

import Home from "../pages/Home.vue";
import PrivacyPolicy from "../pages/PrivacyPolicy.vue";
import TermsOfService from "../pages/TermsOfService.vue";

const routes = [
    { path: "/", name: "home", component: Home },
    { path: "/privacy-policy", name: "privacy", component: PrivacyPolicy },
    { path: "/terms-of-service", name: "terms", component: TermsOfService }
];

const router = createRouter({
    // BASE_URL segue il `base` di Vite: '/' in sviluppo, '/e2c/' in produzione.
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

export default router;
