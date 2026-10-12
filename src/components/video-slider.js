import { escapeHtml, formatViews } from "@/utils/format.js";
import { renderSection } from "@/components/section.js";

// ======================================================
// HELPERS
// ======================================================

/**
 * Fallback chain cho video href — port từ Phase 14.12 helper.
 *
 * Backend khác nhau giữa các endpoint:
 *   - `/explore/videos`  → có `slug` + `id`
 *   - `/charts/videos`   → chỉ có `videoId` + `_id`
 *   - `/lines/{id}/videos` → có thể có `id` hoặc `_id` hoặc `slug`
 *
 * @param {object} video
 * @returns {string} id/slug dùng để build href
 */
export function pickVideoHref(video) {
    return video?.slug || video?._id || video?.id || video?.videoId || "";
}

/**
 * Normalize 1 video item từ API về format dùng cho slider.
 * @param {object} video
 * @returns {{
 *   href: string,
 *   thumb: string,
 *   title: string,
 *   views: number,
 * }}
 */
function normalizeVideoSliderItem(video) {
    const id = pickVideoHref(video);
    const href = id ? `/videos/details/${id}` : "#";

    const thumb =
        (Array.isArray(video.thumbnails) && video.thumbnails[0]) ||
        video.thumb ||
        "https://picsum.photos/seed/video/400/240";

    return {
        href,
        thumb,
        title: video.title || video.name || "Untitled",
        views: Number(video.views) || 0,
    };
}

// ======================================================
// RENDER FUNCTIONS
// ======================================================

/**
 * Render 1 landscape video card (Phase 18.5: dùng `cart-item cart-item--large`
 * giống Discover page `renderVideoItem` thay vì class riêng cũ).
 *
 * @param {object} video - raw video từ API
 * @returns {string} HTML
 */
export function renderVideoSliderItem(video) {
    const { href, thumb, title } = normalizeVideoSliderItem(video);
    const titleEsc = escapeHtml(title);
    const thumbEsc = escapeHtml(thumb);

    return `
        <a
            href="${escapeHtml(href)}"
            data-navigo
            class="cart-item cart-item--large"
            data-slider-item>
            <div class="cart-item__media cart-item__media--large">
                <img
                    src="${thumbEsc}"
                    alt="${titleEsc}"
                    loading="lazy"
                    class="cart-item__img" />
                <div class="cart-item__overlay"></div>
                <div class="cart-item__icon">
                    <i class="fa-solid fa-play"></i>
                </div>
            </div>
            <div class="cart-item__content">
                <h3 class="cart-item__title">${titleEsc}</h3>
            </div>
        </a>
    `;
}

/**
 * @param {object} options
 * @param {string} [options.title] - Tiêu đề section (vd: "Video nhạc")
 * @param {Array<object>} [options.videos=[]] - Mảng video items
 * @returns {string} HTML
 */
export function renderVideoSlider({ title = "", videos = [] } = {}) {
    if (!Array.isArray(videos) || videos.length === 0) return "";

    return renderSection({
        title,
        bodyHtml: videos.map((v) => renderVideoSliderItem(v)).join(""),
        listClass: "album__list home-album__list",
        modifierClass: "home-album",
        showControls: true,
        slider: true,
    });
}

export default renderVideoSlider;
