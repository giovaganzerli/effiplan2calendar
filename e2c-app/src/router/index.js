import { createRouter, createWebHistory } from "vue-router";

import Home from "../pages/Home.vue";
import PrivacyPolicy from "../pages/PrivacyPolicy.vue";
import TermsOfService from "../pages/TermsOfService.vue";

const routes = [
    { path: "/", name: "home", component: Home },
    { path: "/privacy-policy", name: "privacy", component: PrivacyPolicy },
    { path: "/terms-of-service", name: "terms", component: TermsOfService },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
