import { escapeHtml } from "@/utils/format.js";

const STORAGE_KEY_ACTIVE_TAB = "music.library.activeTab";
const STORAGE_KEY_VIEW_MODE = "music.library.viewMode";
const STORAGE_KEY_SORT_BY = "music.library.sortBy";

export const LIBRARY_TABS = [
    { id: "playlists", label: "Playlists", icon: "fa-solid fa-list" },
    { id: "songs", label: "Bài hát đã thích", icon: "fa-solid fa-heart" },
    { id: "albums", label: "Albums", icon: "fa-solid fa-compact-disc" },
    { id: "artists", label: "Nghệ sĩ", icon: "fa-solid fa-microphone" },
    {
        id: "recent",
        label: "Nghe gần đây",
        icon: "fa-solid fa-clock-rotate-left",
    },
];

export const DEFAULT_TAB = "playlists";
export const DEFAULT_VIEW_MODE = "grid";
export const DEFAULT_SORT_BY = "recent";

const VALID_TAB_IDS = LIBRARY_TABS.map((t) => t.id);

// ======================================================
// HTML RENDER
// ======================================================

/**
 * Render HTML cho 5 tabs.
 * @param {object} [options]
 * @param {string} [options.activeTab="playlists"] - ID tab đang active
 * @returns {string} HTML
 */
export function renderTabs({ activeTab = DEFAULT_TAB } = {}) {
    const tabsHtml = LIBRARY_TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const activeClass = isActive ? " library-tabs__tab--active" : "";
        const ariaSelected = isActive ? "true" : "false";
        const tabindex = isActive ? "0" : "-1";

        return `
            <button
                type="button"
                role="tab"
                class="library-tabs__tab${activeClass}"
                data-library-tab="${escapeHtml(tab.id)}"
                aria-selected="${ariaSelected}"
                tabindex="${tabindex}">
                <i class="${escapeHtml(tab.icon)}"></i>
                <span>${escapeHtml(tab.label)}</span>
            </button>
        `;
    }).join("");

    return `
        <nav class="library-tabs" role="tablist" aria-label="Thư viện">
            ${tabsHtml}
        </nav>
    `;
}

// ======================================================
// URL HASH HELPERS
// ======================================================

/**
 * Đọc active tab từ URL hash (format: #tab=playlists).
 * @returns {string|null}
 */
export function getTabFromHash() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith("#")) return null;
    const params = new URLSearchParams(hash.slice(1));
    const tab = params.get("tab");
    return VALID_TAB_IDS.includes(tab) ? tab : null;
}

/**
 * Update URL hash với active tab (không reload page).
 * @param {string} tabId
 */
export function setTabToHash(tabId) {
    if (!VALID_TAB_IDS.includes(tabId)) return;
    const newHash = `#tab=${tabId}`;
    if (window.location.hash !== newHash) {
        // history.replaceState tránh thêm entry mới vào history stack
        history.replaceState(null, "", newHash);
    }
}

// ======================================================
// LOCALSTORAGE HELPERS
// ======================================================

/**
 * Đọc active tab từ localStorage.
 * @returns {string}
 */
export function getStoredTab() {
    try {
        const tab = localStorage.getItem(STORAGE_KEY_ACTIVE_TAB);
        return VALID_TAB_IDS.includes(tab) ? tab : DEFAULT_TAB;
    } catch {
        return DEFAULT_TAB;
    }
}

/**
 * Lưu active tab vào localStorage.
 * @param {string} tabId
 */
export function setStoredTab(tabId) {
    try {
        if (VALID_TAB_IDS.includes(tabId)) {
            localStorage.setItem(STORAGE_KEY_ACTIVE_TAB, tabId);
        }
    } catch (err) {
        console.warn("[library-tabs] Lỗi khi setStoredTab:", err);
    }
}

/**
 * Đọc view mode từ localStorage.
 * @returns {string} "grid" | "list"
 */
export function getStoredViewMode() {
    try {
        const mode = localStorage.getItem(STORAGE_KEY_VIEW_MODE);
        return mode === "list" ? "list" : DEFAULT_VIEW_MODE;
    } catch {
        return DEFAULT_VIEW_MODE;
    }
}

/**
 * Lưu view mode vào localStorage.
 * @param {string} mode "grid" | "list"
 */
export function setStoredViewMode(mode) {
    try {
        if (mode === "grid" || mode === "list") {
            localStorage.setItem(STORAGE_KEY_VIEW_MODE, mode);
        }
    } catch (err) {
        console.warn("[library-tabs] Lỗi khi setStoredViewMode:", err);
    }
}

