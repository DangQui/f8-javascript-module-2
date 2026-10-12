/**
 * pages/library/library.render.js — Library page render
 *
 * Cung cấp các function render HTML cho trang Library:
 *   - renderLibraryPage()       → Full page (header + tabs + content)
 *   - renderLibraryHeader()     → Header (title + tools row)
 *   - renderTabContent()        → Content cho từng tab
 *   - renderEmptyState()        → Empty state (icon + message + CTA)
 *   - renderErrorState()        → Error state (icon + message + retry)
 *   - renderLoadingSkeleton()   → Skeleton loading cho từng tab
 *
 * Exports:
 *   - renderLibraryPage(opts)
 *   - renderLibraryHeader(opts)
 *   - renderTabContent(opts)
 *   - renderEmptyState(opts)
 *   - renderErrorState(opts)
 *   - renderLoadingSkeleton(tab, viewMode)
 *
 * Consumed by:
 *   - `@/pages/library/library.js`
 */

import { escapeHtml } from "@/utils/format.js";
import { renderTabs, LIBRARY_TABS } from "@/components/library-tabs.js";
import { renderCards, normalizeCardItem } from "@/components/card-item.js";

/**
 * Render full Library page.
 * @param {object} [options]
 * @param {string} [options.activeTab="playlists"]
 * @param {string} [options.viewMode="grid"] - "grid" | "list"
 * @param {string} [options.sortBy="recent"] - "recent" | "name" | "name-desc"
 * @param {object} [options.data={}]
 * @returns {string} HTML
 */
export function renderLibraryPage({
    activeTab = "playlists",
    viewMode = "grid",
    sortBy = "recent",
    data = null,
} = {}) {
    return `
        <section class="library-page" data-library-page>
            ${renderLibraryHeader({ viewMode, sortBy })}
            ${renderTabs({ activeTab })}
            <div class="library-content" data-library-content>
                ${renderTabContent({ tab: activeTab, viewMode, sortBy, data })}
            </div>
        </section>
    `;
}

/**
 * Render header (title + search + view toggle + sort).
 */
export function renderLibraryHeader({ viewMode = "grid", sortBy = "recent" } = {}) {
    return `
        <header class="library-header">
            <h1 class="library-page__heading">Thư viện</h1>
            <div class="library-header__tools">
                ${renderSearchInput()}
                ${renderViewToggle(viewMode)}
                ${renderSortDropdown(sortBy)}
            </div>
        </header>
    `;
}

/**
 * Render search input — port nguyên cấu trúc + styles từ header search
 * (`form form__search` + `form__input-search` + `form__close`).
 *
 * Reuse styles có sẵn ở `src/styles/components/_form.scss` để đồng bộ UX
 * với search trên header (border-radius, padding, font-size, close button).
 */
function renderSearchInput() {
    return `
        <form action="" class="form form__search library-search-form" onsubmit="return false">
            <button class="btn btn--text form__search--submit icon" type="submit">
                <i class="fa-solid fa-magnifying-glass"></i>
            </button>
            <input
                id="library-search-input"
                type="text"
                class="form__input-search"
                placeholder="Tìm trong thư viện của bạn…"
                autocomplete="off" />
            <button
                id="library-search-clear"
                class="btn btn--text form__close d-none"
                type="button"
                aria-label="Xóa nội dung tìm kiếm">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </form>
    `;
}

/**
 * Render view toggle (Grid | List).
 */
function renderViewToggle(viewMode) {
    const gridActive = viewMode === "grid" ? " library-view-toggle__btn--active" : "";
    const listActive = viewMode === "list" ? " library-view-toggle__btn--active" : "";

    return `
        <div class="library-view-toggle" role="group" aria-label="Chế độ hiển thị">
            <button
                type="button"
                class="library-view-toggle__btn${gridActive}"
                data-library-view="grid"
                title="Xem dạng lưới"
                aria-label="Xem dạng lưới"
                aria-pressed="${viewMode === "grid"}">
                <i class="fa-solid fa-grid"></i>
            </button>
            <button
                type="button"
                class="library-view-toggle__btn${listActive}"
                data-library-view="list"
                title="Xem dạng danh sách"
                aria-label="Xem dạng danh sách"
                aria-pressed="${viewMode === "list"}">
                <i class="fa-solid fa-list-ul"></i>
            </button>
        </div>
    `;
}

