// ======================================================
// MOODS-AND-GENRES PAGE — Init + render
// ======================================================
//
// Flow:
//   1. Show loading overlay
//   2. Fetch parallel: categories + lines
//   3. Render HTML từ `moods-and-genres.render.js`
//   4. Inject + re-init sliders
//
// Port từ `code chức năng gốc/base.js` route handler dòng 5773-5776:
//   "/moods-and-genres": async () => {
//       let[e,t] = await Promise.all([G.Categories.getAll(), G.Lines.getAll()]);
//       await Q( () => ur(e, t))
//   }
//
// Lưu ý:
//   - Mỗi fetch fail → fallback `[]` để page vẫn render (1 phần data).
//

import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import { renderMoodsAndGenres } from "@/pages/moods-and-genres/moods-and-genres.render.js";
import { SKELETON_SECTION } from "@/components/skeleton.js";
import { categoriesService } from "@/services/categoriesService.js";
import { linesService } from "@/services/linesService.js";
import { initSliders } from "@/libs/slider.js";
import { toast } from "@/libs/toast.js";

/**
 * Render skeleton placeholder cho Moods-and-Genres page.
 * 1 H1 + 3 color-bar sections (mỗi section 4 cols).
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
                console.warn("[moods-and-genres] getAll categories failed:", err.message);
                return [];
            }),
            linesService.getAll().catch((err) => {
                console.warn("[moods-and-genres] getAll lines failed:", err.message);
                return [];
            }),
        ]);

        // 2. Normalize: API trả {items: [...]} → unwrap thành [...]
        const categoriesList = Array.isArray(categories)
            ? categories
            : categories?.items || [];
        const linesList = Array.isArray(lines)
            ? lines
            : lines?.items || [];

        if (categoriesList.length === 0 && linesList.length === 0) {
            renderPage(
                renderPlaceholder(
                    "Chưa có dữ liệu",
                    "Hệ thống chưa có mood/genre/line nào."
                )
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
        const fallback = "Không thể tải danh sách tâm trạng & thể loại. Vui lòng thử lại.";
        toast.error(err.message || fallback);
        renderPage(renderPlaceholder("Đã xảy ra lỗi", err.message || fallback));
    }
}

export default moodsAndGenresPage;