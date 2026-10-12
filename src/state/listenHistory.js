/**
 * state/listenHistory.js — Local lịch sử nghe (workaround cho backend chưa có)
 *
 * Phase 14.9 — workaround: backend hiện trả `/home/personalized` = global top
 * albums (không phải lịch sử user). User mới chưa nghe gì vẫn thấy "Nghe gần
 * đây" → confused. Chưa wire `eventsService.playRecord()` (Phase 15 todo).
 *
 * Giải pháp tạm:
 *   - Lưu lịch sử vào localStorage mỗi khi user play 1 audio.
 *   - Schema: [{ id, type, title, thumbnail, artists, playedAt }, ...]
 *     - id = song.id (primary key)
 *     - type = "song" | "album" | "playlist" | "video"
 *     - playedAt = Date.now()
 *   - Max 20 items (FIFO).
 *   - Sort theo playedAt DESC.
 *
 * Khi nào upgrade:
 *   - Backend implement history tracking → sync localStorage với backend
 *   - Wire eventsService.playRecord() Phase 15 → backend tự track
 *
 * Exports:
 *   - recordListen(item)             → ghi nhận 1 lượt nghe (dedup by id)
 *   - getListenHistory({type, limit}) → lấy history (sorted DESC)
 *   - clearListenHistory()            → xóa toàn bộ (khi logout)
 *   - getListenHistoryCount()         → số items
 *   - historyItemToRenderItem(item)  → convert sang format home.render
 *
 * Consumed by:
 *   - `@/components/audio-player.js` gọi recordListen() khi play
 *   - `@/pages/home/home.js` getListenHistory({type: 'song', limit: 16})
 */

const STORAGE_KEY = "music.listenHistory.v1";
const SCHEMA_VERSION = 1;
const MAX_ITEMS = 20; // chỉ dùng cho "Nghe gần đây" + tiết kiệm quota
/** @param {object} item @returns {boolean} */
function isValidItem(item) {
    if (!item || typeof item !== "object") return false;
    if (!item.id) return false;
    if (!item.type) return false;
    if (!["song", "album", "playlist", "video"].includes(item.type)) return false;
    return true;
}
/** @returns {Array<object>} Raw items từ localStorage (có thể invalid). */
function _read() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const data = JSON.parse(raw);
        if (data.version !== SCHEMA_VERSION || !Array.isArray(data.items)) {
            return [];
        }
        return data.items;
    } catch (err) {
        console.warn("[listenHistory] Lỗi khi read:", err);
        return [];
    }
}

/** @param {Array<object>} items */
function _write(items) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                version: SCHEMA_VERSION,
                items,
                savedAt: Date.now(),
            })
        );
    } catch (err) {
        console.warn("[listenHistory] Lỗi khi write:", err);
    }
}
/**
 * Ghi nhận 1 lượt nghe (audio hoặc video).
 * Dedup theo id — nếu đã có trong history thì update playedAt + đưa lên đầu.
 *
 * @param {{id: string, type: string, title?: string, thumbnails?: string[],
 *          thumb?: string, artists?: Array, subtitle?: string}} item
 * @returns {Array<object>} history sau khi update
 */
export function recordListen(item) {
    if (!isValidItem(item)) {
        console.warn("[listenHistory] Invalid item:", item);
        return _read();
    }

    const items = _read();

    // Normalize item (chỉ giữ fields cần thiết)
    const normalized = {
        id: String(item.id),
        slug: item.slug || null,
        type: item.type,
        title: item.title || item.name || "",
        thumbnail: Array.isArray(item.thumbnails) && item.thumbnails.length
            ? item.thumbnails[0]
            : item.thumb || "",
        subtitle: item.subtitle || "",
        artists: Array.isArray(item.artists)
            ? item.artists.map((a) =>
                  typeof a === "string" ? a : a?.name || ""
              ).filter(Boolean)
            : [],
        playedAt: Date.now(),
    };

    // Remove duplicate (cùng id) — kể cả type khác nhau
    // (vd: 1 bài có thể xuất hiện ở "song" và "album" track)
    const filtered = items.filter((it) => it.id !== normalized.id);

    // Add new item at the front
    filtered.unshift(normalized);

    // Cap at MAX_ITEMS (FIFO — cắt bài cũ nhất)
    const capped = filtered.slice(0, MAX_ITEMS);

    _write(capped);
    return capped;
}

/**
 * Lấy lịch sử nghe (sort theo playedAt DESC).
 * @param {{ type?: string, limit?: number }} [options]
 *   - type: chỉ lấy items có type này (vd "song")
 *   - limit: giới hạn số items trả về
 * @returns {Array<object>}
 */
export function getListenHistory({ type, limit } = {}) {
    let items = _read();

    if (type) {
        items = items.filter((it) => it.type === type);
    }

    // Sort DESC (unshift ở đầu nên mặc định đã DESC, sort lại cho chắc)
    items.sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0));

    if (limit && items.length > limit) {
        items = items.slice(0, limit);
    }

    return items;
}

/** Xóa toàn bộ lịch sử nghe (gọi khi user logout). */
export function clearListenHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
        console.warn("[listenHistory] Lỗi khi clear:", err);
    }
}

/** @returns {number} Số items trong history (debug + UI). */
export function getListenHistoryCount() {
    return _read().length;
}

/**
 * Convert 1 history item sang format mà `renderQuickPickItem()` của home
 * page expect.
 * @param {object} historyItem
 * @returns {{id, slug, type, title, thumbnails, artists}}
 */
export function historyItemToRenderItem(historyItem) {
    return {
        id: historyItem.id,
        slug: historyItem.slug,
        type: historyItem.type,
        title: historyItem.title,
        thumbnails: historyItem.thumbnail ? [historyItem.thumbnail] : [],
        artists: historyItem.artists || [],
    };
}
