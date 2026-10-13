import { $$ } from "@/utils/dom-helpers.js";

/** @returns {string} Current pathname không query/hash. */
function getCurrentPath() {
    return window.location.pathname || "/";
}

/**
 * Match current path với href sidebar item.
 *
 * Logic:
 *   - "/" (root): khớp "/" và các biến thể index.html
 *   - Path khác: khớp CHÍNH XÁC, hoặc "starts with" nếu href là parent
 *     (đề phòng trailing slash, sub-routes như /auth/login/foo)
 *
 * @param {string} currentPath @param {string} href @returns {boolean}
 */
function isPathMatch(currentPath, href) {
    if (!href || href === "#!" || href === "#") return false;

    if (currentPath === "/") {
        const rootVariants = [
            "/",
            "/index.html",
            "/index-logined.html",
            "./index.html",
            "./index-logined.html",
        ];
        return rootVariants.includes(href);
    }

    // Exact match (case thường)
    if (href === currentPath) return true;

    // Normalize trailing slash: "/auth/login/" === "/auth/login"
    const normCurrent = currentPath.replace(/\/+$/, "") || "/";
    const normHref = href.replace(/\/+$/, "") || "/";
    if (normHref === normCurrent) return true;

    // Sub-route match: href là parent của currentPath
    // VD: href="/auth/login" + currentPath="/auth/login/abc" → match
    if (normCurrent.startsWith(normHref + "/")) return true;

    return false;
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
