// ======================================================
// VIDEO SLIDER COMPONENT — Landscape video slider (Phase 17 → 18.5 refactor)
// ======================================================
//
// Mục tiêu: Tách landscape video slider (port `J()` từ base.js dòng 4097)
// thành component độc lập để dùng ở Line Detail (và bất kỳ page nào cần
// slider video 16:9 ngang).
//
// Phase 18.5 refactor:
//   - TRƯỚC: dùng class riêng `.video-slider__list` + `.video-slider__item`
//     (custom markup + custom SCSS). Khác với pattern chuẩn của Discover
//     page → slider progress không hoạt động, scrollbar khác, padding-bottom lệch.
//   - SAU: dùng class `cart-item cart-item--large` (giống Discover page
//     `renderVideoItem`) + `listClass: "album__list home-album__list"`
//     + `modifierClass: "home-album"` → 100% đồng bộ với Discover page,
//     có scrollbar styling giống các slider khác (Home, Discover, Search).
//
// Reference: `code chức năng gốc/base.js`
//   - J(e, t) dòng 4097 → render 1 video slider
//   - discover.render.js `renderVideoItem` → cart-item--large pattern
//   - section.js `renderSection` → wrapper section (Phase 17)
//
// API:
//   renderVideoSliderItem(video)
//     → 1 landscape card `.cart-item.cart-item--large` (giống Discover)
//
//   renderVideoSlider({ title, videos })
//     → 1 section hoàn chỉnh với title + slider (album-list pattern) + progress
//
//   pickVideoHref(video)
//     → fallback chain id/_id/slug/videoId (Phase 14.12 pattern, dùng chung)
//
// Style: REUSE class `.cart-item` + `.cart-item--large` + `.home-album__list`
// đã có sẵn ở `_cart-item.scss` + `_home.scss`. KHÔNG cần SCSS mới.
// File `_video-slider.scss` cũ đã xóa (Phase 18.5 cleanup) — không còn dùng.
//

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

    // Phase 18.5: đổi từ `.video-slider__*` → `.cart-item.cart-item--large`
    // để đồng bộ với Discover page (line 117-145 discover.render.js).
    // Markup giống hệt `renderVideoItem` ở discover — chỉ khác:
    //   - Bỏ `cart-item__brand` (meta) vì phase 14.12 đã đơn giản hoá
    //     views thành text phụ dưới title.
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
 *
 * Phase 18.5 refactor: dùng cùng pattern với Discover `renderVideosSection`
 * → `listClass: "album__list home-album__list"` + `modifierClass: "home-album"`
 * → đồng bộ với Discover page.
 *
 * Slider dùng `home__container` + `home__row` + `home__body[data-slider]`
 * giống các slider khác (Home, Discover, Mood detail) → auto-detected bởi
 * `libs/slider.js` + có prev/next controls.
 *
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