// ======================================================
// TRACK ITEM COMPONENT — Item bài hát trong track list
// ======================================================
//

// ở Album Detail, Playlist Detail, Song Detail, Search results, ...
//
// Style dùng class `.track-list__item` + `.track-list__*` có sẵn
// trong SCSS (`src/styles/components/_track-item.scss`).
// Không thêm SCSS mới — chỉ wrap markup.
//
// API:
//   renderTrackItem({ id, title, artists, thumb, duration, isActive })
//     → HTML string cho 1 track item
//
//   renderTrackList(tracks)
//     → HTML string cho cả list (kèm empty state)
//
// USAGE:
//   import { renderTrackList } from "@/components/track-item.js";
//   const html = renderTrackList(album.tracks);
//

import { escapeHtml, formatDuration } from "@/utils/format.js";

const FALLBACK_THUMB = "/images/quick-picks-01.jpg";

/**
 * Normalize 1 track từ API thành format cho renderTrackItem.
 *
 * @param {object} track - Raw track từ API
 * @returns {{
 *   id: string,
 *   title: string,
 *   artists: string[],
 *   thumb: string,
 *   duration: number,
 * }}
 */
export function normalizeTrackItem(track) {
    return {
        id: track.id || track._id || "",
        title: track.title || track.name || "Không rõ tên",
        artists: Array.isArray(track.artists)
            ? track.artists
                  .map((a) => (typeof a === "string" ? a : a?.name || ""))
                  .filter(Boolean)
            : [],
        thumb: Array.isArray(track.thumbnails)
            ? track.thumbnails[0] || FALLBACK_THUMB
            : track.thumb || FALLBACK_THUMB,
        duration: Number(track.duration) || 0,
    };
}

/**
 * Render 1 track item (anchor click → navigate to song detail).
 *
 * @param {object} track - Raw track từ API
 * @param {number} [index=0] - Index 0-based (để hiển thị số thứ tự)
 * @param {object} [options]
 * @param {boolean} [options.isActive=false] - Track đang phát (highlight)
 * @param {string} [options.basePath="/songs/details"] - Prefix cho href
 * @returns {string} HTML
 */
export function renderTrackItem(track, index = 0, options = {}) {
    if (!track || !track.id) return "";

    const normalized = normalizeTrackItem(track);
    const {
        isActive = false,
        basePath = "/songs/details",
    } = options;

    const title = escapeHtml(normalized.title);
    const artists = normalized.artists.length > 0
        ? normalized.artists.map((a) => escapeHtml(a)).join(", ")
        : "Không rõ nghệ sĩ";
    const duration = formatDuration(normalized.duration);
    const activeClass = isActive ? " track-list__item--active" : "";
    const dataAttrs = isActive
        ? ` data-track-active="true"`
        : "";

    return `
        <a
            href="${basePath}/${encodeURIComponent(normalized.id)}"
            data-navigo
            data-track-id="${escapeHtml(normalized.id)}"${dataAttrs}
            class="btn track-list__item${activeClass}">
            <span class="track-list__number">${index + 1}</span>
            <div class="track-list__media">
                <img
                    src="${escapeHtml(normalized.thumb)}"
                    alt="${title}"
                    loading="lazy"
                    class="track-list__img" />
                <div class="track-list__play">
                    <i class="fa-solid fa-play"></i>
                </div>
            </div>
            <div class="track-list__info">
                <h3 class="track-list__title">${title}</h3>
                <p class="track-list__artist">${artists}</p>
            </div>
            <span class="track-list__duration">${duration}</span>
        </a>
    `;
}

/**
 * Render nhiều track item cùng lúc.
 *
 * @param {Array<object>} tracks - Mảng raw tracks từ API
 * @param {object} [options]
 * @param {string} [options.basePath="/songs/details"]
 * @returns {string} HTML string
 */
export function renderTrackItems(tracks, options = {}) {
    if (!Array.isArray(tracks) || tracks.length === 0) return "";
    return tracks
        .map((t, i) => renderTrackItem(t, i, options))
        .join("");
}

/**
 * Render track-list box (full container với empty state).
 *
 * @param {Array<object>} tracks - Mảng raw tracks từ API
 * @param {object} [options]
 * @param {string} [options.basePath="/songs/details"]
 * @param {string} [options.emptyMessage="Chưa có bài hát nào."]
 * @returns {string} HTML
 */
export function renderTrackList(tracks, options = {}) {
    const {
        basePath = "/songs/details",
        emptyMessage = "Chưa có bài hát nào.",
    } = options;

    const list = Array.isArray(tracks) ? tracks : [];

    if (list.length === 0) {
        return `
            <div class="track-list">
                <p class="track-list__empty">${escapeHtml(emptyMessage)}</p>
            </div>
        `;
    }

    return `
        <div class="track-list">
            ${renderTrackItems(list, { basePath })}
        </div>
    `;
}

export default renderTrackItem;