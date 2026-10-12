/**
 * layout/sidebar.js — Render sidebar partial
 *
 * SSOT (Single Source of Truth): sidebar HTML chỉ tồn tại trong file partial,
 * không duplicate trong JS. Logic:
 *   1. Build time: index.html embed partials/sidebar.html → FCP nhanh
 *   2. Runtime: fetch partial → inject innerHTML (giống hệt build time markup)
 *
 * Navigation: dùng `data-navigo` + path thuần (`/`, `/discover`, ...)
 * để Navigo handle click không reload.
 *
 * Exports:
 *   - renderSidebar(target) → inject sidebar HTML vào target
 *
 * Consumed by:
 *   - `@/layout/init.js` gọi trong Promise.all render layout
 */

const PARTIAL_URL = "/partials/sidebar.html";

/**
 * Fetch HTML partial từ server. Trả về string rỗng nếu lỗi
 * (app không crash, user vẫn thấy HTML build-time có sẵn).
 *
 * Dùng `cache: "default"` để Vite HMR + browser nhận file mới khi sửa.
 * KHÔNG dùng `force-cache` vì browser sẽ cache vĩnh viễn.
 */
async function fetchPartial(url) {
    try {
        const res = await fetch(url, { cache: "default" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.text();
    } catch (err) {
        console.warn('[layout/sidebar] Không fetch được "' + url + '":', err);
        return "";
    }
}

/**
 * Render sidebar vào container.
 * innerHTML thay thế toàn bộ (HTML build-time từ index.html bị overwrite).
 *
 * @param {string|HTMLElement} target - CSS selector hoặc element
 * @returns {Promise<void>}
 */
export async function renderSidebar(target) {
    const el = typeof target === "string"
        ? document.querySelector(target)
        : target;
    if (!el) {
        console.warn('[layout/sidebar] Không tìm thấy container "' + target + '"');
        return;
    }

    const html = await fetchPartial(PARTIAL_URL);
    if (html) {
        el.innerHTML = html;
    } else {
        console.info("[layout/sidebar] Dùng HTML build-time làm fallback");
    }
}
