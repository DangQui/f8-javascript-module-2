import { toast } from "@/libs/toast.js";

/**
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
        errorEl.style.display = "block";
    } else {
        toast.error(message);
    }
}

/**
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
