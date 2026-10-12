import { renderPage, renderPlaceholder } from "@/pages/_shared.js";
import {
    renderCategoryDetail,
    renderCategoryDetailEmpty,
} from "@/pages/category-detail/category-detail.render.js";
import { categoriesService } from "@/services/categoriesService.js";
import { SKELETON_SECTION, skeletonLine } from "@/components/skeleton.js";
import { initSliders } from "@/libs/slider.js";
import { toast } from "@/libs/toast.js";

/**
 * Render skeleton placeholder cho Category Detail.
 * Match layout: H1 + N sections (1 section skeleton đại diện).
 * @returns {string} HTML
 */
function SKELETON_CATEGORY_DETAIL() {
    return `
        <div class="category-detail-page">
            <div class="home__container">
                <div class="home__row">
                    ${skeletonLine("300px", "45px")}
                </div>
            </div>
            ${SKELETON_SECTION(true, 6)}
            ${SKELETON_SECTION(true, 6)}
        </div>
    `;
}

// ======================================================
// MAIN RENDER
// ======================================================

/**
 * Render Category Detail page.
 *
 * @param {{ params: { slug: string } }} route - Router params
 */
export async function categoryDetailPage(route = {}) {
    // Defensive: nếu route không truyền slug (lỗi routing)
    const slug = route.params?.slug;
    if (!slug) {
        renderPage(
            renderPlaceholder(
                "Thiếu slug",
                "Không tìm thấy danh mục được yêu cầu.",
            ),
        );
        return;
    }

    // 0. Render skeleton ngay (UX tốt hơn spinner overlay)
    renderPage(SKELETON_CATEGORY_DETAIL());

    try {
        // 1. Fetch category (port base.js dòng 5779-5780)
        const category = await categoriesService.getCategory(slug);

        if (!category || !category.name) {
            renderPage(
                renderPlaceholder(
                    "Không tìm thấy danh mục",
                    `Danh mục "${slug}" không tồn tại hoặc đã bị xoá.`,
                ),
            );
            return;
        }

        // 2. Render HTML (port fr() dòng 4480)
        const subcategories = category.subcategories || [];
        const html =
            subcategories.length === 0
                ? renderCategoryDetailEmpty(category.name)
                : renderCategoryDetail(category);

        // 3. Inject
        renderPage(html);

        // 4. Re-init sliders
        initSliders();
    } catch (err) {
        console.error("[category-detail] Critical error:", err);
        const fallback = "Không thể tải chi tiết danh mục. Vui lòng thử lại.";
        toast.error(err.message || fallback);
        renderPage(renderPlaceholder("Đã xảy ra lỗi", err.message || fallback));
    }
}

export default categoryDetailPage;
