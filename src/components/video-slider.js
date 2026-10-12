/**
 * components/video-slider.js — Landscape video slider (Phase 18.5)
 *
 * Tách landscape video slider (port `J()` từ base.js dòng 4097) thành
 * component độc lập để dùng ở Line Detail (và bất kỳ page nào cần
 * slider video 16:9 ngang).
 *
 * Phase 18.5 refactor:
 *   - Trước: class riêng `.video-slider__list` + `.video-slider__item`
 *     (custom markup + custom SCSS) → slider progress không hoạt động.
 *   - Sau: dùng `cart-item cart-item--large` (giống Discover page
 *     `renderVideoItem`) + `listClass: "album__list home-album__list"`
 *     + `modifierClass: "home-album"` → 100% đồng bộ Discover page.
 *
 * Reference:
 *   - `code chức năng gốc/base.js` J(e, t) dòng 4097
 *   - `discover.render.js` renderVideoItem
 *   - `section.js` renderSection
 *
 * Style: REUSE `.cart-item` + `.cart-item--large` + `.home-album__list`
 * đã có sẵn ở `_cart-item.scss` + `_home.scss`. File `_video-slider.scss`
 * cũ đã xóa (Phase 18.5 cleanup).
 *
 * Exports:
 *   - renderVideoSlider({title, videos})   → 1 section hoàn chỉnh
 *   - renderVideoSliderItem(video)         → 1 landscape card
 *   - pickVideoHref(video)                 → fallback chain id/_id/slug/videoId
 *
 * Consumed by:
 *   - `@/pages/line-detail/line-detail.render.js` (Video section)
 *   - `@/pages/charts/charts.render.js` (Top Videos)
 */

import { escapeHtml, formatViews } from "@/utils/format.js";
import { renderSection } from "@/components/section.js";
/**
 * Fallback chain cho video href (port từ Phase 14.12 helper).
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
 * @returns {{href: string, thumb: string, title: string, views: number}}
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
/**
 * Render 1 landscape video card (dùng `cart-item cart-item--large` giống
 * Discover page `renderVideoItem`).
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
 * Render 1 video slider section hoàn chỉnh (port `J()` từ base.js dòng 4097).
 * Dùng cùng pattern với Discover `renderVideosSection`:
 * `listClass: "album__list home-album__list"` + `modifierClass: "home-album"`.
 *
 * @param {object} options
 * @param {string} [options.title]
 * @param {Array<object>} [options.videos=[]]
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
