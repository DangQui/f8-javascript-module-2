// ======================================================
// ALBUM DETAIL PAGE — Init + render
// ======================================================
//
// Flow:
//   1. Show loading overlay
//   2. Fetch detailsService.getAlbum(slug)
//   3. Render HTML từ `album-detail.render.js`
//   4. Inject vào #main
//   5. Hide loading overlay
//
// Data shape (port từ base.js `_r()` dòng 4593):
//   {
//     id, title, slug, thumbnails[], albumType, releaseDate,
//     popularity, songCount, duration, tracks[]
//   }
//
// Lưu ý:
//   - Click track → navigate /songs/details/:id.
//   - Thumbnail ở root rỗng → render dùng fallback từ tracks[0].
//

import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import { renderAlbumDetail } from "@/pages/album-detail/album-detail.render.js";
import { SKELETON_ALBUM_DETAIL } from "@/components/skeleton.js";
import { audioPlayer } from "@/components/audio-player.js";
import { recordPlay } from "@/components/event-tracker.js";

import { detailsService } from "@/services/detailsService.js";
import { toast } from "@/libs/toast.js";

// ======================================================
// MAIN RENDER
// ======================================================

/**
 * Render Album Detail page.
 * @param {{ params: object, query: object, url: string }} route
 */
export async function albumDetailPage(route = {}) {
    const slug = route.params?.slug;

    if (!slug) {
        renderPage(
            renderPlaceholder(
                "Chi tiết album",
                "Thiếu slug album. Vui lòng truy cập lại từ danh sách."
            )
        );
        return;
    }

    // Nếu dùng cả 2 → spinner overlay che skeleton, user không thấy structure.

    try {
        // 0. Render skeleton ngay (UX: user thấy structure trước khi data về)
        renderPage(SKELETON_ALBUM_DETAIL());

        // 1. Fetch album details
        const album = await detailsService.getAlbum(slug);

        // 1b. Phase 15: Ghi nhận "user vừa xem detail album này" (best-effort).
        //     Port từ base.js `Er('album', id)` dòng 5657. Fire-and-forget
        //     để không block page render.
        recordPlay("album", album.id);

        // 2. Render HTML
        const html = renderAlbumDetail(album);

        // 3. Inject
        renderPage(html);

        // 4. Set queue = album.tracks + AUTO-PLAY track đầu (Phase 15.3)
        //    Port từ base.js route `/albums/details/:slug` dòng 5793:
        //      `await yr.playSongFromDetail(e.id)` + queue = album.tracks
        //    User click 1 track trong track-list → audio-player.playSongById(id)
        //    tìm thấy trong queue → load + play ngay tại chỗ (không navigate).
        //    Sau khi play, user có thể next/prev để chuyển track khác trong album.
        if (Array.isArray(album?.tracks) && album.tracks.length > 0) {
            const queueTracks = album.tracks
                .filter((t) => t?.id && t?.audioUrl) // chỉ lấy track có audio
                .map((t) => ({
                    id: t.id,
                    title: t.title || "Chưa rõ tên",
                    audioUrl: t.audioUrl,
                    thumbnails: t.thumbnails || [],
                    artists: t.artists || [],
                    duration: t.duration || 0,
                }));
            if (queueTracks.length > 0) {
                audioPlayer.setQueue(queueTracks);

                // Phase 15.3: Auto-play track đầu của album (port base.js:5793).
                // Logic:
                //   - Nếu CHƯA đang phát bài nào (audio.paused === false ở phủ định)
                //     → auto-play track đầu (giống base.js).
                //   - Nếu đang phát bài khác → KHÔNG override (giữ UX cho user).
                //   - Nếu đang phát đúng track đầu → skip (không restart).
                const firstTrack = queueTracks[0];
                const isCurrent = audioPlayer.currentSong?.id === firstTrack.id;
                const isAudioPaused =
                    !audioPlayer.audio || audioPlayer.audio.paused === true;
                if (!isCurrent && isAudioPaused) {
                    await audioPlayer.playSongById(firstTrack.id);
                }
            }
        }
    } catch (err) {
        console.error("[album-detail] Critical error:", err);
        // Ưu tiên err.message (từ AppError mapApiError) thay vì hardcode
        const fallback = "Không thể tải chi tiết album. Vui lòng thử lại.";
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
//

// Giờ dùng renderPlaceholder import từ _shared.js.

export default albumDetailPage;
