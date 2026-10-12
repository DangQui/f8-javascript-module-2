// ======================================================
// SEARCH PAGE — HANDLER
// ======================================================
//
// HARD RULE #0: Port logic + thuật toán 1:1 từ code gốc `base.js`.
//
// Reference từ base.js:
//   - Route "/search" (dòng 5816-5824):
//       1. Lấy `keyword` từ URLSearchParams
//       2. Nếu !keyword → render placeholder "Hãy nhập từ khóa..."
//       3. Else → await G.Search.search(keyword) → Dr(keyword, data)
//
// Pattern 1:1:
//   - Parse keyword từ `route.query.keyword` (Navigo parse sẵn)
//   - safeFetch pattern: gọi searchService, catch error → render placeholder
//   - Phase 20.1: dùng `err.message` từ AppError thay vì hardcode
//   - Sau render: gọi `initSliders()` để wire prev/next buttons cho sections
//
// USAGE:
//   import { searchPage } from "@/pages/search/search.js";
//   // Trong router: .on("/search", wrap(searchPage))
//

import { searchService } from "@/services/searchService.js";
import { renderSearchPage } from "@/pages/search/search.render.js";
import { SKELETON_SEARCH } from "@/components/skeleton.js";
import { initSliders } from "@/libs/slider.js";

/**
 * Render page vào #main. Helper local (giống pattern _shared.js).
 * @param {string} html
 */
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
 *   1. Parse keyword từ URLSearchParams (Navigo 8.x wrap không parse query tự động)
 *   2. Nếu rỗng → render placeholder "Hãy nhập từ khóa"
 *   3. Else → await searchService.getResults(keyword, { page, limit })
 *      - Success → render 4 sections
 *      - Fail → render error placeholder với err.message
 *   4. Init sliders cho các section có data-slider
 *
 * @param {{ params: object, query: object, url: string }} route
 */
export async function searchPage(route = {}) {
    // Parse keyword từ URL (hỗ trợ cả route.query và fallback URLSearchParams).
    // Navigo 8.x wrap() trả `query: {}` rỗng — phải parse trực tiếp từ window.location.search
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

    // Render skeleton ngay (UX: user thấy structure khi đang fetch)
    renderToMain(SKELETON_SEARCH());

    try {
        // Port 1:1 tu base.js:5822 — /search route page cung dung G.Search.search
        // (endpoint /search/suggestions?q=) -> response shape {suggestions, completed}
        // -> Dr(keyword, data) filter data.completed theo type.
        // KHONG dung /search?q= (do la endpoint khac, tra {items} flat).
        data = await searchService.getSuggestions(keyword);
    } catch (err) {
        // Phase 20.1: dùng err.message từ AppError (đã map Tiếng Việt)
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
