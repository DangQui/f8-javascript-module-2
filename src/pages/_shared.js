// ======================================================
// PAGES — Shared helpers
// ======================================================
//
// Phase 6: cung cấp utility cho page render + loading overlay.
// Phase 7+ sẽ dùng helper này để render nội dung page thật.
//
// Cơ chế hoạt động:
//   1. Page module export `render({ params, query })` async function.
//   2. Router gọi page.render() khi navigate tới route.
//   3. `renderPage(html)` inject HTML vào #main + scroll to top.
//   4. `loading.show()/hide()` toggle loading overlay.
//   5. `initSidebarActive()` highlight sidebar item theo route hiện tại.
//
// USAGE:
//   import { renderPage, loading } from "@/pages/_shared.js";
//
//   export async function homePage() {
//       loading.show();
//       try {
//           renderPage("<h1>Home</h1>");
//       } finally {
//           loading.hide();
//       }
//   }
//

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
//
// Toggle class `app-loading` trên <html> để hiển thị spinner.
// Spinner CSS đã có sẵn ở `src/styles/base/_loading.scss`.
//
// Tham khảo phase plan:
// - _loading.scss có class `.app-loading` với ::before/::after làm overlay
// - Sau khi load xong → remove `.app-loading` để ẩn spinner
//

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
 * Render trang placeholder "Coming soon..." — dùng cho các page
 * chưa implement ở Phase 7+.
 *
 * @param {string} title - Tiêu đề page
 * @param {string} [description] - Mô tả ngắn
 */
export function renderPlaceholder(title, description = "Trang này đang được phát triển.") {
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
// USAGE:
//   import { withErrorBoundary } from "@/pages/_shared.js";
//   export const safeHomePage = withErrorBoundary(homePage, "Không thể tải trang chủ");
//
// Lưu ý: KHÔNG thay thế try/catch bên trong page handler (vẫn cần để
// render lỗi gracefully với data cụ thể). `withErrorBoundary` chỉ là
// SAFETY NET cuối cùng.

import { toast } from "@/libs/toast.js";

/**
 * Wrap 1 page handler async để catch tất cả lỗi unexpected.
 *
 * @param {(route?: object) => Promise<void>} pageFn - Page handler (vd: homePage)
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
