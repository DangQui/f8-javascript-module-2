import { renderPage } from "@/pages/_shared.js";
import {
    renderCharts,
    renderChartsContent,
} from "@/pages/charts/charts.render.js";
import { SKELETON_SECTION } from "@/components/skeleton.js";
import { exploreService } from "@/services/exploreService.js";
import { toast } from "@/libs/toast.js";

// ======================================================
// COUNTRY CHANGE HANDLER (port từ base.js `er()` dòng 4123)
// ======================================================

/**
 * Bind country select + wire change handler.
 * Chỉ swap innerHTML của `#charts-content` (không render lại cả page).
 *
 * Note: Hàm này tự lookup DOM `#country-select` + `#charts-content` sau khi page
 * đã được render. Nếu selector không tồn tại → return silently.
 *
 * @param {string} [defaultCode="GLOBAL"] - Country mặc định (đã được render selected)
 */
function bindChartsCountrySelect(defaultCode = "GLOBAL") {
    const selectEl = document.querySelector("#country-select");
    const contentEl = document.querySelector("#charts-content");

    if (!selectEl || !contentEl) {
        console.warn(
            "[charts] #country-select hoặc #charts-content không tồn tại trong DOM",
        );
        return;
    }

    async function loadCountry(country) {
        try {
            const [topVideos, topArtists] = await Promise.all([
                exploreService.getTopVideos(country),
                exploreService.getTopArtists(country),
            ]);

            // Swap chỉ phần content — giữ nguyên H1 + country select
            contentEl.innerHTML = renderChartsContent(topVideos, topArtists);
        } catch (err) {
            console.error(`[charts] loadCountry(${country}) failed:`, err);
            // Ưu tiên err.message (từ AppError mapApiError)
            const fallback = `Không thể tải bảng xếp hạng cho ${country}. Vui lòng thử lại.`;
            toast.error(err.message || fallback);
        }
    }

    selectEl.addEventListener("change", async (e) => {
        const country = e.target.value;
        await loadCountry(country);
    });

    // Initial load với default (nếu defaultCode khác "GLOBAL")
    // Mặc định page render đã load với "GLOBAL" → không cần loadCountry(defaultCode) lại
}

// ======================================================
// MAIN HANDLER
// ======================================================

/**
 * Render Charts page handler.
 * @param {object} [route]
 */
export async function chartsPage(route = {}) {
    try {
        // 0. Render skeleton ngay (UX: user thấy structure trước)
        // Phần trên (H1 + country select) → render inline skeleton cho heading
        // Phần content → 2 SKELETON_SECTION (videos + top-artists)
        renderPage(`
            <div class="charts-page">
                <div class="skeleton skeleton--box" style="width: 280px; height: 45px; margin-bottom: 40px;"></div>
                <div class="skeleton skeleton--box" style="width: 113px; height: 36px; border-radius: 999px; margin-bottom: 24px;"></div>
                ${SKELETON_SECTION(true, 6)}
                ${SKELETON_SECTION(true, 6)}
            </div>
        `);

        // 1. Parallel fetch (3 endpoints)
        const [countries, topVideos, topArtists] = await Promise.all([
            exploreService.getCountries(),
            exploreService.getTopVideos("GLOBAL"),
            exploreService.getTopArtists("GLOBAL"),
        ]);

        // 2. Render HTML với country = GLOBAL được select mặc định
        const html = renderCharts(countries, topVideos, topArtists, "GLOBAL");

        // 3. Inject
        renderPage(html);

        // 4. Bind country select change handler
        bindChartsCountrySelect("GLOBAL");
    } catch (err) {
        console.error("[charts] Critical error:", err);
        // Ưu tiên err.message (từ AppError mapApiError) thay vì hardcode
        const fallback = "Không thể tải trang Bảng xếp hạng. Vui lòng thử lại.";
        toast.error(err.message || fallback);
        renderPage(`
            <section class="page-placeholder">
                <h1 class="page-placeholder__title">Đã xảy ra lỗi</h1>
                <p class="page-placeholder__desc">${err.message || "Unknown error"}</p>
            </section>
        `);
    }
}

export default chartsPage;
