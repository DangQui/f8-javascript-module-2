// ======================================================
// MAIN ENTRY — Vite ES module root (Phase 6)
// ======================================================
//
// Phase 5: render layout (header/sidebar/player) từ `src/layout/`.
// Phase 6: thêm router (Navigo) để handle page navigation.
//

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

// ======================================================
// HELPERS
// ======================================================

/**
 * Re-bind UI handlers + apply auth visibility cho header markup MỚI
 * sau khi renderHeader() swap HTML (login → logged-in partial,
 * logout → logged-out partial).
 *
 * Lý do cần rebind thủ công:
 *   - initLayout() chỉ init 1 lần lúc boot.
 *   - Khi swap HTML, DOM elements cũ bị thay thế → dropdown toggle,
 *     js-toggle, slider handlers mất.
 *   - applyAuthVisibility() (subscribe trong initAuthUI) cũng không
 *     tự động fill user info vào DOM mới vì nó chỉ query toàn page.
 */
function rebindAuthUI() {
    // 1. Re-init UI modules cho DOM mới (sau khi renderHeader/sidebar swap HTML)
    //    - initJsToggle: bind lại .js-toggle (nút bars mobile, X close, ...)
    //    - initDropdowns: bind lại [data-dropdown] (avatar dropdown)
    //    - initSidebarActive: highlight lại sidebar item theo current path
    //    - initUpgradeLink: bind lại [data-upgrade-link] toggle
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
    //    Phase 9.3: async vì renderHeader/renderSidebar/renderPlayer fetch() partials
    await initLayout();

    // 1.5. Wire audio player UI (Phase 8.5) — auto-bind buttons ở #player
    bindAudioPlayerUI();

    // 1.6. Wire search engine (Phase 13) — debounced input + dropdown + mobile modal
    initSearch();

    // 2. Wire search close button (init in layout nhưng tách riêng để dễ quản lý)
    initSearchClose();

    // 3. Wire logout button (global — đã có sẵn từ Phase 3, giữ để backward compat)
    initLogoutClick();

    // 4. Init router (Phase 6) — phải sau initLayout vì router render page vào #main
    initRouter();

    // 4.5. Phase 9.3 fix: Re-render header khi auth state đổi.
    //      Bắt buộc vì renderHeader ban đầu load partial theo isLoggedIn()
    //      tại thời điểm boot — sau khi user login/logout, cần fetch
    //      partial khác để swap HTML (data-user-initial, dropdown, v.v.).
    onAuthChange(async () => {
        await Promise.all([
            renderHeader("#header"),
            renderSidebar("#sidebar"),
        ]);
        // Phase 13: rebind search engine sau khi swap header HTML
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

// ======================================================
// LOGOUT CLICK — global listener (Phase 11.5: API-aware)
// ======================================================
// Phase 3 (multi-page static): reload page về "./index.html" sau logout.
// Phase 9 (SPA + Navigo): KHÔNG reload — chỉ re-render UI qua onAuthChange
// (header swap HTML, sidebar update visibility). Dùng router.navigate("/")
// để đưa user về home route (không reload, giữ Navigo state).
//
// Phase 11.5 (Task B): Thay `logout()` (state mock) bằng `logoutRequest()`
// (authService) để gọi API backend + clear local storage + emit auth-changed
// → onAuthChange tự swap header. Trước đó chỉ gọi state.logout() → backend
// không biết user logout (chỉ clear local). Giờ flow đầy đủ như base.js
// gốc: `await Auth.logout()` + clear + swap + navigate + toast.
//
// Lưu ý: KHÔNG dùng window.location.href = "./index.html" nữa — vì
// path "index.html" không phải SPA route, Vite sẽ trả về notFoundPage
// (404 UI).
async function initLogoutClick() {
    document.addEventListener("click", async (e) => {
        const btn = e.target.closest("[data-logout]");
        if (!btn) return;
        e.preventDefault();

        try {
            // Gọi API logout (best-effort — backend có thể không có endpoint,
            // service sẽ nuốt lỗi) + clear local storage + emit auth-changed
            await logoutRequest();
            toast.success(MESSAGES.AUTH.LOGOUT_SUCCESS);

            // Navigate về home route. onAuthChange sẽ tự swap header HTML
            // (logged-in → logged-out) + sidebar show-when update.
            navigate("/");
        } catch (err) {
            console.error("[main] logout failed:", err);
            toast.error(MESSAGES.AUTH.LOGOUT_FAILED);
        }
    });
}

// ======================================================
// Re-export load() (backward compat)
// ======================================================
export const load = window.load;
