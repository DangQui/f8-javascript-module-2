import { MESSAGES } from "@/utils/messages.js";

/**
 * @typedef {Object} AppError
 * @property {string} code - Machine-readable error code
 * @property {string} message - User-facing message (tiếng Việt)
 * @property {string} [field] - Field name nếu là form error (vd "email", "password")
 * @property {number} [status] - HTTP status code
 * @property {object} [original] - Original axios error (debug only)
 */

/**
 * Map backend message string → code + field + friendly message.
 * Trả message từ MESSAGES (tiếng Việt) cho các case phổ biến.
 * @param {string} apiMessage
 * @returns {{code: string, field?: string, message: string}}
 */
function mapApiMessage(apiMessage) {
    if (!apiMessage || typeof apiMessage !== "string") {
        return { code: "UNKNOWN", message: MESSAGES.COMMON.UNKNOWN_ERROR };
    }
    const msg = apiMessage.toLowerCase();

    // Auth flows
    if (msg.includes("invalid credential")) {
        return {
            code: "INVALID_CREDENTIALS",
            field: "password",
            message: MESSAGES.AUTH.LOGIN_INVALID_CREDENTIALS,
        };
    }
    if (msg.includes("user not found") || msg.includes("user does not exist")) {
        return {
            code: "USER_NOT_FOUND",
            field: "email",
            message: MESSAGES.AUTH.LOGIN_USER_NOT_FOUND,
        };
    }
    if (
        msg.includes("email already in use") ||
        msg.includes("email already exists")
    ) {
        return {
            code: "EMAIL_TAKEN",
            field: "email",
            message: MESSAGES.AUTH.REGISTER_EMAIL_TAKEN,
        };
    }
    if (msg.includes("old password")) {
        return {
            code: "OLD_PASSWORD_WRONG",
            field: "oldPassword",
            message: MESSAGES.AUTH.CHANGE_PASSWORD_OLD_INCORRECT,
        };
    }
    if (
        msg.includes("passwords do not match") ||
        msg.includes("confirmpassword")
    ) {
        return {
            code: "PASSWORD_MISMATCH",
            field: "confirm-password",
            message: MESSAGES.VALIDATION.CONFIRM_PASSWORD_MISMATCH,
        };
    }

    // Token / Auth
    if (msg.includes("token expired") || msg.includes("token invalid")) {
        return {
            code: "UNAUTHORIZED",
            message: MESSAGES.AUTH.SESSION_EXPIRED,
        };
    }
    if (msg === "unauthorized" || msg.includes("unauthorized")) {
        return {
            code: "UNAUTHORIZED",
            message: MESSAGES.COMMON.UNAUTHORIZED,
        };
    }
    if (msg === "forbidden" || msg.includes("forbidden")) {
        return {
            code: "FORBIDDEN",
            message: MESSAGES.COMMON.FORBIDDEN,
        };
    }

    // Resource / Rate / Server
    if (msg.includes("not found") || msg.includes("does not exist")) {
        return {
            code: "NOT_FOUND",
            message: MESSAGES.COMMON.NOT_FOUND,
        };
    }
    if (msg.includes("rate limit") || msg.includes("too many requests")) {
        return {
            code: "RATE_LIMIT",
            message: MESSAGES.COMMON.RATE_LIMIT,
        };
    }
    if (
        msg.includes("service unavailable") ||
        msg.includes("internal server") ||
        msg.includes("server error")
    ) {
        return {
            code: "SERVER_ERROR",
            message: MESSAGES.COMMON.SERVER_ERROR,
        };
    }
    if (msg === "bad request" || msg.includes("bad request")) {
        return {
            code: "BAD_REQUEST",
            message: MESSAGES.COMMON.BAD_REQUEST,
        };
    }

    // Validation
    if (msg.includes("validation failed") || msg.includes("validation error")) {
        return { code: "VALIDATION", message: MESSAGES.COMMON.UNKNOWN_ERROR };
    }
    // Giữ message gốc nếu không match case nào
    return { code: "UNKNOWN", message: apiMessage };
}

