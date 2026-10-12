// ======================================================
// CATEGORIES SERVICE — api.Categories.* (Phase 4 port từ base.js G.Categories)
// ======================================================
//
// Phase 20: Wrap mapApiError để throw AppError {code, message, field, status}
// → page handler hiển thị đúng message backend thay vì hardcode.
//

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const categoriesService = {
    async getAll() {
        try {
            return (await api.get("/categories"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
        }
    },

    /**
     * Fetch 1 category theo slug.
     *
     * Phase 17 fix: đổi param name từ `id` → `slug` cho khớp với
     * base.js dòng 3942 + route `/categories/:slug` dòng 5779.
     *
     * Response shape: { name, subcategories: [{ name, playlists: [...] }] }
     * (suy ra từ cách `fr()` base.js dòng 4480-4486 dùng `e.name` + `e.subcategories`).
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