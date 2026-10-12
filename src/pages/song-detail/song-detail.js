/**
 * pages/song-detail/song-detail.js — Song Detail page handler
 *
 * Flow:
 *   1. Render skeleton ngay (UX: structure trước khi data về)
 *   2. Fetch detailsService.getSong(id)
 *   3. Render HTML từ `song-detail.render.js`
 *   4. Inject vào #main
 *   5. Auto-play current song (port từ base.js:5805 + 4961-4985)
 *
 * Data shape (port từ base.js `br()` dòng 4961):
 *   {
 *     id, audioUrl, thumbnails[], title, duration, popularity,
 *     album: { tracks[] },
 *     playlists: [{ tracks[] }],
 *     related: [...]
 *   }
 *
 * Auto-play logic:
 *   - Build queue từ album.tracks + playlists[].tracks (dedupe by id)
 *   - Fallback related nếu 2 nguồn đầu rỗng
 *   - Set currentIndex = vị trí current song trong queue
 *   - Play song hiện tại (loadSong + playSong) nếu chưa đang play
 *
 * Phase 15: ghi nhận "user vừa xem detail bài hát này" (best-effort).
 * Port từ base.js `Er('song', id)` dòng 5657. Fire-and-forget để UX nhanh.
 *
 * Exports:
 *   - songDetailPage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/songs/details/:id")
 */

import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import { renderSongDetail } from "@/pages/song-detail/song-detail.render.js";
import { SKELETON_SONG_DETAIL } from "@/components/skeleton.js";
import { audioPlayer } from "@/components/audio-player.js";
import { recordPlay } from "@/components/event-tracker.js";

import { detailsService } from "@/services/detailsService.js";
import { toast } from "@/libs/toast.js";

/**
 * Render Song Detail page.
 * @param {{params: object, query: object, url: string}} route
 */
export async function songDetailPage(route = {}) {
    const id = route.params?.id;

    if (!id) {
        renderPage(
            renderPlaceholder(
                "Chi tiết bài hát",
                "Thiếu ID bài hát. Vui lòng truy cập lại từ danh sách."
            )
        );
        return;
    }

    try {
        // 0. Render skeleton ngay
        renderPage(SKELETON_SONG_DETAIL());

        // 1. Fetch song details
        const song = await detailsService.getSong(id);

        // 1b. Phase 15: ghi nhận view (best-effort, fire-and-forget)
        recordPlay("song", song.id);

        // 2. Render HTML
        const html = renderSongDetail(song);

        // 3. Inject + re-init slider
        renderPage(html);

        // 4. AUTO-PLAY khi navigate /songs/details/:id
        //    (port từ base.js:5805 `await yr.playSongFromDetail(e.id)`)
        if (song?.audioUrl) {
            try {
                // 4.1. Build queue từ album + playlists
                const albumTracks = song?.album?.tracks || [];
                const playlistTracks = (song?.playlists || []).flatMap(
                    (p) => p.tracks || []
                );
                const combined = [...albumTracks, ...playlistTracks];
                // Dedupe by id
                const dedupMap = new Map(combined.map((t) => [t.id, t]));
                let queueSource = [...dedupMap.values()];

                // Fallback: nếu album + playlists rỗng → dùng related
                if (queueSource.length === 0) {
                    queueSource = song.related || [];
                }

                // 4.2. Normalize shape (cần audioUrl để play)
                const normalizedQueue = queueSource
                    .filter((t) => t && t.id)
                    .map((t) => ({
                        id: t.id,
                        title: t.title || "Chưa rõ tên",
                        audioUrl: t.audioUrl,
                        thumbnails: t.thumbnails || [],
                        artists:
                            Array.isArray(t.artists) && t.artists.length > 0
                                ? t.artists
                                : ["Không rõ nghệ sĩ"],
                        duration: t.duration || 0,
                    }));

                // 4.3. Set queue + tìm currentIndex
                if (normalizedQueue.length > 0) {
                    audioPlayer.setQueue(normalizedQueue);
                    const idx = normalizedQueue.findIndex(
                        (t) => t.id === song.id
                    );
                    if (idx >= 0) {
                        // Set currentIndex mà KHÔNG phát lại (sẽ playSongById bên dưới)
                        audioPlayer.currentIndex = idx;
                    }
                } else {
                    // Không có context → set queue = [current song] để next/prev không crash
                    const trackForQueue = {
                        id: song.id,
                        title: song.title,
                        audioUrl: song.audioUrl,
                        thumbnails: song.thumbnails || [],
                        artists: song.artists || [],
                        duration: song.duration || 0,
                    };
                    audioPlayer.setQueue([trackForQueue]);
                }

                // 4.4. Play current song (nếu chưa đang play bài này)
                // Lưu ý: track-item click handler đã gọi playSongById() TRƯỚC
                // khi navigate → audio có thể đã chạy → KHÔNG restart.
                const isCurrent = audioPlayer.currentSong?.id === song.id;
                if (!isCurrent) {
                    await audioPlayer.playSongById(song.id);
                }
            } catch (err) {
                console.warn("[song-detail] auto-play failed:", err);
            }
        }
    } catch (err) {
        console.error("[song-detail] Critical error:", err);
        const fallback = "Không thể tải chi tiết bài hát. Vui lòng thử lại.";
        toast.error(err.message || fallback);
        renderPage(`
            <section class="page-placeholder">
                <h1 class="page-placeholder__title">Đã xảy ra lỗi</h1>
                <p class="page-placeholder__desc">${err.message || "Unknown error"}</p>
            </section>
        `);
    }
}

export default songDetailPage;
