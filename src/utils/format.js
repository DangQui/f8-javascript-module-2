/**
 * format.js — Pure formatting utilities
 *
 * Pure functions (no side-effects, no DOM) để format dữ liệu hiển thị.
 *
 * Exports:
 *   - formatDuration(s)  → "mm:ss" hoặc "h:mm:ss"
 *   - formatViews(n)     → compact "1.2K", "3.4M" (1 decimal, EN-style)
 *   - formatViewsVN(n)   → Vietnamese "1 N", "2 Tr", "3 T" (no decimal)
 *   - escapeHtml(str)    → escape để chèn an toàn vào innerHTML
 *   - escapeAttr(str)    → alias cho escapeHtml (cho HTML attribute context)
 *   - debounce(fn, ms)   → delay invocation cho đến khi ngừng gọi `wait` ms
 *
 * Consumed by:
 *   - `@/components/track-item.js` dùng formatDuration
 *   - `@/pages/top-artist`, `@/components/card-item.js` dùng formatViewsVN
 *   - `@/components/video-slider.js` dùng formatViews
 *   - Mọi file render HTML dynamic dùng escapeHtml để chèn text
 *   - `@/components/search.js` dùng debounce cho input
 */

/**
 * Format seconds → "mm:ss" hoặc "hh:mm:ss".
 * @param {number} seconds
 * @returns {string}
 *
 * @example
 * formatDuration(95)    // "1:35"
 * formatDuration(3725)  // "1:02:05"
 */
export function formatDuration(seconds) {
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
        return "0:00";
    }
    const s = Math.floor(seconds);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;

    // Pad 2 chữ số để format "mm:ss" luôn đúng width.
    const pad = (n) => String(n).padStart(2, "0");

    return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}

/**
 * Format số lượt view theo compact (1.2M, 3.4K, ...).
 * @param {number} n
 * @returns {string}
 *
 * @example
 * formatViews(1234)    // "1.2K"
 * formatViews(1234567) // "1.2M"
 */
export function formatViews(n) {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "0";
    if (n < 1000) return String(n);
    if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    if (n < 1_000_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
}

/**
 * Escape HTML để chèn text an toàn vào innerHTML.
 * Phải dùng mỗi khi render text từ user/API vào DOM.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/**
 * Escape text cho HTML attribute context.
 * Hiện tại escapeHtml đã handle cả ", ', <, >, & nên dùng chung được.
 * Tách riêng để call site rõ ràng ý định (vs body text).
 * @param {string} str
 * @returns {string}
 */
export const escapeAttr = escapeHtml;

/**
 * Format số view theo locale Việt Nam (port từ base.js `Qn()` dòng 4054).
 * Logic: >=1e9 → "X T", >=1e6 → "X Tr", >=1e3 → "X N", else raw.
 * Không thập phân (khác `formatViews` dùng K/M/B với 1 decimal).
 *
 * @param {number} n - Số view
 * @returns {string} Formatted string tiếng Việt
 *
 * @example
 * formatViewsVN(1234)    // "1 N"
 * formatViewsVN(1500000) // "1 Tr"
 * formatViewsVN(2.5e9)   // "3 T"
 */
export function formatViewsVN(n) {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "0";
    if (n >= 1e9) return Math.floor(n / 1e9) + " T";
    if (n >= 1e6) return Math.floor(n / 1e6) + " Tr";
    if (n >= 1e3) return Math.floor(n / 1e3) + " N";
    return String(Math.floor(n));
}

/**
 * Debounce — delay invocation cho đến khi ngừng gọi `wait` ms.
 * Trả về wrapper function, không gọi fn ngay. Khi gọi liên tục,
 * reset timer; chỉ chạy fn khi ngừng gọi `wait` ms.
 *
 * @template {(...args: any[]) => any} F
 * @param {F} fn - Hàm cần debounce
 * @param {number} wait - Thời gian chờ (ms)
 * @returns {(...args: Parameters<F>) => void} Wrapper
 */
export function debounce(fn, wait = 300) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
    };
}
