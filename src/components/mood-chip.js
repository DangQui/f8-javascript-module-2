/**
 * components/mood-chip.js — Mood & Genre chips
 *
 * 2 variant:
 *   1. `renderMoodChip` — chip nhỏ dạng pill (`.cate-btn`) — Home/Mood detail
 *      (port `tr()` dòng 4139 base.js).
 *   2. `renderMoodGenreItem` — chip lớn có color bar (`.mood-genre-item`) —
 *      Discover page (port `r()` trong `ir()` dòng 4247 base.js).
 *
 * Style dùng class có sẵn trong SCSS
 * (`src/styles/pages/_home.scss` + `src/styles/pages/_discover.scss`).
 * Không thêm SCSS mới.
 *
 * Exports:
 *   - renderMoodChip(mood, options?)              → 1 chip pill
 *   - renderMoodChips(moods, options?)            → nhiều chip pill
 *   - renderMoodGenreItem(item, options?)         → 1 chip có color bar
 *   - renderMoodGenreItems(items, options?)       → nhiều chip color bar
 *   - normalizeMoodChip(mood)                     → convert API → render
 *   - normalizeMoodGenreItem(item)                → convert API → render
 *
 * Consumed by:
 *   - `@/pages/home/home.render.js` (mood chips)
 *   - `@/pages/discover/discover.render.js` (mood-genre items)
 *   - `@/pages/mood-detail/mood-detail.render.js` (mood chips)
 */

import { escapeHtml } from "@/utils/format.js";

const DEFAULT_COLOR = "#7fdbff";
const DEFAULT_MOOD_BASE_PATH = "/moods";
const DEFAULT_GENRE_BASE_PATH = "/categories";

/**
 * Normalize 1 mood từ API thành format cho renderMoodChip.
 * @param {object} mood
 * @returns {{slug: string, name: string, href: string|null, isActive: boolean}}
 */
export function normalizeMoodChip(mood) {
    return {
        slug: mood.slug || mood._id || "",
        name: mood.name || mood.title || "Không rõ tên",
        href: mood.href || null,
        isActive: Boolean(mood.isActive),
    };
}

/**
 * Render 1 mood chip pill (`.cate-btn`).
 * @param {object} mood - { slug, name, href?, isActive? }
 * @param {object} [options]
 * @param {string} [options.basePath="/moods"] - Prefix nếu mood không có href riêng
 * @returns {string} HTML
 */
export function renderMoodChip(mood, options = {}) {
    if (!mood) return "";
    const normalized = normalizeMoodChip(mood);
    if (!normalized.slug && !normalized.href) return "";

    const { basePath = DEFAULT_MOOD_BASE_PATH } = options;
    const href = normalized.href || `${basePath}/${encodeURIComponent(normalized.slug)}`;
    const isActive = normalized.isActive || Boolean(mood.active);
    const stateClass = isActive ? "cate-btn--active" : "cate-btn--inactive";
    const dataActive = isActive ? ` data-active="true"` : "";

    return `
        <a
            href="${escapeHtml(href)}"
            data-navigo
            data-mood-slug="${escapeHtml(normalized.slug)}"${dataActive}
            class="btn cate-btn ${stateClass} slider-item">${escapeHtml(normalized.name)}</a>
    `;
}

/**
 * Render nhiều mood chip pill cùng lúc.
 * @param {Array<object>} moods
 * @param {object} [options]
 * @param {string} [options.basePath="/moods"]
 * @param {string} [options.activeSlug=""] - Slug đang active (highlight)
 * @returns {string} HTML
 */
export function renderMoodChips(moods, options = {}) {
    if (!Array.isArray(moods) || moods.length === 0) return "";

    const { basePath = DEFAULT_MOOD_BASE_PATH, activeSlug = "" } = options;

    return moods
        .map((m) => {
            const slug = m.slug || m._id || "";
            return renderMoodChip(
                { ...m, isActive: slug === activeSlug },
                { basePath }
            );
        })
        .join("");
}

/**
 * Normalize 1 mood/genre item từ API.
 * @param {object} item
 * @returns {{slug: string, name: string, color: string, path: string|null}}
 */
export function normalizeMoodGenreItem(item) {
    return {
        slug: item.slug || item._id || "",
        name: item.name || item.title || "Không rõ tên",
        color: item.color || DEFAULT_COLOR,
        path: item.path || null,
    };
}

/**
 * Render 1 mood/genre item có color bar (`.mood-genre-item`).
 * @param {object} item - { slug, name, color, path? }
 * @param {object} [options]
 * @param {string} [options.basePath="/categories"] - Prefix khi item.path rỗng
 * @returns {string} HTML
 */
export function renderMoodGenreItem(item, options = {}) {
    if (!item) return "";

    const normalized = normalizeMoodGenreItem(item);
    if (!normalized.slug) return "";

    const { basePath = DEFAULT_GENRE_BASE_PATH } = options;
    const href = normalized.path
        ? `${normalized.path}/${encodeURIComponent(normalized.slug)}`
        : `${basePath}/${encodeURIComponent(normalized.slug)}`;

    return `
        <a
            href="${escapeHtml(href)}"
            data-navigo
            data-mood-slug="${escapeHtml(normalized.slug)}"
            class="mood-genre-item"
            style="--mood-color: ${escapeHtml(normalized.color)};">
            <div class="mood-genre-item__right"></div>
            <span class="mood-genre-item__title">${escapeHtml(normalized.name)}</span>
        </a>
    `;
}

/**
 * Render nhiều mood/genre item cùng lúc.
 * @param {Array<object>} items
 * @param {object} [options]
 * @param {string} [options.basePath="/categories"]
 * @returns {string} HTML
 */
export function renderMoodGenreItems(items, options = {}) {
    if (!Array.isArray(items) || items.length === 0) return "";
    return items.map((it) => renderMoodGenreItem(it, options)).join("");
}

export default renderMoodChip;
