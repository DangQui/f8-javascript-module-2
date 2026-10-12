// ======================================================
// EVENTS SERVICE — api.Events.* (Phase 4 port từ base.js G.Events)
// ======================================================

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";
import { getAccessToken } from "@/services/tokenStorage.js";

export const eventsService = {
    /**
     * Ghi nhận 1 lượt play.
     *
     * Best-effort: đã login nhưng API fail → log warn + return null.
     *
     * @param {{ songId?: string, videoId?: string, playedAt?: string }} payload
     * @returns {Promise<any|null>}
     */
    async playRecord(payload) {
        if (!getAccessToken()) return null;

        try {
            return api.post("/events/play", payload);
        } catch (err) {
            // Best-effort — log structured AppError rồi nuốt (không throw)
            const appErr = mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
            console.warn(
                `[events] playRecord failed (code=${appErr.code}):`,
                appErr.message,
            );
            return null;
        }
    },

    /**
     
     *
     * @param {object} payload
     * @returns {Promise<any|null>}
     */
    async impression(payload) {
        // GUARD: chưa login → NO-OP
        if (!getAccessToken()) return null;

        try {
            return api.post("/events/impression", payload);
        } catch (err) {
            const appErr = mapApiError(err, {
                defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR,
            });
            console.warn(
                `[events] impression failed (code=${appErr.code}):`,
                appErr.message,
            );
            return null;
        }
    },
};
