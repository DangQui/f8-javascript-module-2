import { renderSection as renderSectionComponent } from "@/components/section.js";
import { renderTopArtistsSection } from "@/components/top-artist.js";
import { escapeHtml } from "@/utils/format.js";

// ======================================================
// VIDEO ITEM
// ======================================================

/**
 *
 * @param {object} video
 * @returns {string} path segment
 */
function pickVideoHref(video) {
    return video.slug || video._id || video.id || video.videoId || "";
}

/**
 * Render 1 video cart-item (kích thước lớn — landscape thumb).
 * Style dùng `cart-item--large` + `cart-item__media--large`.
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

// ======================================================
// SECTION — Top Videos slider (port từ J('Bảng xếp hạng video', topVideos))
// ======================================================

/**
 * Render slider Top Videos cho Charts page.
 *
 * @param {Array<object>} topVideos
 * @returns {string} HTML
 */
function renderTopVideosSection(topVideos) {
    if (!Array.isArray(topVideos) || topVideos.length === 0) return "";
    return renderSectionComponent({
        title: "Bảng xếp hạng video",
        bodyHtml: topVideos.map(renderVideoItem).join(""),
        listClass: "album__list home-album__list",
        modifierClass: "home-album",
        showControls: true,
        slider: true,
    });
}

// ======================================================
// CHARTS CONTENT
// ======================================================

/**
 * Render chỉ phần content (không có H1 + country select).
 * Dùng cho innerHTML update khi user đổi country (KHÔNG re-render cả page).
 *
 * @param {Array<object>} topVideos
 * @param {Array<object>} topArtists
 * @returns {string} HTML
 */
export function renderChartsContent(topVideos, topArtists) {
    const videosArr = Array.isArray(topVideos) ? topVideos : [];
    const artistsArr = Array.isArray(topArtists) ? topArtists : [];

    if (videosArr.length === 0 && artistsArr.length === 0) {
        return `<p class="page-placeholder__desc">Không có dữ liệu cho quốc gia này</p>`;
    }

    return `
        ${renderTopVideosSection(videosArr)}
        ${renderTopArtistsSection("Nghệ sĩ hàng đầu", artistsArr)}
    `;
}

// ======================================================
// COUNTRY SELECT — Dropdown với custom arrow
// ======================================================

/**
 * Render country select dropdown.
 * Port từ base.js `lr()` dòng 4435-4442.
 *
 * @param {Array<object>} countries - [{ code, name }]
 * @param {string} [defaultCode="GLOBAL"] - Country được select ban đầu
 * @returns {string} HTML
 */
function renderCountrySelect(countries, defaultCode = "GLOBAL") {
    const countriesArr = Array.isArray(countries) ? countries : [];

    const optionsHtml = countriesArr
        .map((c) => {
            const code = escapeHtml(c.code || "");
            const name = escapeHtml(c.name || c.code || "");
            const selected = code === defaultCode ? " selected" : "";
            return `<option value="${code}"${selected}>${name}</option>`;
        })
        .join("");

    return `
        <div class="country-select">
            <select id="country-select" class="country-select__field">
                ${optionsHtml}
            </select>
            <span class="country-select__arrow">▼</span>
        </div>
    `;
}

// ======================================================
// FULL CHARTS
// ======================================================

/**
 * Render toàn bộ Charts page.
 *
 * @param {Array<object>} countries - [{ code, name }]
 * @param {Array<object>} topVideos - Top videos cho country mặc định
 * @param {Array<object>} topArtists - Top artists cho country mặc định
 * @param {string} [defaultCode="GLOBAL"]
 * @returns {string} HTML
 */
export function renderCharts(
    countries,
    topVideos,
    topArtists,
    defaultCode = "GLOBAL",
) {
    return `
        <div class="charts-page">
            <h1 class="home__title charts-page__heading">Bảng xếp hạng</h1>
            ${renderCountrySelect(countries, defaultCode)}
            <div id="charts-content">
                ${renderChartsContent(topVideos, topArtists)}
            </div>
        </div>
    `;
}

// Re-export individual renderers cho testing / extending
export { renderCountrySelect, renderTopVideosSection, renderVideoItem };
