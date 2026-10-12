/**
 * services/homeService.js — Home page API endpoints
 *
 * Endpoints:
 *   GET /home/personalized?limit=12      (cần login)
 *   GET /moods                           → list moods
 *   GET /moods/:id                       → mood details
 *   GET /quick-picks                     (default mood)
 *   GET /quick-picks?mood=:id
 *   GET /home/albums-for-you
 *   GET /home/todays-hits
 *   GET /playlists/by-country?country=:code
 *
 * Exports:
 *   - homeService.getPersonalized()       → personalized feed
 *   - homeService.getMoods()              → list moods
 *   - homeService.getMoodDetails(id)      → 1 mood
 *   - homeService.getQuickPicks()         → default mood picks
 *   - homeService.getQuickPicksByMood(id) → picks theo mood
 *   - homeService.getAlbumsForYou()       → albums recommendation
 *   - homeService.getTodaysHits()         → today's hits
 *   - homeService.getPlaylistsByCountry(code) → playlists theo country
 *
 * Consumed by:
 *   - `@/pages/home/home.js` (tất cả endpoints)
 *   - `@/pages/moods-and-genres/moods-and-genres.js` (getMoods)
 *   - `@/pages/mood-detail/mood-detail.js` (getMoodDetails + getQuickPicksByMood)
 *
 * Tất cả errors được wrap qua `mapApiError()` → throw AppError có {code, message}.
 */

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";
import { getAccessToken } from "@/services/tokenStorage.js";

export const homeService = {
    /**
     * Lấy personalized feed (albums user nghe gần đây).
     * Phase 14.3 fix: chỉ gọi khi user đã login — backend trả 401 nếu chưa login
     * → axios interceptor force-logout. Trả [] ngay khi chưa login (không gọi API).
     * @returns {Promise<Array>}
     */
    async getPersonalized() {
        if (!getAccessToken()) return [];
        try {
            return (await api.get("/home/personalized?limit=12")) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Lấy danh sách moods (dùng cho Moods & Genres page + Home sidebar).
     * @returns {Promise<Array>}
     */
    async getMoods() {
        try {
            return (await api.get("/moods"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Lấy chi tiết 1 mood (dùng cho mood-detail page).
     * @param {string} id
     * @returns {Promise<object>}
     */
    async getMoodDetails(id) {
        try {
            return (await api.get(`/moods/${id}`)) ?? {};
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Lấy quick picks (default mood).
     * @returns {Promise<Array>}
     */
    async getQuickPicks() {
        try {
            return (await api.get("/quick-picks")) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Lấy quick picks theo mood.
     * @param {string} moodId
     * @returns {Promise<Array>}
     */
    async getQuickPicksByMood(moodId) {
        try {
            return (await api.get(`/quick-picks?mood=${moodId}`)) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Lấy albums recommendation cho user.
     * @returns {Promise<Array>}
     */
    async getAlbumsForYou() {
        try {
            return (await api.get("/home/albums-for-you")) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Lấy today's hits.
     * @returns {Promise<Array>}
     */
    async getTodaysHits() {
        try {
            return (await api.get("/home/todays-hits")) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Lấy playlists theo country code (vd "VN", "US").
     * @param {string} code
     * @returns {Promise<Array>}
     */
    async getPlaylistsByCountry(code) {
        try {
            return (await api.get(`/playlists/by-country?country=${code}`)) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },
};
