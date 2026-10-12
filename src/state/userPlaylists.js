/**
 * state/userPlaylists.js — Local user-created playlists (workaround)
 *
 * Phase L-2.1 (09/10/2026) — workaround cho backend chưa implement
 * `/me/playlists` (16 endpoint dạng `/me/*` đều 404).
 *
 * Lý do tạo:
 *   - Backend KHÔNG có `/me/playlists` (test 09/10/2026).
 *   - base.js gốc CŨNG không có library API (chỉ `getPlaylist(slug)`).
 *   - User muốn click "Thêm vào playlist" ở dấu 3 chấm video → lưu được
 *     và xem lại ở `/library`.
 *
 * Schema: {version, playlists: [{slug, title, videos: [...], createdAt}]}
 *   - slug: tự generate từ title + random (unique)
 *   - videos: [{id, title, thumbnail, artists, addedAt}]
 *   - Max 50 playlists (FIFO).
 *   - Sort theo createdAt DESC.
 *
 * Khi nào upgrade:
 *   - Backend implement `/me/playlists` → service fallback xuống localStorage
 *     khi API 404 (Phase L-2.x).
 *   - Có thể sync localStorage ↔ backend qua `userId` key.
 *
 * Exports:
 *   - getUserPlaylists()                → tất cả playlist (sort DESC)
 *   - getUserPlaylist(slug)              → 1 playlist
 *   - createPlaylist(title)              → tạo mới
 *   - addVideoToUserPlaylist(slug, v)   → thêm video (dedup by id)
 *   - removeVideoFromUserPlaylist(slug, videoId) → xóa video
 *   - removeUserPlaylist(slug)           → xóa playlist
 *   - clearUserPlaylists()               → xóa tất cả
 *   - getStorageKey()                    → debug
 *
 * Consumed by:
 *   - `@/components/video-overlay.js` (3 chấm menu → "Thêm vào playlist")
 *   - `@/pages/library/library.js` (render Playlists tab)
 */

const STORAGE_KEY = "music.userPlaylists.v1";
const SCHEMA_VERSION = 1;
const MAX_PLAYLISTS = 50;

// ======================================================
// VALIDATE
// ======================================================

/** @param {object} pl @returns {boolean} */
function isValidPlaylist(pl) {
    if (!pl || typeof pl !== "object") return false;
    if (!pl.slug || typeof pl.slug !== "string") return false;
    if (!pl.title || typeof pl.title !== "string") return false;
    if (!Array.isArray(pl.videos)) return false;
    return true;
}

/** @param {object} v @returns {boolean} */
function isValidVideo(v) {
    if (!v || typeof v !== "object") return false;
    if (!v.id) return false;
    if (!v.title) return false;
    return true;
}

// ======================================================
// READ / WRITE
// ======================================================

/** @returns {{version: number, playlists: Array}} */
function readRaw() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { version: SCHEMA_VERSION, playlists: [] };

        const data = JSON.parse(raw);
        if (
            !data ||
            typeof data !== "object" ||
            data.version !== SCHEMA_VERSION ||
            !Array.isArray(data.playlists)
        ) {
            return { version: SCHEMA_VERSION, playlists: [] };
        }
        return data;
    } catch (err) {
        console.warn("[userPlaylists] readRaw parse error:", err);
        return { version: SCHEMA_VERSION, playlists: [] };
    }
}

/** @param {{version: number, playlists: Array}} data */
function writeRaw(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
        console.error("[userPlaylists] writeRaw error:", err);
    }
}

/**
 * Generate slug unique từ title + random suffix.
 * @param {string} title
 * @returns {string}
 */
function generateSlug(title) {
    const base = String(title || "playlist")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // xóa dấu
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .substring(0, 40);
    const suffix = Math.random().toString(36).substring(2, 8);
    return (base || "playlist") + "-" + suffix;
}

// ======================================================
// PUBLIC API
// ======================================================

/**
 * Lấy tất cả user playlists (sort theo createdAt DESC).
 * @returns {Array<{slug, title, videos, createdAt}>}
 */
