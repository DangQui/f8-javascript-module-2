/**
 * api.js — Axios instance + interceptors + auto refresh token
 *
 * Centralized HTTP client cho toàn bộ services. Wire axios với 2 interceptor:
 *   - Request: attach Authorization header (trừ _skipAuth routes)
 *   - Response: unwrap res.data + auto refresh-token on 401
 *
 * Exports:
 *   - `api`         → Axios instance dùng trong `@/services/*`
 *   - `api.default` → same instance (backward compat)
 *
 * Consumed by:
 *   - `@/services/*.js` — mọi HTTP call đều qua `api`
 *   - `@/services/authService.js` set `_skipAuth: true` cho login/register/refresh
 *
 * Response shape (backend trả snake_case):
 *   { access_token, refresh_token, user: { id, name, email, created_at, updated_at } }
 *   → Auth service tự unwrap + map `created_at` → `joinedAt` cho UI.
 *
 * Refresh token flow:
 *   1. Request → 401 (token expired)
 *   2. POST /auth/refresh-token với body { refreshToken }
 *   3. Response 200: lưu access_token + refresh_token mới
 *   4. Retry original request với token mới
 *   5. Nếu refresh fail → forceLogout() (clearStorage + SPA navigate /auth/login)
 *
 * Lưu ý:
 *   - Vite dev server có thể cần proxy tránh CORS — đã verify OK (backend CORS *).
 *   - Refresh dùng `axios.post` gốc (không qua instance `api`) tránh infinite loop.
 *   - `isRefreshing` + `refreshQueue` đảm bảo chỉ 1 refresh request chạy cùng lúc,
 *     các request 401 khác queue lại và retry khi refresh xong.
 */

import axios from "axios";

import { ENV } from "@/config/env.js";
import { API_BASE_URL } from "@/utils/constants.js";
import {
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
    clearAll as clearStorage,
} from "@/services/tokenStorage.js";
import { MESSAGES } from "@/utils/messages.js";
import { toast } from "@/libs/toast.js";

/** Axios instance dùng trong mọi service. */
export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: ENV.API_TIMEOUT,
    headers: { "Content-Type": "application/json" },
});

/**
 * Request interceptor: attach `Authorization: Bearer <token>` header
 * cho mọi request — trừ khi caller set `_skipAuth: true` (login/register/refresh).
 */
api.interceptors.request.use(
    (config) => {
        // Skip Authorization cho /auth/refresh-token (gửi refreshToken trong body)
        // và /auth/login, /auth/register (chưa có token)
        if (config._skipAuth) return config;

        const token = getAccessToken();
        if (token) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (err) => Promise.reject(err)
);

// Refresh state — đảm bảo chỉ 1 refresh request chạy 1 lúc.
let isRefreshing = false;
/** @type {Array<{resolve, reject, config}>} Queue các request 401 đang chờ refresh xong. */
let refreshQueue = [];

/**
 * Resolve/reject tất cả request trong queue sau khi refresh xong.
 * Nếu refresh thành công → set Authorization mới rồi retry request.
 * Nếu refresh fail → reject tất cả.
 */
function processQueue(error, token = null) {
    refreshQueue.forEach(({ resolve, reject, config }) => {
        if (error) {
            reject(error);
        } else {
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }
            resolve(api(config));
        }
    });
    refreshQueue = [];
}

/**
 * Gọi /auth/refresh-token bằng axios gốc (không qua instance `api`)
 * để tránh infinite loop và skip Authorization header.
 * @returns {Promise<{access_token: string, refresh_token: string}>}
 */
async function performRefresh() {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        throw new Error("No refresh token available");
    }
    const res = await axios.post(
        `${API_BASE_URL}/auth/refresh-token`,
        { refreshToken },
        {
            timeout: ENV.API_TIMEOUT,
            headers: { "Content-Type": "application/json" },
            _skipAuth: true,
        }
    );
    return res.data; // { access_token, refresh_token }
}

/**
 * Response interceptor:
 *   - Success: unwrap `res.data` (services nhận data trực tiếp).
 *   - 401: thử refresh token 1 lần, retry request. Fail → forceLogout.
 */
api.interceptors.response.use(
    (res) => {
        // Unwrap res.data — services gọi `await api.get(...)` nhận data trực tiếp
        return res.data;
    },
    async (err) => {
        const { response, config } = err;

        // Không phải 401 hoặc request đã retry rồi → reject thẳng
        if (response?.status !== 401 || config?._retry || config?._skipAuth) {
            return Promise.reject(err);
        }

        // Không có refresh token → force logout
        if (!getRefreshToken()) {
            forceLogout();
            return Promise.reject(err);
        }

        // Nếu đang refresh → queue request này (sẽ retry khi refresh xong)
        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                refreshQueue.push({ resolve, reject, config });
            });
        }

        // Bắt đầu refresh
        config._retry = true;
        isRefreshing = true;

        try {
            const data = await performRefresh();
            const newAccess = data.access_token;
            const newRefresh = data.refresh_token;

            if (!newAccess) {
                throw new Error("Refresh response missing access_token");
            }

            // Lưu token mới
            setAccessToken(newAccess);
            if (newRefresh) setRefreshToken(newRefresh);

            // Retry original request + queue
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${newAccess}`;
            const retried = await api(config);

            processQueue(null, newAccess);
            return retried;
        } catch (refreshErr) {
            processQueue(refreshErr, null);
            forceLogout();
            return Promise.reject(refreshErr);
        } finally {
            isRefreshing = false;
        }
    }
);

// Chống re-entry khi nhiều request 401 fail đồng thời.
let _forceLogoutInProgress = false;

/**
 * Force logout: clearStorage + dispatch auth-changed + toast + SPA navigate.
 *
 * SPA navigate thay vì hard reload để:
 *   - Giữ Navigo state, audio player, queue
 *   - Tránh flash trắng khi reload
 *   - Có UX feedback (toast)
 *
 * Fallback: nếu dynamic import router fail → window.location.replace.
 */
async function forceLogout() {
    if (_forceLogoutInProgress) return;
    _forceLogoutInProgress = true;

    try {
        clearStorage();
        // Dispatch event để listeners (header, sidebar, main.js) tự re-render
        window.dispatchEvent(
            new CustomEvent("auth-changed", { detail: { isLoggedIn: false, user: null } })
        );
    } catch (e) {
        console.warn("[api] forceLogout cleanup failed:", e);
    }

    // UX feedback: thông báo session hết hạn
    try {
        toast.error(MESSAGES.AUTH.SESSION_EXPIRED);
    } catch (e) {
        console.warn("[api] toast failed:", e);
    }

    // SPA navigate — dynamic import tránh circular dep:
    //   api.js → router.js (nhưng router.js có thể ngược về api.js qua service)
    try {
        const { router } = await import("@/libs/router.js");
        router.navigate("/auth/login");
    } catch (e) {
        // Fallback: nếu dynamic import fail (hiếm), hard reload để đảm bảo clean
        console.warn("[api] SPA navigate failed, fallback to hard reload:", e);
        window.location.replace("/auth/login");
    }
}

export default api;
