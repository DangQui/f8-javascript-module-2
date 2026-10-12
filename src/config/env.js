/**
 * env.js — Centralized environment configuration
 *
 * Load config từ `.env*` files thông qua Vite's `import.meta.env`.
 * Env var PHẢI prefix `VITE_` để Vite expose ra client.
 *
 * Exports:
 *   - ENV → object chứa API_BASE_URL, API_TIMEOUT, APP_ENV, APP_VERSION, IS_DEV, IS_PROD
 *
 * Consumed by:
 *   - `@/utils/constants.js` re-export API_BASE_URL (backward compat)
 *   - `@/libs/api.js` dùng ENV.API_BASE_URL + ENV.API_TIMEOUT
 *   - Auth refresh-token interceptor dùng IS_DEV để log
 *
 * Lưu ý:
 *   - `VITE_API_BASE_URL` không có → fallback về default F8 backend.
 *   - `VITE_API_TIMEOUT` không hợp lệ → fallback 15000ms.
 *   - `VITE_APP_ENV` không nằm trong {"development"|"staging"|"production"} → fallback theo raw.DEV/PROD.
 */

const raw = import.meta.env;

/**
 * @typedef {Object} EnvConfig
 * @property {string} API_BASE_URL - Base URL của API backend (không trailing slash).
 * @property {number} API_TIMEOUT - Request timeout (ms).
 * @property {"development"|"staging"|"production"} APP_ENV - Environment name.
 * @property {string} APP_VERSION - App version (semver).
 * @property {boolean} IS_DEV - true nếu đang chạy dev mode.
 * @property {boolean} IS_PROD - true nếu đang build production.
 */

/** @returns {string} API base URL, loại bỏ trailing slash để tránh `//` khi concat path. */
function getApiBaseUrl() {
    const url = raw.VITE_API_BASE_URL;
    if (!url) {
        console.error(
            "[env] VITE_API_BASE_URL is not defined. " +
                "Check .env file. Falling back to default."
        );
        return "https://youtube-music.f8team.dev/api";
    }
    // Loại bỏ trailing slash để tránh `//` khi concat path
    return url.replace(/\/+$/, "");
}

/** @returns {number} Request timeout (ms), default 15000 nếu không hợp lệ. */
function getApiTimeout() {
    const t = Number(raw.VITE_API_TIMEOUT);
    if (!Number.isFinite(t) || t <= 0) {
        return 15000; // default 15s
    }
    return t;
}

/** @returns {"development"|"staging"|"production"} Env name, fallback theo Vite mode. */
function getAppEnv() {
    const env = raw.VITE_APP_ENV;
    if (env === "production" || env === "staging" || env === "development") {
        return env;
    }
    return raw.DEV ? "development" : "production";
}

/** @returns {string} App version (semver), default "0.0.0". */
function getAppVersion() {
    return raw.VITE_APP_VERSION || "0.0.0";
}

/** @type {EnvConfig} */
export const ENV = {
    API_BASE_URL: getApiBaseUrl(),
    API_TIMEOUT: getApiTimeout(),
    APP_ENV: getAppEnv(),
    APP_VERSION: getAppVersion(),
    IS_DEV: raw.DEV === true,
    IS_PROD: raw.PROD === true,
};

// Log 1 lần khi module load (dev only) — giúp debug config khi mở app.
if (ENV.IS_DEV) {
    // eslint-disable-next-line no-console
    console.info(
        `[env] mode=${ENV.APP_ENV} version=${ENV.APP_VERSION} ` +
            `api=${ENV.API_BASE_URL} timeout=${ENV.API_TIMEOUT}ms`
    );
}

export default ENV;
