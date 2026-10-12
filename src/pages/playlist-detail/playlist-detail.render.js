import { escapeHtml, formatDuration, formatViews } from "@/utils/format.js";
import { renderTrackList as renderTrackItemComponent } from "@/components/track-item.js";

// ======================================================
// INFO DETAIL — left column
// ======================================================

/**
 * Render info-detail box (left column) cho playlist.
 * @param {object} playlist - Playlist object từ detailsService.getPlaylist()
 * @returns {string} HTML
 */
export function renderInfoDetail(playlist) {
    // Playlist có `thumbnails[]` thường có sẵn ở root → fallback từ tracks[0]
    const fallbackThumb = playlist.tracks?.[0]?.thumbnails?.[0];
    const thumbnail =
        playlist.thumbnails?.[0] ||
        fallbackThumb ||
        "/images/quick-picks-01.jpg";

    const title = escapeHtml(playlist.title || "Không rõ tên playlist");
    const songCount = Number(playlist.songCount) || 0;
    const totalDuration = Number(playlist.duration) || 0;
    const popularity =
        Number.isFinite(playlist.popularity) && playlist.popularity >= 0
            ? playlist.popularity
            : null;
    const description = playlist.description || null;
    const artists =
        Array.isArray(playlist.artists) && playlist.artists.length > 0
            ? playlist.artists.map((a) => escapeHtml(a)).join(", ")
            : null;

    // Tính giờ/phút nếu có totalDuration
    const hours = totalDuration > 0 ? Math.floor(totalDuration / 3600) : null;
    const minutes =
        totalDuration > 0 ? Math.floor((totalDuration % 3600) / 60) : null;

    return `
        <div class="info-detail">
            <img
                src="${escapeHtml(thumbnail)}"
                class="info-detail__img"
                alt="${title}"
                loading="lazy" />
            <h1 class="info-detail__title">${title}</h1>
            <div class="info-detail__meta">
                ${
                    !songCount && description
                        ? `<p class="info-detail__desc">${escapeHtml(description)}</p>`
                        : ""
                }
                ${
                    songCount > 0 || totalDuration > 0
                        ? `
                    <div class="info-detail__meta-row">
                        ${songCount > 0 ? `<span>${songCount} bài hát</span>` : ``}
                        ${songCount > 0 && totalDuration > 0 ? `<span class="info-detail__meta-dot">•</span>` : ``}
                        ${totalDuration > 0 ? `<span>${hours} giờ ${minutes} phút</span>` : ``}
                    </div>
                `
                        : ""
                }
                ${
                    popularity !== null
                        ? `
                    <div class="info-detail__meta-item">
                        <span>${formatViews(popularity)} lượt nghe</span>
                    </div>
                `
                        : ""
                }
                ${
                    artists
                        ? `
                    <div class="info-detail__meta-item">
                        <span>Các nghệ sĩ: ${artists}</span>
                    </div>
                `
                        : ""
                }
            </div>
        </div>
    `;
}

// ======================================================
// TRACK LIST — right column
// ======================================================

/**
 * Render một track item trong list.
 * @param {object} track - { id, title, thumbnails, duration, artists }
 * @param {number} index - Index (0-based) để hiển thị số thứ tự
 * @returns {string} HTML
 */
/**
 * Render track-list box (right column).
 * Dùng `track-item` component.
 * @param {object[]} tracks - Playlist.tracks[]
 * @returns {string} HTML
 */
export function renderTrackList(tracks) {
    return renderTrackItemComponent(tracks, {
        emptyMessage: "Playlist này chưa có bài hát.",
    });
}

// ======================================================
// FULL PAGE RENDER
// ======================================================

/**
 * Render toàn bộ Playlist Detail page (info-detail + track-list).
 * @param {object} playlist - Playlist object từ detailsService.getPlaylist()
 * @returns {string} HTML
 */
export function renderPlaylistDetail(playlist) {
    return `
        <div class="row row-cols-2 gx-4">
            <div class="col">
                ${renderInfoDetail(playlist)}
            </div>
            <div class="col">
                ${renderTrackList(playlist.tracks)}
            </div>
        </div>
    `;
}
