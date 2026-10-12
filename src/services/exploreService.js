/**
 * services/exploreService.js — Explore/Charts page API endpoints
 *
 * Endpoints:
 *   GET /explore/albums
 *   GET /explore/meta              → { categories, lines }
 *   GET /explore/videos
 *   GET /explore/new-releases
 *   GET /charts/countries          → { countries: [...] }
 *   GET /charts/videos?country=:code
 *   GET /charts/top-artists?country=:code
 *
 * Exports:
 *   - exploreService.getAlbums()             → albums explore
 *   - exploreService.getMoodsGenres()        → merge categories + lines
 *   - exploreService.getVideos()             → videos explore
 *   - exploreService.getNewReleases()        → new releases
 *   - exploreService.getCountries()          → list country
 *   - exploreService.getTopVideos(country)   → top videos theo country
 *   - exploreService.getTopArtists(country)  → top artists theo country
 *
 * Consumed by:
 *   - `@/pages/discover/discover.js` (getMoodsGenres, getVideos, getAlbums)
 *   - `@/pages/charts/charts.js` (getCountries, getTopVideos, getTopArtists)
 *   - `@/pages/moods-and-genres/moods-and-genres.js` (getMoodsGenres)
 *   - `@/pages/new-releases/new-releases.js` (getNewReleases)
 */

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const exploreService = {
    /** @returns {Promise<Array>} Albums cho Explore page */
    async getAlbums() {
        try {
            return (await api.get("/explore/albums"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Gộp categories + lines thành 1 list cho mood-genre UI.
     * Mỗi item có thêm field `path` để component biết navigate đâu.
     * @returns {Promise<Array<{...category, path: "/categories"} | {...line, path: "/lines"}>>}
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

    /** @returns {Promise<Array>} Videos cho Explore page */
    async getVideos() {
        try {
            return (await api.get("/explore/videos"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /** @returns {Promise<Array>} New releases */
    async getNewReleases() {
        try {
            return (await api.get("/explore/new-releases"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /** @returns {Promise<Array>} List country cho Charts filter */
    async getCountries() {
        try {
            return (await api.get("/charts/countries"))?.countries ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Top videos theo country code.
     * @param {string} country
     * @returns {Promise<Array>}
     */
    async getTopVideos(country) {
        try {
            return (await api.get(`/charts/videos?country=${country}`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Top artists theo country code.
     * @param {string} country
     * @returns {Promise<Array>}
     */
    async getTopArtists(country) {
        try {
            return (await api.get(`/charts/top-artists?country=${country}`))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },
};
