import { renderPage } from "@/pages/_shared.js";
import { renderDiscover } from "@/pages/discover/discover.render.js";
import { SKELETON_DISCOVER } from "@/components/skeleton.js";

import { exploreService } from "@/services/exploreService.js";
import { initSliders } from "@/libs/slider.js";
import { toast } from "@/libs/toast.js";

// ======================================================
// SAFE FETCH — try/catch wrapper, fallback về []
// ======================================================

/**
 * Wrapper: gọi async function, nếu throw → log + return fallback.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {T} fallback
 * @param {string} label - Log label
 * @returns {Promise<T>}
 */
async function safeFetch(fn, fallback, label) {
    try {
        return await fn();
    } catch (err) {
        console.warn(`[discover] ${label} failed:`, err.message);
        return fallback;
    }
}

// ======================================================
// MAIN RENDER
// ======================================================

/**
 * Render Discover page.
 * @param {{ params: object, query: object, url: string }} route
 */
export async function discoverPage(route = {}) {
    // Nếu dùng cả 2 → spinner overlay che skeleton, user không thấy structure.

    try {
        // 0. Render skeleton ngay (UX: user thấy structure trước khi data về)
        renderPage(SKELETON_DISCOVER());

        // 1. Fetch 3 endpoints song song
        //    getMoodsGenres() đã gộp categories + lines thành 1 list (có `path` field)
        const [albums, moodsGenres, videos] = await Promise.all([
            safeFetch(() => exploreService.getAlbums(), [], "getAlbums"),
            safeFetch(
                () => exploreService.getMoodsGenres(),
                [],
                "getMoodsGenres",
            ),
            safeFetch(() => exploreService.getVideos(), [], "getVideos"),
        ]);

        // 2. Render HTML
        const html = renderDiscover({
            albums,
            moodsGenres,
            videos,
        });

        // 3. Inject + re-init slider
        renderPage(html);
        initSliders();
    } catch (err) {
        console.error("[discover] Critical error:", err);
        // Ưu tiên err.message (từ AppError mapApiError) thay vì hardcode
        const fallback = "Không thể tải trang Khám phá. Vui lòng thử lại.";
        toast.error(err.message || fallback);
        renderPage(`
            <section class="page-placeholder">
                <h1 class="page-placeholder__title">Đã xảy ra lỗi</h1>
                <p class="page-placeholder__desc">${err.message || "Unknown error"}</p>
            </section>
        `);
    }
}

export default discoverPage;
