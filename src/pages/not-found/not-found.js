// ======================================================
// NOT FOUND PAGE — 404
// ======================================================
//
// Flow:
//   1. Show loading overlay (router hook before)
//   2. Get URL path user đã gõ (để echo lại cho user biết)
//   3. Render 404 page (icon + title + path echo + CTA buttons)
//   4. Hide loading overlay
//
// Routing: được register qua `router.notFound()` trong libs/router.js.
// Bất kỳ URL nào không match routes đã định → vào đây.
//

import { renderPage, loading } from "@/pages/_shared.js";
import { renderNotFoundPage } from "@/pages/not-found/not-found.render.js";

/**
 * Render Not Found page (mọi URL không match).
 * @param {{ params: object, query: object, url: string }} route
 */
export async function notFoundPage(route = {}) {
    loading.show();
    try {
        // Echo lại URL user đã gõ để họ biết đường dẫn sai ở đâu
        // (port từ base.js — chỉ hiển thị path, không show query để gọn)
        const url = route?.url || window.location.pathname;
        const pathOnly = stripOrigin(url);

        // Render 404 page
        renderPage(renderNotFoundPage(pathOnly));
    } finally {
        loading.hide();
    }
}

/**
 * Strip origin (http://localhost:5173) → chỉ giữ path + query.
 * Tránh việc hiển thị nguyên URL dài dòng.
 */
function stripOrigin(url) {
    if (!url) return "";
    try {
        // Nếu là full URL → parse
        const u = new URL(url, window.location.origin);
        return u.pathname + u.search;
    } catch {
        // Fallback: nếu đã là path rồi → return nguyên
        return url;
    }
}

export default notFoundPage;