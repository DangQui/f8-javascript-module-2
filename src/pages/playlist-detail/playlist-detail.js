/**
 * pages/playlist-detail/playlist-detail.js — Playlist Detail page handler
 *
 * Flow:
 *   1. Render skeleton ngay
 *   2. Fetch detailsService.getPlaylist(slug)
 *   3. Render HTML từ `playlist-detail.render.js`
 *   4. Inject vào #main
 *   5. Set queue = playlist.tracks + auto-play track đầu (Phase 15.3)
 *
 * Data shape (port từ base.js `_r()` dòng 4593 + `mr()` 4498, áp dụng cho playlist):
 *   {
 *     id, title, slug, thumbnails[], description,
 *     popularity, songCount, duration, artists[], tracks[]
 *   }
 *
 * Playlist khác album ở chỗ: KHÔNG có albumType/releaseDate, CÓ description.
 *
 * Auto-play (Phase 15.3): cùng pattern với album-detail.
 *
 * Exports:
 *   - playlistDetailPage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/playlists/details/:slug")
 */

import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import { renderPlaylistDetail } from "@/pages/playlist-detail/playlist-detail.render.js";
import { SKELETON_PLAYLIST_DETAIL } from "@/components/skeleton.js";
import { audioPlayer } from "@/components/audio-player.js";
import { recordPlay } from "@/components/event-tracker.js";

import { detailsService } from "@/services/detailsService.js";
import { toast } from "@/libs/toast.js";

/**
 * Render Playlist Detail page.
 * @param {{params: object, query: object, url: string}} route
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

    try {
        // 0. Render skeleton ngay
        renderPage(SKELETON_PLAYLIST_DETAIL());

        // 1. Fetch playlist details
        const playlist = await detailsService.getPlaylist(slug);

        // 1b. Phase 15: ghi nhận view
        recordPlay("playlist", playlist.id);

        // 2. Render HTML
        const html = renderPlaylistDetail(playlist);

        // 3. Inject
        renderPage(html);

        // 4. Set queue = playlist.tracks + AUTO-PLAY track đầu
        //    Port từ base.js route `/playlists/details/:slug` dòng 5802
        if (Array.isArray(playlist?.tracks) && playlist.tracks.length > 0) {
            const queueTracks = playlist.tracks
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
        console.error("[playlist-detail] Critical error:", err);
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

export default playlistDetailPage;
