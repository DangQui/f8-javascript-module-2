import { escapeHtml } from "@/utils/format.js";
import { renderMoodChips } from "@/components/mood-chip.js";
import { renderSliderSection } from "@/components/section.js";
import { renderQuickPicksSection } from "@/pages/home/home.render.js";
import { homeService } from "@/services/homeService.js";

// ======================================================
// MAIN RENDER
// ======================================================

/**
 * Render Mood Detail page HTML.
 * Async vì cần fetch `getMoods()` để render chip tabs.
 *
 * @param {object} mood - { hero: { title, subtitle }, sections: [...] }
 * @param {Array<object>} quickPicks - quick-pick items
 * @param {string} activeSlug - Slug hiện tại (highlight chip)
 * @returns {Promise<string>} HTML
 */
export async function renderMoodDetail(mood, quickPicks, activeSlug) {
    const hero = mood?.hero || { title: "Tâm trạng", subtitle: "" };

    const allMoods = await homeService.getMoods();
    const moodChipsHtml = renderMoodChips(allMoods, { activeSlug });

    const chipTabsHtml = `
            <div class="mood-page__chip-tabs" data-slider>
                ${moodChipsHtml}
            </div>
    `;

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

    const quickPicksHtml = renderQuickPicksSection(
        "Quick Picks",
        quickPicks || [],
        "/songs/details",
    );

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
 *
 * @param {object} section - { title, items: [...] }
 * @returns {string} HTML
 */
function renderMoodSection(section) {
    if (
        !section ||
        !Array.isArray(section.items) ||
        section.items.length === 0
    ) {
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
