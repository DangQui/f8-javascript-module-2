// ======================================================
// EVENT TRACKER — Wrap playRecord để ghi nhận lượt nghe
// ======================================================
//
// Port từ `code chức năng gốc/base.js` function `Er()` dòng 5657-5667:
//
//   async function Er(e, t) {
//       try {
//           let n = {};
//           e === `song` && (n.songId = t),
//           e === `album` && (n.albumId = t),
//           e === `playlist` && (n.playlistId = t),
//           await G.Events.playRecord(n)
//       } catch (e) {
//           console.warn(`Play event error:`, e)
//       }
//   }
//
// Mục đích:
//   - Sau khi user navigate vào Song/Album/Playlist detail → backend nhận
//     event "user vừa xem detail này" → phục vụ analytics + recommendation.
//   - Best-effort: KHÔNG throw ra page handler (port logic best-effort từ
//     base.js — `console.warn` + return null), KHÔNG ảnh hưởng UX nếu fail.
//
// USAGE:
//   import { recordPlay } from "@/components/event-tracker.js";
//   await recordPlay("song", song.id);      // sau khi getSong(id) success
//   await recordPlay("album", album.id);    // sau khi getAlbum(slug) success
//   await recordPlay("playlist", pl.id);    // sau khi getPlaylist(slug) success
//
// Lưu ý kỹ thuật:
//   - Hàm trả về `Promise<null>` để có thể `await` nếu muốn (best-effort).
//   - Hiện chỉ hỗ trợ 3 type: song/album/playlist. Code gốc cũng chỉ có 3
//     type này (video detail KHÔNG gọi Er()).
//   - KHÔNG cần check auth token ở đây — `eventsService.playRecord()`
//     đã guard `if (!getAccessToken()) return null` (Phase 19, port
//     `base.js:4003-4011`). Chưa login → service tự NO-OP, không có
//     HTTP request, không spam log 401 ở console.
//
// ======================================================

import { eventsService } from "@/services/eventsService.js";

/**
 * Type hợp lệ cho `recordPlay`.
 * Match với base.js switch (line 5660-5662).
 */
const VALID_TYPES = ["song", "album", "playlist"];

/**
 * Ghi nhận 1 lượt "view/play" cho entity (best-effort).
 *
 * Port từ `Er()` base.js dòng 5657. Mapping:
 *   - `recordPlay("song", id)`     → POST `/events/play {songId: id}`
 *   - `recordPlay("album", id)`    → POST `/events/play {albumId: id}`
 *   - `recordPlay("playlist", id)` → POST `/events/play {playlistId: id}`
 *
 * @param {("song"|"album"|"playlist")} type - Loại entity
 * @param {string} id - Mongo ID của entity
 * @returns {Promise<null>} Luôn return null (best-effort, không throw)
 */
export async function recordPlay(type, id) {
    // Validate input (defensive)
    if (!VALID_TYPES.includes(type)) {
        console.warn(`[event-tracker] Invalid type "${type}". Valid: ${VALID_TYPES.join(", ")}`);
        return null;
    }

    if (!id || typeof id !== "string") {
        console.warn(`[event-tracker] Invalid id for type "${type}":`, id);
        return null;
    }

    // Build payload theo type (port logic base.js:5660-5662)
    const payload = {};
    if (type === "song") payload.songId = id;
    else if (type === "album") payload.albumId = id;
    else if (type === "playlist") payload.playlistId = id;

    try {
        // eventsService.playRecord đã wrap mapApiError + best-effort
        // → nuốt lỗi internally + log warning → KHÔNG throw ra đây.
        return await eventsService.playRecord(payload);
    } catch (err) {
        // Double safety net (eventsService đã catch, nhưng thêm 1 lớp nữa
        // để chắc chắn KHÔNG BAO GIỜ throw ra caller).
        console.warn(`[event-tracker] Unexpected error recording ${type} ${id}:`, err);
        return null;
    }
}

export default recordPlay;