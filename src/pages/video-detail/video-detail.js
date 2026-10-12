import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import { renderVideoDetail } from "@/pages/video-detail/video-detail.render.js";
import { SKELETON_VIDEO_DETAIL } from "@/components/skeleton.js";
import * as videoOverlay from "@/components/video-overlay.js";
import { audioPlayer } from "@/components/audio-player.js";

import { detailsService } from "@/services/detailsService.js";
import { toast } from "@/libs/toast.js";

// ======================================================
// MAIN RENDER
// ======================================================

/**
 * Render Video Detail page.
 * @param {{ params: object, query: object, url: string }} route
 */
export async function videoDetailPage(route = {}) {
    const id = route.params?.id;

    if (!id) {
        renderPage(
            renderPlaceholder(
                "Chi tiết video",
                "Thiếu ID video. Vui lòng truy cập lại từ danh sách.",
            ),
        );
        return;
    }

    // Nếu dùng cả 2 → spinner overlay che skeleton, user không thấy structure.

    try {
        // 0. Render skeleton ngay (UX: user thấy structure trước khi data về)
        renderPage(SKELETON_VIDEO_DETAIL());

        // 1. Fetch video details
        const video = await detailsService.getVideo(id);

        // 2. Build related list
        //    - Map current video → {id, title, thumbnails, duration, videoId, popularity}
        //    - Concat related[] mapped → giữ nguyên shape
        //    - Dedupe by id (giữ thứ tự đầu tiên) → current ở đầu, related sau
        const current = pickVideoFields(video);
        const related = (Array.isArray(video.related) ? video.related : []).map(
            pickVideoFields,
        );
        const deduped = [
            ...new Map([current, ...related].map((v) => [v.id, v])).values(),
        ];

        // 3. Render
        const html = renderVideoDetail({
            ...video,
            relatedList: deduped,
        });

        // 4. Inject
        renderPage(html);

        // 5. PAUSE audio player (nếu đang phát) trước khi mở video overlay.
        if (!audioPlayer.audio.paused) {
            audioPlayer.pauseSong();
        }

        // 6. Mở video overlay full (player + related list hiện ngay khi vào trang)
        await videoOverlay.open(video, deduped, { startAsMini: false });
    } catch (err) {
        console.error("[video-detail] Critical error:", err);
        // Ưu tiên err.message (từ AppError mapApiError) thay vì hardcode
        const fallback = "Không thể tải chi tiết video. Vui lòng thử lại.";
        toast.error(err.message || fallback);
        renderPage(`
            <section class="page-placeholder">
                <h1 class="page-placeholder__title">Đã xảy ra lỗi</h1>
                <p class="page-placeholder__desc">${err.message || "Unknown error"}</p>
            </section>
        `);
    }
}

// ======================================================
// HELPERS
// ======================================================

/**
 * @param {object} video
 * @returns {object}
 */
function pickVideoFields(video) {
    return {
        id: video.id,
        title: video.title,
        thumbnails: video.thumbnails,
        duration: video.duration,
        videoId: video.videoId,
        popularity: video.popularity,
    };
}

export default videoDetailPage;
