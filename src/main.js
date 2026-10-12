/**
 * main.js — Vite ES module root (Application entry point)
 *
 * Khởi tạo toàn bộ SPA khi DOM ready:
 *   1. Load global SCSS bundle (`@/styles/main.scss`)
 *   2. Render layout (header/sidebar/player) — async, fetch partials
 *   3. Bind UI handlers (audio player, search, js-toggle, dropdowns, sidebar)
 *   4. Init router (Navigo) để handle page navigation
 *   5. Subscribe `onAuthChange` → re-render header/sidebar khi login/logout
 *   6. Fade-in animation (UX polish)
 *
 * Compat:
 *   - Expose `window.load(selector, path)` (legacy helper dùng bởi code cũ)
 *   - Re-export `load` để import từ module khác
 *
 * Consumed by:
 *   - `index.html` (Vite entry)
 *   - `@/services/*` (qua logoutRequest)
 *   - `@/state/authState.js` (subscribe onAuthChange)
 */

import "@/styles/main.scss";

import { $ } from "@/utils/dom-helpers.js";
import { initLayout } from "@/layout/init.js";
import { initRouter, navigate } from "@/libs/router.js";
import { onAuthChange, isLoggedIn, getAuth } from "@/state/authState.js";
import { logoutRequest } from "@/services/authService.js";
import { renderHeader } from "@/layout/header.js";
import { renderSidebar } from "@/layout/sidebar.js";
import { initJsToggle } from "@/libs/toggle.js";
import { initDropdowns } from "@/libs/dropdown.js";
import { initSidebarActive, initUpgradeLink } from "@/libs/sidebar.js";
import { bindAudioPlayerUI } from "@/components/audio-player.js";
import { initSearch, resetSearch } from "@/components/search.js";
import { toast } from "@/libs/toast.js";
import { MESSAGES } from "@/utils/messages.js";

/**
 * Compat: expose `load()` globally (cho code cũ gọi trong HTML).
 * Fetch HTML từ `path` rồi inject vào `selector`. Dispatch event
 * `template-loaded` để các module khác (slider, toggle) rebind.
 */
window.load = async function load(selector, path) {
    return fetch(path)
        .then((res) => res.text())
        .then((html) => {
            const el = $(selector);
            if (el) el.innerHTML = html;
            window.dispatchEvent(new Event("template-loaded"));
        });
};

/**
 * Re-bind UI handlers + apply auth visibility cho header markup MỚI
 * sau khi `renderHeader()` swap HTML (login → logged-in partial,
 * logout → logged-out partial).
 *
 * Lý do cần rebind thủ công:
 *   - `initLayout()` chỉ init 1 lần lúc boot.
 *   - Khi swap HTML, DOM elements cũ bị thay thế → dropdown toggle,
 *     js-toggle, slider handlers mất.
 *   - `applyAuthVisibility()` (subscribe trong initAuthUI) cũng không
 *     tự động fill user info vào DOM mới vì nó chỉ query toàn page.
 */
function rebindAuthUI() {
    // 1. Re-init UI modules cho DOM mới
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

document.addEventListener("DOMContentLoaded", async () => {
    // 0. Đánh dấu DOM ready
    document.documentElement.classList.add("app-dom-ready");

    // 1. Render layout + init UI handlers (async vì fetch partials)
    await initLayout();

    // 1.5. Wire audio player UI — auto-bind buttons ở #player
    bindAudioPlayerUI();

    // 1.6. Wire search engine — debounced input + dropdown + mobile modal
    initSearch();

    // 2. Wire search close button
    initSearchClose();

    // 3. Wire logout button (global, API-aware)
    initLogoutClick();

    // 4. Init router (sau initLayout vì router render page vào #main)
    initRouter();

    // 4.5. Re-render header khi auth state đổi.
    //      Bắt buộc vì renderHeader ban đầu load partial theo isLoggedIn()
    //      tại thời điểm boot — sau khi user login/logout, cần fetch
    //      partial khác để swap HTML.
    onAuthChange(async () => {
        await Promise.all([
            renderHeader("#header"),
            renderSidebar("#sidebar"),
        ]);
        // Rebind search engine sau khi swap header HTML
        // (vì #navbar-search-input cũ đã bị thay thế bởi partial mới)
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

/**
 * Wire nút X trong ô tìm kiếm (clear input + dispatch event để search reset).
 */
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

/**
 * Wire global logout click handler (Phase 11.5: API-aware).
 *
 * Flow đầy đủ như base.js gốc:
 *   1. Gọi API logout (best-effort — service sẽ nuốt lỗi nếu backend không có endpoint)
 *   2. Clear local storage (token + user)
 *   3. Emit `auth-changed` → `onAuthChange` tự swap header HTML
 *   4. Navigate về home route (giữ Navigo state, KHÔNG reload)
 *   5. Toast success
 *
 * Lưu ý: KHÔNG dùng `window.location.href = "./index.html"` nữa — vì
 * path "index.html" không phải SPA route, Vite sẽ trả về notFoundPage (404 UI).
 */
async function initLogoutClick() {
    document.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-logout]");
        if (!btn) return;
        e.preventDefault();

        try {
            await logoutRequest();
            toast.success(MESSAGES.AUTH.LOGOUT_SUCCESS);
            navigate("/");
        } catch (err) {
            console.error("[main] logout failed:", err);
            toast.error(MESSAGES.AUTH.LOGOUT_FAILED);
        }
    });
}

/** Re-export load() cho backward compat. */
export const load = window.load;
