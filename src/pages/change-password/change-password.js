// ======================================================
// CHANGE PASSWORD PAGE — Form đổi mật khẩu + API call
// ======================================================
//
// Phase 10.1: dùng MESSAGES + form-helpers + mapApiError.
// Stub "MAINTENANCE" code handle ở catch.
//

import { renderPage, loading } from "@/pages/_shared.js";
import { renderChangePasswordPage } from "@/pages/change-password/change-password.render.js";

import { requireAuth, onAuthChange } from "@/state/authState.js";
import { changePassword } from "@/services/authService.js";
import {
    getPasswordError,
} from "@/utils/validators.js";
import { MESSAGES } from "@/utils/messages.js";
import { showFormError, clearFormErrors } from "@/utils/form-helpers.js";
import { $ } from "@/utils/dom-helpers.js";
import { toast } from "@/libs/toast.js";
import { navigate } from "@/libs/router.js";

/**
 * Render Change Password page (/auth/change-password).
 *
 * Auth guard: port từ base.js:5831 — `await Ar() && await Q(Tr, Gn)`
 * → Nếu getProfile throw → render form login `Gn` thay vì change-password.
 * → Trong dự án dùng requireAuth() (đọc localStorage, navigate + toast nếu fail).
 */
export async function changePasswordPage(route = {}) {
    void route;

    // Guard trước, nếu chưa login thì return — KHÔNG render page (kể cả skeleton).
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

// ======================================================
// BIND EVENTS
// ======================================================

function bindChangePasswordPage() {
    const form = $("#change-password-form");
    if (form) form.addEventListener("submit", handleChangePasswordSubmit);

    onAuthChange((data) => {
        if (!data.isLoggedIn) navigate("/auth/login");
    });
}

// ======================================================
// CHANGE PASSWORD HANDLER
// ======================================================

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
        // Theo docs F8: PATCH /auth/change-password
        //   body: { oldPassword, password, confirmPassword }
        // → dùng `password` (không phải `newPassword`) cho khớp backend.
        await changePassword({ oldPassword, password, confirmPassword });
        toast.success(MESSAGES.AUTH.CHANGE_PASSWORD_SUCCESS);

        form.reset();
        navigate("/auth/profile");
    } catch (err) {
        // AppError từ authService (mapApiError):
        // - code "OLD_PASSWORD_WRONG" → backend trả khi oldPassword sai
        // - code "VALIDATION"          → backend trả 400 với errors object
        // - code "UNAUTHORIZED"        → token hết hạn, interceptor force logout
        // - code "NETWORK/TIMEOUT/..." → lỗi mạng
        const field = err.field || "password";
        showFormError(form, field, err.message);
        toast.error(err.message);
    } finally {
        loading.hide();
    }
}

export default changePasswordPage;