/**
 * Đọc sort by từ localStorage.
 * @returns {string}
 */
export function getStoredSortBy() {
    try {
        const sort = localStorage.getItem(STORAGE_KEY_SORT_BY);
        return ["recent", "name", "name-desc"].includes(sort)
            ? sort
            : DEFAULT_SORT_BY;
    } catch {
        return DEFAULT_SORT_BY;
    }
}

/**
 * Lưu sort by vào localStorage.
 * @param {string} sort
 */
export function setStoredSortBy(sort) {
    try {
        if (["recent", "name", "name-desc"].includes(sort)) {
            localStorage.setItem(STORAGE_KEY_SORT_BY, sort);
        }
    } catch (err) {
        console.warn("[library-tabs] Lỗi khi setStoredSortBy:", err);
    }
}

// ======================================================
// RESOLVE INITIAL TAB
// ======================================================

/**
 * Đọc tab ban đầu theo thứ tự ưu tiên:
 *   1. URL hash (shareable link)
 *   2. localStorage (F5 restore)
 *   3. Default ("playlists")
 * @returns {string}
 */
export function getInitialTab() {
    return getTabFromHash() || getStoredTab() || DEFAULT_TAB;
}

// ======================================================
// BIND EVENTS
// ======================================================

/**
 * Attach click + keyboard events cho tabs.
 *
 * @param {object} [options]
 * @param {(tabId: string) => void} [options.onChange] - Callback khi đổi tab
 * @param {string} [options.initialTab] - Tab đang active (chỉ để skip re-render nếu click lại)
 * @returns {() => void} cleanup function
 */
export function bindTabs({ onChange, initialTab = DEFAULT_TAB } = {}) {
    const root = document.querySelector(".library-tabs");
    if (!root) {
        console.warn("[library-tabs] Không tìm thấy .library-tabs");
        return () => {};
    }

    const handleActivate = (tabId) => {
        if (!VALID_TAB_IDS.includes(tabId)) return;
        if (tabId === initialTab) return; // No-op nếu click cùng tab

        // Update UI
        root.querySelectorAll(".library-tabs__tab").forEach((btn) => {
            const isActive = btn.dataset.libraryTab === tabId;
            btn.classList.toggle("library-tabs__tab--active", isActive);
            btn.setAttribute("aria-selected", isActive ? "true" : "false");
            btn.setAttribute("tabindex", isActive ? "0" : "-1");
        });

        // Persist
        setTabToHash(tabId);
        setStoredTab(tabId);

        // Callback
        if (typeof onChange === "function") {
            onChange(tabId);
        }
    };

    const handleClick = (e) => {
        const btn = e.target.closest(".library-tabs__tab");
        if (!btn) return;
        const tabId = btn.dataset.libraryTab;
        if (tabId) handleActivate(tabId);
    };

    const handleKeydown = (e) => {
        const btn = e.target.closest(".library-tabs__tab");
        if (!btn) return;

        const tabs = Array.from(root.querySelectorAll(".library-tabs__tab"));
        const currentIndex = tabs.indexOf(btn);

        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            e.preventDefault();
            const nextIndex = (currentIndex + 1) % tabs.length;
            tabs[nextIndex].focus();
            handleActivate(tabs[nextIndex].dataset.libraryTab);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
            tabs[prevIndex].focus();
            handleActivate(tabs[prevIndex].dataset.libraryTab);
        } else if (e.key === "Home") {
            e.preventDefault();
            tabs[0].focus();
            handleActivate(tabs[0].dataset.libraryTab);
        } else if (e.key === "End") {
            e.preventDefault();
            const last = tabs[tabs.length - 1];
            last.focus();
            handleActivate(last.dataset.libraryTab);
        }
    };

    root.addEventListener("click", handleClick);
    root.addEventListener("keydown", handleKeydown);

    // Cleanup function
    return () => {
        root.removeEventListener("click", handleClick);
        root.removeEventListener("keydown", handleKeydown);
    };
}

export default {
    LIBRARY_TABS,
    DEFAULT_TAB,
    DEFAULT_VIEW_MODE,
    DEFAULT_SORT_BY,
    renderTabs,
    getTabFromHash,
    setTabToHash,
    getStoredTab,
    setStoredTab,
    getStoredViewMode,
    setStoredViewMode,
    getStoredSortBy,
    setStoredSortBy,
    getInitialTab,
    bindTabs,
};
