import { renderPage, loading } from "@/pages/_shared.js";
import { renderNotFoundPage } from "@/pages/not-found/not-found.render.js";

/**
 * Render Not Found page (mọi URL không match).
 * @param {{ params: object, query: object, url: string }} route
 */
export async function notFoundPage(route = {}) {
    loading.show();
    try {
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
