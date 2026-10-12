/**
 * sidebar.js — Sidebar UI handlers (highlight active + upgrade toggle)
 *
 * Layer: layout-libs (pure DOM, no API, no state).
 *
 * Exports:
 *   - initSidebarActive()  → highlight active sidebar item theo URL hiện tại
 *   - initUpgradeLink()     → toggle "Nâng cấp" button
 *
 * Consumed by:
 *   - `@/layout/init.js` gọi sau khi sidebar render xong
 *
 * Lưu ý:
 *   - Logic match path: "/" (root) match nhiều biến thể (path thuần hoặc HTML file).
 *   - Path khác: so khớp CHÍNH XÁC với current pathname.
 */

import { $$ } from "@/utils/dom-helpers.js";

/** @returns {string} Current pathname không query/hash. */
function getCurrentPath() {
    return window.location.pathname || "/";
}

/**
 * Match current path với href sidebar item.
 *   - "/" (root): khớp "/" và các biến thể index.html
 *   - Path khác: khớp CHÍNH XÁC
 * @param {string} currentPath @param {string} href @returns {boolean}
 */
function isPathMatch(currentPath, href) {
    if (!href || href === "#!" || href === "#") return false;

    if (currentPath === "/") {
        const rootVariants = [
            "/", "/index.html", "/index-logined.html",
            "./index.html", "./index-logined.html"
        ];
        return rootVariants.includes(href);
    }

    return href === currentPath;
}

/** Highlight sidebar item active theo URL hiện tại. */
export function initSidebarActive() {
    const currentPath = getCurrentPath();

    $$(".sidebar-item, .sidebar-slide__item").forEach((item) => {
        if (item.hasAttribute("data-upgrade-link")) return;

        const href = item.getAttribute("href");
        if (!isPathMatch(currentPath, href)) {
            item.classList.remove("active");
            return;
        }
        item.classList.add("active");
    });
}

/** Toggle "Nâng cấp" button active state (vì không có trang thật). */
export function initUpgradeLink() {
    $$("[data-upgrade-link]").forEach((item) => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            $$(".sidebar-item, .sidebar-slide__item").forEach((other) => {
                if (other !== item) other.classList.remove("active");
            });
            item.classList.toggle("active");
        });
    });
}
