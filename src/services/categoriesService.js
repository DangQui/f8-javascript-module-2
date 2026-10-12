// ======================================================
// CATEGORIES SERVICE — api.Categories.* (Phase 4 port từ base.js G.Categories)
// ======================================================

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";

export const categoriesService = {
    async getAll() {
        try {
            return (await api.get("/categories"))?.items ?? [];
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },

    /**
     
     * @param {string} slug - Category slug (vd: "pop", "rock-vn")
     * @returns {Promise<{name?: string, subcategories?: Array}>}
     */
    async getCategory(slug) {
        try {
            return (await api.get(`/categories/${slug}`)) ?? {};
        } catch (err) {
            throw mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
        }
    },
};