/**
 * Render sort dropdown.
 */
function renderSortDropdown(sortBy) {
    const labels = {
        "recent": "Mới nhất",
        "name": "A → Z",
        "name-desc": "Z → A",
    };
    const currentLabel = labels[sortBy] || labels.recent;

    const options = [
        { value: "recent", label: "Mới nhất" },
        { value: "name", label: "Tên A → Z" },
        { value: "name-desc", label: "Tên Z → A" },
    ];

    const optionsHtml = options.map((opt) => {
        const activeClass = opt.value === sortBy ? " library-sort__option--active" : "";
        return `
            <button
                type="button"
                class="library-sort__option${activeClass}"
                data-library-sort="${escapeHtml(opt.value)}"
                role="menuitem">
                ${escapeHtml(opt.label)}
            </button>
        `;
    }).join("");

    return `
        <div class="library-sort" data-library-sort-root>
            <button
                type="button"
                class="library-sort__trigger"
                data-library-sort-trigger
                aria-haspopup="menu"
                aria-expanded="false">
                <i class="fa-solid fa-arrow-down-wide-short"></i>
                <span>${escapeHtml(currentLabel)}</span>
            </button>
            <div class="library-sort__menu" role="menu">
                ${optionsHtml}
            </div>
        </div>
    `;
}

/**
 * Render content cho 1 tab.
 */
export function renderTabContent({ tab, viewMode = "grid", sortBy = "recent", data = null }) {
    if (data?.error) {
        return renderErrorState({
            message: data.error.message || "Đã xảy ra lỗi khi tải dữ liệu.",
        });
    }

    const items = data?.items ?? [];
    const total = data?.total ?? 0;

    switch (tab) {
        case "playlists":
            return renderPlaylistsSection({ items, total, viewMode, sortBy });
        case "songs":
        case "albums":
        case "artists":
        case "recent":
        default:
            return renderComingSoonTab(tab);
    }
}

/**
 * Render section Playlists.
 */
function renderPlaylistsSection({ items = [], total = 0, viewMode = "grid", sortBy = "recent" }) {
    if (items.length === 0) {
        return renderEmptyState({
            icon: "fa-solid fa-list",
            title: "Chưa có playlist nào",
            message: "Bạn chưa tạo playlist nào. Tạo playlist đầu tiên để sắp xếp những bài hát yêu thích.",
            ctaText: "Tạo playlist mới",
            ctaHref: "/",
            ctaIcon: "fa-solid fa-plus",
        });
    }

    const sorted = sortItems(items, sortBy);
    const bodyHtml = viewMode === "grid"
        ? renderCards(sorted.map((it) => normalizeCardItem(it, "/playlists/details")))
        : renderPlaylistList(sorted);

    return `
        <section class="library-section" data-library-section="playlists">
            <div class="library-section__header">
                <h2 class="library-section__title">
                    Playlists của bạn
                    <span class="library-section__count">${total} playlist</span>
                </h2>
                <button class="btn library-create-btn" data-library-action="create-playlist" type="button">
                    <i class="fa-solid fa-plus"></i> Tạo playlist
                </button>
            </div>
            <div class="library-grid">
                ${bodyHtml}
            </div>
        </section>
    `;
}

/**
 * Render list view cho playlists.
 */
function renderPlaylistList(playlists) {
    return playlists
        .map(
            (p) => `
        <a href="/playlists/details/${encodeURIComponent(p.slug || p.id)}"
           data-navigo
           class="library-list-row">
            <i class="fa-solid fa-list"></i>
            <span>${escapeHtml(p.title || "Không rõ tên")}</span>
        </a>
    `
        )
        .join("");
}

/**
 * Render tab "coming soon" cho 4 tab còn lại.
 */
function renderComingSoonTab(tab) {
    const tabConfig = LIBRARY_TABS.find((t) => t.id === tab);
    const label = tabConfig?.label || "Mục này";

    return renderEmptyState({
        icon: tabConfig?.icon || "fa-solid fa-music",
        title: "Đang phát triển",
        message: `Tab "${label}" sẽ được hoàn thiện ở các phase tiếp theo (L-2/L-3).`,
        ctaText: "Quay lại Playlists",
        ctaHref: "#tab=playlists",
        ctaIcon: "fa-solid fa-arrow-left",
    });
}

/**
 * Sort items theo sortBy.
 * @param {Array} items
 * @param {string} sortBy - "recent" | "name" | "name-desc"
 * @returns {Array}
 */
