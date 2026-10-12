// ======================================================
// TOKEN STORAGE — Wrapper quanh localStorage
// ======================================================

import { STORAGE_KEYS } from "@/utils/constants.js";

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

function writeAll({ accessToken, refreshToken, user }) {
    try {
        if (accessToken != null)
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (refreshToken != null)
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        if (user != null)
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } catch (err) {
        console.warn("tokenStorage writeAll failed:", err);
    }
}

// ======================================================
// PUBLIC API
// ======================================================

export function getAccessToken() {
    return readAll().accessToken;
}

export function setAccessToken(token) {
    try {
        if (token != null)
            localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
        else localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {}
}

export function getRefreshToken() {
    return readAll().refreshToken;
}

export function setRefreshToken(token) {
    try {
        if (token != null)
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
        else localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {}
}

export function getUser() {
    return readAll().user;
}

export function setUser(user) {
    try {
        if (user != null)
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        else localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {}
}

export function setAuthSession({ accessToken, refreshToken, user }) {
    writeAll({ accessToken, refreshToken, user });
}

export function clearAll() {
    try {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
    } catch {}
}
