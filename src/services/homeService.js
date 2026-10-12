// ======================================================
// HOME SERVICE — api.Home.* (Phase 4 port từ base.js G.Home)
// ======================================================
//
// Endpoints:
//   GET /home/personalized?limit=12
//   GET /moods
//   GET /moods/:id
//   GET /quick-picks                  (mood default)
//   GET /quick-picks?mood=:id
//   GET /home/albums-for-you
//   GET /home/todays-hits
//   GET /playlists/by-country?country=:code
//
// Phase 20: Wrap mapApiError để throw AppError {code, message, field, status}
// → home page hiển thị đúng message backend.
//

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";
import { getAccessToken } from "@/services/tokenStorage.js";

export const homeService = {
    async getPersonalized() {
        // Phase 14.3 fix: chi goi khi user da dang nhap (can auth token).
        // Backend tra 401 neu chua login -> axios interceptor force-logout.
        // -> Tra [] ngay khi chua login (khong goi API).
        if (!getAccessToken()) return [];
        try {
            return (await api.get("/home/personalized?limit=12")) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getMoods() {
        try {
            return (await api.get("/moods"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getMoodDetails(id) {
        try {
            return (await api.get(`/moods/${id}`)) ?? {};
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getQuickPicks() {
        try {
            return (await api.get("/quick-picks")) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getQuickPicksByMood(moodId) {
        try {
            return (await api.get(`/quick-picks?mood=${moodId}`)) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getAlbumsForYou() {
        try {
            return (await api.get("/home/albums-for-you")) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getTodaysHits() {
        try {
            return (await api.get("/home/todays-hits")) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getPlaylistsByCountry(code) {
        try {
            return (await api.get(`/playlists/by-country?country=${code}`)) ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },
};