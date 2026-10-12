import {
    getAccessToken,
    getUser,
    setAuthSession,
    clearAll as clearStorage,
} from "@/services/tokenStorage.js";
import { isValidEmail } from "@/utils/validators.js";

/** @type {Set<(data: {isLoggedIn: boolean, user: object|null}) => void>} */
const listeners = new Set();

/**
 * Notify tất cả listeners + dispatch 'auth-changed' event.
 * Exported để authService.js dùng khi session thay đổi từ API response.
 *
 * @param {{isLoggedIn: boolean, user: object|null}} data
 */
export function notify(data) {
    window.dispatchEvent(new CustomEvent("auth-changed", { detail: data }));
    listeners.forEach((cb) => {
        try {
            cb(data);
        } catch (err) {
            console.error("auth listener error:", err);
        }
    });
}

// ======================================================
// CORE HELPERS
// ======================================================

function getInitialFromName(name) {
    if (!name) return "?";
    const trimmed = String(name).trim();
    return trimmed.charAt(0).toUpperCase() || "?";
}

function deriveNameFromEmail(email) {
    if (!email || typeof email !== "string") return "User";
    const local = email.split("@")[0];
    const clean = local.replace(/[^a-zA-Z0-9._-]/g, "");
    if (!clean) return "User";
    return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** @returns {{isLoggedIn: boolean, user: object|null}} */
function snapshot() {
    const token = getAccessToken();
    const user = getUser();
    return {
        isLoggedIn: !!token && !!user,
        user: user || null,
    };
}

// ======================================================
// PUBLIC API
// ======================================================

/** @returns {{isLoggedIn: boolean, user: object|null}} Snapshot auth state hiện tại. */
export function getAuth() {
    return snapshot();
}

/** @returns {boolean} true nếu user đã login. */
export function isLoggedIn() {
    return snapshot().isLoggedIn;
}

/**
 * @param {string} [loginPath="/auth/login"] - Path navigate khi chưa login
 * @param {string} [message] - Custom toast message (mặc định: LOGIN_REQUIRED)
 * @returns {boolean} true nếu đã login
 */
export function requireAuth(loginPath = "/auth/login", message = null) {
    if (isLoggedIn()) return true;

    // Lazy import tránh circular dep (state → router → state)
    import("@/libs/router.js").then(({ navigate }) => {
        navigate(loginPath);
    });
    import("@/libs/toast.js").then(({ toast }) => {
        import("@/utils/messages.js").then(({ MESSAGES }) => {
            toast.warning(message || MESSAGES.AUTH.LOGIN_REQUIRED);
        });
    });

    return false;
}

/**
 * @param {{ email: string, name?: string, password?: string }} payload
 */
export function login({ email, name } = {}) {
    if (!isValidEmail(email)) {
        throw new Error("Email không đúng định dạng!");
    }

    const userName =
        (name && String(name).trim()) || deriveNameFromEmail(email);
    const user = {
        email: email.trim(),
        name: userName,
        initial: getInitialFromName(userName),
        joinedAt: new Date().toISOString(),
    };
    // Mock token (real token lấy từ API response)
    const accessToken = "mock_access_" + Math.random().toString(36).slice(2);

    setAuthSession({ accessToken, refreshToken: null, user });
    notify(snapshot());
    return snapshot();
}

/** @deprecated MOCK register — alias of login. Dùng authService.registerRequest(). */
export function register(payload) {
    return login(payload);
}

/** Logout: clear storage + notify subscribers. */
export function logout() {
    clearStorage();
    notify({ isLoggedIn: false, user: null });
}

/**
 * Subscribe auth state changes.
 * @param {(data: {isLoggedIn: boolean, user: object|null}) => void} callback
 * @returns {() => void} unsubscribe
 */
export function onAuthChange(callback) {
    if (typeof callback !== "function") return () => {};
    listeners.add(callback);
    return () => listeners.delete(callback);
}

// ======================================================
// UI HELPER — applyAuthVisibility
// ======================================================

export function applyAuthVisibility() {
    const { isLoggedIn: loggedIn } = snapshot();

    // 1. data-show-when
    document.querySelectorAll("[data-show-when]").forEach((el) => {
        if (el.hasAttribute("data-dropdown-menu")) return;

        const showWhen = el.getAttribute("data-show-when");
        let shouldShow = false;

        if (showWhen === "logged-in") shouldShow = loggedIn;
        else if (showWhen === "logged-out") shouldShow = !loggedIn;
        else {
            console.warn(
                `data-show-when="${showWhen}" không hợp lệ. Chỉ chấp nhận "logged-in" hoặc "logged-out".`,
            );
            return;
        }

        el.classList.toggle("d-none", !shouldShow);
    });

    // 2. Fill user fields (data-user-name, data-user-initial, data-user-email)
    const user = getUser();
    fillUserField("[data-user-name]", user?.name);
    fillUserField("[data-user-initial]", user?.initial);
    fillUserField("[data-user-email]", user?.email);

    // 3. Update home links (Navigo SPA → path thuần "/")
    updateHomeLinks(loggedIn);
}

/** Update href cho [data-home-link] (Navigo SPA). */
function updateHomeLinks(loggedIn) {
    document.querySelectorAll("[data-home-link]").forEach((el) => {
        el.setAttribute("href", "/");
    });
    void loggedIn;
}

/** Fill textContent cho tất cả element match selector. */
function fillUserField(selector, value) {
    document.querySelectorAll(selector).forEach((el) => {
        if (value != null) el.textContent = value;
    });
}

/** Apply UI sync + subscribe. Gọi 1 lần ở init. */
export function initAuthUI() {
    applyAuthVisibility();
    return onAuthChange(() => applyAuthVisibility());
}
