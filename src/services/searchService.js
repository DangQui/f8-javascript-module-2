/**
 * services/searchService.js — Search API endpoints
 *
 * Endpoints (theo docs F8):
 *   GET /search/suggestions?q=...       — dropdown autocomplete (≤ 8 items mỗi loại)
 *   GET /search?q=...&limit=&page=      — trang kết quả đầy đủ (pagination)
 *
 * Phân biệt:
 *   - `getSuggestions(q)`         → dropdown ở header search
 *   - `getResults(q, {page, limit})` → /search route page
 *
 * Exports:
 *   - searchService.getSuggestions(query) → dropdown autocomplete
 *   - searchService.getResults(query, options) → search page results
 *   - searchService.search(query)         → backward-compat alias of getSuggestions
 *
 * Consumed by:
 *   - `@/components/search.js` (getSuggestions - dropdown)
 *   - `@/pages/search/search.js` (getResults - page results)
 */

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const searchService = {
    /**
     * Gợi ý tìm kiếm (cho dropdown autocomplete ở header).
     * @param {string} query
     * @returns {Promise<object>} Backend trả về dạng {songs, albums, artists, videos, playlists}
     *                           hoặc {items: [...]}. Caller tự normalize.
     */
    async getSuggestions(query) {
        if (!query || !query.trim()) return {};
        try {
            return (
                (await api.get(
                    `/search/suggestions?q=${encodeURIComponent(query.trim())}`
                )) ?? {}
            );
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Kết quả tìm kiếm đầy đủ (cho /search route page), có pagination.
     * @param {string} query
     * @param {{limit?: number, page?: number}} [options]
     * @returns {Promise<{items: Array, page: number, total: number, hasMore?: boolean}>}
     */
    async getResults(query, { limit = 20, page = 1 } = {}) {
        if (!query || !query.trim()) return { items: [], page: 1, total: 0 };
        try {
            const params = new URLSearchParams({
                q: query.trim(),
                limit: String(limit),
                page: String(page),
            });
            return (await api.get(`/search?${params.toString()}`)) ?? {
                items: [],
                page,
                total: 0,
            };
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /** @deprecated Backward-compat alias of `getSuggestions`. Dùng getSuggestions hoặc getResults. */
    async search(query) {
        return this.getSuggestions(query);
    },
};
