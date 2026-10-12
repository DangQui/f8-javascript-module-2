/**
 * pages/discover/discover.js — Discover page handler
 *
 * Flow:
 *   1. Render skeleton ngay
 *   2. Fetch 3 endpoints song song (albums, moodsGenres, videos)
 *   3. Render HTML từ `discover.render.js`
 *   4. Inject + re-init sliders
 *
 * Sections (theo base.js `ar()` function):
 *   - Discover Navigation   ← 3 cards (New Releases / Charts / Moods & Genres)
 *   - Albums mới            ← exploreService.getAlbums()
 *   - Tâm trạng & thể loại  ← exploreService.getMoodsGenres() (categories + lines merged)
 *   - Video nhạc mới        ← exploreService.getVideos()
 *
 * Lưu ý:
 *   - Mỗi section fetch fail → fallback `[]` để page vẫn render được.
 *   - PHẢI gọi `initSliders()` vì slider lib scan DOM một lần ở app init,
 *     không tự detect DOM mới.
 *
 * Exports:
 *   - discoverPage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/discover")
 */

import { renderPage } from "@/pages/_shared.js";
import { renderDiscover } from "@/pages/discover/discover.render.js";
import { SKELETON_DISCOVER } from "@/components/skeleton.js";

import { exploreService } from "@/services/exploreService.js";
import { initSliders } from "@/libs/slider.js";
import { toast } from "@/libs/toast.js";
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
/**
 * Render Discover page.
 * @param {{params: object, query: object, url: string}} route
 */
export async function discoverPage(route = {}) {
    void route;
    try {
        // 0. Render skeleton ngay
        renderPage(SKELETON_DISCOVER());

        // 1. Fetch 3 endpoints song song
        //    getMoodsGenres() đã gộp categories + lines thành 1 list (có `path` field)
        const [albums, moodsGenres, videos] = await Promise.all([
            safeFetch(() => exploreService.getAlbums(), [], "getAlbums"),
            safeFetch(() => exploreService.getMoodsGenres(), [], "getMoodsGenres"),
            safeFetch(() => exploreService.getVideos(), [], "getVideos"),
        ]);

        // 2. Render HTML
        const html = renderDiscover({ albums, moodsGenres, videos });

        // 3. Inject + re-init slider
        renderPage(html);
        initSliders();
    } catch (err) {
        console.error("[discover] Critical error:", err);
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