function sortItems(items, sortBy) {
    const arr = Array.isArray(items) ? [...items] : [];
    if (sortBy === "name") {
        arr.sort((a, b) => (a.title || a.name || "").localeCompare(b.title || b.name || ""));
    } else if (sortBy === "name-desc") {
        arr.sort((a, b) => (b.title || b.name || "").localeCompare(a.title || a.name || ""));
    }
    // "recent" giữ nguyên thứ tự (backend đã sort DESC)
    return arr;
}

/**
 * Render empty state.
 */
export function renderEmptyState({
    icon = "fa-solid fa-music",
    title = "Chưa có dữ liệu",
    message = "",
    ctaText = null,
    ctaHref = null,
    ctaIcon = null,
} = {}) {
    const ctaHtml = ctaText && ctaHref
        ? `<a href="${escapeHtml(ctaHref)}" data-navigo class="library-empty__cta">
               ${ctaIcon ? `<i class="${escapeHtml(ctaIcon)}"></i>` : ""}
               <span>${escapeHtml(ctaText)}</span>
           </a>`
        : "";

    return `
        <div class="library-empty" role="status">
            <div class="library-empty__icon">
                <i class="${escapeHtml(icon)}"></i>
            </div>
            <h2 class="library-empty__title">${escapeHtml(title)}</h2>
            ${message ? `<p class="library-empty__message">${escapeHtml(message)}</p>` : ""}
            ${ctaHtml}
        </div>
    `;
}

/**
 * Render error state.
 */
export function renderErrorState({ message = "Đã xảy ra lỗi", title = "Đã xảy ra lỗi" } = {}) {
    return `
        <div class="library-error" role="alert">
            <div class="library-error__icon">
                <i class="fa-solid fa-circle-exclamation"></i>
            </div>
            <h2 class="library-error__title">${escapeHtml(title)}</h2>
            <p class="library-error__message">${escapeHtml(message)}</p>
            <button
                type="button"
                class="library-error__retry"
                data-library-action="retry">
                <i class="fa-solid fa-rotate-right"></i>
                <span>Thử lại</span>
            </button>
        </div>
    `;
}

/**
 * Render loading skeleton cho 1 tab.
 */
export function renderLoadingSkeleton(tab, viewMode = "grid") {
    if (tab === "playlists") {
        return viewMode === "grid"
            ? renderGridSkeleton(8)
            : renderListSkeleton(10);
    }
    return renderGridSkeleton(8);
}

/**
 * Render grid skeleton (8 card placeholders).
 */
function renderGridSkeleton(count = 8) {
    const items = Array.from(
        { length: count },
        () => `
        <div class="library-grid-skeleton-item" aria-hidden="true">
            <div class="skeleton skeleton--box" style="width:100%;aspect-ratio:1/1;border-radius:8px"></div>
            <div class="skeleton skeleton--line" style="width:80%;height:14px;margin-top:8px"></div>
            <div class="skeleton skeleton--line" style="width:60%;height:12px;margin-top:4px"></div>
        </div>
    `
    ).join("");

    return `
        <section class="library-section">
            <div class="library-section__header">
                <div class="skeleton skeleton--line" style="width:200px;height:24px"></div>
            </div>
            <div class="library-grid">
                ${items}
            </div>
        </section>
    `;
}

/**
 * Render list skeleton (10 row placeholders).
 */
function renderListSkeleton(count = 10) {
    const items = Array.from(
        { length: count },
        () => `
        <div class="library-list-skeleton-item" aria-hidden="true">
            <div class="skeleton skeleton--box" style="width:48px;height:48px;border-radius:6px;flex-shrink:0"></div>
            <div style="flex:1">
                <div class="skeleton skeleton--line" style="width:70%;height:14px"></div>
                <div class="skeleton skeleton--line" style="width:50%;height:12px;margin-top:4px"></div>
            </div>
        </div>
    `
    ).join("");

    return `
        <section class="library-section">
            <div class="library-section__header">
                <div class="skeleton skeleton--line" style="width:200px;height:24px"></div>
            </div>
            <div class="library-list">
                ${items}
            </div>
        </section>
    `;
}

export default {
    renderLibraryPage,
    renderLibraryHeader,
    renderTabContent,
    renderEmptyState,
    renderErrorState,
    renderLoadingSkeleton,
};
