// ======================================================
// EVENTS SERVICE — api.Events.* (Phase 4 port từ base.js G.Events)
// ======================================================
//
// Phase 10: Wire Authorization header từ tokenStorage thay vì
// đọc localStorage trực tiếp (hiện tại api.js đã handle).
//
// Phase 20: Wrap mapApiError để log có cấu trúc.
// LƯU Ý: Events là BEST-EFFORT (không ảnh hưởng UX nếu fail).
// → Service nuốt error sau khi log, không throw ra page handler.
//
// Phase 19 fix: Add guard `if (!getAccessToken()) return null` TRƯỚC khi
// gọi API. Lý do: code gốc `base.js:4003-4011` chỉ POST khi CÓ token:
//   Events: {
//       async playRecord(e) {
//           let t = localStorage.getItem(`token`);
//           if (t) return W.post(`/events/play`, e, { headers: { ... } });
//       }
//   }
//
// Bug trước Phase 19: LUÔN gọi `api.post('/events/play', payload)` bất kể
// login state → backend trả 401 → spam log `[events] playRecord failed
// (code=UNAUTHORIZED)` + Network tab `POST ... 401 (Unauthorized)`.
//
// Hậu quả UX:
//   - User CHƯA login click vào quick-picks/track/album/playlist card →
//     Navigo navigate sang detail page → page handler gọi
//     `recordPlay("song"|"album"|"playlist", id)` → 401 ở console → user
//     confuse vì "chỉ click nhạc, sao báo unauthorized?".
//   - Log warn spam nhiều lần (mỗi lần navigate sang 1 trong 3 detail page
//     đều trigger).
//
// Fix: Guard ở service level (single source of truth) → KHÔNG cần check
// `isLoggedIn()` ở 3 page detail. Caller (`event-tracker.js` + 3 page
// detail) giữ nguyên, chỉ service tự skip khi chưa login.
//

import { api } from "@/libs/api.js";
import { mapApiError } from "@/libs/api-error.js";
import { MESSAGES } from "@/utils/messages.js";
import { getAccessToken } from "@/services/tokenStorage.js";

export const eventsService = {
    /**
     * Ghi nhận 1 lượt play.
     *
     * Guard: chưa login → return null (NO-OP, port `base.js:4003-4011`).
     * Best-effort: đã login nhưng API fail → log warn + return null.
     *
     * @param {{ songId?: string, videoId?: string, playedAt?: string }} payload
     * @returns {Promise<any|null>}
     */
    async playRecord(payload) {
        // GUARD: chưa login → NO-OP (port `base.js:4003-4011` chỉ POST khi có token)
        if (!getAccessToken()) return null;

        try {
            return api.post("/events/play", payload);
        } catch (err) {
            // Best-effort — log structured AppError rồi nuốt (không throw)
            const appErr = mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
            console.warn(`[events] playRecord failed (code=${appErr.code}):`, appErr.message);
            return null;
        }
    },

    /**
     * Ghi nhận 1 lượt click/impression khác (tùy endpoint).
     *
     * Guard: chưa login → return null (NO-OP, đồng nhất pattern với
     * playRecord). Lý do: impression event cũng chỉ track user behavior,
     * không có ý nghĩa khi chưa đăng nhập.
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
            const appErr = mapApiError(err, { defaultMessage: MESSAGES.COMMON.UNKNOWN_ERROR });
            console.warn(`[events] impression failed (code=${appErr.code}):`, appErr.message);
            return null;
        }
    },
};