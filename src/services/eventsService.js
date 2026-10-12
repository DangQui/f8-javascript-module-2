/**
 * services/eventsService.js — User behavior tracking (best-effort)
 *
 * Wire Authorization header từ tokenStorage (Phase 10) + guard login (Phase 19).
 *
 * LƯU Ý: Events là BEST-EFFORT — không ảnh hưởng UX nếu fail.
 * → Service nuốt error sau khi log, không throw ra page handler.
 *
 * Phase 19 fix: Add guard `if (!getAccessToken()) return null` TRƯỚC khi gọi.
 * Bug trước: LUÔN gọi API bất kể login state → backend 401 → spam log +
 * user confuse vì "chỉ click nhạc, sao báo unauthorized?".
 * Fix: Guard ở service level (SSOT) → không cần check ở caller.
 *
 * Exports:
 *   - eventsService.playRecord(payload)    → POST /events/play
 *   - eventsService.impression(payload)    → POST /events/impression
 *
 * Consumed by:
 *   - `@/components/event-tracker.js` (auto-track click)
 *   - 3 page detail (song/album/playlist) gọi recordPlay sau khi render
 */

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";
import { getAccessToken } from "@/services/tokenStorage.js";

export const eventsService = {
    /**
     * Ghi nhận 1 lượt play. Guard: chưa login → return null (NO-OP,
     * port `base.js:4003-4011` chỉ POST khi có token).
     *
     * Best-effort: đã login nhưng API fail → log warn + return null.
     *
     * @param {{songId?: string, videoId?: string, playedAt?: string}} payload
     * @returns {Promise<any|null>}
     */
    async playRecord(payload) {
        // GUARD: chưa login → NO-OP
        if (!getAccessToken()) return null;

        try {
            return api.post("/events/play", payload);
        } catch (err) {
            // Best-effort — log structured AppError rồi nuốt
            const appErr = mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
            console.warn(`[events] playRecord failed (code=${appErr.code}):`, appErr.message);
            return null;
        }
    },

    /**
     * Ghi nhận impression/click. Guard: chưa login → return null (NO-OP).
     * Lý do: impression event chỉ track user behavior, không có ý nghĩa khi
     * chưa đăng nhập.
     *
     * @param {object} payload
     * @returns {Promise<any|null>}
     */
    async impression(payload) {
        if (!getAccessToken()) return null;

        try {
            return api.post("/events/impression", payload);
        } catch (err) {
            const appErr = mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
            console.warn(`[events] impression failed (code=${appErr.code}):`, appErr.message);
            return null;
        }
    },
};
