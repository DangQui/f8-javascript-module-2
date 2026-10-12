// ======================================================
// LIBRARY PAGE — Placeholder (chờ backend có API /library/*)
// ======================================================
//
// base.js gốc (`or()` function, dòng 4300) cũng chỉ là placeholder đơn giản.
// Khi backend implement API /library/* → fetch + render sections:
//   - playlists/albums/artists/songs đã lưu của user.
//
// Auth guard: nếu chưa login → navigate /auth/login + toast.

import { renderPage, renderPlaceholder, loading } from "@/pages/_shared.js";
import { requireAuth } from "@/state/authState.js";
import { MESSAGES } from "@/utils/messages.js";

/**
 * Render Library page.
 * @param {{ params: object, query: object, url: string }} route
 */
export async function libraryPage(route = {}) {
    void route;
    loading.show();
    try {
        // 1. Auth guard (port từ base.js:5748 — `Ar() && await Q(or)`)
        if (!requireAuth("/auth/login", MESSAGES.AUTH.LIBRARY_GUARD)) {
            // Chưa login → helper đã navigate /auth/login + toast → return
            return;
        }

        // 2. Render
        renderPage(renderPlaceholder(
            "Thư viện",
            "Danh sách phát, album đã lưu, nghệ sĩ theo dõi,… Sẽ implement khi backend có API riêng."
        ));
    } finally {
        loading.hide();
    }
}

export default libraryPage;
