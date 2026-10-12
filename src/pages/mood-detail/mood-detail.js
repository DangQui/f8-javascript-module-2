// ======================================================
// MOOD DETAIL PAGE — Init + render
// ======================================================
//
// Flow:
//   1. Show loading overlay (router before hook tự lo)
//   2. Render skeleton ngay (UX tốt hơn spinner overlay)
//   3. Fetch parallel: getMoodDetails(slug) + getQuickPicksByMood(slug)
//   4. Render HTML từ `mood-detail.render.js`
//   5. Inject vào #main + re-init sliders
//
// Port từ `code chức năng gốc/base.js` route handler dòng 5767-5771:
//   "/moods/:slug": async ({data: e}) => {
//       let t = await G.Home.getMoodDetails(e.slug)
//         , n = await G.Home.getQuickPicksByMood(e.slug);
//       await Q( () => dr(t, n, e))
//   }
//
// Lưu ý:
//   - `quickPicks` rỗng cho 1 số mood → render empty state.
//   - Mỗi fetch fail → fallback `{}` / `[]` để page vẫn render.
//   - Sau render PHẢI gọi `initSliders()` vì slider lib scan DOM
//     một lần ở app init, không tự detect DOM mới.
//

import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import { renderMoodDetail } from "@/pages/mood-detail/mood-detail.render.js";
import { SKELETON_SECTION } from "@/components/skeleton.js";
import { homeService } from "@/services/homeService.js";
import { initSliders } from "@/libs/slider.js";
import { toast } from "@/libs/toast.js";

/**
 * Render skeleton placeholder cho Mood Detail (Phase 11.2 pattern).
 * Mood detail có 1 hero (H1 + p) + N sections → dùng 1 hero skeleton
 * + 1 section skeleton để user thấy structure.
 */
function SKELETON_MOOD_DETAIL() {
    return `
        <div class="mood-page">
            <div class="mood-page__chip-tabs">
                ${Array.from({ length: 5 }, () => `<div class="skeleton-box" style="height:32px;width:90px;border-radius:9999px;"></div>`).join("")}
            </div>
            <div class="skeleton-box" style="height:45px;width:300px;margin-bottom:16px;"></div>
            <div class="skeleton-box" style="height:20px;width:500px;margin-bottom:24px;"></div>
            ${SKELETON_SECTION(true, 6)}
        </div>
    `;
}

// ======================================================
// MAIN RENDER
// ======================================================

/**
 * Render Mood Detail page.
 *
 * @param {{ data: { slug: string } }} params - Navigo route params
 */
export async function moodDetailPage(route = {}) {
    // Defensive: nếu route không truyền slug (lỗi routing)
    const slug = route.params?.slug;
    if (!slug) {
        renderPage(
            renderPlaceholder("Thiếu slug", "Không tìm thấy mood được yêu cầu.")
        );
        return;
    }

    // 0. Render skeleton ngay (UX: user thấy structure trước khi data về)
    renderPage(SKELETON_MOOD_DETAIL());

    try {
        // 1. Fetch parallel: mood details + quick-picks
        //    (port base.js dòng 5768-5769)
        const [mood, quickPicks] = await Promise.all([
            homeService.getMoodDetails(slug),
            homeService.getQuickPicksByMood(slug).catch((err) => {
                // Một số mood không có quick-picks (vd slug "nang-luong" test) → []
                console.warn(`[mood-detail] quickPicks for "${slug}" failed:`, err.message);
                return [];
            }),
        ]);

        if (!mood || !mood.hero) {
            renderPage(
                renderPlaceholder(
                    "Không tìm thấy mood",
                    `Mood "${slug}" không tồn tại hoặc đã bị xoá.`
                )
            );
            return;
        }

        // 2. Render HTML (port base.js dr() dòng 4470-4478)
        const html = await renderMoodDetail(mood, quickPicks, slug);

        // 3. Inject
        renderPage(html);

        // 4. Re-init sliders (chip tabs + dynamic sections có data-slider)
        initSliders();
    } catch (err) {
        console.error("[mood-detail] Critical error:", err);
        const fallback = "Không thể tải chi tiết mood. Vui lòng thử lại.";
        toast.error(err.message || fallback);
        renderPage(renderPlaceholder("Đã xảy ra lỗi", err.message || fallback));
    }
}

export default moodDetailPage;