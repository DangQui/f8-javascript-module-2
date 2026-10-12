import { escapeHtml, formatViews } from "@/utils/format.js";

// ======================================================
// HELPERS
// ======================================================

/**
 * @param {number} seconds
 * @returns {string}
 */
function formatLongDuration(seconds) {
    const total = Number(seconds) || 0;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;

    if (hours > 0) return `${hours} giờ ${minutes} phút`;
    if (minutes > 0) return `${minutes} phút ${secs} giây`;
    return `${secs} giây`;
}

/**
 * Build YouTube embed URL từ videoId.
 * @param {string} videoId
 * @returns {string}
 */
function buildYouTubeEmbedUrl(videoId) {
    const params = new URLSearchParams({
        autoplay: "1",
        rel: "0", // Không show related videos từ kênh khác
        modestbranding: "1",
    });
    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

// ======================================================
// INFO DETAIL
// ======================================================

export function renderInfoDetail(video) {
    const title = escapeHtml(video.title || "Không rõ tên video");
    const duration = Number(video.duration) || 0;
    const popularity =
        Number.isFinite(video.popularity) && video.popularity >= 0
            ? video.popularity
            : null;

    return `
        <div class="info-detail info-detail--video">
            <p class="info-detail__label">Đang phát</p>
            <h1 class="info-detail__title">${title}</h1>
            <div class="info-detail__meta">
                ${
                    duration > 0
                        ? `
                    <div class="info-detail__meta-item">
                        <span>Thời lượng: ${escapeHtml(formatLongDuration(duration))}</span>
                    </div>
                `
                        : ""
                }
                ${
                    popularity !== null
                        ? `
                    <div class="info-detail__meta-item">
                        <span>${formatViews(popularity)} lượt xem</span>
                    </div>
                `
                        : ""
                }
            </div>
        </div>
    `;
}

// ======================================================
// RELATED LIST — right column
// ======================================================

/**
 * Render một video item trong related list.
 * @param {object} video - { id, title, thumbnails, duration, videoId, popularity }
 * @param {number} index - Index (0-based)
 * @returns {string} HTML
 */
function renderVideoItem(video, index) {
    const thumb = video.thumbnails?.[0] || "/images/quick-picks-01.jpg";
    const title = escapeHtml(video.title || "Không rõ tên");
    const duration = formatLongDuration(Number(video.duration) || 0);

    return `
        <a href="/videos/details/${encodeURIComponent(video.id)}" data-navigo
           class="btn video-list__item">
            <span class="video-list__number">${index + 1}</span>
            <div class="video-list__media">
                <img src="${escapeHtml(thumb)}" alt="${title}" loading="lazy" class="video-list__img" />
                <div class="video-list__play">
                    <i class="fa-solid fa-play"></i>
                </div>
            </div>
            <div class="video-list__info">
                <h3 class="video-list__title">${title}</h3>
            </div>
            <span class="video-list__duration">${escapeHtml(duration)}</span>
        </a>
    `;
}

/**
 * Render related-videos list box (right column).
 * @param {object[]} videos - Array video đã dedupe (current ở đầu)
 * @returns {string} HTML
 */
export function renderVideoList(videos) {
    const list = Array.isArray(videos) ? videos : [];

    if (list.length === 0) {
        return `
            <div class="video-list">
                <p class="video-list__empty">Chưa có video liên quan.</p>
            </div>
        `;
    }

    return `
        <div class="video-list">
            ${list.map((v, i) => renderVideoItem(v, i)).join("")}
        </div>
    `;
}

// ======================================================
// FULL PAGE RENDER
// ======================================================

/**
 * Render toàn bộ Video Detail page (info-detail + related list).
 * @param {object} video - Video object từ detailsService.getVideo() (đã gộp current + related)
 * @returns {string} HTML
 */
export function renderVideoDetail(video) {
    return `
        <div class="row row-cols-2 gx-4">
            <div class="col">
                ${renderInfoDetail(video)}
            </div>
            <div class="col">
                ${renderVideoList(video.relatedList || [])}
            </div>
        </div>
    `;
}
