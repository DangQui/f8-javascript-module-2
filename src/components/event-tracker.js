/**
 * components/event-tracker.js — Wrap playRecord để ghi nhận lượt nghe
 *
 * Port từ `code chức năng gốc/base.js` function `Er()` dòng 5657-5667.
 * Mục đích: sau khi user navigate vào Song/Album/Playlist detail → backend
 * nhận event "user vừa xem detail này" → analytics + recommendation.
 *
 * Best-effort: KHÔNG throw ra page handler (port logic best-effort từ base.js),
 * KHÔNG ảnh hưởng UX nếu fail.
 *
 * Exports:
 *   - recordPlay(type, id) → POST /events/play với {songId|albumId|playlistId}
 *
 * Consumed by:
 *   - `@/pages/song-detail/song-detail.js`
 *   - `@/pages/album-detail/album-detail.js`
 *   - `@/pages/playlist-detail/playlist-detail.js`
 *
 * Lưu ý:
 *   - Chỉ hỗ trợ 3 type: song/album/playlist (code gốc cũng chỉ có 3 type).
 *     Video detail KHÔNG gọi recordPlay.
 *   - KHÔNG cần check auth token ở đây — `eventsService.playRecord()` đã
 *     guard `if (!getAccessToken()) return null` (Phase 19, port base.js:4003-4011).
 *   - Hàm trả về `Promise<null>` để có thể `await` nếu muốn.
 */

import { eventsService } from "@/services/eventsService.js";

/** Type hợp lệ cho recordPlay. Match với base.js switch (line 5660-5662). */
const VALID_TYPES = ["song", "album", "playlist"];

/**
 * Ghi nhận 1 lượt "view/play" cho entity (best-effort).
 *
 * Mapping:
 *   - `recordPlay("song", id)`     → POST /events/play {songId: id}
 *   - `recordPlay("album", id)`    → POST /events/play {albumId: id}
 *   - `recordPlay("playlist", id)` → POST /events/play {playlistId: id}
 *
 * @param {("song"|"album"|"playlist")} type - Loại entity
 * @param {string} id - Mongo ID của entity
 * @returns {Promise<null>} Luôn return null (best-effort, không throw)
 */
export async function recordPlay(type, id) {
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
