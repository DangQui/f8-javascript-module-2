/**
 * pages/auth/auth.js — Login + Register page handlers
 *
 * Flow:
 *   1. Show loading overlay (mask page transition ngắn)
 *   2. Render form HTML từ auth.render.js
 *   3. Re-init js-toggle (vì page render xong cần bind cho button mới)
 *   4. Bind submit handler cho form tương ứng
 *   5. On success: navigate("/") (SPA, không reload)
 *   6. On error: hiển thị .form__error inline + toast
 *
 * Refactor Phase 10.1:
 *   - Mọi text lấy từ `@/utils/messages.js` (không hardcode)
 *   - Form helpers từ `@/utils/form-helpers.js` (xoá duplicate)
 *   - Error mapping qua `mapApiError()` → switch theo `err.code`
 *   - Validators dùng `getXxxError()` → trả về string|null
 *
 * Lưu ý: Cả 2 form (#login-form + #register-form) đều tồn tại trong DOM cùng
 * lúc — chỉ toggle class "hide" qua js-toggle. User ở /auth/login có thể
 * click "Đăng ký" link → form đăng ký hiện ra → submit form đăng ký MÀ KHÔNG
 * navigate tới /auth/register. Vì vậy phải bind CẢ 2 handler ngay từ đầu.
 *
 * Exports:
 *   - loginPage(route)
 *   - registerPage(route)
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/auth/login" + "/auth/register")
 */

import { renderPage, loading } from "@/pages/_shared.js";
import { renderAuthPage } from "@/pages/auth/auth.render.js";
import { initJsToggle } from "@/libs/toggle.js";
import { loginRequest, registerRequest } from "@/services/authService.js";
import {
    getEmailError,
    getPasswordError,
    getNameError,
    getConfirmPasswordError,
} from "@/utils/validators.js";
import { MESSAGES } from "@/utils/messages.js";
import { showFormError, clearFormErrors } from "@/utils/form-helpers.js";
import { $ } from "@/utils/dom-helpers.js";
import { toast } from "@/libs/toast.js";
import { navigate } from "@/libs/router.js";

/** Render Login page (/auth/login). */
export async function loginPage(route = {}) {
    void route;
    loading.show();
    try {
        renderPage(renderAuthPage("login"));
        bindAuthPage();
    } finally {
        loading.hide();
    }
}

/** Render Register page (/auth/register). */
export async function registerPage(route = {}) {
    void route;
    loading.show();
    try {
        renderPage(renderAuthPage("register"));
        bindAuthPage();
    } finally {
        loading.hide();
    }
}

/**
 * Wire toggle + submit handler cho page hiện tại.
 * Bind CẢ 2 form (vì cả 2 đều tồn tại trong DOM — chỉ toggle class "hide").
 * Flag `data-submit-bound` tránh bind trùng nếu re-render.
 */
function bindAuthPage() {
    initJsToggle();

    const loginForm = $("#login-form");
    if (loginForm && !loginForm.dataset.submitBound) {
        loginForm.addEventListener("submit", handleLoginSubmit);
        loginForm.dataset.submitBound = "1";
    }

    const registerForm = $("#register-form");
    if (registerForm && !registerForm.dataset.submitBound) {
        registerForm.addEventListener("submit", handleRegisterSubmit);
        registerForm.dataset.submitBound = "1";
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    const form = e.target;
    const emailInput = $("#email-login", form);
    const passwordInput = $("#password-login", form);
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    const emailErr = getEmailError(email);
    if (emailErr) return showFormError(form, "email", emailErr);

    const passwordErr = getPasswordError(password);
    if (passwordErr) return showFormError(form, "password", passwordErr);

    clearFormErrors(form);
    loading.show();
    try {
        await loginRequest({ email, password });
        toast.success(MESSAGES.AUTH.LOGIN_SUCCESS);
        navigate("/");
    } catch (err) {
        // AppError đã có `field` + `message` từ mapApiError
        const field = err.field || "password";
        showFormError(form, field, err.message);
        toast.error(err.message);
    } finally {
        loading.hide();
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    const form = e.target;
    const emailInput = $("#email-register", form);
    const nameInput = $("#name-register", form);
    const passwordInput = $("#password-register", form);
    const confirmInput = $("#confirm-password-register", form);

    const email = emailInput?.value.trim();
    const name = nameInput?.value.trim();
    const password = passwordInput?.value;
    const confirmPassword = confirmInput?.value;

    const emailErr = getEmailError(email);
    if (emailErr) return showFormError(form, "email", emailErr);

    const nameErr = getNameError(name);
    if (nameErr) return showFormError(form, "name", nameErr);

    const passwordErr = getPasswordError(password);
    if (passwordErr) return showFormError(form, "password", passwordErr);

    const confirmErr = getConfirmPasswordError(password, confirmPassword);
    if (confirmErr) return showFormError(form, "confirm-password", confirmErr);

    clearFormErrors(form);
    loading.show();
    try {
        await registerRequest({ email, name, password, confirmPassword });
        toast.success(MESSAGES.AUTH.REGISTER_SUCCESS);
        navigate("/");
    } catch (err) {
        // AppError có `field` từ mapApiError:
        //   - EMAIL_TAKEN → field "email"
        //   - PASSWORD_MISMATCH → field "confirm-password"
        //   - VALIDATION → field từ errors object
        const field = err.field || "email";
        showFormError(form, field, err.message);
        toast.error(err.message);
    } finally {
        loading.hide();
    }
}

export default { loginPage, registerPage };
