/**
 * services/tokenStorage.js — localStorage wrapper cho auth tokens
 *
 * Tách phần localStorage auth ra module riêng để:
 *   1. Tái sử dụng ở nhiều nơi (services + state)
 *   2. Dễ test (mock localStorage)
 *   3. Tránh circular dep giữa state ↔ service
 *
 * Storage shape (3 keys riêng biệt trong localStorage):
 *   - ACCESS_TOKEN  → string JWT
 *   - REFRESH_TOKEN → string JWT
 *   - USER          → JSON: { id, email, name, initial, joinedAt, ... }
 *
 * Exports:
 *   - getAccessToken() / setAccessToken(token?)
 *   - getRefreshToken() / setRefreshToken(token?)
 *   - getUser() / setUser(user?)
 *   - setAuthSession({accessToken, refreshToken, user}) → write all 3
 *   - clearAll() → xóa cả 3 (logout)
 *
 * Consumed by:
 *   - `@/libs/api.js` đọc/ghi tokens cho Authorization + refresh interceptor
 *   - `@/state/authState.js` đọc user + setAuthSession khi login
 *   - `@/services/authService.js` set session sau khi login/register API success
 */

import { STORAGE_KEYS } from "@/utils/constants.js";

/** @returns {{accessToken: string|null, refreshToken: string|null, user: object|null}} */
function readAll() {
    try {
        return {
            accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
            refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
            user: JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || "null"),
        };
    } catch {
        return { accessToken: null, refreshToken: null, user: null };
    }
}

/**
 * Ghi nhiều keys cùng lúc (chỉ ghi những field != null).
 * @param {{accessToken?: string, refreshToken?: string, user?: object}} payload
 */
function writeAll({ accessToken, refreshToken, user }) {
    try {
        if (accessToken != null) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (refreshToken != null) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        if (user != null) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (err) {
        console.warn("tokenStorage writeAll failed:", err);
    }
}
/** @returns {string|null} */
export function getAccessToken() {
    return readAll().accessToken;
}

/**
 * Set access token. Pass null để xóa.
 * @param {string|null} token
 */
export function setAccessToken(token) {
    try {
        if (token != null) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        else localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {}
}

/** @returns {string|null} */
export function getRefreshToken() {
    return readAll().refreshToken;
}

/** @param {string|null} token */
export function setRefreshToken(token) {
    try {
        if (token != null) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
        else localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {}
}

/** @returns {object|null} */
export function getUser() {
    return readAll().user;
}

/** @param {object|null} user */
export function setUser(user) {
    try {
        if (user != null) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        else localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {}
}

/** Ghi cả 3 keys cùng lúc (dùng cho login/register success). */
export function setAuthSession({ accessToken, refreshToken, user }) {
    writeAll({ accessToken, refreshToken, user });
}

/** Xóa cả 3 keys (logout). */
export function clearAll() {
    try {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {}
}
