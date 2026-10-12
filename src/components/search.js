// ======================================================
// SEARCH ENGINE — Phase 13 (port từ base.js class Mr dòng 5843-6036)
// ======================================================
//
// HARD RULE #0: Port logic + thuật toán 1:1 từ code gốc `base.js`.
//
// Reference từ base.js:
//   - class Mr (dòng 5843-6036): search engine singleton
//   - hàm jr (dòng 5836-5842): debounce 400ms (Mr dùng 350ms)
//   - hàm Dr (dòng 5668-5696): render search results page
//   - Search.search (dòng 3997-4000): G.Search.search → /search/suggestions?q=
//   - getPath mapping (dòng 5998-6003): {playlist, album, song, video} → routes
//
// Thuật toán port 1:1:
//   1. Debounce 350ms cho input event (desktop + mobile)
//   2. Clear button → input rỗng + hide dropdown + focus input
//   3. Enter → navigateSearch(q) → /search?keyword=... (encodeURIComponent)
//   4. focus input → nếu lastData có → re-render dropdown
//   5. Click outside dropdown + input → hideDropdown()
//   6. Click suggestion → fill input + handleSearch lại
//   7. Click result → navigate theo type
//   8. Mobile: mở/đóng modal qua open-search / mobile-close-search
//
// Cấu trúc DOM cần (từ partials/header-*.html — Task 13.1):
//   - #navbar-search-input + #navbar-search-clear + #search-dropdown (desktop)
//   - #open-search + #mobile-search-modal + #mobile-search-input +
//     #mobile-search-clear + #mobile-close-search + #search-modal-results (mobile)
//
// USAGE:
//   import { initSearch } from "@/components/search.js";
//   initSearch(); // gọi 1 lần sau khi layout render xong
//

import { debounce } from "@/utils/format.js";
import { searchService } from "@/services/searchService.js";
import { navigate, router } from "@/libs/router.js";

// ======================================================
// CONSTANTS
// ======================================================

const DEBOUNCE_MS = 350; // base.js:5860 (Mr.handleSearch dùng 350ms)
const EMPTY_MESSAGE = "Không tìm thấy kết quả";
const FALLBACK_THUMB = "/images/quick-picks-01.jpg";

// ======================================================
// STATE (singleton)
// ======================================================

let inputEl = null;
let dropdown = null;
let clearBtn = null;
let mobileTriggerBtn = null;
let mobileModal = null;
let mobileInput = null;
let mobileClearBtn = null;
let mobileCloseBtn = null;
let mobileResults = null;
let lastData = null;
let initialized = false;

// ======================================================
// HELPERS
// ======================================================

/**
 * Map type → path. Port từ base.js:5998-6003 (Mr.getPath).
 * @param {string} type
 * @param {string} id
 * @returns {string}
 */
function getPath(type, id) {
    const map = {
        playlist: `/playlists/details/${id}`,
        album: `/albums/details/${id}`,
        song: `/songs/details/${id}`,
        video: `/videos/details/${id}`,
    };
    return map[type] || "/";
}

/**
 * Escape HTML để chèn text an toàn.
 * @param {string} str
 */
