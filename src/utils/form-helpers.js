/**
 * form-helpers.js — Show/clear form errors (form-scoped)
 *
 * Gom helper show/clear form error vào 1 file để tránh duplicate
 * giữa các form page (auth, profile, change-password).
 *
 * Exports:
 *   - showFormError(form, field, message) → inline error dưới input, fallback toast
 *   - clearFormErrors(form)              → ẩn + xoá tất cả error trong form
 *
 * Consumed by:
 *   - `@/pages/auth/auth.js`
 *   - `@/pages/profile/profile.js`
 *   - `@/pages/change-password/change-password.js`
 *
 * Quan trọng — form-scope selector:
 *   - Dùng `form.querySelector('[data-error="${field}"]')` thay vì
 *     `document.querySelector(...)` để tránh ambiguity khi 2 form cùng page
 *     có cùng field name (vd login + register đều có data-error="email").
 *   - Nếu dùng document.querySelector, element đầu tiên matching luôn được
 *     chọn → bug ẩn khi 2 form DOM cùng tồn tại.
 */

import { toast } from "@/libs/toast.js";

/**
 * Hiển thị error message trên 1 field cụ thể trong form.
 * Nếu không tìm thấy element → fallback toast.error.
 *
 * @param {HTMLFormElement} form - Form chứa field
 * @param {string} field - data-error value (vd "email", "password")
 * @param {string} message - Text user-facing
 */
export function showFormError(form, field, message) {
    if (!form) {
        toast.error(message);
        return;
    }
    // form-scope (an toàn khi 2 form cùng page)
    const errorEl = form.querySelector(`[data-error="${field}"]`);
    if (errorEl) {
        const span = errorEl.querySelector("span");
        if (span) span.textContent = message;
        // Toggle display thay vì class 'hide' (vì .hide không có global rule
        // cho .form__error, mà chỉ scoped trong .auth__inner.hide).
        errorEl.style.display = "block";
    } else {
        // Fallback khi form KHÔNG có data-error element cho field này.
        // → Đảm bảo form HTML có đầy đủ `<div data-error="..."><span></span></div>`
        //   cho mỗi field khi thêm form mới (xem auth/login.html, profile.html, change-password.html).
        // → Nếu KHÔNG có data-error → show toast (có thể trùng với toast ở page handler).
        toast.error(message);
    }
}

/**
 * Clear tất cả error trong form (ẩn + xoá text).
 * Gọi khi user bắt đầu nhập lại input hoặc khi submit thành công.
 *
 * @param {HTMLFormElement} form
 */
export function clearFormErrors(form) {
    if (!form) return;
    form.querySelectorAll("[data-error]").forEach((el) => {
        el.style.display = "none";
        const span = el.querySelector("span");
        if (span) span.textContent = "";
    });
}
