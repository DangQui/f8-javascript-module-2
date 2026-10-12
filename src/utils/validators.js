import { MESSAGES } from "@/utils/messages.js";

// RFC 5321: local-part 64 + "@" + domain 255 = 254 max.
const EMAIL_MAX_LENGTH = 254;

// Email regex đơn giản: `xxx@xxx.xxx` không có khoảng trắng.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_MIN_LENGTH = 6;

/**
 * Check email format cơ bản.
 * Trim trước khi check, giới hạn 254 chars (RFC 5321).
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    if (!email || typeof email !== "string") return false;
    const trimmed = email.trim();
    if (trimmed.length === 0) return false;
    if (trimmed.length > EMAIL_MAX_LENGTH) return false;
    return EMAIL_REGEX.test(trimmed);
}

/**
 * Check password length tối thiểu.
 * @param {string} password
 * @returns {boolean}
 */
export function isValidPassword(password) {
    return (
        typeof password === "string" && password.length >= PASSWORD_MIN_LENGTH
    );
}

/**
 * Check password complexity (chỉ warn, không block register/login).
 * Password mạnh = có chữ hoa + chữ thường + số.
 * @param {string} password
 * @returns {boolean}
 */
export function isStrongPassword(password) {
    if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
        return false;
    }
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    return hasLower && hasUpper && hasDigit;
}

/**
 * Check name hợp lệ: 2-50 chars sau khi trim.
 * Cho phép ký tự Unicode (tiếng Việt có dấu).
 * @param {string} name
 * @returns {boolean}
 */
export function isValidName(name) {
    if (!name || typeof name !== "string") return false;
    const trimmed = name.trim();
    if (trimmed.length < 2) return false;
    if (trimmed.length > 50) return false;
    return true;
}

/**
 * Check confirm password khớp với password.
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {boolean}
 */
export function isValidConfirmPassword(password, confirmPassword) {
    return (
        typeof password === "string" &&
        typeof confirmPassword === "string" &&
        password === confirmPassword
    );
}

/**
 * Lấy error message cho email input.
 * @param {string} email
 * @param {boolean} [required=true] - Nếu false, bỏ qua lỗi "required"
 * @returns {string|null} Message lỗi, hoặc null nếu hợp lệ
 */
export function getEmailError(email, required = true) {
    if (!email || (typeof email === "string" && email.trim() === "")) {
        return required ? MESSAGES.VALIDATION.EMAIL_REQUIRED : null;
    }
    if (typeof email !== "string" || email.length > EMAIL_MAX_LENGTH) {
        return MESSAGES.VALIDATION.EMAIL_TOO_LONG;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
        return MESSAGES.VALIDATION.EMAIL_INVALID;
    }
    return null;
}

/**
 * Lấy error message cho password input.
 * @param {string} password
 * @param {boolean} [required=true]
 * @returns {string|null}
 */
export function getPasswordError(password, required = true) {
    if (!password || (typeof password === "string" && password === "")) {
        return required ? MESSAGES.VALIDATION.PASSWORD_REQUIRED : null;
    }
    if (typeof password !== "string" || password.length < PASSWORD_MIN_LENGTH) {
        return MESSAGES.VALIDATION.PASSWORD_TOO_SHORT;
    }
    return null;
}

/**
 * Lấy error message cho name input.
 * @param {string} name
 * @returns {string|null}
 */
export function getNameError(name) {
    if (!name || (typeof name === "string" && name.trim() === "")) {
        return MESSAGES.VALIDATION.NAME_REQUIRED;
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
        return MESSAGES.VALIDATION.NAME_TOO_SHORT;
    }
    if (trimmed.length > 50) {
        return MESSAGES.VALIDATION.NAME_TOO_LONG;
    }
    return null;
}

/**
 * Lấy error message cho confirm password input.
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {string|null}
 */
export function getConfirmPasswordError(password, confirmPassword) {
    if (!confirmPassword || confirmPassword === "") {
        return MESSAGES.VALIDATION.CONFIRM_PASSWORD_REQUIRED;
    }
    if (password !== confirmPassword) {
        return MESSAGES.VALIDATION.CONFIRM_PASSWORD_MISMATCH;
    }
    return null;
}
