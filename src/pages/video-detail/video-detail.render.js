/**
 * pages/video-detail/video-detail.render.js — Video Detail page render
 *
 * Layout (2 columns) — port từ `Cr()` trong base.js (dòng 5527):
 *
 *   ┌──────────────────────┬─────────────────────────┐
 *   │   .info-detail       │     .video-list         │
 *   │   (YouTube iframe    │     (scrollable list    │
 *   │    + title + meta)   │      of related videos)  │
 *   └──────────────────────┴─────────────────────────┘
 *
 * Data flow (port từ `Cr()` base.js dòng 5527 + `Sr()` dòng 5509 + `xr()` dòng 5477):
 *   - API trả `video` ở root + `related[]` ~20 items (đã bao gồm video hiện tại ở cuối).
 *   - `n = [video, ...related]` dedupe by `id` (giữ thứ tự đầu tiên) → render related list.
 *   - Info-detail:
 *       * YouTube iframe embed (16:9, autoplay=1, no controls stop nav)
 *       * title
 *       * "Đang phát" label
 *       * duration → format "X giờ Y phút" (port `hr()` base.js dòng 4558)
 *       * popularity → "X lượt xem"
 *   - Mỗi video trong related list click → navigate `/videos/details/:id` (Navigo).
 *
 * Lưu ý:
 *   - Tạm thời dùng YouTube iframe embed thuần (không dùng class `Z` phức tạp của base.js).
 *   - Click related → navigate trang → iframe reset với video mới.
 *   - `videoId` là YouTube ID 11-char (vd "Rb0UmrCXxVA").
 *
 * Exports:
 *   - renderInfoDetail(video)    → left column HTML
 *   - renderVideoList(videos)    → right column HTML
 *   - renderVideoDetail(video)   → full page HTML
 *
 * Consumed by:
 *   - `@/pages/video-detail/video-detail.js`
 */

import { escapeHtml, formatViews } from "@/utils/format.js";

/**
 * Format duration (giây) → "X giờ Y phút" / "Y phút Z giây" / "Z giây"
 * Port từ `hr()` base.js dòng 4558-4563.
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
        rel: "0",        // Không show related videos từ kênh khác
        modestbranding: "1",
    });
    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

/**
 * Render info-detail box (left column) cho video.
 * Gồm: Label "Đang phát" + Title (h1) + Meta: duration + popularity.
 *
 * KHÔNG render iframe ở đây (player được mount bởi video-overlay component).
 */
export function renderInfoDetail(video) {
    const title = escapeHtml(video.title || "Không rõ tên video");
    const duration = Number(video.duration) || 0;
    const popularity = Number.isFinite(video.popularity) && video.popularity >= 0
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

/**
 * Render một video item trong related list.
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
