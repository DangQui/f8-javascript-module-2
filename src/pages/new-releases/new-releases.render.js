// ======================================================
// NEW RELEASES PAGE — Render functions
// ======================================================
//
// Port từ `code chức năng gốc/base.js` function `cr()` dòng 4415:
//
//   function cr(e, t) {
//       return !e.length && !t.length ? `<p>Không có dữ liệu</p>` : `
//         <div class="p-4 text-white">
//           <h1 class="font-bold text-[45px] -mb-10">Bản phát hành mới</h1>
//           ${Y(``, e, `/albums/details`)}
//           ${J(`Video nhạc mới`, t)}
//         </div>
//       `
//   }
//
// → 2 sections: Albums slider (no heading — title dùng page title) + Videos slider.
// → Nếu cả 2 mảng rỗng → fallback "Không có dữ liệu".
//
// USAGE:
//   import { renderNewReleases } from "@/pages/new-releases/new-releases.render.js";
//   const html = renderNewReleases(albums, videos);
//
// ======================================================

import { renderSection as renderSectionComponent, renderSliderSection as renderSliderSectionComponent } from "@/components/section.js";
import { escapeHtml } from "@/utils/format.js";

// ======================================================
// SECTION — Albums slider (no title — page title đã có ở H1)
// ======================================================
//
// Port từ `Y(``, e, '/albums/details')` — slider ngang album items.
// KHÔNG truyền `title` (base.js dùng chuỗi rỗng) → H1 đã ở page.
// ======================================================

/**
 * Render slider albums cho New Releases.
 * Tái sử dụng helper `renderSliderSection` từ section.js với title rỗng.
 *
 * @param {Array<object>} albums - Albums từ `exploreService.getNewReleases()`
 * @returns {string} HTML
 */
function renderNewReleasesAlbumsSection(albums) {
    if (!Array.isArray(albums) || albums.length === 0) return "";
    return renderSliderSectionComponent({
        title: "",
        items: albums,
        basePath: "/albums/details",
        listClass: "album__list home-album__list",
        modifierClass: "home-album",
        showControls: true,
        slider: true,
    });
}

// ======================================================
// SECTION — Video slider (port từ J('Video nhạc mới', videos))
// ======================================================
//
// Video dùng `cart-item--large` (landscape thumb) — copy từ discover.render.js
// để đảm bảo style khớp 100% với slider Video ở Discover.
// ======================================================

/**
 * Pick href cho video item — port pattern `/videos/details/:slug` (xem base.js
 * 4156 + video-overlay.js:1075).
 *
 * Thứ tự ưu tiên:
 *   1. slug (vd: "nhc-c-in-video-40-39") — chuẩn SEO, dễ đọc
 *   2. _id   (Mongo ID)
 *   3. id    (fallback generic)
 *   4. videoId (YouTube videoId — vd: "Rb0UmrCXxVA", dùng làm identifier cuối cùng)
 *
 * Phase 14.12 fix: `/charts/videos` endpoint trả items CHỈ CÓ `videoId`+`_id`
 * (không có `slug`/`id`) → nếu chỉ fallback `slug || id` → URL = "/videos/details/undefined"
 * → Navigo không match → reload page. Thêm `_id` + `videoId` làm fallback chain.
 *
 * @param {object} video
 * @returns {string} path segment
 */
function pickVideoHref(video) {
    return video.slug || video._id || video.id || video.videoId || "";
}

/**
 * Render 1 video cart-item (kích thước lớn — landscape thumb).
 * Tái sử dụng style `.cart-item--large` + `.cart-item__media--large`
 * từ `_cart-item.scss` (shared component).
 *
 * @param {object} video
 * @returns {string}
 */
function renderVideoItem(video) {
    const id = pickVideoHref(video);
    const href = id ? `/videos/details/${id}` : "#";
    const thumb =
        video.thumb || video.thumbnails || "https://picsum.photos/seed/video/400/240";
    const title = escapeHtml(video.title || video.name || "Untitled");

    const artists = Array.isArray(video.artists)
        ? video.artists
              .map((a) => (typeof a === "string" ? a : a?.name || ""))
              .filter(Boolean)
              .join(", ")
        : "";

    const meta = [
        video.albumType ? escapeHtml(video.albumType) : "",
        artists ? escapeHtml(artists) : "",
    ]
        .filter(Boolean)
        .join(" • ");

    return `
        <a
            href="${escapeHtml(href)}"
            data-navigo
            class="cart-item cart-item--large"
            data-slider-item>
            <div class="cart-item__media cart-item__media--large">
                <img
                    src="${escapeHtml(thumb)}"
                    alt="${title}"
                    loading="lazy"
                    class="cart-item__img" />
                <div class="cart-item__overlay"></div>
                <div class="cart-item__icon">
                    <i class="fa-solid fa-play"></i>
                </div>
            </div>
            <div class="cart-item__content">
                <h3 class="cart-item__title">${title}</h3>
                ${meta ? `<span class="cart-item__brand">${meta}</span>` : ""}
            </div>
        </a>
    `;
}

/**
 * Render slider videos cho New Releases.
 * Mỗi item là cart-item--large (port từ base.js `J()` dòng 4097).
 *
 * @param {Array<object>} videos
 * @returns {string} HTML
 */
function renderNewReleasesVideosSection(videos) {
    if (!Array.isArray(videos) || videos.length === 0) return "";
    return renderSectionComponent({
        title: "Video nhạc mới",
        bodyHtml: videos.map(renderVideoItem).join(""),
        listClass: "album__list home-album__list",
        modifierClass: "home-album",
        showControls: true,
        slider: true,
    });
}

// ======================================================
// FULL NEW RELEASES — Compose H1 + 2 sections
// ======================================================

/**
 * Render toàn bộ New Releases page.
 * Page wrapper có class `.new-releases-page` (padding + color).
 *
 * @param {Array<object>} albums - Albums từ `exploreService.getNewReleases()`
 * @param {Array<object>} videos - Videos từ `exploreService.getVideos()`
 * @returns {string} HTML
 */
export function renderNewReleases(albums, videos) {
    const albumsArr = Array.isArray(albums) ? albums : [];
    const videosArr = Array.isArray(videos) ? videos : [];

    // Fallback khi cả 2 rỗng (port từ base.js `cr()` dòng 4417)
    if (albumsArr.length === 0 && videosArr.length === 0) {
        return `
            <div class="new-releases-page">
                <p class="page-placeholder__desc">Không có dữ liệu</p>
            </div>
        `;
    }

    return `
        <div class="new-releases-page">
            <h1 class="home__title new-releases-page__heading">
                Bản phát hành mới
            </h1>
            ${renderNewReleasesAlbumsSection(albumsArr)}
            ${renderNewReleasesVideosSection(videosArr)}
        </div>
    `;
}

// Re-export individual renderers cho testing / extending
export {
    renderNewReleasesAlbumsSection,
    renderNewReleasesVideosSection,
    renderVideoItem,
};