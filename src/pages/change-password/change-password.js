/**
 * pages/change-password/change-password.js — Change Password page handler
 *
 * Form đổi mật khẩu + API call PATCH /auth/change-password.
 *
 * Auth guard: chưa login → navigate /auth/login + toast.
 *
 * Body shape (theo docs F8):
 *   { oldPassword, password, confirmPassword }
 *   Dùng `password` (không phải `newPassword`) cho khớp backend.
 *
 * AppError codes:
 *   - OLD_PASSWORD_WRONG → backend trả khi oldPassword sai
 *   - VALIDATION         → backend trả 400 với errors object
 *   - UNAUTHORIZED       → token hết hạn, interceptor force logout
 *   - NETWORK/TIMEOUT/...→ lỗi mạng
 *
 * Exports:
 *   - changePasswordPage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/auth/change-password")
 */

import { renderPage, loading } from "@/pages/_shared.js";
import { renderChangePasswordPage } from "@/pages/change-password/change-password.render.js";
import { requireAuth, onAuthChange } from "@/state/authState.js";
import { changePassword } from "@/services/authService.js";
import { getPasswordError } from "@/utils/validators.js";
import { MESSAGES } from "@/utils/messages.js";
import { showFormError, clearFormErrors } from "@/utils/form-helpers.js";
import { $ } from "@/utils/dom-helpers.js";
import { toast } from "@/libs/toast.js";
import { navigate } from "@/libs/router.js";

/** Render Change Password page (/auth/change-password). */
export async function changePasswordPage(route = {}) {
    void route;
    loading.show();
    try {
        // 1. Guard
        if (!requireAuth("/auth/login", MESSAGES.AUTH.CHANGE_PASSWORD_GUARD)) {
            return;
        }

        // 2. Render
        renderPage(renderChangePasswordPage());
        bindChangePasswordPage();
    } finally {
        loading.hide();
    }
}

function bindChangePasswordPage() {
    const form = $("#change-password-form");
    if (form) form.addEventListener("submit", handleChangePasswordSubmit);

    onAuthChange((data) => {
        if (!data.isLoggedIn) navigate("/auth/login");
    });
}

async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const oldInput = $("#old-password", form);
    const newInput = $("#new-password", form);
    const confirmInput = $("#confirm-new-password", form);

    const oldPassword = oldInput?.value;
    const password = newInput?.value;
    const confirmPassword = confirmInput?.value;

    // Validation
    if (!oldPassword) {
        return showFormError(form, "oldPassword", MESSAGES.VALIDATION.OLD_PASSWORD_REQUIRED);
    }
    const passwordErr = getPasswordError(password);
    if (passwordErr) return showFormError(form, "password", passwordErr);

    if (password && password === oldPassword) {
        return showFormError(form, "password", MESSAGES.VALIDATION.NEW_PASSWORD_SAME_AS_OLD);
    }

    if (!confirmPassword) {
        return showFormError(form, "confirmPassword", MESSAGES.VALIDATION.CONFIRM_PASSWORD_REQUIRED);
    }
    if (password !== confirmPassword) {
        return showFormError(form, "confirmPassword", MESSAGES.VALIDATION.CONFIRM_PASSWORD_MISMATCH);
    }

    // Submit
    clearFormErrors(form);
    loading.show();
    try {
        await changePassword({ oldPassword, password, confirmPassword });
        toast.success(MESSAGES.AUTH.CHANGE_PASSWORD_SUCCESS);

        form.reset();
        navigate("/auth/profile");
    } catch (err) {
        const field = err.field || "password";
        showFormError(form, field, err.message);
        toast.error(err.message);
    } finally {
        loading.hide();
    }
}

export default changePasswordPage;
