// ======================================================
// EXPLORE SERVICE — api.Explore.* (Phase 4 port từ base.js G.Explore)
// ======================================================
//
// Phase 20: Wrap mapApiError để throw AppError {code, message, field, status}
// → explore/discover page hiển thị đúng message backend.
//

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const exploreService = {
    async getAlbums() {
        try {
            return (await api.get("/explore/albums"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Gộp categories + lines thành 1 list duy nhất cho mood-genre UI.
     */
    async getMoodsGenres() {
        try {
            const res = await api.get("/explore/meta");
            const categories = (res?.categories ?? []).map((c) => ({
                ...c,
                path: "/categories",
            }));
            const lines = (res?.lines ?? []).map((l) => ({
                ...l,
                path: "/lines",
            }));
            return [...categories, ...lines];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getVideos() {
        try {
            return (await api.get("/explore/videos"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getNewReleases() {
        try {
            return (await api.get("/explore/new-releases"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getCountries() {
        try {
            return (await api.get("/charts/countries"))?.countries ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getTopVideos(country) {
        try {
            return (await api.get(`/charts/videos?country=${country}`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    async getTopArtists(country) {
        try {
            return (await api.get(`/charts/top-artists?country=${country}`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },
};