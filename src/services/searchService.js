// ======================================================
// SEARCH SERVICE — api.Search.* (Phase 4 port từ base.js G.Search)
// ======================================================

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const searchService = {
    /**
     * @param {string} query
     * @returns {Promise<object>}
     */
    async getSuggestions(query) {
        if (!query || !query.trim()) return {};
        try {
            return (
                (await api.get(
                    `/search/suggestions?q=${encodeURIComponent(query.trim())}`,
                )) ?? {}
            );
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    /**
     * @param {string} query
     * @param {{ limit?: number, page?: number }} [options]
     * @returns {Promise<object>} — { items: [...], page, total, hasMore, ... }
     */
    async getResults(query, { limit = 20, page = 1 } = {}) {
        if (!query || !query.trim()) return { items: [], page: 1, total: 0 };
        try {
            const params = new URLSearchParams({
                q: query.trim(),
                limit: String(limit),
                page: String(page),
            });
            return (
                (await api.get(`/search?${params.toString()}`)) ?? {
                    items: [],
                    page,
                    total: 0,
                }
            );
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    /**
     * @deprecated Use `getSuggestions()` hoặc `getResults()` thay thế.
     * @param {string} query
     */
    async search(query) {
        return this.getSuggestions(query);
    },
};
