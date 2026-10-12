/**
 * pages/new-releases/new-releases.js — New Releases page handler
 *
 * Flow (port từ base.js route `/new-releases` dòng 5757-5760):
 *   1. Render skeleton ngay
 *   2. Parallel fetch `exploreService.getNewReleases()` + `getVideos()`
 *   3. Render HTML từ `new-releases.render.js`
 *   4. Inject vào #main
 *
 * Data shape (từ API):
 *   - getNewReleases() → [{ id, slug, title, thumbnails[], artists[], albumType }]
 *   - getVideos()      → [{ id, slug, title, thumbnails[], artists[], albumType }]
 *
 * Exports:
 *   - newReleasesPage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/new-releases")
 */

import { renderPage } from "@/pages/_shared.js";
import { renderNewReleases } from "@/pages/new-releases/new-releases.render.js";
import { SKELETON_SECTION } from "@/components/skeleton.js";
import { exploreService } from "@/services/exploreService.js";
import { toast } from "@/libs/toast.js";

/**
 * Render New Releases page handler.
 * @param {object} [route] - Navigo route (không dùng)
 */
export async function newReleasesPage(route = {}) {
    void route;
    try {
        // 0. Render skeleton ngay
        renderPage(SKELETON_SECTION(true, 6) + SKELETON_SECTION(true, 6));

        // 1. Parallel fetch
        const [albums, videos] = await Promise.all([
            exploreService.getNewReleases(),
            exploreService.getVideos(),
        ]);

        // 2. Render HTML
        const html = renderNewReleases(albums, videos);

        // 3. Inject
        renderPage(html);
    } catch (err) {
        console.error("[new-releases] Critical error:", err);
        const fallback = "Không thể tải trang Bản phát hành mới. Vui lòng thử lại.";
        toast.error(err.message || fallback);
        renderPage(`
            <section class="page-placeholder">
                <h1 class="page-placeholder__title">Đã xảy ra lỗi</h1>
                <p class="page-placeholder__desc">${err.message || "Unknown error"}</p>
            </section>
        `);
    }
}

export default newReleasesPage;
