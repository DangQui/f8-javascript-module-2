// === SCSS entry ===
import "@/styles/main.scss";

// === UTILS ===
import { $ } from "@/utils/dom-helpers.js";

// === LAYOUT (Phase 5) ===
import { initLayout } from "@/layout/init.js";

// === ROUTER (Phase 6) ===
import { initRouter, navigate } from "@/libs/router.js";

// === STATE (auth) ===
import { onAuthChange, isLoggedIn, getAuth } from "@/state/authState.js";
import { logoutRequest } from "@/services/authService.js";
import { renderHeader } from "@/layout/header.js";
import { renderSidebar } from "@/layout/sidebar.js";
import { initJsToggle } from "@/libs/toggle.js";
import { initDropdowns } from "@/libs/dropdown.js";
import { initSidebarActive, initUpgradeLink } from "@/libs/sidebar.js";

// === COMPONENTS (Phase 8.5: audio player) ===
import { bindAudioPlayerUI } from "@/components/audio-player.js";

// === COMPONENTS (Phase 13: search engine) ===
import { initSearch, resetSearch } from "@/components/search.js";

// === UI HELPERS ===
import { toast } from "@/libs/toast.js";
import { MESSAGES } from "@/utils/messages.js";

// ======================================================
// COMPAT: expose load() globally (cho code cũ gọi trong HTML)
// ======================================================
window.load = async function load(selector, path) {
    return fetch(path)
        .then((res) => res.text())
        .then((html) => {
            const el = $(selector);
            if (el) el.innerHTML = html;
            window.dispatchEvent(new Event("template-loaded"));
        });
};

function rebindAuthUI() {
    initJsToggle();
    initSidebarActive();
    initUpgradeLink();
    initDropdowns();

    // 2. Apply data-show-when cho DOM mới
    const loggedIn = isLoggedIn();
    document.querySelectorAll("[data-show-when]").forEach((el) => {
        // Bỏ qua dropdown menu (vì data-dropdown-menu đã có d-none sẵn)
        if (el.hasAttribute("data-dropdown-menu")) return;

        const showWhen = el.getAttribute("data-show-when");
        let shouldShow = true;
        if (showWhen === "logged-in") shouldShow = loggedIn;
        else if (showWhen === "logged-out") shouldShow = !loggedIn;

        el.classList.toggle("d-none", !shouldShow);
    });

    // 3. Fill user info vào DOM mới (nếu logged-in)
    const { user } = getAuth();
    if (user) {
        document.querySelectorAll("[data-user-name]").forEach((el) => {
            if (user.name != null) el.textContent = user.name;
        });
        document.querySelectorAll("[data-user-initial]").forEach((el) => {
            if (user.initial != null) el.textContent = user.initial;
        });
        document.querySelectorAll("[data-user-email]").forEach((el) => {
            if (user.email != null) el.textContent = user.email;
        });
    }
}

// ======================================================
// INIT
// ======================================================
document.addEventListener("DOMContentLoaded", async () => {
    // 0. Đánh dấu DOM ready
    document.documentElement.classList.add("app-dom-ready");

    // 1. Render layout + init UI handlers
    await initLayout();

    bindAudioPlayerUI();

    initSearch();

    // 2. Wire search close button (init in layout nhưng tách riêng để dễ quản lý)
    initSearchClose();

    // 3. Wire logout button (global — đã có sẵn từ Phase 3, giữ để backward compat)
    initLogoutClick();

    // 4. Init router (Phase 6) — phải sau initLayout vì router render page vào #main
    initRouter();

    onAuthChange(async () => {
        await Promise.all([renderHeader("#header"), renderSidebar("#sidebar")]);

        resetSearch();
        initSearch();

        rebindAuthUI();
    });

    // 5. Fade-in animation
    const FADE_DURATION = 500;
    const STAGGER_DELAY = 240;

    requestAnimationFrame(() => {
        const root = document.documentElement;
        root.classList.add("app-loaded");
        setTimeout(() => {
            root.classList.remove("app-loading");
        }, FADE_DURATION + STAGGER_DELAY);
    });
});

// ======================================================
// SEARCH CLOSE — nút X trong ô tìm kiếm
// ======================================================
function initSearchClose() {
    document.addEventListener("click", (e) => {
        const closeBtn = e.target.closest(".form__close");
        if (!closeBtn) return;

        const form = closeBtn.closest("form");
        if (!form) return;

        const input = form.querySelector(".form__input-search");
        if (!input) return;

        e.preventDefault();
        input.value = "";
        input.focus();
        input.dispatchEvent(new Event("input", { bubbles: true }));
    });
}

async function initLogoutClick() {
    document.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-logout]");
        if (!btn) return;
        e.preventDefault();

        try {
            // Gọi API logout (best-effort — backend có thể không có endpoint,
            await logoutRequest();
            toast.success(MESSAGES.AUTH.LOGOUT_SUCCESS);

            // Navigate về home route. onAuthChange sẽ tự swap header HTML
            navigate("/");
        } catch (err) {
            console.error("[main] logout failed:", err);
            toast.error(MESSAGES.AUTH.LOGOUT_FAILED);
        }
    });
}

// ======================================================
// Re-export
// ======================================================
export const load = window.load;
