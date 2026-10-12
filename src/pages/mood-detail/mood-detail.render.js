/**
 * pages/mood-detail/mood-detail.render.js — Mood Detail page render
 *
 * Port từ `code chức năng gốc/base.js`:
 *   - `dr(e, t, n)` dòng 4463 → render mood detail
 *   - `tr(e, t)`    dòng 4139 → mood chip tabs
 *   - `Y(e, t, n)`  dòng 4203 → dynamic section slider
 *
 * Flow:
 *   1. Mood chip tabs (active = current slug) — port `tr()`
 *   2. H1 mood.hero.title (45px bold) + p mood.hero.subtitle — port `dr()`
 *   3. "Quick Picks" track list — REUSE `renderQuickPicksSection` từ
 *      `pages/home/home.render.js` (Phase 18.5).
 *      Lý do: cấu trúc 4 cols × 4 items + slider prev/next + progress bar
 *      GIỐNG "Nghe gần đây" ở Home. `nr()` base.js gốc CHIA 3 cột × N/3 rows,
 *      không slider — không match.
 *   4. Dynamic sections từ mood.sections — port `Y()`
 *
 * Lưu ý:
 *   - Slider cho dynamic sections → dùng `renderSliderSection()` helper.
 *   - KHÔNG còn helper riêng `normalizeQuickPickItem`, `renderQuickPickRow`,
 *     `chunkArray`, `renderQuickPicksSection` (đã xóa Phase 18.5).
 *   - Class CSS `.mood-page__quick-pick*` cũng đã xóa khỏi `_mood-page.scss`
 *     (Phase 18.5) — dùng chung `.quick-picks` / `.quick-picks-col` từ
 *     `_quick-picks-item.scss` + `_home.scss`.
 *
 * Exports:
 *   - renderMoodDetail(mood, quickPicks, activeSlug) → full page HTML (async)
 *
 * Consumed by:
 *   - `@/pages/mood-detail/mood-detail.js`
 */

import { escapeHtml } from "@/utils/format.js";
import { renderMoodChips } from "@/components/mood-chip.js";
import { renderSliderSection } from "@/components/section.js";
import { renderQuickPicksSection } from "@/pages/home/home.render.js";
import { homeService } from "@/services/homeService.js";

/**
 * Render Mood Detail page HTML.
 * Port 1:1 từ `dr()` base.js dòng 4463-4479 (trừ section "Quick Picks"
 * giờ dùng `renderQuickPicksSection` Phase 18.5).
 *
 * Async vì cần fetch `getMoods()` để render chip tabs.
 *
 * @param {object} mood - { hero: { title, subtitle }, sections: [...] }
 * @param {Array<object>} quickPicks - quick-pick items
 * @param {string} activeSlug - Slug hiện tại (highlight chip)
 * @returns {Promise<string>} HTML
 */
export async function renderMoodDetail(mood, quickPicks, activeSlug) {
    const hero = mood?.hero || { title: "Tâm trạng", subtitle: "" };

    // 1. Mood chip tabs (port `tr()` base.js dòng 4139) — async vì cần getMoods()
    const allMoods = await homeService.getMoods();
    const moodChipsHtml = renderMoodChips(allMoods, { activeSlug });

    // 2. Chip tabs wrapper — đi cấu trúc `home__container` + `home__row` giống
    //    Quick Picks section (consistency với các slider section khác).
    const chipTabsHtml = `
            <div class="mood-page__chip-tabs" data-slider>
                ${moodChipsHtml}
            </div>
    `;

    // 3. Hero title + subtitle (port base.js dòng 4471-4472)
    const heroHtml = `
        <div class="home__container">
            <div class="home__row">
                <h1 class="mood-page__heading">${escapeHtml(hero.title)}</h1>
            </div>
            <div class="home__body">
                <p class="mood-page__subtitle">${escapeHtml(hero.subtitle || "")}</p>
            </div>
        </div>
    `;

    // 4. Quick Picks section — dùng `renderQuickPicksSection` từ
    //    home.render.js để có cấu trúc 4 cols × 4 items + slider
    //    prev/next GIỐNG "Nghe gần đây" ở Home.
    const quickPicksHtml = renderQuickPicksSection(
        "Quick Picks",
        quickPicks || [],
        "/songs/details"
    );

    // 5. Dynamic sections từ mood.sections (port base.js dòng 4475)
    const dynamicSections = (mood?.sections || [])
        .map((section) => renderMoodSection(section))
        .join("");

    return `
        <div class="mood-page">
            ${chipTabsHtml}
            ${heroHtml}
            ${quickPicksHtml}
            ${dynamicSections}
        </div>
    `;
}

/**
 * Render 1 dynamic section từ mood.sections (port `Y()` base.js dòng 4203).
 *
 * @param {object} section - { title, items: [...] }
 * @returns {string} HTML
 */
function renderMoodSection(section) {
    if (!section || !Array.isArray(section.items) || section.items.length === 0) {
        return "";
    }

    const basePath = section.basePath || "/playlists/details";
    return renderSliderSection({
        title: section.title || "",
        items: section.items,
        listClass: "album__list home-album__list",
        basePath,
    });
}

export default renderMoodDetail;
