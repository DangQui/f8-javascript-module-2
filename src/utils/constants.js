import { ENV } from "@/config/env.js";

/** @deprecated */
export const API_BASE_URL = ENV.API_BASE_URL;

export const DEFAULT_COUNTRY = "VN";

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

export const STORAGE_KEYS = {
    AUTH: "ytmusic_auth",
    ACCESS_TOKEN: "ytmusic_access_token",
    REFRESH_TOKEN: "ytmusic_refresh_token",
    USER: "ytmusic_user",
    TEMPLATE_VERSION: "ytmusic_tpl_version",
};
