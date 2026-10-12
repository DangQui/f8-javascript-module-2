// ======================================================
// PLAYLISTS SERVICE — api.Playlists.*
// ======================================================

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
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    /**
     * Thêm 1 video vào playlist.
     * @param {string} playlistSlug
     * @param {string} videoId
     * @returns {Promise<object>} response từ API
     */
    async addVideoToPlaylist(playlistSlug, videoId) {
        try {
            return await api.post(`/playlists/${playlistSlug}/videos`, {
                videoId,
            });
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },
};
