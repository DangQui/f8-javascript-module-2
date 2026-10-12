/**
 * pages/line-detail/line-detail.js — Line Detail page handler
 *
 * Flow:
 *   1. Render skeleton ngay
 *   2. Fetch parallel: 4 endpoints (songs, playlists, videos, albums)
 *   3. Render HTML từ `line-detail.render.js` (empty state nếu cả 4 rỗng)
 *   4. Inject + re-init sliders
 *
 * Port từ `code chức năng gốc/base.js` route handler dòng 5784-5787:
 *   "/lines/:slug": async ({data: e}) => {
 *       let[t,n,r,i] = await Promise.all([
 *           G.Lines.getLineSongs(e.slug),
 *           G.Lines.getLinePlaylists(e.slug),
 *           G.Lines.getLineVideos(e.slug),
 *           G.Lines.getLineAlbums(e.slug)
 *       ]);
 *       await Q( () => pr(t, n, r, i))
 *   }
 *
 * Lưu ý:
 *   - Mỗi fetch fail → fallback `[]` để page vẫn render 3 sections còn lại.
 *   - Cả 4 rỗng → render empty state.
 *   - KHÔNG auto-play (Phase 17 chỉ render theo yêu cầu).
 *   - KHÔNG `recordPlay` event (line detail chưa có event type "line" ở backend).
 *
 * Exports:
 *   - lineDetailPage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/lines/:slug")
 */

import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import {
    renderLineDetail,
    renderLineDetailEmpty,
} from "@/pages/line-detail/line-detail.render.js";
import { linesService } from "@/services/linesService.js";
import { SKELETON_SECTION, skeletonLine, skeletonBox } from "@/components/skeleton.js";
import { initSliders } from "@/libs/slider.js";
import { toast } from "@/libs/toast.js";

/**
 * Render skeleton placeholder cho Line Detail.
 * Match Phase 18: 1 quick-picks section (4 cols × 4 items) + 3 slider sections.
 * @returns {string} HTML
 */
function SKELETON_LINE_DETAIL() {
    return `
        <div class="line-detail-page">
            <section class="home__container">
                <div class="home__row">
                    ${skeletonLine("180px", "32px")}
                    ${skeletonBox("70px", "32px", "999px")}
                </div>
                <div class="quick-picks__list hscroll" data-slider>
                    <div class="hscroll-inner">
                        ${Array.from({ length: 4 }, () => `
                            <div class="col quick-picks-col skeleton-col">
                                ${Array.from({ length: 4 }, () => `
                                    <div class="quick-picks skeleton-quickpick">
                                        ${skeletonBox("64px", "64px", "8px")}
                                        <div class="quick-picks__content">
                                            ${skeletonLine("90%")}
                                            ${skeletonLine("60%")}
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        `).join("")}
                    </div>
                </div>
            </section>
            ${SKELETON_SECTION(true, 6)}
            ${SKELETON_SECTION(true, 6)}
            ${SKELETON_SECTION(true, 6)}
        </div>
    `;
}

/**
 * Render Line Detail page.
 * @param {{params: {slug: string}}} route
 */
export async function lineDetailPage(route = {}) {
    // Defensive: nếu route không truyền slug (lỗi routing)
    const slug = route.params?.slug;
    if (!slug) {
        renderPage(
            renderPlaceholder("Thiếu slug", "Không tìm thấy dòng nhạc được yêu cầu.")
        );
        return;
    }

    // 0. Render skeleton ngay
    renderPage(SKELETON_LINE_DETAIL());

    try {
        // 1. Fetch parallel: 4 endpoints (port base.js dòng 5785-5788)
        //    Mỗi fail → fallback [] (best-effort).
        const [songs, playlists, videos, albums] = await Promise.all([
            linesService.getLineSongs(slug).catch((err) => {
                console.warn(`[line-detail] songs for "${slug}" failed:`, err.message);
                return [];
            }),
            linesService.getLinePlaylists(slug).catch((err) => {
                console.warn(`[line-detail] playlists for "${slug}" failed:`, err.message);
                return [];
            }),
            linesService.getLineVideos(slug).catch((err) => {
                console.warn(`[line-detail] videos for "${slug}" failed:`, err.message);
                return [];
            }),
            linesService.getLineAlbums(slug).catch((err) => {
                console.warn(`[line-detail] albums for "${slug}" failed:`, err.message);
                return [];
            }),
        ]);

        // 2. Check empty (cả 4 rỗng → render empty state)
        if (
            (!Array.isArray(songs) || songs.length === 0) &&
            (!Array.isArray(playlists) || playlists.length === 0) &&
            (!Array.isArray(videos) || videos.length === 0) &&
            (!Array.isArray(albums) || albums.length === 0)
        ) {
            renderPage(renderLineDetailEmpty());
            return;
        }

        // 3. Render HTML (port pr() dòng 4488)
        const html = renderLineDetail({ songs, playlists, videos, albums });

        // 4. Inject
        renderPage(html);

        // 5. Re-init sliders
        initSliders();
    } catch (err) {
        console.error("[line-detail] Critical error:", err);
        const fallback = "Không thể tải chi tiết dòng nhạc. Vui lòng thử lại.";
        toast.error(err.message || fallback);
        renderPage(renderPlaceholder("Đã xảy ra lỗi", err.message || fallback));
    }
}

export default lineDetailPage;
