/**
 * constants.js — Static config values shared across the app
 *
 * Tách khỏi `@/config/env.js` (build-time env) để giữ runtime constants
 * ở 1 nơi duy nhất, dễ tra cứu và refactor.
 *
 * Exports:
 *   - API_BASE_URL    → Backward-compat alias of ENV.API_BASE_URL
 *   - DEFAULT_COUNTRY → Country code mặc định cho Home/Charts page
 *   - COUNTRY_CODES   → Danh sách country hỗ trợ filter
 *   - STORAGE_KEYS    → Namespace cho các key localStorage
 *
 * Consumed by:
 *   - `@/services/*` dùng API_BASE_URL khi gọi axios
 *   - `@/pages/home/*`, `@/pages/charts/*` dùng DEFAULT_COUNTRY + COUNTRY_CODES
 *   - `@/state/authState.js`, `@/services/tokenStorage.js` dùng STORAGE_KEYS
 */

import { ENV } from "@/config/env.js";

/** @deprecated Phase 10.1+: dùng `import { ENV } from "@/config/env.js"` thay thế. Vẫn re-export để giữ backward compat. */
export const API_BASE_URL = ENV.API_BASE_URL;

/** Country code mặc định cho Home/Charts — hiện tại chỉ hỗ trợ VN. */
export const DEFAULT_COUNTRY = "VN";

/** Danh sách country hỗ trợ filter ở Discover/Charts. Mỗi entry: { code, name }. */
export const COUNTRY_CODES = [
    { code: "US", name: "United States" },
    { code: "VN", name: "Việt Nam" },
    { code: "KR", name: "South Korea" },
    { code: "JP", name: "Japan" },
    { code: "GB", name: "United Kingdom" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "BR", name: "Brazil" },
    { code: "IN", name: "India" },
];

/** Centralized localStorage keys. Tránh typo khi dùng ở nhiều nơi. */
export const STORAGE_KEYS = {
    AUTH: "ytmusic_auth",
    ACCESS_TOKEN: "ytmusic_access_token",
    REFRESH_TOKEN: "ytmusic_refresh_token",
    USER: "ytmusic_user",
    TEMPLATE_VERSION: "ytmusic_tpl_version",
};