export function getUserPlaylists() {
    const data = readRaw();
    return [...data.playlists].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/**
 * Lấy 1 playlist theo slug.
 * @param {string} slug
 * @returns {object|null}
 */
export function getUserPlaylist(slug) {
    if (!slug) return null;
    const data = readRaw();
    return data.playlists.find((p) => p.slug === slug) || null;
}

/**
 * Tạo playlist mới.
 * @param {string} title
 * @returns {{slug, title, videos, createdAt}}
 */
export function createPlaylist(title) {
    const cleanTitle = String(title || "").trim();
    if (!cleanTitle) {
        throw new Error("Tên playlist không được để trống");
    }

    const data = readRaw();
    const newPlaylist = {
        slug: generateSlug(cleanTitle),
        title: cleanTitle,
        videos: [],
        createdAt: Date.now(),
    };
    data.playlists.unshift(newPlaylist);

    // FIFO cap
    if (data.playlists.length > MAX_PLAYLISTS) {
        data.playlists = data.playlists.slice(0, MAX_PLAYLISTS);
    }

    writeRaw(data);
    return newPlaylist;
}

/**
 * Thêm 1 video vào playlist (theo slug). Dedup theo video.id.
 * @param {string} slug
 * @param {object} video - {id, title, thumbnail?, thumbnails?, artists?, duration?}
 * @returns {object|null} playlist đã update, hoặc null nếu slug không tồn tại
 */
export function addVideoToUserPlaylist(slug, video) {
    if (!slug) return null;
    if (!isValidVideo(video)) {
        console.warn("[userPlaylists] addVideoToUserPlaylist: invalid video", video);
        return null;
    }

    const data = readRaw();
    const playlist = data.playlists.find((p) => p.slug === slug);
    if (!playlist) return null;

    // Normalize video
    const videoItem = {
        id: video.id,
        title: video.title,
        thumbnail:
            Array.isArray(video.thumbnails) && video.thumbnails.length > 0
                ? video.thumbnails[0]
                : video.thumbnail || "",
        artists: Array.isArray(video.artists) ? video.artists : [],
        addedAt: Date.now(),
    };

    // Dedup theo id
    const existingIdx = playlist.videos.findIndex((v) => v.id === video.id);
    if (existingIdx >= 0) {
        playlist.videos[existingIdx] = videoItem; // update addedAt
    } else {
        playlist.videos.unshift(videoItem);
    }

    writeRaw(data);
    return playlist;
}

/**
 * Xoá 1 video khỏi playlist.
 * @param {string} slug
 * @param {string} videoId
 * @returns {boolean} true nếu xoá thành công
 */
export function removeVideoFromUserPlaylist(slug, videoId) {
    if (!slug || !videoId) return false;

    const data = readRaw();
    const playlist = data.playlists.find((p) => p.slug === slug);
    if (!playlist) return false;

    const before = playlist.videos.length;
    playlist.videos = playlist.videos.filter((v) => v.id !== videoId);
    if (playlist.videos.length === before) return false;

    writeRaw(data);
    return true;
}

/** Xoá cả playlist. @returns {boolean} */
export function removeUserPlaylist(slug) {
    if (!slug) return false;

    const data = readRaw();
    const before = data.playlists.length;
    data.playlists = data.playlists.filter((p) => p.slug !== slug);
    if (data.playlists.length === before) return false;

    writeRaw(data);
    return true;
}

/** Xoá tất cả (debug/test). */
export function clearUserPlaylists() {
    writeRaw({ version: SCHEMA_VERSION, playlists: [] });
}

/** @returns {string} Storage key (cho test/debug). */
export function getStorageKey() {
    return STORAGE_KEY;
}

export default {
    getUserPlaylists,
    getUserPlaylist,
    createPlaylist,
    addVideoToUserPlaylist,
    removeVideoFromUserPlaylist,
    removeUserPlaylist,
    clearUserPlaylists,
    getStorageKey,
};