/**
 * Map bất kỳ error (axios, network, throw Error) → AppError chuẩn.
 *
 * @param {unknown} err - Error từ axios / network / throw
 * @param {object} [context]
 * @param {string} [context.defaultMessage] - Fallback message khi không map được
 * @returns {AppError}
 */
export function mapApiError(err, context = {}) {
    const defaultMessage =
        context.defaultMessage || MESSAGES.COMMON.UNKNOWN_ERROR;

    // 1. Network error (offline, DNS fail, CORS block, ...)
    if (
        err?.code === "ERR_NETWORK" ||
        err?.message === "Network Error" ||
        (typeof err?.message === "string" &&
            err.message.toLowerCase().includes("network"))
    ) {
        return {
            code: "NETWORK_ERROR",
            message: MESSAGES.COMMON.NETWORK_ERROR,
            original: err,
        };
    }

    // 2. Timeout
    if (err?.code === "ECONNABORTED" || err?.message?.includes("timeout")) {
        return {
            code: "TIMEOUT",
            message: MESSAGES.COMMON.TIMEOUT,
            original: err,
        };
    }

    // 3. Axios error with response
    const response = err?.response;
    if (response) {
        const status = response.status;
        const data = response.data;

        // 3a. 401 — Unauthorized (token invalid/expired)
        if (status === 401) {
            return {
                code: "UNAUTHORIZED",
                message: MESSAGES.AUTH.SESSION_EXPIRED,
                status,
                original: err,
            };
        }

        // 3b. 403 — Forbidden
        if (status === 403) {
            return {
                code: "FORBIDDEN",
                message: MESSAGES.COMMON.FORBIDDEN,
                status,
                original: err,
            };
        }

        // 3c. 404 — Not Found
        if (status === 404) {
            return {
                code: "NOT_FOUND",
                message: MESSAGES.COMMON.NOT_FOUND,
                status,
                original: err,
            };
        }

        // 3d. 429 — Rate Limit
        if (status === 429) {
            return {
                code: "RATE_LIMIT",
                message: MESSAGES.COMMON.RATE_LIMIT,
                status,
                original: err,
            };
        }

        // 3e. 5xx — Server Error
        if (status >= 500) {
            return {
                code: "SERVER_ERROR",
                message: MESSAGES.COMMON.SERVER_ERROR,
                status,
                original: err,
            };
        }

        // 3f. 400/422 — Validation or business logic error
        if (status === 400 || status === 422) {
            // Try to map from response.data
            if (typeof data === "object" && data !== null) {
                // If has `errors` object (validation), pick first
                if (data.errors && typeof data.errors === "object") {
                    const firstField = Object.keys(data.errors)[0];
                    const firstError = data.errors[firstField];
                    const message = Array.isArray(firstError)
                        ? firstError[0]
                        : firstError;
                    return {
                        code: "VALIDATION",
                        message: message || defaultMessage,
                        field: firstField,
                        status,
                        original: err,
                    };
                }
                // If has `message`, map it
                if (data.message) {
                    const mapped = mapApiMessage(data.message);
                    return {
                        ...mapped,
                        status,
                        original: err,
                    };
                }
            }
            // string body
            if (typeof data === "string") {
                const mapped = mapApiMessage(data);
                return {
                    ...mapped,
                    status,
                    original: err,
                };
            }
        }

        // 3g. Other status
        return {
            code: "UNKNOWN",
            message: defaultMessage,
            status,
            original: err,
        };
    }

    // 4. No response (request was made but no response received)
    if (err?.request) {
        return {
            code: "NETWORK_ERROR",
            message: MESSAGES.COMMON.NETWORK_ERROR,
            original: err,
        };
    }

    // 5. AppError already mapped (re-throw) — return as-is
    if (err?.code && err?.message && err?.original) {
        return /** @type {AppError} */ (err);
    }

    // 6. Unknown error (e.g. our own thrown Error from stub)
    return {
        code: "UNKNOWN",
        message: err?.message || defaultMessage,
        original: err,
    };
}

/**
 * Helper: check if AppError code khớp 1 trong các code cho trước.
 * @param {AppError|undefined|null} appError
 * @param  {...string} codes
 * @returns {boolean}
 */
export function isErrorCode(appError, ...codes) {
    return !!appError && codes.includes(appError.code);
}

export default mapApiError;
