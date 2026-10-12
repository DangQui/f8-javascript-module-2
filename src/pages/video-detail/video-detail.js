/**
 * pages/video-detail/video-detail.js — Video Detail page handler
 *
 * Flow:
 *   1. Render skeleton ngay (UX: structure trước khi data về)
 *   2. Fetch detailsService.getVideo(id)
 *   3. Gộp current video + related[] → dedupe by id (port từ base.js `Cr()` 5527-5547)
 *   4. Render HTML từ `video-detail.render.js`
 *   5. Inject vào #main
 *   6. Pause audio player (nếu đang phát) + mở video overlay mini
 *
 * Data shape (port từ base.js `Cr()` dòng 5527):
 *   {
 *     id, title, slug, thumbnails[], duration, popularity, videoId,
 *     playlists[], related[] (đã bao gồm current ở cuối)
 *   }
 *
 * Phase L-2.5: mở video overlay ở mini mode + autoplay=0 (KHÔNG tự play)
 * để tránh 2 media cùng chạy. User click play trong mini mới chạy.
 *
 * Exports:
 *   - videoDetailPage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/videos/details/:id")
 */

import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import { renderVideoDetail } from "@/pages/video-detail/video-detail.render.js";
import { SKELETON_VIDEO_DETAIL } from "@/components/skeleton.js";
import * as videoOverlay from "@/components/video-overlay.js";
import { audioPlayer } from "@/components/audio-player.js";

import { detailsService } from "@/services/detailsService.js";
import { toast } from "@/libs/toast.js";

/**
 * Render Video Detail page.
 * @param {{params: object, query: object, url: string}} route
 */
export async function videoDetailPage(route = {}) {
    const id = route.params?.id;

    if (!id) {
        renderPage(
            renderPlaceholder(
                "Chi tiết video",
                "Thiếu ID video. Vui lòng truy cập lại từ danh sách."
            )
        );
        return;
    }

    try {
        // 0. Render skeleton ngay
        renderPage(SKELETON_VIDEO_DETAIL());

        // 1. Fetch video details
        const video = await detailsService.getVideo(id);

        // 2. Build related list (port logic `n` từ base.js dòng 5529-5547):
        //    - Map current video → {id, title, thumbnails, duration, videoId, popularity}
        //    - Concat related[] mapped → giữ nguyên shape
        //    - Dedupe by id (giữ thứ tự đầu tiên) → current ở đầu, related sau
        const current = pickVideoFields(video);
        const related = (Array.isArray(video.related) ? video.related : []).map(pickVideoFields);
        const deduped = [...new Map([current, ...related].map((v) => [v.id, v])).values()];

        // 3. Render
        const html = renderVideoDetail({
            ...video,
            relatedList: deduped,
        });

        // 4. Inject
        renderPage(html);

        // 5. PAUSE audio player (nếu đang phát) trước khi mở video overlay.
        //    State của audio (currentTime, queue) giữ nguyên → user back lại
        //    song-detail vẫn resume được bài đang dở.
        if (!audioPlayer.audio.paused) {
            audioPlayer.pauseSong();
        }

        // 6. Phase L-2.5: mở video overlay ở mini mode + autoplay=0
        //    (KHÔNG tự play) để tránh 2 media cùng chạy.
        await videoOverlay.open(video, deduped, { startAsMini: true, autoplay: 0 });
    } catch (err) {
        console.error("[video-detail] Critical error:", err);
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
/**
 * Pick các field cần thiết cho video item (port từ base.js `Cr()` dòng 5529-5542).
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
