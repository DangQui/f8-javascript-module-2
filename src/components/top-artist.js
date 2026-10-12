import { escapeHtml, formatViewsVN } from "@/utils/format.js";

// ======================================================
// HELPERS
// ======================================================

/**
 *
 * @example
 * chunkArray([1,2,3,4,5,6,7,8,9], 4) // [[1,2,3,4], [5,6,7,8], [9]]
 *
 * @template T
 * @param {T[]} arr - Mảng gốc
 * @param {number} size - Kích thước mỗi chunk
 * @returns {T[][]} Mảng 2D
 */
function chunkArray(arr, size = 4) {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}

/**
 * @param {string|undefined} trend
 * @returns {string} HTML inline span
 */
function renderTrendArrow(trend) {
    if (trend === "up") {
        return `<span class="top-artist__trend top-artist__trend--up">▲</span>`;
    }
    if (trend === "down") {
        return `<span class="top-artist__trend top-artist__trend--down">▼</span>`;
    }
    return "";
}

// ======================================================
// ITEM RENDER
// ======================================================

/**
 * Render 1 top-artist row.
 *
 * Data shape (từ API `/charts/top-artists?country=`):
 *   { rank, name, totalViews, trend: "up"|"down"|null, artistId }
 *
 * @param {object} artist
 * @returns {string} HTML
 */
export function renderTopArtist(artist) {
    const rank = Number(artist.rank) || 0;
    const name = escapeHtml(artist.name || "Untitled");
    const totalViews = Number(artist.totalViews) || 0;
    const trendHtml = renderTrendArrow(artist.trend);

    return `
        <div class="top-artist__item" data-slider-item>
            <div class="top-artist__rank">
                ${rank}
                ${trendHtml}
            </div>
            <div class="top-artist__info">
                <h3 class="top-artist__name">${name}</h3>
                <p class="top-artist__views">${formatViewsVN(totalViews)} lượt xem</p>
            </div>
        </div>
    `;
}

// ======================================================
// SECTION RENDER — 4 cols × 4 items grid
// ======================================================

/**
 * Render section "Nghệ sĩ hàng đầu" (port từ `$n()` base.js dòng 4059).
 *
 * Layout: section wrapper (re-use component `section.js`)
 *         → body = nhiều col (flex row), mỗi col = 4 artists (flex col).
 *
 * @param {string} title - Tiêu đề section (vd: "Nghệ sĩ hàng đầu")
 * @param {Array<object>} artists - Top artists từ API
 * @returns {string} HTML
 */
export function renderTopArtistsSection(title, artists) {
    if (!Array.isArray(artists) || artists.length === 0) return "";

    const cols = chunkArray(artists, 4);
    const bodyHtml = cols
        .map(
            (col) => `
                <div class="top-artist__col" data-slider-item>
                    ${col.map(renderTopArtist).join("")}
                </div>
            `,
        )
        .join("");

    return `
        <section class="home__container top-artist">
            <div class="home__row">
                <h2 class="home__title">${escapeHtml(title)}</h2>
                <div class="crt">
                    <button class="btn btn--around crt__btn crt__prev icon" type="button">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button class="btn btn--around crt__btn crt__next icon" type="button">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            <div class="home__body top-artist__list" data-slider>
                ${bodyHtml}
            </div>
        </section>
    `;
}

// ======================================================
// EXPORTS
// ======================================================

export { renderTrendArrow, chunkArray };
export default renderTopArtistsSection;
