import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import { renderMoodDetail } from "@/pages/mood-detail/mood-detail.render.js";
import { SKELETON_SECTION } from "@/components/skeleton.js";
import { homeService } from "@/services/homeService.js";
import { initSliders } from "@/libs/slider.js";
import { toast } from "@/libs/toast.js";

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
            renderPlaceholder(
                "Thiếu slug",
                "Không tìm thấy mood được yêu cầu.",
            ),
        );
        return;
    }

    // 0. Render skeleton ngay (UX: user thấy structure trước khi data về)
    renderPage(SKELETON_MOOD_DETAIL());

    try {
        // 1. Fetch parallel: mood details + quick-picks
        const [mood, quickPicks] = await Promise.all([
            homeService.getMoodDetails(slug),
            homeService.getQuickPicksByMood(slug).catch((err) => {
                // Một số mood không có quick-picks (vd slug "nang-luong" test) → []
                console.warn(
                    `[mood-detail] quickPicks for "${slug}" failed:`,
                    err.message,
                );
                return [];
            }),
        ]);

        if (!mood || !mood.hero) {
            renderPage(
                renderPlaceholder(
                    "Không tìm thấy mood",
                    `Mood "${slug}" không tồn tại hoặc đã bị xoá.`,
                ),
            );
            return;
        }

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
