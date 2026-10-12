import { escapeHtml } from "@/utils/format.js";
import { renderCards, normalizeCardItem } from "@/components/card-item.js";

/**
 * Render 1 section hoàn chỉnh (heading + slider controls + body).
 *
 * @param {object} options
 * @param {string} [options.title] - Tiêu đề section (optional — nếu rỗng sẽ không render h2)
 * @param {string} [options.bodyHtml=""] - HTML cho phần body (items)
 * @param {string} [options.listClass=""] - Class thêm cho list container
 *   (vd: "album__list home-album__list", "quick-picks__list hscroll",
 *   "home__cate", "discover-mood-genre", ...).
 *   Nếu không có `data-slider` trong class, sẽ tự thêm attribute.
 * @param {string} [options.modifierClass=""] - Class thêm cho `<section>`
 *   (vd: "home-album", "discover-mood-genre", ...).
 * @param {boolean} [options.showControls=true] - Có hiện prev/next buttons không
 * @param {boolean} [options.slider=true] - Có gắn `data-slider` để slider.js hook vào không
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
 * @param {string} [options.title] - Tiêu đề section
 * @param {Array<object>} [options.items=[]] - Mảng raw items
 * @param {string} [options.listClass="album__list home-album__list"] - Class cho list
 * @param {string} [options.basePath="/songs/details"] - Prefix cho href card
 * @param {string} [options.modifierClass=""] - Class thêm cho section
 * @param {(item: object) => string} [options.renderItem] - Custom item renderer.
 *   Nếu không truyền sẽ dùng `renderCards()` mặc định (cho album/playlist).
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
 *
 * @param {object} options
 * @param {string} [options.title] - Tiêu đề
 * @param {string} [options.bodyHtml=""] - HTML body
 * @param {string} [options.listClass=""] - Class cho list
 * @param {string} [options.modifierClass=""] - Class thêm cho section
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
