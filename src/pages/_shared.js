import { initSidebarActive } from "@/libs/sidebar.js";

// ======================================================
// DOM HELPERS
// ======================================================

const MAIN_SELECTOR = "#main";

/**
 * Inject HTML vào main container + scroll to top.
 * @param {string} html
 */
export function renderPage(html) {
    const main = document.querySelector(MAIN_SELECTOR);
    if (!main) {
        console.warn(`[pages] Không tìm thấy "${MAIN_SELECTOR}"`);
        return;
    }
    main.innerHTML = html;

    // Scroll về top khi navigate sang page mới
    window.scrollTo({ top: 0, behavior: "instant" });

    // Re-highlight sidebar item theo route hiện tại
    initSidebarActive();
}

// ======================================================
// LOADING OVERLAY
// ======================================================

const LOADING_CLASS = "app-loading";
const LOADING_MIN_DURATION = 250; // ms — tránh flash nếu page load quá nhanh

let hideTimer = null;

function setLoading(on) {
    const root = document.documentElement;
    if (on) root.classList.add(LOADING_CLASS);
    else root.classList.remove(LOADING_CLASS);
}

export const loading = {
    /**
     * Hiển thị loading overlay.
     */
    show() {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        setLoading(true);
    },

    /**
     * Ẩn loading overlay (delay tối thiểu để tránh flash).
     */
    hide() {
        // Đảm bảo loading hiển thị ít nhất LOADING_MIN_DURATION ms
        // để tránh flash khi page render quá nhanh.
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            setLoading(false);
            hideTimer = null;
        }, LOADING_MIN_DURATION);
    },
};

// ======================================================
// PLACEHOLDER RENDER
// ======================================================

/**
 *
 * @param {string} title - Tiêu đề page
 * @param {string} [description] - Mô tả ngắn
 */
export function renderPlaceholder(
    title,
    description = "Trang này đang được phát triển.",
) {
    return `
        <section class="page-placeholder">
            <h1 class="page-placeholder__title">${title}</h1>
            <p class="page-placeholder__desc">${description}</p>
        </section>
    `;
}

// ======================================================
// ERROR BOUNDARY — wrap page handler (Phase 11.3)
// ======================================================

import { toast } from "@/libs/toast.js";

/**
 * Wrap 1 page handler async để catch tất cả lỗi unexpected.
 *
 * @param {(route?: object) => Promise<void>} pageFn - Page handler (vd: homePage)
 * @param {string} [fallbackMessage] - Message mặc định khi render error placeholder
 * @returns {(route?: object) => Promise<void>} Wrapped handler
 */
export function withErrorBoundary(
    pageFn,
    fallbackMessage = "Đã xảy ra lỗi không xác định",
) {
    return async function wrappedPageHandler(route) {
        try {
            await pageFn(route);
        } catch (err) {
            // Log đầy đủ cho dev
            console.error("[error-boundary] Caught unhandled error:", err);

            // Render placeholder an toàn (không crash UI)
            const message = err?.message || fallbackMessage;
            renderPage(`
                <section class="page-placeholder">
                    <h1 class="page-placeholder__title">Đã xảy ra lỗi</h1>
                    <p class="page-placeholder__desc">${escapeHtmlForBoundary(message)}</p>
                </section>
            `);

            // Toast warning nếu toast available (best-effort)
            try {
                toast.error(message);
            } catch {
                /* toast có thể chưa load — bỏ qua */
            }
        }
    };
}

/**
 * Escape HTML cho error boundary (tránh XSS nếu err.message chứa HTML).
 * @param {string} str
 * @returns {string}
 */
function escapeHtmlForBoundary(str) {
    if (typeof str !== "string") return String(str);
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
