/**
 * services/authService.js — Real auth API (login/register/logout/profile)
 *
 * Wire backend API + map snake_case → UI camelCase. Tất cả errors
 * được map qua `mapApiError()` → throw AppError có `code` machine-readable.
 *
 * API endpoints (verified Phase 10.1):
 *   POST   /auth/login             { email, password } → { access_token, refresh_token, user }
 *   POST   /auth/register          { email, name, password, confirmPassword }
 *   DELETE /auth/logout            (no body, Bearer header)
 *   GET    /auth/me                → { id, name, email, created_at, updated_at }
 *   PATCH  /auth/me                { name, ... }
 *   PATCH  /auth/change-password   { oldPassword, password, confirmPassword }
 *
 * User shape mapping (snake_case API → camelCase UI):
 *   API: { id, name, email, created_at, updated_at }
 *   UI:  { id, email, name, initial, joinedAt }
 *
 * Exports:
 *   - loginRequest(payload)        → POST /auth/login
 *   - registerRequest(payload)     → POST /auth/register
 *   - logoutRequest()              → DELETE /auth/logout + clear local
 *   - getProfile()                 → GET /auth/me
 *   - updateProfile(updates)       → PATCH /auth/me
 *   - changePassword(payload)      → PATCH /auth/change-password
 *
 * Consumed by:
 *   - `@/pages/auth/auth.js` (login/register page handlers)
 *   - `@/pages/profile/profile.js` (getProfile + updateProfile)
 *   - `@/pages/change-password/change-password.js` (changePassword)
 *   - `@/state/authState.js` (notify() — broadcast session change)
 *   - `@/libs/api.js` forceLogout() (gọi logoutRequest + clear)
 */

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import {
    setAuthSession,
    setUser as setUserStorage,
    clearAll as clearStorage,
} from "@/services/tokenStorage.js";

import { notify } from "@/state/authState.js";
import { MESSAGES } from "@/utils/messages.js";
/** Lấy chữ cái đầu của name (uppercase) làm avatar fallback. */
function getInitialFromName(name) {
    if (!name) return "?";
    const trimmed = String(name).trim();
    return trimmed.charAt(0).toUpperCase() || "?";
}

/**
 * Map user từ API (snake_case) → UI shape (camelCase + derived fields).
 * @param {object} apiUser - { id, name, email, created_at, updated_at }
 * @returns {object} - { id, email, name, initial, joinedAt }
 */
function mapUserFromApi(apiUser = {}) {
    return {
        id: apiUser.id,
        email: apiUser.email,
        name: apiUser.name,
        initial: getInitialFromName(apiUser.name),
        joinedAt: apiUser.created_at || apiUser.updated_at || new Date().toISOString(),
    };
}

/**
 * Lưu session vào storage + notify listeners.
 * @param {{access_token: string, refresh_token: string, user: object}} apiData
 * @returns {object} user (UI shape)
 */
function persistSession(apiData) {
    const user = mapUserFromApi(apiData.user);
    setAuthSession({
        accessToken: apiData.access_token,
        refreshToken: apiData.refresh_token,
        user,
    });
    notify({ isLoggedIn: true, user });
    return user;
}
/**
 * Đăng nhập.
 * @param {{email: string, password: string}} payload
 * @returns {Promise<{isLoggedIn: boolean, user: object}>}
 * @throws {AppError} code: INVALID_CREDENTIALS | NETWORK_ERROR | TIMEOUT | ...
 */
export async function loginRequest({ email, password }) {
    try {
        // axios tự unwrap res.data → data là { access_token, refresh_token, user }
        const data = await api.post("/auth/login", { email, password });
        const user = persistSession(data);
        return { isLoggedIn: true, user };
    } catch (err) {
        throw mapApiError(err, { defaultMessage: MESSAGES.AUTH.LOGIN_FAILED });
    }
}

/**
 * Đăng ký. Backend auto-login sau register nên set session luôn.
 * @param {{email: string, name: string, password: string, confirmPassword: string}} payload
 * @returns {Promise<{isLoggedIn: boolean, user: object}>}
 * @throws {AppError} code: EMAIL_TAKEN | PASSWORD_MISMATCH | VALIDATION | ...
 */
export async function registerRequest({ email, name, password, confirmPassword }) {
    try {
        const data = await api.post("/auth/register", {
            email,
            name,
            password,
            confirmPassword,
        });
        const user = persistSession(data);
        return { isLoggedIn: true, user };
    } catch (err) {
        throw mapApiError(err, { defaultMessage: MESSAGES.AUTH.REGISTER_FAILED });
    }
}

/**
 * Đăng xuất. Best-effort: nếu API fail vẫn clear local + emit auth-changed
 * (user không bị "kẹt" trong app).
 *
 * Docs F8: DELETE /auth/logout, no body, Bearer header.
 */
export async function logoutRequest() {
    try {
        await api.delete("/auth/logout");
    } catch (err) {
        console.warn("[authService.logout] API failed (best-effort):", err?.message || err);
    }
    clearStorage();
    notify({ isLoggedIn: false, user: null });
}

/**
 * Lấy profile hiện tại (cần token).
 * @returns {Promise<object>} user (UI shape)
 * @throws {AppError} code: UNAUTHORIZED | ...
 */
export async function getProfile() {
    try {
        const data = await api.get("/auth/me");
        const user = mapUserFromApi(data);
        setUserStorage(user);
        notify({ isLoggedIn: true, user });
        return user;
    } catch (err) {
        throw mapApiError(err, { defaultMessage: MESSAGES.AUTH.PROFILE_UPDATE_FAILED });
    }
}

/**
 * Update profile (PATCH /auth/me) → reload lại qua getProfile() để sync UI.
 * @param {{name?: string, email?: string}} updates
 * @returns {Promise<{success: boolean, user: object}>}
 * @throws {AppError} code: EMAIL_TAKEN | VALIDATION | ...
 */
export async function updateProfile(updates) {
    try {
        await api.patch("/auth/me", updates);
        const user = await getProfile();
        return { success: true, user };
    } catch (err) {
        throw mapApiError(err, { defaultMessage: MESSAGES.AUTH.PROFILE_UPDATE_FAILED });
    }
}

/**
 * Đổi mật khẩu.
 *
 * Docs F8: PATCH /auth/change-password
 *   Body: { oldPassword, password, confirmPassword }  (key `password` cho new, không phải `newPassword`)
 *   → 200 { success: true, message: "..." }
 *   → 400 { success: false, message: "Old password is incorrect" }
 *
 * 401 → interceptor tự refresh-token. Nếu refresh fail → force logout.
 *
 * @param {{oldPassword: string, password: string, confirmPassword: string}} payload
 * @returns {Promise<{success: boolean, message: string}>}
 * @throws {AppError} code: OLD_PASSWORD_WRONG | VALIDATION | UNAUTHORIZED | ...
 */
export async function changePassword({ oldPassword, password, confirmPassword }) {
    try {
        const res = await api.patch("/auth/change-password", {
            oldPassword,
            password,
            confirmPassword,
        });
        return res ?? { success: true, message: MESSAGES.AUTH.CHANGE_PASSWORD_SUCCESS };
    } catch (err) {
        throw mapApiError(err, { defaultMessage: MESSAGES.AUTH.CHANGE_PASSWORD_FAILED });
    }
}
