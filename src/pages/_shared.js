/**
 * pages/_shared.js — Shared helpers cho page render
 *
 * Cung cấp:
 *   - renderPage(html): inject HTML vào #main + scroll to top + highlight sidebar
 *   - loading.show()/hide(): toggle class `app-loading` trên <html> (spinner overlay)
 *   - renderPlaceholder(title, desc): page "Coming soon..." cho page chưa impl
 *   - withErrorBoundary(pageFn, fallbackMessage): wrap handler để catch tất cả
 *     lỗi unexpected (TypeError, ReferenceError, ...) — render placeholder + toast
 *
 * Pattern dùng:
 *   1. Page module export `render({ params, query })` async function.
 *   2. Router gọi page.render() khi navigate tới route.
 *   3. `renderPage(html)` inject HTML vào #main + scroll to top.
 *   4. `initSidebarActive()` highlight sidebar item theo route hiện tại.
 *
 * Consumed by:
 *   - Tất cả page handlers trong `@/pages/**`
 *   - `@/libs/router.js` (route registration)
 */

import { initSidebarActive } from "@/libs/sidebar.js";
import { toast } from "@/libs/toast.js";
const MAIN_SELECTOR = "#main";

/**
 * Inject HTML vào main container + scroll to top + highlight sidebar.
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
//
// Toggle class `app-loading` trên <html> để hiển thị spinner.
// Spinner CSS định nghĩa ở `src/styles/base/_loading.scss`.
//
// `hide()` có delay tối thiểu (250ms) để tránh flash khi page render quá nhanh.

const LOADING_CLASS = "app-loading";
const LOADING_MIN_DURATION = 250; // ms
let hideTimer = null;

function setLoading(on) {
    const root = document.documentElement;
    if (on) root.classList.add(LOADING_CLASS);
    else root.classList.remove(LOADING_CLASS);
}

export const loading = {
    /** Hiển thị loading overlay. */
    show() {
        if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
        }
        setLoading(true);
    },

    /** Ẩn loading overlay (delay tối thiểu để tránh flash). */
    hide() {
        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            setLoading(false);
            hideTimer = null;
        }, LOADING_MIN_DURATION);
    },
};
/**
 * Render trang placeholder "Coming soon..." — dùng cho các page chưa impl.
 * @param {string} title - Tiêu đề page
 * @param {string} [description] - Mô tả ngắn
 * @returns {string} HTML
 */
export function renderPlaceholder(title, description = "Trang này đang được phát triển.") {
    return `
        <section class="page-placeholder">
            <h1 class="page-placeholder__title">${title}</h1>
            <p class="page-placeholder__desc">${description}</p>
        </section>
    `;
}
//
// Cơ chế: 1 số page handler có thể throw lỗi UNEXPECTED (không phải AppError
// mà là runtime error như TypeError, ReferenceError, ...). Phase 20 đã xử lý
// lỗi từ API (throw AppError), nhưng lỗi runtime trong page render (vd:
// gọi `.map()` trên undefined, syntax error template) thì throw raw Error
// → Promise reject → page trắng + console error.
//
// `withErrorBoundary(pageFn, fallbackMessage)` wrap page handler để catch
// MỌI lỗi, render placeholder an toàn + toast warning (nếu toast available).
//
// Lưu ý: KHÔNG thay thế try/catch bên trong page handler (vẫn cần để
// render lỗi gracefully với data cụ thể). `withErrorBoundary` chỉ là
// SAFETY NET cuối cùng.

/**
 * Wrap 1 page handler async để catch tất cả lỗi unexpected.
 * @param {(route?: object) => Promise<void>} pageFn - Page handler
 * @param {string} [fallbackMessage] - Message mặc định khi render error placeholder
 * @returns {(route?: object) => Promise<void>} Wrapped handler
 */
export function withErrorBoundary(pageFn, fallbackMessage = "Đã xảy ra lỗi không xác định") {
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

/** Escape HTML cho error boundary (tránh XSS nếu err.message chứa HTML). */
function escapeHtmlForBoundary(str) {
    if (typeof str !== "string") return String(str);
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
