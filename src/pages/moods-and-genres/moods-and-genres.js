import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import { renderMoodsAndGenres } from "@/pages/moods-and-genres/moods-and-genres.render.js";
import { SKELETON_SECTION } from "@/components/skeleton.js";
import { categoriesService } from "@/services/categoriesService.js";
import { linesService } from "@/services/linesService.js";
import { initSliders } from "@/libs/slider.js";
import { toast } from "@/libs/toast.js";

/**
 * Render skeleton placeholder cho Moods-and-Genres page.
 */
function SKELETON_MOODS_AND_GENRES() {
    return `
        <div class="moods-genres-page">
            <div class="skeleton-box" style="height:45px;width:500px;margin-bottom:40px;"></div>
            ${SKELETON_SECTION(true, 8)}
            ${SKELETON_SECTION(true, 8)}
            ${SKELETON_SECTION(true, 8)}
        </div>
    `;
}

/**
 * Render Moods-and-Genres page.
 */
export async function moodsAndGenresPage() {
    // 0. Render skeleton ngay
    renderPage(SKELETON_MOODS_AND_GENRES());

    try {
        // 1. Fetch parallel (port base.js dòng 5774)
        const [categories, lines] = await Promise.all([
            categoriesService.getAll().catch((err) => {
                console.warn(
                    "[moods-and-genres] getAll categories failed:",
                    err.message,
                );
                return [];
            }),
            linesService.getAll().catch((err) => {
                console.warn(
                    "[moods-and-genres] getAll lines failed:",
                    err.message,
                );
                return [];
            }),
        ]);

        // 2. Normalize: API trả {items: [...]} → unwrap thành [...]
        const categoriesList = Array.isArray(categories)
            ? categories
            : categories?.items || [];
        const linesList = Array.isArray(lines) ? lines : lines?.items || [];

        if (categoriesList.length === 0 && linesList.length === 0) {
            renderPage(
                renderPlaceholder(
                    "Chưa có dữ liệu",
                    "Hệ thống chưa có mood/genre/line nào.",
                ),
            );
            return;
        }

        // 3. Render HTML
        const html = renderMoodsAndGenres(categoriesList, linesList);

        // 4. Inject
        renderPage(html);

        // 5. Re-init sliders
        initSliders();
    } catch (err) {
        console.error("[moods-and-genres] Critical error:", err);
        const fallback =
            "Không thể tải danh sách tâm trạng & thể loại. Vui lòng thử lại.";
        toast.error(err.message || fallback);
        renderPage(renderPlaceholder("Đã xảy ra lỗi", err.message || fallback));
    }
}

export default moodsAndGenresPage;
