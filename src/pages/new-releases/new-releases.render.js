import {
    renderSection as renderSectionComponent,
    renderSliderSection as renderSliderSectionComponent,
} from "@/components/section.js";
import { escapeHtml } from "@/utils/format.js";

// ======================================================
// SECTION — Albums slider (no title — page title đã có ở H1)
// ======================================================
//
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

/**
 * @param {object} video
 * @returns {string} path segment
 */
function pickVideoHref(video) {
    return video.slug || video._id || video.id || video.videoId || "";
}

/**
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
        video.thumb ||
        video.thumbnails ||
        "https://picsum.photos/seed/video/400/240";
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
