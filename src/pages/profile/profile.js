/**
 * pages/profile/profile.js — Profile page handler
 *
 * Thông tin user + đổi mật khẩu + logout.
 *
 * Auth guard: chưa login → navigate /auth/login + toast (return sớm,
 * không render page kể cả skeleton).
 *
 * Form: dùng MESSAGES + form-helpers + mapApiError (giống auth.js) → giảm
 * duplicate, error mapping chuẩn hoá.
 *
 * Exports:
 *   - profilePage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/auth/profile")
 */

import { renderPage, loading } from "@/pages/_shared.js";
import { renderProfilePage } from "@/pages/profile/profile.render.js";
import { requireAuth, getAuth, onAuthChange } from "@/state/authState.js";
import { updateProfile, logoutRequest } from "@/services/authService.js";
import { getEmailError, getNameError } from "@/utils/validators.js";
import { MESSAGES } from "@/utils/messages.js";
import { showFormError, clearFormErrors } from "@/utils/form-helpers.js";
import { $ } from "@/utils/dom-helpers.js";
import { toast } from "@/libs/toast.js";
import { navigate } from "@/libs/router.js";

/**
 * Render Profile page.
 * @param {{params: object, query: object, url: string}} route
 */
export async function profilePage(route = {}) {
    void route;
    loading.show();
    try {
        if (!requireAuth("/auth/login", MESSAGES.AUTH.PROFILE_GUARD)) {
            return;
        }

        const { user } = getAuth();
        renderPage(renderProfilePage(user));
        bindProfilePage();
    } finally {
        loading.hide();
    }
}

function bindProfilePage() {
    const updateForm = $("#update-profile-form");
    if (updateForm) {
        updateForm.addEventListener("submit", handleUpdateProfileSubmit);
    }

    const logoutBtn = $("[data-logout]");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    onAuthChange((data) => {
        if (!data.isLoggedIn) {
            navigate("/auth/login");
        }
    });
}

async function handleUpdateProfileSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const nameInput = $("#profile-name", form);
    const emailInput = $("#profile-email", form);
    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();

    const nameErr = getNameError(name);
    if (nameErr) return showFormError(form, "name", nameErr);

    const emailErr = getEmailError(email);
    if (emailErr) return showFormError(form, "email", emailErr);

    clearFormErrors(form);
    loading.show();
    try {
        await updateProfile({ name, email });

        // Update hiển thị trên header card
        const { user } = getAuth();
        const nameEl = $("[data-profile-name]");
        const emailEl = $("[data-profile-email]");
        if (nameEl) nameEl.textContent = user.name;
        if (emailEl) emailEl.textContent = user.email;
        const avatarEl = $(".profile-header__avatar");
        if (avatarEl) avatarEl.textContent = user.initial || name.charAt(0).toUpperCase();

        toast.success(MESSAGES.AUTH.PROFILE_UPDATE_SUCCESS);
    } catch (err) {
        const field = err.field || "email";
        showFormError(form, field, err.message);
        toast.error(err.message);
    } finally {
        loading.hide();
    }
}

async function handleLogout() {
    loading.show();
    try {
        await logoutRequest();
        toast.success(MESSAGES.AUTH.LOGOUT_SUCCESS);
        navigate("/auth/login");
    } catch (err) {
        console.error("[profile] logout error:", err);
        toast.error(MESSAGES.AUTH.LOGOUT_FAILED);
    } finally {
        loading.hide();
    }
}

export default profilePage;
