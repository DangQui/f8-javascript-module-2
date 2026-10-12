import { renderPage, loading } from "@/pages/_shared.js";
import { renderProfilePage } from "@/pages/profile/profile.render.js";

// Guard trước, nếu chưa login → return, không cần skeleton.
import { requireAuth, getAuth, onAuthChange } from "@/state/authState.js";
import { updateProfile, logoutRequest } from "@/services/authService.js";
import { getEmailError, getNameError } from "@/utils/validators.js";
import { MESSAGES } from "@/utils/messages.js";
import { showFormError, clearFormErrors } from "@/utils/form-helpers.js";
import { $ } from "@/utils/dom-helpers.js";
import { toast } from "@/libs/toast.js";
import { navigate } from "@/libs/router.js";

/**
 * Render Profile page (/auth/profile).
 *
 */
export async function profilePage(route = {}) {
    void route;

    // Guard trước, nếu chưa login thì return — KHÔNG render page (kể cả skeleton).
    loading.show();
    try {
        // 1. Guard (chưa login → toast + navigate /auth/login)
        if (!requireAuth("/auth/login", MESSAGES.AUTH.PROFILE_GUARD)) {
            return;
        }

        // 2. Render form profile
        const { user } = getAuth();
        renderPage(renderProfilePage(user));
        bindProfilePage();
    } finally {
        loading.hide();
    }
}

// ======================================================
// BIND EVENTS
// ======================================================

function bindProfilePage() {
    // 1. Update form
    const updateForm = $("#update-profile-form");
    if (updateForm) {
        updateForm.addEventListener("submit", handleUpdateProfileSubmit);
    }

    // 2. Logout button
    const logoutBtn = $("[data-logout]");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    // 3. Auth change → navigate về login
    onAuthChange((data) => {
        if (!data.isLoggedIn) {
            navigate("/auth/login");
        }
    });
}

// ======================================================
// UPDATE PROFILE HANDLER
// ======================================================

async function handleUpdateProfileSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const nameInput = $("#profile-name", form);
    const emailInput = $("#profile-email", form);
    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();

    // Validation
    const nameErr = getNameError(name);
    if (nameErr) return showFormError(form, "name", nameErr);

    const emailErr = getEmailError(email);
    if (emailErr) return showFormError(form, "email", emailErr);

    // Submit
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
        if (avatarEl)
            avatarEl.textContent = user.initial || name.charAt(0).toUpperCase();

        toast.success(MESSAGES.AUTH.PROFILE_UPDATE_SUCCESS);
    } catch (err) {
        const field = err.field || "email";
        showFormError(form, field, err.message);
        toast.error(err.message);
    } finally {
        loading.hide();
    }
}

// ======================================================
// LOGOUT HANDLER
// ======================================================

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
