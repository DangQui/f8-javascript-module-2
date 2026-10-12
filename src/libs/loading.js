/**
 * loading.js — Page-level loading overlay
 *
 * Toggle class `app-loading` trên `<html>` element để show/hide spinner overlay
 * (CSS định nghĩa ở `src/styles/base/_loading.scss`).
 *
 * Exports:
 *   - loading.show()  → show overlay
 *   - loading.hide()  → hide overlay
 *   - showLoading()   → alias
 *   - hideLoading()   → alias
 *
 * Consumed by:
 *   - `@/libs/router.js` before/after hooks (safety net)
 *   - `@/pages/_shared.js` re-export qua `loading.show()/hide()`
 *   - Một số page handler dùng trong try/finally
 */

export function showLoading() {
    document.documentElement.classList.add("app-loading");
}

export function hideLoading() {
    document.documentElement.classList.remove("app-loading");
}

export const loading = {
    show: showLoading,
    hide: hideLoading,
};
