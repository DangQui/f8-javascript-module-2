/**
 * Format seconds → "mm:ss" hoặc "hh:mm:ss".
 * @param {number} seconds
 * @returns {string}
 *
 * @example
 */
export function formatDuration(seconds) {
    if (
        typeof seconds !== "number" ||
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {
        return "0:00";
    }
    const s = Math.floor(seconds);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;

    const pad = (n) => String(n).padStart(2, "0");

    return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}

/**
 * @param {number} n
 * @returns {string}
 *
 * @example
 */
export function formatViews(n) {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "0";
    if (n < 1000) return String(n);
    if (n < 1_000_000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    if (n < 1_000_000_000)
        return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
}

/**
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
 *
 * @param {number} n - Số view
 * @returns {string} Formatted string tiếng Việt
 *
 * @example
 */
export function formatViewsVN(n) {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "0";
    if (n >= 1e9) return Math.floor(n / 1e9) + " T";
    if (n >= 1e6) return Math.floor(n / 1e6) + " Tr";
    if (n >= 1e3) return Math.floor(n / 1e3) + " N";
    return String(Math.floor(n));
}

/**
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
