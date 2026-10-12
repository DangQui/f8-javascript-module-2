/**
 * pages/album-detail/album-detail.js — Album Detail page handler
 *
 * Flow:
 *   1. Render skeleton ngay
 *   2. Fetch detailsService.getAlbum(slug)
 *   3. Render HTML từ `album-detail.render.js`
 *   4. Inject vào #main
 *   5. Set queue = album.tracks + auto-play track đầu (Phase 15.3)
 *
 * Data shape (port từ base.js `_r()` dòng 4593):
 *   {
 *     id, title, slug, thumbnails[], albumType, releaseDate,
 *     popularity, songCount, duration, tracks[]
 *   }
 *
 * Auto-play (Phase 15.3):
 *   - Set queue = album.tracks (chỉ lấy track có audioUrl)
 *   - Auto-play track đầu NẾU: chưa đang phát bài nào (audio.paused) +
 *     chưa đang phát đúng track đầu (currentSong !== firstTrack)
 *
 * Phase 15: ghi nhận view (best-effort, fire-and-forget).
 *
 * Exports:
 *   - albumDetailPage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/albums/details/:slug")
 */

import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import { renderAlbumDetail } from "@/pages/album-detail/album-detail.render.js";
import { SKELETON_ALBUM_DETAIL } from "@/components/skeleton.js";
import { audioPlayer } from "@/components/audio-player.js";
import { recordPlay } from "@/components/event-tracker.js";

import { detailsService } from "@/services/detailsService.js";
import { toast } from "@/libs/toast.js";

/**
 * Render Album Detail page.
 * @param {{params: object, query: object, url: string}} route
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

    try {
        // 0. Render skeleton ngay
        renderPage(SKELETON_ALBUM_DETAIL());

        // 1. Fetch album details
        const album = await detailsService.getAlbum(slug);

        // 1b. Phase 15: ghi nhận view
        recordPlay("album", album.id);

        // 2. Render HTML
        const html = renderAlbumDetail(album);

        // 3. Inject
        renderPage(html);

        // 4. Set queue = album.tracks + AUTO-PLAY track đầu
        //    Port từ base.js route `/albums/details/:slug` dòng 5793:
        //    `await yr.playSongFromDetail(e.id)` + queue = album.tracks
        if (Array.isArray(album?.tracks) && album.tracks.length > 0) {
            const queueTracks = album.tracks
                .filter((t) => t?.id && t?.audioUrl)
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

export default albumDetailPage;
