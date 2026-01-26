let accessToken = null;
let tokenClient = null;
let googleClientId = null;
let userProfile = null;

/* -------------------------------------------------------------
   1. Carica Google Identity Services
------------------------------------------------------------- */
export function initGoogle(clientId) {
    googleClientId = clientId;

    return new Promise((resolve) => {
        if (window.google) return resolve();

        const s = document.createElement("script");
        s.src = "https://accounts.google.com/gsi/client";
        s.async = true;
        s.defer = true;
        s.onload = resolve;
        document.head.appendChild(s);
    });
}

/* -------------------------------------------------------------
   2. Inizializza OAuth2 Token Client
------------------------------------------------------------- */
function initTokenClient() {
    if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: "https://www.googleapis.com/auth/calendar.app.created https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.calendarlist.readonly",
            callback: (response) => {
                accessToken = response.access_token;
                localStorage.setItem("googleLogged", "1");
            },
        });
    }
}

/* -------------------------------------------------------------
   3. Login manuale (popup la prima volta)
------------------------------------------------------------- */
export function loginWithGoogle() {
    initTokenClient();

    return new Promise((resolve) => {
        tokenClient.requestAccessToken({ prompt: "consent" });

        const wait = setInterval(async () => {
            if (accessToken) {
                clearInterval(wait);
                userProfile = await fetchUserProfile(accessToken);
                resolve(userProfile);
            }
        }, 50);
    });
}

/* -------------------------------------------------------------
   4. Login automatico silenzioso (nessun popup)
------------------------------------------------------------- */
export function autoLoginGoogle() {
    initTokenClient();

    return new Promise((resolve, reject) => {
        tokenClient.requestAccessToken({ prompt: "" });

        let tries = 0;
        const wait = setInterval(async () => {
            tries++;

            if (accessToken) {
                clearInterval(wait);
                userProfile = await fetchUserProfile(accessToken);
                resolve(userProfile);
            }

            if (tries > 30) {
                clearInterval(wait);
                reject("no_session");
            }
        }, 150);
    });
}

/* -------------------------------------------------------------
   LOGOUT
------------------------------------------------------------- */
export function logoutWithGoogle() {
    // Rimuovi token in memoria
    accessToken = null;

    // Rimuovi profilo utente
    userProfile = null;

    // Rimuovi flag di login automatico
    localStorage.removeItem("googleLogged");

    // Se esiste Google Identity, disconnetti l'auto-select
    try {
        if (window.google && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
        }
    } catch (e) {
        console.warn("Google logout warning:", e);
    }
}

/* -------------------------------------------------------------
   5. Recupera profilo utente (Google APIs)
------------------------------------------------------------- */
async function fetchUserProfile(token) {
    const res = await fetch(
        "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    return await res.json();
}

/* -------------------------------------------------------------
   Google Calendar API
------------------------------------------------------------- */

export async function getUserCalendars() {
    if (!accessToken) {
        throw new Error("Missing Google access token");
    }

    const response = await fetch(
        "https://www.googleapis.com/calendar/v3/users/me/calendarList",
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("Google Calendar API ERROR:", err);
        throw new Error("Failed to load Google calendars");
    }

    const data = await response.json();
    return data.items || [];
}

export async function createUserCalendar(summary, description = "") {
    if (!accessToken) {
        throw new Error("Missing Google access token");
    }

    if (!summary || summary.trim() === "") {
        throw new Error("Calendar summary is required");
    }

    const body = {
        summary,
        description
    };

    const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        }
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        console.error("Google Calendar API ERROR:", err);
        throw new Error("Failed to create calendar");
    }

    return await response.json();
}

/* -------------------------------------------------------------
   Helpers
------------------------------------------------------------- */
export function getToken() {
    return accessToken;
}

export function getUserProfile() {
    return userProfile;
}

export function hasLoggedBefore() {
    return localStorage.getItem("googleLogged") === "1";
}
