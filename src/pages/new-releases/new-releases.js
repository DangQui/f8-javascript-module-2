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
    try {
        // 0. Render skeleton ngay (UX: user thấy structure trước)
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
        // Ưu tiên err.message (từ AppError mapApiError) thay vì hardcode
        const fallback =
            "Không thể tải trang Bản phát hành mới. Vui lòng thử lại.";
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
