// ======================================================
// SEARCH SERVICE — api.Search.* (Phase 4 port từ base.js G.Search)
// ======================================================
//
// Phase 20: Wrap mapApiError để throw AppError {code, message, field, status}
// → search page (Phase 13) hiển thị đúng message backend.
//
// Theo docs F8 (https://youtube-music.f8team.dev/):
//   GET /search/suggestions?q=...     — dropdown autocomplete (≤ 8 items mỗi loại)
//   GET /search?q=...&limit=&page=    — trang kết quả đầy đủ (pagination)
//
// Lưu ý phân biệt:
//   - `getSuggestions(q)`   → gọi `/search/suggestions` (CHO HEADER SEARCH DROPDOWN)
//   - `getResults(q, page)` → gọi `/search`             (CHO /search ROUTE PAGE)
//
// Phase 13 page handler đang gọi `searchService.search(q)` — sau refactor
// đổi thành `searchService.getResults(q, { page, limit })` cho khớp docs.
//

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const searchService = {
    /**
     * Gợi ý tìm kiếm (cho dropdown autocomplete ở header).
     * GET /search/suggestions?q=...
     * @param {string} query
     * @returns {Promise<object>} — shape backend tự do (suggestions có thể trả về
     *                              dạng phẳng {songs, albums, artists, videos, playlists}
     *                              hoặc dạng items[] — caller tự normalize).
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
     * Kết quả tìm kiếm đầy đủ (cho /search route page).
     * GET /search?q=...&limit=20&page=1
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
            return (await api.get(`/search?${params.toString()}`)) ?? {
                items: [],
                page,
                total: 0,
            };
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Backward-compat alias.
     * Phase 13 code cũ gọi `searchService.search(q)` — map sang `getSuggestions`
     * để giữ dropdown hoạt động đúng.
     * @deprecated Use `getSuggestions()` hoặc `getResults()` thay thế.
     * @param {string} query
     */
    async search(query) {
        return this.getSuggestions(query);
    },
};