function esc(str) {
    if (str == null) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ======================================================
// DESKTOP: renderDropdown (port từ base.js:5953-5983)
// ======================================================

/**
 * Render dropdown với suggestions + completed items.
 * @param {{ suggestions?: string[], completed?: object[] }} data
 */
function renderDropdown(data) {
    if (!dropdown) return;

    const { suggestions = [], completed = [] } = data || {};

    // Empty state
    if (!suggestions.length && !completed.length) {
        dropdown.innerHTML = `
            <p class="search-dropdown__empty">${EMPTY_MESSAGE}</p>
        `;
        dropdown.classList.remove("d-none");
        return;
    }

    // Sections
    const suggestionsHtml = suggestions.length
        ? `
            <p class="search-dropdown__section-title">Gợi ý</p>
            ${suggestions
                .map(
                    (s) => `
                <button
                    type="button"
                    class="search-dropdown__item search-dropdown__item--suggest"
                    data-action="suggest"
                    data-value="${esc(s)}">
                    <span class="search-dropdown__suggest-icon">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </span>
                    <span>${esc(s)}</span>
                </button>
            `
                )
                .join("")}
        `
        : "";

    const resultsHtml = completed.length
        ? `
            ${suggestions.length
                ? '<hr class="search-dropdown__divider" />'
                : ""}
            <p class="search-dropdown__section-title">Kết quả</p>
            ${completed
                .map((item) => {
                    const title = esc(item.title || "Không rõ tên");
                    const subtitle = esc(item.subtitle || "");
                    const thumb = esc(
                        Array.isArray(item.thumbnails)
                            ? item.thumbnails[0]
                            : item.thumb || FALLBACK_THUMB
                    );
                    const href = getPath(item.type, item.id);
                    return `
                <a
                    href="${href}"
                    data-navigo
                    data-action="navigate"
                    data-type="${esc(item.type)}"
                    data-id="${esc(item.id)}"
                    class="search-dropdown__item">
                    <img
                        src="${thumb}"
                        alt="${title}"
                        class="search-dropdown__thumb"
                        loading="lazy" />
                    <div class="search-dropdown__info">
                        <p class="search-dropdown__title">${title}</p>
                        ${subtitle
                            ? `<p class="search-dropdown__subtitle">${subtitle}</p>`
                            : ""}
                    </div>
                </a>
            `;
                })
                .join("")}
        `
        : "";

    dropdown.innerHTML = suggestionsHtml + resultsHtml;
    dropdown.classList.remove("d-none");
}

// ======================================================
// MOBILE: renderMobileResults (port từ base.js:6005-6022)
// ======================================================

/**
 * Render mobile results (chỉ completed items, không có suggestions section).
 * @param {{ completed?: object[] }} data
 */
function renderMobileResults(data) {
    if (!mobileResults) return;

    const { completed = [] } = data || {};

    if (!completed.length) {
        mobileResults.innerHTML = `
            <p class="search-dropdown__empty">${EMPTY_MESSAGE}</p>
        `;
        return;
    }

    mobileResults.innerHTML = completed
        .map((item) => {
            const title = esc(item.title || "Không rõ tên");
            const subtitle = esc(item.subtitle || "");
            const thumb = esc(
                Array.isArray(item.thumbnails)
                    ? item.thumbnails[0]
                    : item.thumb || FALLBACK_THUMB
            );
            return `
            <button
                type="button"
                class="search-dropdown__item"
                data-action="mobile-navigate"
                data-type="${esc(item.type)}"
                data-id="${esc(item.id)}">
                <img
                    src="${thumb}"
                    alt="${title}"
                    class="search-dropdown__thumb"
                    loading="lazy" />
                <div class="search-dropdown__info">
                    <p class="search-dropdown__title">${title}</p>
                    ${subtitle
                        ? `<p class="search-dropdown__subtitle">${subtitle}</p>`
                        : ""}
                </div>
            </button>
        `;
        })
        .join("");
}

// ======================================================
// ACTIONS
// ======================================================

/**
 * Navigate tới search results page. Port từ base.js:5985-5989 (navigateSearch).
 * Bọc trong requestAnimationFrame (giống base.js) để đợi input event loop
 * xử lý xong trước khi navigate.
 *
 * Edge case quan trọng: Navigo 8.x `router.navigate()` KHÔNG trigger resolve lại
 * khi path đã trùng path hiện tại (chỉ khác query). VD: đang ở `/search?keyword=A`,
 * Enter lại với keyword "B" → path vẫn là `/search` → không re-render. Fix: detect
 * trùng path → gọi `router.resolve()` manually để trigger lại searchPage().
 *
 * @param {string} q
 */
function navigateSearch(q) {
    const keyword = encodeURIComponent(q.trim());
    const targetPath = `/search?keyword=${keyword}`;
    const currentPath = window.location.pathname + window.location.search;

    requestAnimationFrame(() => {
        if (currentPath === targetPath) {
            // Đã ở đúng /search?keyword=... → force resolve lại
            // để searchPage chạy lại với keyword mới.
            router.resolve();
        } else {
            router.navigate(targetPath);
        }
    });
}

/**
 * Navigate tới detail page theo type/id. Port từ base.js:5990-5995 (navigate).
 * @param {string} type
 * @param {string} id
 */
function navigateToDetail(type, id) {
    const path = getPath(type, id);
    navigate(path);
    if (inputEl) inputEl.value = "";
    hideDropdown();
    closeMobileModal();
}

function hideDropdown() {
    if (!dropdown) return;
    dropdown.classList.add("d-none");
    dropdown.innerHTML = "";
}

function closeMobileModal() {
    if (!mobileModal) return;
    mobileModal.classList.remove("is-open");
    mobileModal.setAttribute("aria-hidden", "true");
    if (mobileResults) mobileResults.innerHTML = "";
    if (mobileInput) mobileInput.value = "";
    if (mobileClearBtn) mobileClearBtn.classList.add("d-none");
}

function openMobileModal() {
    if (!mobileModal) return;
    mobileModal.classList.add("is-open");
    mobileModal.setAttribute("aria-hidden", "false");
    if (mobileInput) {
        mobileInput.value = "";
        mobileInput.focus();
    }
    if (mobileClearBtn) mobileClearBtn.classList.add("d-none");
    if (mobileResults) mobileResults.innerHTML = "";
}

// ======================================================
// SEARCH HANDLERS
// ======================================================

/**
 * Desktop search handler. Port từ base.js:5923-5933 (Mr.handleSearch).
 * @param {Event} e
 */
async function handleSearch(e) {
    const q = e.target.value.trim();

    // Toggle clear button visibility
    if (clearBtn) {
        if (q.length > 0) clearBtn.classList.remove("d-none");
        else clearBtn.classList.add("d-none");
    }

    if (!q) {
        hideDropdown();
        lastData = null;
        return;
    }

    try {
        const data = await searchService.getSuggestions(q);
        lastData = data;
        renderDropdown(data);
    } catch (err) {
        console.warn("[search] desktop search error:", err);
        // Silent fail — chỉ log, không hiện toast (UX search dropdown nhẹ nhàng)
        hideDropdown();
    }
}

/**
 * Mobile search handler. Port từ base.js:5935-5943 (Mr.handleMobileSearch).
 * @param {Event} e
 */
async function handleMobileSearch(e) {
    const q = e.target.value.trim();

    if (mobileClearBtn) {
        if (q.length > 0) mobileClearBtn.classList.remove("d-none");
        else mobileClearBtn.classList.add("d-none");
    }

    if (!q) {
        if (mobileResults) mobileResults.innerHTML = "";
        return;
    }

    try {
        const data = await searchService.getSuggestions(q);
        renderMobileResults(data);
    } catch (err) {
        console.warn("[search] mobile search error:", err);
        if (mobileResults) {
            mobileResults.innerHTML = `<p class="search-dropdown__empty">${EMPTY_MESSAGE}</p>`;
        }
    }
}

// ======================================================
// EVENT BINDING (port từ base.js:5852-5921 Mr.init)
// ======================================================

function bindEvents() {
    if (!inputEl) return;

    // Desktop input (debounced)
    const debouncedSearch = debounce(handleSearch, DEBOUNCE_MS);
    inputEl.addEventListener("input", debouncedSearch);

    // Form submit → preventDefault (tránh browser reload khi Enter trong input)
    const form = inputEl.closest("form");
    if (form) {
        form.addEventListener("submit", (e) => e.preventDefault());
    }

    // Desktop Enter → navigate search page
    inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const q = inputEl.value.trim();
            if (q) {
                navigateSearch(q);
                hideDropdown();
                inputEl.blur();
            }
        }
    });

    // Desktop focus → re-render last data (port base.js:5872-5876)
    inputEl.addEventListener("focus", () => {
        if (inputEl.value.trim() && lastData) {
            renderDropdown(lastData);
        }
    });

    // Task 13.11: Desktop blur → hide dropdown (UX giống YouTube Music).
    // Khi user gõ xong và focus sang chỗ khác (click body, tab, click link
    // sidebar, etc.) → dropdown ẩn ngay. Dùng setTimeout(0) để delay 1 tick
    // — tránh race với click event "click outside" (line 447-454) vẫn chạy
    // đồng thời, không gây double-call.
    // Lưu ý: KHÔNG hide nếu focus chuyển sang dropdown (suggestion/result)
    // → check `e.relatedTarget` có nằm trong dropdown hay không.
    inputEl.addEventListener("blur", (e) => {
        const nextFocus = e.relatedTarget;
        if (dropdown && nextFocus && dropdown.contains(nextFocus)) {
            return; // focus đi vào dropdown → không hide
        }
        setTimeout(hideDropdown, 0);
    });

    // Desktop clear button
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            inputEl.value = "";
            lastData = null;
            hideDropdown();
            clearBtn.classList.add("d-none");
            inputEl.focus();
        });
    }

    // Desktop dropdown click (event delegation)
    if (dropdown) {
        dropdown.addEventListener("click", (e) => {
            const target = e.target.closest("[data-action]");
            if (!target) return;

            const action = target.dataset.action;

            if (action === "suggest") {
                // Click suggestion → fill input + re-search (port base.js:5897-5901)
                const value = target.dataset.value;
                if (value) {
                    inputEl.value = value;
                    // Dispatch input event để trigger debounced search
                    inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                }
            } else if (action === "navigate") {
                // Click result → navigate (port base.js:5902-5905)
                e.preventDefault();
                navigateToDetail(target.dataset.type, target.dataset.id);
            }
        });
    }

    // Click outside → hide dropdown (port base.js:5907-5910)
    document.addEventListener("click", (e) => {
        if (
            dropdown &&
            !dropdown.contains(e.target) &&
            e.target !== inputEl
        ) {
            hideDropdown();
        }
    });

    // Mobile trigger button → open modal
    if (mobileTriggerBtn) {
        mobileTriggerBtn.addEventListener("click", openMobileModal);
    }

    // Mobile close button → close modal
    if (mobileCloseBtn) {
        mobileCloseBtn.addEventListener("click", closeMobileModal);
    }

    // Mobile input (debounced)
    if (mobileInput) {
        const debouncedMobile = debounce(handleMobileSearch, DEBOUNCE_MS);
        mobileInput.addEventListener("input", debouncedMobile);

        // Mobile form submit → preventDefault
        const mobileForm = mobileInput.closest("form");
        if (mobileForm) {
            mobileForm.addEventListener("submit", (e) => e.preventDefault());
        }

        // Mobile Enter → navigate + close modal
        mobileInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const q = mobileInput.value.trim();
                if (q) {
                    navigateSearch(q);
                    closeMobileModal();
                }
            }
        });
    }

    // Mobile clear button
    if (mobileClearBtn) {
        mobileClearBtn.addEventListener("click", () => {
            if (mobileInput) {
                mobileInput.value = "";
                mobileInput.focus();
            }
            if (mobileResults) mobileResults.innerHTML = "";
            mobileClearBtn.classList.add("d-none");
        });
    }

    // Mobile results click (event delegation)
    if (mobileResults) {
        mobileResults.addEventListener("click", (e) => {
            const target = e.target.closest("[data-action='mobile-navigate']");
            if (!target) return;
            navigateToDetail(target.dataset.type, target.dataset.id);
        });
    }

    // Esc → close mobile modal
    document.addEventListener("keydown", (e) => {
        if (
            e.key === "Escape" &&
            mobileModal?.classList.contains("is-open")
        ) {
            closeMobileModal();
        }
    });
}

