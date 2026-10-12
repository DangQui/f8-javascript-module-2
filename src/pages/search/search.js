/**
 * pages/search/search.js — Search page handler
 *
 * Port 1:1 từ base.js route "/search" (dòng 5816-5824):
 *   1. Parse `keyword` từ URLSearchParams
 *   2. Nếu !keyword → render placeholder "Hãy nhập từ khóa..."
 *   3. Else → await searchService.getResults(keyword, { page, limit })
 *
 * Lưu ý Navigo 8.x: `wrap()` trả `query: {}` rỗng — phải parse trực tiếp
 * từ `window.location.search` để lấy `?keyword=...`.
 *
 * Exports:
 *   - searchPage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/search")
 */

import { searchService } from "@/services/searchService.js";
import { renderSearchPage } from "@/pages/search/search.render.js";
import { SKELETON_SEARCH } from "@/components/skeleton.js";
import { initSliders } from "@/libs/slider.js";

/** Render page vào #main. Helper local (giống pattern _shared.js). */
function renderToMain(html) {
    const main = document.querySelector("#main");
    if (main) {
        main.innerHTML = html;
    }
}

/**
 * Handler cho route /search.
 *
 * Flow (port từ base.js:5816-5824):
 *   1. Parse keyword từ URLSearchParams
 *   2. Nếu rỗng → render placeholder "Hãy nhập từ khóa"
 *   3. Else → fetch searchService.getSuggestions(keyword)
 *      - Success → render 4 sections
 *      - Fail → render error placeholder với err.message
 *   4. Init sliders cho các section có data-slider
 *
 * @param {{params: object, query: object, url: string}} route
 */
export async function searchPage(route = {}) {
    // Navigo 8.x wrap() trả `query: {}` rỗng — phải parse trực tiếp
    const queryKeyword = route.query?.keyword;
    const urlKeyword = new URLSearchParams(window.location.search).get("keyword");
    const keyword = (queryKeyword || urlKeyword || "").trim();

    // STATE 1: No keyword → render placeholder
    if (!keyword) {
        renderToMain(
            renderSearchPage({ keyword: "", data: null, error: null })
        );
        return;
    }

    // STATE 2 + 3 + 4: Fetch + render
    let data = null;
    let error = null;

    // Render skeleton ngay
    renderToMain(SKELETON_SEARCH());

    try {
        // /search route page dùng /search/suggestions?q= (response {suggestions, completed})
        // KHÔNG dùng /search?q= (endpoint khác, trả {items} flat).
        data = await searchService.getSuggestions(keyword);
    } catch (err) {
        console.error("[search] fetch error:", err);
        // AppError từ mapApiError đã có `message` Tiếng Việt
        error = err?.message || "Đã xảy ra lỗi không xác định";
    }

    renderToMain(renderSearchPage({ keyword, data, error }));

    // Init slider prev/next buttons cho sections có data-slider
    if (data) {
        initSliders();
    }
}

export default searchPage;
