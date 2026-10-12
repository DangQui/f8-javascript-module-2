import { escapeHtml, formatDuration, formatViews } from "@/utils/format.js";
import { renderTrackList as renderTrackItemComponent } from "@/components/track-item.js";

// ======================================================
// INFO DETAIL — left column
// ======================================================

/**
 * @param {object} song - Song object từ detailsService.getSong()
 * @returns {string} HTML
 */
export function renderInfoDetail(song) {
    const thumbnail = song.thumbnails?.[0] || "/images/quick-picks-01.jpg";
    const title = escapeHtml(song.title || "Không rõ tên bài hát");
    const durationSec = Number(song.duration) || 0;
    const popularity =
        Number.isFinite(song.popularity) && song.popularity >= 0
            ? song.popularity
            : null;

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
                    durationSec > 0
                        ? `
                    <div class="info-detail__meta-item">
                        <span>Thời lượng:</span>
                        <span>${formatDuration(durationSec)}</span>
                    </div>
                `
                        : ""
                }
                ${
                    popularity !== null
                        ? `
                    <div class="info-detail__meta-item">
                        <span>Lượt nghe:</span>
                        <span>${formatViews(popularity)}</span>
                    </div>
                `
                        : ""
                }
            </div>
        </div>
    `;
}

// ======================================================
// TRACK LIST — right column (scrollable list of related tracks)
// ======================================================

/**
 * Render track-list box (right column).
 * @param {object} song - Song object (chứa album.tracks, playlists, related)
 * @returns {string} HTML
 */
export function renderSongTrackList(song) {
    // Combine tracks từ album + playlists (theo logic base.js `br()`)
    const fromAlbum = Array.isArray(song.album?.tracks)
        ? song.album.tracks
        : [];
    const fromPlaylists = Array.isArray(song.playlists)
        ? song.playlists.flatMap((p) =>
              Array.isArray(p.tracks) ? p.tracks : [],
          )
        : [];

    // Dedupe by id
    const combined = [...fromAlbum, ...fromPlaylists];
    const uniqueMap = new Map(combined.map((t) => [t.id, t]));
    let tracks = Array.from(uniqueMap.values());

    // Fallback: nếu rỗng → dùng related
    if (tracks.length === 0 && Array.isArray(song.related)) {
        tracks = song.related;
    }

    // Dùng component track-item (CÓ data-track-id → audio-player click handler work)
    return renderTrackItemComponent(tracks, {
        emptyMessage: "Không có bài hát liên quan.",
    });
}

// ======================================================
// FULL PAGE RENDER
// ======================================================

/**
 * Render toàn bộ Song Detail page (info-detail + track-list).
 * @param {object} song - Song object từ detailsService.getSong()
 * @returns {string} HTML
 */
export function renderSongDetail(song) {
    return `
        <div class="row row-cols-2 gx-4">
            <div class="col">
                ${renderInfoDetail(song)}
            </div>
            <div class="col">
                ${renderSongTrackList(song)}
            </div>
        </div>
    `;
}
