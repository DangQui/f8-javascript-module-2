import { renderPage, loading } from "@/pages/_shared.js";
import { renderAuthPage } from "@/pages/auth/auth.render.js";
import { initSidebarActive } from "@/libs/sidebar.js";

// Xóa import SKELETON_AUTH.
import { initJsToggle } from "@/libs/toggle.js";
import { loginRequest, registerRequest } from "@/services/authService.js";
import {
    isValidEmail,
    isValidPassword,
    isValidName,
    isValidConfirmPassword,
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

// ======================================================
// PAGE HANDLERS
// ======================================================

/**
 * Render Login page (/auth/login).
 */
export async function loginPage(route = {}) {
    void route;

    // Chỉ dùng loading.show() để mask page transition ngắn, không cần render skeleton.
    loading.show();
    try {
        renderPage(renderAuthPage("login"));
        bindAuthPage({ mode: "login" });
    } finally {
        loading.hide();
        // Fix bug "sidebar không active khi vào /auth/login":
        // renderPage đã gọi initSidebarActive() rồi, NHƯNG có thể chạy khi
        // sidebar chưa load xong (vì renderSidebar cũng async). Defer 1 frame
        // để chắc chắn sidebar items đã có trong DOM.
        requestAnimationFrame(() => initSidebarActive());
    }
}

/**
 * Render Register page (/auth/register).
 */
export async function registerPage(route = {}) {
    void route;

    loading.show();
    try {
        renderPage(renderAuthPage("register"));
        bindAuthPage({ mode: "register" });
    } finally {
        loading.hide();
        // Tương tự loginPage — defer initSidebarActive để đảm bảo
        // sidebar items đã load xong.
        requestAnimationFrame(() => initSidebarActive());
    }
}

// ======================================================
// BIND EVENTS
// ======================================================

/**
 * Wire toggle + submit handler cho page hiện tại.
 *
 * QUAN TRỌNG: Cả 2 form (#login-form + #register-form) đều tồn tại trong
 * DOM cùng lúc — chỉ toggle class "hide" qua js-toggle. User ở /auth/login
 * có thể click "Đăng ký" link → form đăng ký hiện ra → submit form đăng ký
 * MÀ KHÔNG navigate tới /auth/register. Vì vậy phải bind CẢ 2 handler ngay
 * từ đầu (không phụ thuộc mode).
 *
 * Defensive: flag `data-submit-bound` tránh bind trùng nếu bindAuthPage()
 * bị gọi nhiều lần (re-render).
 */
function bindAuthPage({ mode }) {
    void mode; // mode không còn dùng — bind cả 2
    // Re-init toggle cho button mới trong page (link Đăng ký ↔ Đăng nhập)
    initJsToggle();

    // Bind submit cho CẢ 2 form (vì cả 2 đều tồn tại trong DOM)
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

// ======================================================
// LOGIN HANDLER
// ======================================================

async function handleLoginSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    const form = e.target;
    const emailInput = $("#email-login", form);
    const passwordInput = $("#password-login", form);
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    // Validation
    const emailErr = getEmailError(email);
    if (emailErr) return showFormError(form, "email", emailErr);

    const passwordErr = getPasswordError(password);
    if (passwordErr) return showFormError(form, "password", passwordErr);

    // Submit
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

// ======================================================
// REGISTER HANDLER
// ======================================================

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

    // Validation
    const emailErr = getEmailError(email);
    if (emailErr) return showFormError(form, "email", emailErr);

    const nameErr = getNameError(name);
    if (nameErr) return showFormError(form, "name", nameErr);

    const passwordErr = getPasswordError(password);
    if (passwordErr) return showFormError(form, "password", passwordErr);

    const confirmErr = getConfirmPasswordError(password, confirmPassword);
    if (confirmErr) return showFormError(form, "confirm-password", confirmErr);

    // Submit
    clearFormErrors(form);
    loading.show();
    try {
        await registerRequest({ email, name, password, confirmPassword });
        toast.success(MESSAGES.AUTH.REGISTER_SUCCESS);
        navigate("/");
    } catch (err) {
        // AppError đã có `field` + `message` từ mapApiError
        // - EMAIL_TAKEN → field "email"
        // - PASSWORD_MISMATCH → field "confirm-password"
        // - VALIDATION → field từ errors object
        const field = err.field || "email";
        showFormError(form, field, err.message);
        toast.error(err.message);
    } finally {
        loading.hide();
    }
}

export default { loginPage, registerPage };
