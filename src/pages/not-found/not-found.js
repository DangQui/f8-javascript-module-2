/**
 * pages/not-found/not-found.js — 404 page handler
 *
 * Flow:
 *   1. Show loading overlay
 *   2. Get URL path user đã gõ (echo lại để user biết đường dẫn sai)
 *   3. Render 404 page (icon + title + path echo + CTA buttons)
 *   4. Hide loading overlay
 *
 * Routing: register qua `router.notFound()` trong libs/router.js.
 * Bất kỳ URL nào không match routes đã định → vào đây.
 *
 * Exports:
 *   - notFoundPage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (fallback `router.notFound()`)
 */

import { renderPage, loading } from "@/pages/_shared.js";
import { renderNotFoundPage } from "@/pages/not-found/not-found.render.js";

/**
 * Render Not Found page.
 * @param {{params: object, query: object, url: string}} route
 */
export async function notFoundPage(route = {}) {
    loading.show();
    try {
        // Echo lại URL user đã gõ để họ biết đường dẫn sai ở đâu
        const url = route?.url || window.location.pathname;
        const pathOnly = stripOrigin(url);

        renderPage(renderNotFoundPage(pathOnly));
    } finally {
        loading.hide();
    }
}

/**
 * Strip origin (http://localhost:5173) → chỉ giữ path + query.
 * Tránh hiển thị nguyên URL dài dòng.
 */
function stripOrigin(url) {
    if (!url) return "";
    try {
        const u = new URL(url, window.location.origin);
        return u.pathname + u.search;
    } catch {
        // Fallback: nếu đã là path rồi → return nguyên
        return url;
    }
}

export default notFoundPage;
