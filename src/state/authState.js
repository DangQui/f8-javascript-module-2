/**
 * state/authState.js — Centralized auth state + UI sync
 *
 * Layer: state (pure state + subscribe API, no DOM).
 *
 * Exports:
 *   - notify(data)               → broadcast auth state change (cho service dùng)
 *   - getAuth()                  → { isLoggedIn, user }
 *   - isLoggedIn()               → boolean
 *   - requireAuth(path?, msg?)   → page-level guard: navigate login nếu chưa login
 *   - login(payload)             → MOCK login (giữ backward compat)
 *   - register(payload)          → MOCK register (alias of login)
 *   - logout()                   → clear session
 *   - onAuthChange(callback)     → subscribe, returns unsubscribe
 *   - applyAuthVisibility()      → sync DOM với auth state
 *   - initAuthUI()               → apply + subscribe (cho layout init)
 *
 * Consumed by:
 *   - `@/services/authService.js` (real login/register/logout) → gọi notify()
 *   - `@/layout/header.js` đọc isLoggedIn() để chọn partial
 *   - `@/layout/init.js` gọi initAuthUI() để wire UI sync
 *   - Mọi page cần guard (library, profile, change-password) → requireAuth()
 *
 * Tách rời:
 *   - state: chỉ quan tâm "đã login / chưa, user là ai"
 *   - storage (`tokenStorage.js`): lưu/đọc localStorage
 *   - service (`authService.js`): gọi API login/register thật
 */

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
    window.dispatchEvent(
        new CustomEvent("auth-changed", { detail: data })
    );
    listeners.forEach((cb) => {
        try { cb(data); } catch (err) { console.error("auth listener error:", err); }
    });
}
/** Lấy chữ cái đầu của name (uppercase) làm avatar fallback. */
function getInitialFromName(name) {
    if (!name) return "?";
    const trimmed = String(name).trim();
    return trimmed.charAt(0).toUpperCase() || "?";
}

/** Derive display name từ email nếu user không truyền name. */
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
/** @returns {{isLoggedIn: boolean, user: object|null}} Snapshot auth state hiện tại. */
export function getAuth() {
    return snapshot();
}

/** @returns {boolean} true nếu user đã login. */
export function isLoggedIn() {
    return snapshot().isLoggedIn;
}

/**
 * Page-level auth guard. Trả về `true` nếu đã login, ngược lại navigate
 * sang login + show toast guard.
 *
 * Port từ base.js:5748/5826/5831 — pattern: check auth trước khi render.
 * Dùng isLoggedIn() (sync) thay vì API getProfile (async) vì:
 *   - isLoggedIn() đồng bộ, không cần network
 *   - API getProfile cũng được gọi bên trong page handler
 *   - 401 interceptor (api.js) tự force logout khi token hết hạn
 *
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
 * MOCK login — giữ backward compat cho code cũ.
 * Phase 10+ chuyển sang authService.loginRequest() (real API).
 *
 * @param {{ email: string, name?: string, password?: string }} payload
 */
export function login({ email, name } = {}) {
    if (!isValidEmail(email)) {
        throw new Error("Email không đúng định dạng!");
    }

    const userName = (name && String(name).trim()) || deriveNameFromEmail(email);
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
/**
 * Sync DOM với auth state.
 *   1. data-show-when="logged-in/out" → show/hide element
 *   2. data-user-{name,initial,email} → fill user info
 *   3. Update home links (data-home-link → "/")
 */
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
                `data-show-when="${showWhen}" không hợp lệ. Chỉ chấp nhận "logged-in" hoặc "logged-out".`
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
