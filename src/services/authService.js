// ======================================================
// AUTH SERVICE — Login / register / profile (API thật)
// ======================================================
//
// Phase 10.1: Wire API backend + throw AppError có `code` machine-readable.
//
// API SHAPE (verified Phase 10.1):
//   POST /auth/login        body: {email, password}
//                           200: { access_token, refresh_token, user: {id, name, email, created_at, updated_at} }
//                           400: { success: false, message: "Invalid credentials" }
//
//   POST /auth/register     body: {email, name, password, confirmPassword}
//                           200: { access_token, refresh_token, user }
//                           400: { success: false, message: "Email already in use" }
//                                hoặc { success: false, message: "Validation failed", errors: {confirmPassword: "Passwords do not match"} }
//
//   GET  /auth/me           200: { id, name, email, created_at, updated_at }
//                           401: empty body
//
//   PATCH /auth/me          body: {name, ...}
//                           200: { success: true, message: "Update profile successfuly" }
//
//   POST /auth/logout       ❌ NOT EXIST → chỉ clear local
//   POST /auth/change-password ❌ NOT FOUND → stub
//
// USER SHAPE MAPPING (UI expects):
//   { id, email, name, initial, joinedAt }
//
// ERROR HANDLING:
//   - Tất cả axios errors được map qua `mapApiError()` → throw AppError có `code`
//   - Page handlers chỉ cần switch theo `err.code` thay vì parse message thủ công.
//

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import {
    setAuthSession,
    setUser as setUserStorage,
    clearAll as clearStorage,
} from "@/services/tokenStorage.js";

import { notify } from "@/state/authState.js";
import { MESSAGES } from "@/utils/messages.js";

// ======================================================
// HELPERS
// ======================================================

function getInitialFromName(name) {
    if (!name) return "?";
    const trimmed = String(name).trim();
    return trimmed.charAt(0).toUpperCase() || "?";
}

/**
 * Map user từ API response (snake_case) → UI shape (camelCase + derived).
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
 * Lưu session + notify listeners.
 * @param {object} apiData - { access_token, refresh_token, user }
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

// ======================================================
// PUBLIC API
// ======================================================

/**
 * Đăng nhập.
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<{ isLoggedIn: boolean, user: object }>}
 * @throws {AppError} code: INVALID_CREDENTIALS | NETWORK_ERROR | TIMEOUT | SERVER_ERROR | ...
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
 * Đăng ký.
 * @param {{ email: string, name: string, password: string, confirmPassword: string }} payload
 * @returns {Promise<{ isLoggedIn: boolean, user: object }>}
 * @throws {AppError} code: EMAIL_TAKEN | PASSWORD_MISMATCH | VALIDATION | ...
 */
export async function registerRequest({ email, name, password, confirmPassword }) {
    try {
        // Backend yêu cầu confirmPassword trong body (verified Phase 10.1)
        const data = await api.post("/auth/register", {
            email,
            name,
            password,
            confirmPassword,
        });

        // Backend auto-login sau register → set session luôn
        const user = persistSession(data);
        return { isLoggedIn: true, user };
    } catch (err) {
        throw mapApiError(err, { defaultMessage: MESSAGES.AUTH.REGISTER_FAILED });
    }
}

/**
 * Đăng xuất.
 *
 * Theo docs F8 (https://youtube-music.f8team.dev/):
 *   DELETE /auth/logout
 *   Header: Authorization: Bearer <token>
 *   → 200 { success: true, message: "Logout successfuly" }
 *
 * - KHÔNG gửi body (docs không yêu cầu).
 * - Bearer header tự động gắn qua request interceptor (`api.js`).
 * - Best-effort: nếu API fail vẫn clear local + emit auth-changed
 *   để UI về trạng thái logged-out (user không bị "kẹt" trong app).
 */
export async function logoutRequest() {
    try {
        await api.delete("/auth/logout");
    } catch (err) {
        // Best-effort — log warning nhưng vẫn clear local để UX không kẹt
        console.warn("[authService.logout] API failed (best-effort):", err?.message || err);
    }
    clearStorage();
    notify({ isLoggedIn: false, user: null });
}

/**
 * Lấy profile (cần token).
 * @returns {Promise<object>} user object (UI shape)
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
 * Update profile (PATCH /auth/me).
 * @param {{ name?: string, email?: string }} updates
 * @returns {Promise<{ success: boolean, user: object }>}
 * @throws {AppError} code: EMAIL_TAKEN | VALIDATION | ...
 */
export async function updateProfile(updates) {
    try {
        await api.patch("/auth/me", updates);
        // Reload profile để sync UI với data server
        const user = await getProfile();
        return { success: true, user };
    } catch (err) {
        throw mapApiError(err, { defaultMessage: MESSAGES.AUTH.PROFILE_UPDATE_FAILED });
    }
}

/**
 * Đổi mật khẩu.
 *
 * Theo docs F8 (https://youtube-music.f8team.dev/):
 *   PATCH /auth/change-password
 *   Header: Authorization: Bearer <token>
 *   Body: { oldPassword, password, confirmPassword }
 *   → 200 { success: true, message: "Change password successfuly" }
 *   → 400 { success: false, message: "Old password is incorrect" }
 *
 * LƯU Ý:
 *   - Backend dùng key `password` cho new password (không phải `newPassword`).
 *   - Bearer header tự động gắn qua request interceptor (`api.js`).
 *   - 401 → interceptor tự refresh-token. Nếu refresh fail → force logout.
 *
 * @param {{ oldPassword: string, password: string, confirmPassword: string }} payload
 * @returns {Promise<{ success: boolean, message: string }>}
 * @throws {AppError} code: OLD_PASSWORD_WRONG | VALIDATION | UNAUTHORIZED | ...
 */
export async function changePassword({ oldPassword, password, confirmPassword }) {
    try {
        const res = await api.patch("/auth/change-password", {
            oldPassword,
            password,
            confirmPassword,
        });
        // Backend trả { success: true, message: "..." } — trả nguyên cho page handler
        return res ?? { success: true, message: MESSAGES.AUTH.CHANGE_PASSWORD_SUCCESS };
    } catch (err) {
        throw mapApiError(err, { defaultMessage: MESSAGES.AUTH.CHANGE_PASSWORD_FAILED });
    }
}
