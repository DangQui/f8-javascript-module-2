/**
 * services/detailsService.js — Detail page API endpoints
 *
 * Endpoints:
 *   GET /playlists/details/:slug?limit=50
 *   GET /albums/details/:slug?limit=50
 *   GET /songs/details/:id
 *   GET /videos/details/:id
 *
 * Exports:
 *   - detailsService.getPlaylist(slug)
 *   - detailsService.getAlbum(slug)
 *   - detailsService.getSong(id)
 *   - detailsService.getVideo(id)
 *
 * Consumed by:
 *   - `@/pages/playlist-detail/playlist-detail.js`
 *   - `@/pages/album-detail/album-detail.js`
 *   - `@/pages/song-detail/song-detail.js`
 *   - `@/pages/video-detail/video-detail.js`
 */

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const detailsService = {
    /**
     * Lấy chi tiết playlist (gồm tracks).
     * @param {string} slug
     * @returns {Promise<object>}
     */
    async getPlaylist(slug) {
        try {
            return (await api.get(`/playlists/details/${slug}?limit=50`)) ?? {};
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Lấy chi tiết album (gồm tracks).
     * @param {string} slug
     * @returns {Promise<object>}
     */
    async getAlbum(slug) {
        try {
            return (await api.get(`/albums/details/${slug}?limit=50`)) ?? {};
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Lấy chi tiết song.
     * @param {string} id
     * @returns {Promise<object>}
     */
    async getSong(id) {
        try {
            return (await api.get(`/songs/details/${id}`)) ?? {};
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Lấy chi tiết video.
     * @param {string} id
     * @returns {Promise<object>}
     */
    async getVideo(id) {
        try {
            return (await api.get(`/videos/details/${id}`)) ?? {};
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },
};