// ======================================================
// PUBLIC API
// ======================================================

/**
 * Khởi tạo search engine. Gọi 1 lần sau khi layout render xong
 * (cần DOM có sẵn: input, dropdown, mobile modal, ...).
 *
 * Idempotent: gọi nhiều lần chỉ init 1 lần.
 */
export function initSearch() {
    if (initialized) {
        console.info("[search] Đã init rồi, bỏ qua");
        return;
    }

    // Query DOM elements
    inputEl = document.querySelector("#navbar-search-input");
    dropdown = document.querySelector("#search-dropdown");
    clearBtn = document.querySelector("#navbar-search-clear");
    mobileTriggerBtn = document.querySelector("#open-search");
    mobileModal = document.querySelector("#mobile-search-modal");
    mobileInput = document.querySelector("#mobile-search-input");
    mobileClearBtn = document.querySelector("#mobile-search-clear");
    mobileCloseBtn = document.querySelector("#mobile-close-search");
    mobileResults = document.querySelector("#search-modal-results");

    if (!inputEl) {
        // Phase 13: Header partial có thể chưa inject xong khi initSearch()
        // chạy lần đầu (race giữa fetch partial + DOMContentLoaded).
        // Thay vì log warning + skip, đợi event `header:rendered` rồi retry.
        // Robust cho cả boot (initial) và onAuthChange (rebind sau swap).
        console.info("[search] #navbar-search-input chưa có, đợi header:rendered...");
        const onHeaderRendered = () => {
            document.removeEventListener("header:rendered", onHeaderRendered);
            // Retry sau khi DOM đã có input (microtask để innerHTML settle)
            requestAnimationFrame(() => initSearch());
        };
        document.addEventListener("header:rendered", onHeaderRendered, { once: true });

        // Safety net: nếu header partial đã có sẵn (build-time HTML, FCP),
        // `header:rendered` không bao giờ fire → thử MutationObserver.
        const headerEl = document.querySelector("#header");
        if (headerEl) {
            const observer = new MutationObserver(() => {
                if (document.querySelector("#navbar-search-input")) {
                    observer.disconnect();
                    document.removeEventListener("header:rendered", onHeaderRendered);
                    requestAnimationFrame(() => initSearch());
                }
            });
            observer.observe(headerEl, { childList: true, subtree: true });
        }
        return;
    }

    bindEvents();
    initialized = true;
    console.info("[search] Search engine ready (debounce 350ms)");

    // Phase 13.3c: Force clearBtn + mobileClearBtn về `d-none` ngay khi init
    // (defensive — tránh trường hợp HTML cache cũ không có class `d-none` →
    // CSS `.form__close:not(.d-none) { display: inline-block }` sẽ làm nút
    // close hiện ngay cả khi input rỗng).
    if (clearBtn && inputEl.value.trim() === "") {
        clearBtn.classList.add("d-none");
    }
    if (mobileClearBtn && mobileInput && mobileInput.value.trim() === "") {
        mobileClearBtn.classList.add("d-none");
    }
}

/**
 * Reset state (dùng khi swap auth state → header HTML thay đổi → cần rebind).
 * An toàn để gọi lại initSearch() sau đó.
 */
export function resetSearch() {
    initialized = false;
    lastData = null;
    inputEl = null;
    dropdown = null;
    clearBtn = null;
    mobileTriggerBtn = null;
    mobileModal = null;
    mobileInput = null;
    mobileClearBtn = null;
    mobileCloseBtn = null;
    mobileResults = null;
}

export default { initSearch, resetSearch };
