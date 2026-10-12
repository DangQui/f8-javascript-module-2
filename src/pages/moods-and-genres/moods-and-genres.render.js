import { escapeHtml } from "@/utils/format.js";
import { renderMoodGenreItems } from "@/components/mood-chip.js";
import { renderSection } from "@/components/section.js";

/**
 *
 * @param {string} title
 * @param {Array<object>} items - mood/genre items (cần color, slug, name, path?)
 * @param {string} [basePath="/categories"] - basePath cho href
 * @returns {string} HTML
 */
function renderColorBarSection(title, items, basePath = "/categories") {
    // 4 items/column (port base.js dòng 4262)
    const CHUNK_SIZE = 4;
    const columns = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        columns.push(items.slice(i, i + CHUNK_SIZE));
    }

    const columnsHtml = columns
        .map(
            (col) => `
            <div class="discover-mood-genre__col" data-slider-item>
                ${renderMoodGenreItems(col, { basePath })}
            </div>
        `,
        )
        .join("");

    // Nếu rỗng → render title + empty state (không cần slider)
    if (!Array.isArray(items) || items.length === 0) {
        return `
            <section class="home__container">
                <div class="home__row">
                    <h2 class="home__title">${escapeHtml(title)}</h2>
                </div>
                <div class="home__body moods-genres-page__colors">
                    <p class="moods-genres-page__empty">Chưa có dữ liệu.</p>
                </div>
            </section>
        `;
    }

    //   - listClass: "discover-mood-genre home-album__list" (data-slider)
    //   - prev/next: crt__prev / crt__next (showControls: true)
    return renderSection({
        title,
        bodyHtml: columnsHtml,
        listClass: "discover-mood-genre home-album__list",
        showControls: true,
        slider: true,
    });
}

/**
 * Render Moods-and-Genres page HTML.
 *
 * @param {Array<object>} categories - categories (filter theo type)
 * @param {Array<object>} lines - lines (dòng nhạc)
 * @returns {string} HTML
 */
export function renderMoodsAndGenres(categories, lines) {
    if (!Array.isArray(categories) || categories.length === 0) {
        return `<p class="moods-genres-page__no-data">Không có dữ liệu</p>`;
    }

    // 1. Genres (port base.js dòng 4452)
    const genres = categories.filter((c) => c.type === "genre");

    // 2. Moods + other (port base.js dòng 4453)
    const moods = categories.filter(
        (c) => c.type === "mood" || c.type === "other",
    );

    // 3. Lines — basePath = /lines (port base.js dòng 4456)
    const linesArr = Array.isArray(lines) ? lines : [];

    return `
        <div class="moods-genres-page">
            <h1 class="moods-genres-page__heading">Tâm trạng và thể loại</h1>
            ${renderColorBarSection("Dành cho bạn", genres, "/categories")}
            ${renderColorBarSection("Tâm trạng và khoảnh khắc", moods, "/categories")}
            ${renderColorBarSection("Dòng nhạc", linesArr, "/lines")}
        </div>
    `;
}

export default renderMoodsAndGenres;
