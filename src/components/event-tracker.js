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
        console.warn(
            `[event-tracker] Invalid type "${type}". Valid: ${VALID_TYPES.join(", ")}`,
        );
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
        console.warn(
            `[event-tracker] Unexpected error recording ${type} ${id}:`,
            err,
        );
        return null;
    }
}

export default recordPlay;
