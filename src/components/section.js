/**
 * components/section.js — Section layout wrapper (heading + slider + body)
 *
 * Wrap pattern heading + slider controls + body thành component độc lập
 * để dùng ở Home, Discover, Search, Mood detail, ...
 *
 * Structure:
 *   <section class="home__container [modifierClass]">
 *       <div class="home__row">
 *           <h2 class="home__title">{title?}</h2>
 *           <div class="crt">
 *               <button class="crt__prev">‹</button>
 *               <button class="crt__next">›</button>
 *           </div>
 *       </div>
 *       <div class="home__body [listClass]" data-slider>
 *           {bodyHtml}
 *       </div>
 *   </section>
 *
 * Slider lib (`libs/slider.js`) auto-detect `[data-slider]` + tìm
 * `.crt__prev/next` trong `closest('.home__container')` → render khớp
 * 100% với logic slider cũ.
 *
 * Style dùng class `.home__container` + `.home__row` + `.home__title`
 * + `.home__body` + `.crt` (từ `src/styles/pages/_home.scss`).
 * Không thêm SCSS mới.
 *
 * Exports:
 *   - renderSection(options)            → 1 section hoàn chỉnh
 *   - renderSliderSection(options)      → section + render cards từ items
 *   - renderGridSection(options)        → section grid (no controls)
 *
 * Consumed by:
 *   - `@/pages/home/home.render.js`
 *   - `@/pages/discover/discover.render.js`
 *   - `@/pages/search/search.render.js`
 *   - `@/pages/mood-detail/mood-detail.render.js`
 */

import { escapeHtml } from "@/utils/format.js";
import { renderCards, normalizeCardItem } from "@/components/card-item.js";

/**
 * Render 1 section hoàn chỉnh (heading + slider controls + body).
 *
 * @param {object} options
 * @param {string} [options.title] - Tiêu đề (nếu rỗng → không render h2)
 * @param {string} [options.bodyHtml=""] - HTML body
 * @param {string} [options.listClass=""] - Class cho list container
 *   (vd: "album__list home-album__list", "quick-picks__list hscroll")
 * @param {string} [options.modifierClass=""] - Class thêm cho `<section>`
 *   (vd: "home-album", "discover-mood-genre")
 * @param {boolean} [options.showControls=true] - Có hiện prev/next không
 * @param {boolean} [options.slider=true] - Có gắn data-slider không
 * @returns {string} HTML
 */
export function renderSection(options = {}) {
    const {
        title = "",
        bodyHtml = "",
        listClass = "",
        modifierClass = "",
        showControls = true,
        slider = true,
    } = options;

    const sectionClass = modifierClass
        ? `home__container ${modifierClass}`
        : "home__container";

    const bodyClasses = listClass ? `home__body ${listClass}` : "home__body";
    const dataSlider = slider ? " data-slider" : "";

    const titleHtml = title
        ? `<h2 class="home__title">${escapeHtml(title)}</h2>`
        : "";

    const controlsHtml = showControls
        ? `
                <div class="crt">
                    <button class="btn btn--around crt__btn crt__prev icon" type="button">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    <button class="btn btn--around crt__btn crt__next icon" type="button">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>`
        : "";

    return `
        <section class="${sectionClass}">
            <div class="home__row">${titleHtml}${controlsHtml}
            </div>
            <div class="${bodyClasses}"${dataSlider}>
                ${bodyHtml}
            </div>
        </section>
    `;
}

/**
 * Render 1 section dạng slider với body là card items.
 * Tiện ích — gọi `renderSection` + `renderCards`.
 *
 * @param {object} options
 * @param {string} [options.title] - Tiêu đề
 * @param {Array<object>} [options.items=[]] - Mảng raw items
 * @param {string} [options.listClass="album__list home-album__list"] - Class cho list
 * @param {string} [options.basePath="/songs/details"] - Prefix cho href card
 * @param {string} [options.modifierClass=""] - Class thêm cho section
 * @param {(item: object) => string} [options.renderItem] - Custom item renderer.
 *   Không truyền sẽ dùng `renderCards()` mặc định (album/playlist).
 *   Truyền vào khi cần markup khác (vd: video card có duration overlay).
 * @returns {string} HTML
 */
export function renderSliderSection(options = {}) {
    const {
        title = "",
        items = [],
        listClass = "album__list home-album__list",
        basePath = "/songs/details",
        modifierClass = "",
        renderItem = null,
    } = options;

    if (!Array.isArray(items) || items.length === 0) return "";

    const bodyHtml = renderItem
        ? items.map(renderItem).join("")
        : renderCards(items.map((it) => normalizeCardItem(it, basePath)));

    return renderSection({
        title,
        bodyHtml,
        listClass,
        modifierClass,
        showControls: true,
        slider: true,
    });
}

/**
 * Render 1 section dạng grid (no slider controls).
 * @param {object} options
 * @param {string} [options.title]
 * @param {string} [options.bodyHtml=""]
 * @param {string} [options.listClass=""]
 * @param {string} [options.modifierClass=""]
 * @returns {string} HTML
 */
export function renderGridSection(options = {}) {
    const {
        title = "",
        bodyHtml = "",
        listClass = "",
        modifierClass = "",
    } = options;

    return renderSection({
        title,
        bodyHtml,
        listClass,
        modifierClass,
        showControls: false,
        slider: false,
    });
}

export default renderSection;
