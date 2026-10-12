// ======================================================
// HOME SERVICE — api.Home.* (Phase 4 port từ base.js G.Home)
// ======================================================

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";
import { getAccessToken } from "@/services/tokenStorage.js";

export const homeService = {
    async getPersonalized() {
        if (!getAccessToken()) return [];
        try {
            return (await api.get("/home/personalized?limit=12")) ?? [];
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    async getMoods() {
        try {
            return (await api.get("/moods"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    async getMoodDetails(id) {
        try {
            return (await api.get(`/moods/${id}`)) ?? {};
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    async getQuickPicks() {
        try {
            return (await api.get("/quick-picks")) ?? [];
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    async getQuickPicksByMood(moodId) {
        try {
            return (await api.get(`/quick-picks?mood=${moodId}`)) ?? [];
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    async getAlbumsForYou() {
        try {
            return (await api.get("/home/albums-for-you")) ?? [];
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    async getTodaysHits() {
        try {
            return (await api.get("/home/todays-hits")) ?? [];
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    async getPlaylistsByCountry(code) {
        try {
            return (
                (await api.get(`/playlists/by-country?country=${code}`)) ?? []
            );
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },
};
