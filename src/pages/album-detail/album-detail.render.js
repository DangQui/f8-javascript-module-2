// ======================================================
// ALBUM DETAIL PAGE — Render functions
// ======================================================
//
// Layout (2 columns) — port từ `_r()` trong base.js (dòng 4593):
//
//   ┌──────────────────────┬─────────────────────────┐
//   │   .info-detail       │     .track-list         │
//   │   (img + title       │     (scrollable list    │
//   │    + meta)           │      of album tracks)  │
//   └──────────────────────┴─────────────────────────┘
//
// Data flow (port từ `mr()` dòng 4498 + `_r()` dòng 4593):
//   - Info-detail dùng `mr(album)` logic:
//       * albumType present → show "Loại album" + "Phát hành"
//       * songCount > 0 → show "X bài hát"
//       * duration > 0 → show "X giờ Y phút"
//       * popularity >= 0 → show "X lượt nghe"
//   - Track-list: render `album.tracks[]` trực tiếp.
//   - Mỗi track link → /songs/details/:id (Navigo).
//
// Lưu ý:
//   - Tracks có `artists[]` rỗng → fallback "Không rõ nghệ sĩ".
//   - Track item dùng `<a href="/songs/details/...">` (giống song-detail).
//

import { escapeHtml, formatDuration, formatViews } from "@/utils/format.js";
import { renderTrackList as renderTrackItemComponent } from "@/components/track-item.js";

// ======================================================
// INFO DETAIL — left column
// ======================================================

/**
 * Render info-detail box (left column) cho album.
 * @param {object} album - Album object từ detailsService.getAlbum()
 * @returns {string} HTML
 */
export function renderInfoDetail(album) {
    // Album detail có `thumbnails[]` thường rỗng → fallback từ tracks[0]
    const fallbackThumb = album.tracks?.[0]?.thumbnails?.[0];
    const thumbnail = album.thumbnails?.[0] || fallbackThumb || "/images/quick-picks-01.jpg";

    const title = escapeHtml(album.title || "Không rõ tên album");
    const songCount = Number(album.songCount) || 0;
    const totalDuration = Number(album.duration) || 0;
    const popularity = Number.isFinite(album.popularity) && album.popularity >= 0
        ? album.popularity
        : null;
    const albumType = album.albumType || null;
    const releaseDate = album.releaseDate
        ? new Date(album.releaseDate).toLocaleDateString("vi-VN")
        : null;
    const artists = Array.isArray(album.artists) && album.artists.length > 0
        ? album.artists.map((a) => escapeHtml(a)).join(", ")
        : null;

    // Tính giờ/phút nếu có totalDuration
    const hours = totalDuration > 0 ? Math.floor(totalDuration / 3600) : null;
    const minutes = totalDuration > 0 ? Math.floor((totalDuration % 3600) / 60) : null;

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
                    albumType
                        ? `
                    <div class="info-detail__meta-item">
                        <span>Loại album: ${escapeHtml(albumType)}</span>
                    </div>
                `
                        : ""
                }
                ${
                    releaseDate
                        ? `
                    <div class="info-detail__meta-item">
                        <span>Phát hành: ${escapeHtml(releaseDate)}</span>
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
 * @param {object[]} tracks - Album.tracks[]
 * @returns {string} HTML
 */
export function renderTrackList(tracks) {
    return renderTrackItemComponent(tracks, {
        emptyMessage: "Album này chưa có bài hát.",
    });
}

// ======================================================
// FULL PAGE RENDER
// ======================================================

/**
 * Render toàn bộ Album Detail page (info-detail + track-list).
 * @param {object} album - Album object từ detailsService.getAlbum()
 * @returns {string} HTML
 */
export function renderAlbumDetail(album) {
    return `
        <div class="row row-cols-2 gx-4">
            <div class="col">
                ${renderInfoDetail(album)}
            </div>
            <div class="col">
                ${renderTrackList(album.tracks)}
            </div>
        </div>
    `;
}
