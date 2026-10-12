/**
 * layout/header.js — Render header partial (logged-in vs logged-out)
 *
 * SSOT (Single Source of Truth): header HTML chỉ tồn tại trong file partial,
 * không duplicate trong JS. Logic:
 *   1. Build time: index.html embed partials/header-logged-out.html -> FCP nhanh
 *   2. Runtime: fetch partial -> inject innerHTML (giống hệt build time markup)
 *   3. Auth state change: re-fetch partial khác -> swap HTML
 *
 * Exports:
 *   - renderHeader(target) -> inject header HTML vào target
 *
 * Consumed by:
 *   - @/layout/init.js gọi trong Promise.all render layout
 *   - @/state/authState.js gọi lại khi auth state change
 */

import { isLoggedIn } from "@/state/authState.js";

/** Partial paths — work cả dev (Vite serve) và build (file copy vào dist/). */
const PARTIAL_LOGGED_OUT = "/partials/header-logged-out.html";
const PARTIAL_LOGGED_IN = "/partials/header-logged-in.html";

/**
 * Fetch HTML partial từ server. Trả về string rỗng nếu lỗi
 * (app không crash, user vẫn thấy HTML build-time có sẵn).
 *
 * Dùng cache: "default" để Vite HMR + browser nhận file mới khi sửa.
 * KHÔNG dùng force-cache vì browser sẽ cache vĩnh viễn.
 */
async function fetchPartial(url) {
    try {
        const res = await fetch(url, { cache: "default" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.text();
    } catch (err) {
        console.warn('[layout/header] Không fetch được "' + url + '":', err);
        return "";
    }
}

/**
 * Render header vào container.
 *   - isLoggedIn() === true  -> fetch partial logged-in
 *   - isLoggedIn() === false -> fetch partial logged-out
 */
export async function renderHeader(target) {
    const el = typeof target === "string"
        ? document.querySelector(target)
        : target;
    if (!el) {
        console.warn('[layout/header] Không tìm thấy container "' + target + '"');
        return;
    }

    const url = isLoggedIn() ? PARTIAL_LOGGED_IN : PARTIAL_LOGGED_OUT;
    const html = await fetchPartial(url);

    if (html) {
        el.innerHTML = html;
        el.dispatchEvent(new CustomEvent("header:rendered", { bubbles: true }));
    } else {
        console.info("[layout/header] Dùng HTML build-time làm fallback");
    }
}