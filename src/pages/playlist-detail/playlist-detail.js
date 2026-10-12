// ======================================================
// PLAYLIST DETAIL PAGE — Init + render
// ======================================================
//
// Flow:
//   1. Show loading overlay
//   2. Fetch detailsService.getPlaylist(slug)
//   3. Render HTML từ `playlist-detail.render.js`
//   4. Inject vào #main
//   5. Hide loading overlay
//
// Data shape (port từ base.js `_r()` dòng 4593 + `mr()` dòng 4498, áp dụng cho playlist):
//   {
//     id, title, slug, thumbnails[], description,
//     popularity, songCount, duration, artists[], tracks[]
//   }
//
// Lưu ý:
//   - Click track → navigate /songs/details/:id.
//   - Playlist khác album ở chỗ: KHÔNG có albumType/releaseDate, CÓ description.
//

import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import { renderPlaylistDetail } from "@/pages/playlist-detail/playlist-detail.render.js";
import { SKELETON_PLAYLIST_DETAIL } from "@/components/skeleton.js";
import { audioPlayer } from "@/components/audio-player.js";
import { recordPlay } from "@/components/event-tracker.js";

import { detailsService } from "@/services/detailsService.js";
import { toast } from "@/libs/toast.js";

// ======================================================
// MAIN RENDER
// ======================================================

/**
 * Render Playlist Detail page.
 * @param {{ params: object, query: object, url: string }} route
 */
export async function playlistDetailPage(route = {}) {
    const slug = route.params?.slug;

    if (!slug) {
        renderPage(
            renderPlaceholder(
                "Chi tiết playlist",
                "Thiếu slug playlist. Vui lòng truy cập lại từ danh sách."
            )
        );
        return;
    }

    // Nếu dùng cả 2 → spinner overlay che skeleton, user không thấy structure.

    try {
        // 0. Render skeleton ngay (UX: user thấy structure trước khi data về)
        renderPage(SKELETON_PLAYLIST_DETAIL());

        // 1. Fetch playlist details
        const playlist = await detailsService.getPlaylist(slug);

        // 1b. Phase 15: Ghi nhận "user vừa xem detail playlist này" (best-effort).
        //     Port từ base.js `Er('playlist', id)` dòng 5657. Fire-and-forget.
        recordPlay("playlist", playlist.id);

        // 2. Render HTML
        const html = renderPlaylistDetail(playlist);

        // 3. Inject
        renderPage(html);

        // 4. Set queue = playlist.tracks + AUTO-PLAY track đầu (Phase 15.3)
        //    Port từ base.js route `/playlists/details/:slug` dòng 5802:
        //      `await yr.playSongFromDetail(e.id)` + queue = playlist.tracks.
        //    User click 1 track trong track-list → audio-player.playSongById(id)
        //    tìm thấy trong queue → load + play ngay tại chỗ (không navigate).
        if (Array.isArray(playlist?.tracks) && playlist.tracks.length > 0) {
            const queueTracks = playlist.tracks
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

                // Phase 15.3: Auto-play track đầu (port base.js:5802).
                // Cùng pattern với album-detail:
                //   - Chưa phát bài nào (paused) → auto-play track đầu.
                //   - Đang phát đúng track đầu → skip.
                //   - Đang phát bài khác → KHÔNG override.
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
        console.error("[playlist-detail] Critical error:", err);
        // Ưu tiên err.message (từ AppError mapApiError) thay vì hardcode
        const fallback = "Không thể tải chi tiết playlist. Vui lòng thử lại.";
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

export default playlistDetailPage;
