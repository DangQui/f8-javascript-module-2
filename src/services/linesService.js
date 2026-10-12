/**
 * services/linesService.js — Lines (nhạc Việt / US-UK / K-Pop / ...) API
 *
 * "Line" = tuyến nhạc theo quốc gia/vùng miền (vd: "V-Pop", "K-Pop", "US-UK").
 *
 * Endpoints:
 *   GET /lines
 *   GET /lines/:id/songs
 *   GET /lines/:id/playlists
 *   GET /lines/:id/videos
 *   GET /lines/:id/albums
 *
 * Exports:
 *   - linesService.getAll()
 *   - linesService.getLineSongs(lineId)
 *   - linesService.getLinePlaylists(lineId)
 *   - linesService.getLineVideos(lineId)
 *   - linesService.getLineAlbums(lineId)
 *
 * Consumed by:
 *   - `@/pages/moods-and-genres/moods-and-genres.js` (getAll)
 *   - `@/pages/line-detail/line-detail.js` (tất cả getLine*)
 */

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const linesService = {
    /** @returns {Promise<Array>} List tất cả lines */
    async getAll() {
        try {
            return (await api.get("/lines"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /** @returns {Promise<Array>} Songs trong 1 line */
    async getLineSongs(lineId) {
        try {
            return (await api.get(`/lines/${lineId}/songs`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /** @returns {Promise<Array>} Playlists trong 1 line */
    async getLinePlaylists(lineId) {
        try {
            return (await api.get(`/lines/${lineId}/playlists`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /** @returns {Promise<Array>} Videos trong 1 line */
    async getLineVideos(lineId) {
        try {
            return (await api.get(`/lines/${lineId}/videos`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /** @returns {Promise<Array>} Albums trong 1 line */
    async getLineAlbums(lineId) {
        try {
            return (await api.get(`/lines/${lineId}/albums`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },
};
