import { searchService } from "@/services/searchService.js";
import { renderSearchPage } from "@/pages/search/search.render.js";
import { SKELETON_SEARCH } from "@/components/skeleton.js";
import { initSliders } from "@/libs/slider.js";

/**
 * @param {string} html
 */
function renderToMain(html) {
    const main = document.querySelector("#main");
    if (main) {
        main.innerHTML = html;
    }
}

/**
 *
 * @param {{ params: object, query: object, url: string }} route
 */
export async function searchPage(route = {}) {
    const queryKeyword = route.query?.keyword;
    const urlKeyword = new URLSearchParams(window.location.search).get(
        "keyword",
    );
    const keyword = (queryKeyword || urlKeyword || "").trim();

    // STATE 1: No keyword → render placeholder
    if (!keyword) {
        renderToMain(
            renderSearchPage({ keyword: "", data: null, error: null }),
        );
        return;
    }

    // STATE 2 + 3 + 4: Fetch + render
    let data = null;
    let error = null;

    // Render skeleton ngay (UX: user thấy structure khi đang fetch)
    renderToMain(SKELETON_SEARCH());

    try {
        data = await searchService.getSuggestions(keyword);
    } catch (err) {
        console.error("[search] fetch error:", err);
        error = err?.message || "Đã xảy ra lỗi không xác định";
    }

    renderToMain(renderSearchPage({ keyword, data, error }));

    // Init slider prev/next buttons cho sections có data-slider
    // (chỉ khi có data — renderSearchPage mới tạo sections)
    if (data) {
        initSliders();
    }
}

export default searchPage;
