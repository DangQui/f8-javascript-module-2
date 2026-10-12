/**
 * pages/library/library.js — Library page handler
 *
 * Tabs: playlists | songs | albums | artists | recent
 * Dùng `localStorage` để render user playlists (khi backend `/me/*` chưa có)
 * + listen history.
 *
 * Auth guard: chưa login → navigate /auth/login + toast.
 *
 * Exports:
 *   - libraryPage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/library" + tab hash)
 */

import { renderPage, loading } from "@/pages/_shared.js";
import { requireAuth } from "@/state/authState.js";
import { MESSAGES } from "@/utils/messages.js";
import { renderLibraryPage } from "@/pages/library/library.render.js";

/**
 * Render Library page.
 * @param {{params: object, query: object, url: string}} route
 */
export async function libraryPage(route = {}) {
    loading.show();
    try {
        // 1. Auth guard
        if (!requireAuth("/auth/login", MESSAGES.AUTH.LIBRARY_GUARD)) {
            // Chưa login → helper đã navigate + toast → return
            return;
        }

        // 2. Render (5 tabs, mỗi tab có handler riêng)
        renderPage(renderLibraryPage());
    } finally {
        loading.hide();
    }
}

export default libraryPage;
