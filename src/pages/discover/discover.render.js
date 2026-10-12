import { escapeHtml } from "@/utils/format.js";
import { renderMoodGenreItem as renderMoodGenreItemComponent } from "@/components/mood-chip.js";
import {
    renderSection as renderSectionComponent,
    renderSliderSection as renderSliderSectionComponent,
} from "@/components/section.js";

// ======================================================
// HELPERS — Cart item renderers (album / video)
// ======================================================

/**
 * Render 1 album cart-item (kích thước tiêu chuẩn).
 * Tái sử dụng style `.cart-item` từ `_home.scss` (shared).
 *
 * @param {object} album
 * @param {string} [basePath="/albums/details"]
 * @returns {string}
 */
function renderAlbumItem(album, basePath = "/albums/details") {
    const href = `${basePath}/${album.slug || album.id}`;
    const thumb =
        album.thumbnails ||
        album.thumb ||
        "https://picsum.photos/seed/album/400/400";
    const title = escapeHtml(album.title || album.name || "Untitled");

    const artists = Array.isArray(album.artists)
        ? album.artists
              .map((a) => (typeof a === "string" ? a : a?.name || ""))
              .filter(Boolean)
              .join(", ")
        : "";

    const meta = [
        album.albumType ? escapeHtml(album.albumType) : "",
        artists ? escapeHtml(artists) : "",
    ]
        .filter(Boolean)
        .join(" • ");

    return `
        <a
            href="${href}"
            data-navigo
            class="cart-item"
            data-slider-item>
            <div class="cart-item__media">
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
 * Render 1 video cart-item (kích thước lớn — landscape thumb).
 * Tái sử dụng style `.cart-item--large` + `.cart-item__media--large`.
 *
 * @param {object} video
 * @param {string} [basePath="/videos/details"]
 * @returns {string}
 */
function renderVideoItem(video, basePath = "/videos/details") {
    const href = `${basePath}/${video.slug || video.id}`;
    const thumb =
        video.thumbnails ||
        video.thumb ||
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
            href="${href}"
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

// ======================================================
// DISCOVER NAVIGATION — 3 cards top
// ======================================================

/**
 *
 * @returns {string}
 */
function renderDiscoverNav() {
    return `
        <div class="discover__navigation">
            <div class="row row-cols-3 gx-2">
                <div class="col">
                    <a href="/new-releases" data-navigo class="btn discover-item">
                        <i class="fa-solid fa-compact-disc icon--xl"></i>
                        <span class="discover-item__title">
                            Bản phát hành mới
                        </span>
                    </a>
                </div>
                <div class="col">
                    <a href="/charts" data-navigo class="btn discover-item">
                        <i class="fa-solid fa-chart-line icon--xl"></i>
                        <span class="discover-item__title">
                            Bản xếp hạng
                        </span>
                    </a>
                </div>
                <div class="col">
                    <a href="/moods-and-genres" data-navigo class="btn discover-item">
                        <i class="fa-regular fa-face-smile icon--xl"></i>
                        <span class="discover-item__title">
                            Tâm trạng và thể loại
                        </span>
                    </a>
                </div>
            </div>
        </div>
    `;
}

// ======================================================
// SECTION — Albums mới
// ======================================================

/**
 * Render section "Khám phá Albums mới".
 * Slider ngang, mỗi item là 1 album.
 *
 * @param {Array} albums
 * @returns {string}
 */
function renderAlbumsSection(albums) {
    return renderSliderSectionComponent({
        title: "Khám phá Albums mới",
        items: albums,
        basePath: "/albums/details",
        listClass: "album__list home-album__list",
        modifierClass: "home-album",
    });
}

// ======================================================
// SECTION — Tâm trạng và thể loại
// ======================================================

/**
 * Render 1 mood/genre item với color từ API (hex inline).
 * Dùng `mood-chip` component.
 *
 * @param {object} item - { name, slug, color, path }
 * @returns {string}
 */
function renderMoodGenreItem(item) {
    return renderMoodGenreItemComponent(item);
}

/**
 * Render section "Tâm trạng và thể loại".
 *
 * @param {Array} items - merged từ categories + lines
 * @returns {string}
 */
function renderMoodGenresSection(items) {
    if (!Array.isArray(items) || items.length === 0) return "";

    // Chunk theo 4 items/column (giống base.js Zn)
    const CHUNK = 4;
    const cols = [];
    for (let i = 0; i < items.length; i += CHUNK) {
        cols.push(items.slice(i, i + CHUNK));
    }

    return renderSectionComponent({
        title: "Tâm trạng và thể loại",
        bodyHtml: cols
            .map(
                (col) => `
                    <div class="discover-mood-genre__col" data-slider-item>
                        ${col.map(renderMoodGenreItem).join("")}
                    </div>
                `,
            )
            .join(""),
        listClass: "discover-mood-genre home-album__list",
        showControls: true,
        slider: true,
    });
}

// ======================================================
// SECTION — Video nhạc mới
// ======================================================

/**
 * Render section "Video nhạc mới".
 *
 * @param {Array} videos
 * @returns {string}
 */
function renderVideosSection(videos) {
    if (!Array.isArray(videos) || videos.length === 0) return "";

    return renderSectionComponent({
        title: "Video nhạc mới",
        bodyHtml: videos
            .map((v) => renderVideoItem(v, "/videos/details"))
            .join(""),
        listClass: "album__list home-album__list",
        modifierClass: "home-album",
        showControls: true,
        slider: true,
    });
}

// ======================================================
// FULL DISCOVER — Compose all sections
// ======================================================

/**
 * Render toàn bộ Discover page.
 *
 * @param {{
 *   albums: Array,
 *   moodsGenres: Array,
 *   videos: Array,
 * }} data
 * @returns {string} HTML
 */
export function renderDiscover(data) {
    const { albums = [], moodsGenres = [], videos = [] } = data || {};

    return `
        ${renderDiscoverNav()}
        ${renderAlbumsSection(albums)}
        ${renderMoodGenresSection(moodsGenres)}
        ${renderVideosSection(videos)}
    `;
}

// Re-export individual renderers cho testing / extending
export {
    renderDiscoverNav,
    renderAlbumsSection,
    renderMoodGenresSection,
    renderVideosSection,
    renderAlbumItem,
    renderVideoItem,
    renderMoodGenreItem,
};
