/**
 * services/categoriesService.js — Categories API endpoints
 *
 * Endpoints:
 *   GET /categories              → list all categories
 *   GET /categories/:slug        → 1 category (gồm subcategories)
 *
 * Response shape (1 category):
 *   { name, subcategories: [{ name, playlists: [...] }] }
 *   (suy ra từ `fr()` base.js dòng 4480-4486)
 *
 * Exports:
 *   - categoriesService.getAll()        → list all
 *   - categoriesService.getCategory(slug) → 1 category
 *
 * Consumed by:
 *   - `@/pages/moods-and-genres/moods-and-genres.js` (getAll)
 *   - `@/pages/category-detail/category-detail.js` (getCategory)
 */

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const categoriesService = {
    /** @returns {Promise<Array>} List tất cả categories */
    async getAll() {
        try {
            return (await api.get("/categories"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Fetch 1 category theo slug.
     * Phase 17 fix: đổi param name từ `id` → `slug` cho khớp với
     * base.js dòng 3942 + route `/categories/:slug` dòng 5779.
     *
     * @param {string} slug - Category slug (vd: "pop", "rock-vn")
     * @returns {Promise<{name?: string, subcategories?: Array}>}
     */
    async getCategory(slug) {
        try {
            return (await api.get(`/categories/${slug}`)) ?? {};
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },
};
