/**
 * pages/charts/charts.render.js — Charts page render
 *
 * Port từ `code chức năng gốc/base.js`:
 *   - `lr(e, t, n)` dòng 4428 → render full Charts page
 *   - `er()`        dòng 4123 → re-render content khi đổi country
 *
 * Gốc dùng Tailwind utility (`p-4 text-white`, `font-bold text-[45px] mb-10`,
 * `relative w-[113px]`); Phase 17 convert sang SCSS class riêng
 * `.charts-page` + `&__heading` + `.country-select` (Hard Rule #3).
 *
 * Page layout:
 *   - H1 "Bảng xếp hạng" (45px bold)
 *   - Country select dropdown
 *   - #charts-content (slider Top Videos + Top Artists)
 *
 * Khi user đổi country → `charts.js` chỉ update `#charts-content`
 * qua `renderChartsContent()` — KHÔNG re-render cả page (port từ `er()`).
 *
 * Exports:
 *   - renderCharts(countries, topVideos, topArtists, defaultCode) → full page
 *   - renderChartsContent(topVideos, topArtists)                  → content only
 *
 * Consumed by:
 *   - `@/pages/charts/charts.js`
 */

import { renderSection as renderSectionComponent } from "@/components/section.js";
import { renderTopArtistsSection } from "@/components/top-artist.js";
import { escapeHtml } from "@/utils/format.js";

/**
 * Pick href cho video item — port pattern `/videos/details/:slug`.
 *
 * Thứ tự ưu tiên:
 *   1. slug      (chuẩn SEO, dễ đọc)
 *   2. _id       (Mongo ID từ `/charts/videos` — backend KHÔNG có slug)
 *   3. id        (fallback generic)
 *   4. videoId   (YouTube videoId — identifier cuối cùng)
 *
 * Note: `/charts/videos` endpoint CHỈ trả `videoId` + `_id` (KHÔNG có slug/id).
 * Backend `/videos/details/:id` chấp nhận `_id` Mongo → dùng `_id` làm fallback.
 */
function pickVideoHref(video) {
    return video.slug || video._id || video.id || video.videoId || "";
}

/**
 * Render 1 video cart-item (kích thước lớn — landscape thumb).
 * Style dùng `cart-item--large` + `cart-item__media--large`.
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
 * Render slider Top Videos cho Charts page.
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

/**
 * Render country select dropdown.
 * Port từ base.js `lr()` dòng 4435-4442.
 *
 * @param {Array<object>} countries - [{ code, name }]
 * @param {string} [defaultCode="GLOBAL"]
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

/**
 * Render toàn bộ Charts page.
 *
 * @param {Array<object>} countries
 * @param {Array<object>} topVideos
 * @param {Array<object>} topArtists
 * @param {string} [defaultCode="GLOBAL"]
 * @returns {string} HTML
 */
export function renderCharts(countries, topVideos, topArtists, defaultCode = "GLOBAL") {
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

export {
    renderCountrySelect,
    renderTopVideosSection,
    renderVideoItem,
};
