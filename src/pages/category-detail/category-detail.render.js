/**
 * pages/category-detail/category-detail.render.js — Category Detail page render
 *
 * Port từ `code chức năng gốc/base.js`:
 *   - `fr(e)` dòng 4480-4486 → render category detail
 *
 * Flow render:
 *   1. H1 `category.name` (45px bold) — port `fr()` dòng 4482
 *   2. Mỗi subcategory → 1 slider `Y(name, playlists)` — port dòng 4483
 *
 * Lưu ý:
 *   - Code gốc dùng Tailwind utility (`p-4 text-white`, `font-bold`,
 *     `text-[45px]`, `mb-10`). Phase 17 convert sang SCSS class riêng
 *     `.category-detail-page` + `&__heading` (Hard Rule #3).
 *   - Mỗi subcategory là 1 section slider dùng `renderSliderSection()`
 *     từ section.js, basePath mặc định `/playlists/details` (port `Y()`
 *     base.js dòng 4203 có default `n = "/playlists/details"`).
 *
 * Exports:
 *   - renderCategoryDetail(category)    → full page HTML
 *   - renderCategoryDetailEmpty(name)   → empty state HTML
 *
 * Consumed by:
 *   - `@/pages/category-detail/category-detail.js`
 */

import { escapeHtml } from "@/utils/format.js";
import { renderSliderSection } from "@/components/section.js";

/**
 * Render Category Detail page HTML.
 * Port 1:1 từ `fr()` base.js dòng 4480-4486.
 *
 * @param {object} category - { name: string, subcategories: [{ name, playlists }] }
 * @returns {string} HTML
 */
export function renderCategoryDetail(category) {
    const name = category?.name || "Danh mục";
    const subcategories = Array.isArray(category?.subcategories)
        ? category.subcategories
        : [];

    // 1. H1 (port base.js dòng 4482 — `font-bold text-[45px] mb-10`)
    const headingHtml = `
        <div class="home__container">
            <div class="home__row">
                <h1 class="category-detail-page__heading">${escapeHtml(name)}</h1>
            </div>
        </div>
    `;

    // 2. Mỗi subcategory → 1 slider (port base.js dòng 4483 — `Y(e.name, e.playlists)`)
    const subcategorySections = subcategories
        .map((sub) =>
            renderSliderSection({
                title: sub?.name || "",
                items: Array.isArray(sub?.playlists) ? sub.playlists : [],
                listClass: "album__list home-album__list",
                basePath: "/playlists/details",
            })
        )
        .join("");

    return `
        <div class="category-detail-page">
            ${headingHtml}
            ${subcategorySections}
        </div>
    `;
}

/**
 * Empty state khi category không có subcategory nào.
 * @param {string} name
 * @returns {string} HTML
 */
export function renderCategoryDetailEmpty(name) {
    return `
        <div class="category-detail-page">
            <div class="home__container">
                <div class="home__row">
                    <h1 class="category-detail-page__heading">${escapeHtml(name || "Danh mục")}</h1>
                </div>
            </div>
            <p class="category-detail-page__empty">Danh mục này chưa có dữ liệu.</p>
        </div>
    `;
}

export default renderCategoryDetail;
