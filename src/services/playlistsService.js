// ======================================================
// PLAYLISTS SERVICE — api.Playlists.* (Phase 4 port từ base.js G.Playlists)
// ======================================================
//
// Endpoints (TODO Phase 8.6 confirm):
//   GET    /me/playlists                       — playlist của user hiện tại
//   POST   /playlists/:slug/videos             — thêm 1 video vào playlist
//   POST   /playlists/:slug/songs              — thêm 1 song vào playlist
//
// API chưa stable — Phase 8.6 sẽ port đầy đủ. Tạm thời service chỉ có
// 2 methods dùng cho video-overlay menu 3 chấm:
//   - getMyPlaylists()
//   - addVideoToPlaylist(playlistSlug, videoId)
//
// Phase 20: Wrap mapApiError để throw AppError {code, message, field, status}
// → video-overlay menu hiển thị đúng message backend.
//

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const playlistsService = {
    /**
     * Lấy danh sách playlist của user hiện tại (dùng cho menu "Thêm vào playlist").
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
     * @param {string} videoId  — MongoDB id của video (KHÔNG phải YouTube videoId)
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