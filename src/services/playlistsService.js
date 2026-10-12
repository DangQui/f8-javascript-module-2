/**
 * services/playlistsService.js — User playlist API (best-effort)
 *
 * Endpoints:
 *   GET  /me/playlists                  — playlist của user hiện tại
 *   POST /playlists/:slug/videos        — thêm 1 video vào playlist
 *
 * LƯU Ý: API `/me/playlists` chưa stable (Phase L-2.1 verified 09/10/2026 → 404).
 * Tạm thời chỉ có 2 methods cho video-overlay menu "Thêm vào playlist".
 * Khi backend sẵn sàng, mở rộng thêm endpoints.
 *
 * Exports:
 *   - playlistsService.getMyPlaylists()              → list user playlists
 *   - playlistsService.addVideoToPlaylist(slug, id)  → thêm video vào playlist
 *
 * Consumed by:
 *   - `@/components/video-overlay.js` (menu 3 chấm)
 *
 * Fallback: Khi API 404, page dùng `state/userPlaylists.js` (localStorage).
 */

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const playlistsService = {
    /**
     * Lấy danh sách playlist của user hiện tại.
     * @returns {Promise<Array<{slug: string, title: string, thumbnail?: string}>>}
     */
    async getMyPlaylists() {
        try {
            return (await api.get("/me/playlists"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Thêm 1 video vào playlist.
     * @param {string} playlistSlug
     * @param {string} videoId - MongoDB id của video (KHÔNG phải YouTube videoId)
     * @returns {Promise<object>} response từ API
     */
    async addVideoToPlaylist(playlistSlug, videoId) {
        try {
            return (await api.post(`/playlists/${playlistSlug}/videos`, {
                videoId,
            }));
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },
};
