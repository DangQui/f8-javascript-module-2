// ======================================================
// HOME PAGE — Render functions (Phase 7)
// ======================================================
//
// Tách riêng markup khỏi logic ở `home.js` để dễ đọc + test.
//
// Sections của Home page (theo templates/index-logined-backup.html):
//   1. Greeting (nếu logged-in)
//   2. Mood chips (Năng lượng, Thư giãn, ...)
//   3. Quick Picks (slider ngang, items xếp cột 4 item/cột)
//   4. Album gợi ý cho bạn (slider ngang, cart-item)
//   5. Today's Hits (slider ngang, cart-item)
//   6. Nhạc Việt (slider ngang, cart-item)
//
// Mỗi section có:
//   - `<div class="home__row">` chứa heading + control buttons (crt__prev/crt__next)
//   - `<div class="...-list" data-slider>` chứa items
//
// Slider lib (libs/slider.js) auto-detect `data-slider` + tìm `.crt__prev/next`
// trong section chứa list (xem `closest('.home__container') || parentElement`).
//

import { escapeHtml, formatViews } from "@/utils/format.js";
import { DEFAULT_COUNTRY } from "@/utils/constants.js";
import {
    renderCard,
    renderCards,
    normalizeCardItem,
} from "@/components/card-item.js";
import { renderMoodChips as renderMoodChipsComponent } from "@/components/mood-chip.js";
import {
    renderSection as renderSectionComponent,
    renderSliderSection as renderSliderSectionComponent,
} from "@/components/section.js";
import { renderQuickPickItem } from "@/components/quick-picks-item.js";

// ======================================================
// GREETING — chỉ hiện khi logged-in
// ======================================================

/**
 * Render greeting section.
 * @param {object|null} user - User object từ authState.getUser()
 * @returns {string} HTML
 */
export function renderGreeting(user) {
    if (!user) return "";

    const name = escapeHtml(user.name || user.email || "bạn");
    return `
        <h2 class="greeting-user">
            👋 Chào mừng
            <span data-user-name>${name}</span>
        </h2>
    `;
}

// ======================================================
// MOOD CHIPS — click → navigate /moods/:slug
// ======================================================

/**
 * Render mood chips (Năng lượng, Thư giãn, ...).
 * Dùng `mood-chip` component cho mỗi chip bên trong.
 * Dùng `section` component cho layout container.
 * @param {Array<{_id:string, slug:string, name:string}>} moods
 * @returns {string} HTML
 */
export function renderMoodChips(moods) {
    if (!Array.isArray(moods) || moods.length === 0) return "";

    return renderSectionComponent({
        bodyHtml: renderMoodChipsComponent(moods),
        listClass: "home__cate",
        // Modifier: bỏ margin-top 80px (default container) + 40px (first-child)
        // → mood chips áp sát header "Music". File `_section-modifier.scss`.
        modifierClass: "home__container--flush-top",
        showControls: true,
        slider: true,
    });
}

// ======================================================
// QUICK PICKS — slider ngang, items xếp cột 4 item/cột
// ======================================================

/**
 * Render quick picks section.
 *
 * Cấu trúc markup (port từ base.js `q()` function — slider ngang):
 *   <div class="quick-picks__list hscroll" data-slider>
 *     <div class="hscroll-inner flex gap-6">
 *       <div class="col" data-slider-item>           ← 1 slide = 1 column
 *         <div class="quick-picks-col">              ← wrapper items
 *           <a class="quick-picks">item 1</a>
 *           <a class="quick-picks">item 2</a>
 *           <a class="quick-picks">item 3</a>
 *           <a class="quick-picks">item 4</a>
 *         </div>
 *       </div>
 *       ... 4 columns × 4 items = 16 items max
 *     </div>
 *   </div>
 *
 * Lưu ý: KHÔNG dùng grid system (.row.row-cols-3) vì gutter padding gây
 * thừa width khi slider ngang. Dùng flex gap đơn giản, mỗi column
 * là 1 slide.
 *
 * Phase 18.5: refactor để dùng `renderSection` → nhận prev/next + body
 * qua option. Trước đây hard-code markup.
 *
 * @param {string} title - Tiêu đề section (VD "Nghe gần đây", "Quick Picks")
 * @param {Array} items
 * @param {string} [basePath="/songs/details"] - Prefix cho href items
 * @returns {string} HTML
 */
export function renderQuickPicksSection(title, items, basePath = "/songs/details") {
    if (!Array.isArray(items) || items.length === 0) return "";

    // Chia items thành chunks 4 (1 column = 4 items dọc)
    const COL_SIZE = 4;
    const cols = [];
    for (let i = 0; i < items.length; i += COL_SIZE) {
        cols.push(items.slice(i, i + COL_SIZE));
    }

    const columnsHtml = cols
        .map(
            (col) => `
        <div class="col quick-picks-col" data-slider-item>
            ${col.map((item) => renderQuickPickItem(item, basePath)).join("")}
        </div>
    `
        )
        .join("");

    return renderSectionComponent({
        title,
        bodyHtml: `<div class="hscroll-inner">${columnsHtml}</div>`,
        listClass: "quick-picks__list hscroll",
        showControls: true,
        slider: true,
    });
}

// ======================================================
// ALBUM/PLAYLIST CARD — slider ngang đơn giản
// ======================================================

/**
 * Render nhiều cart-item từ raw API items.
 * Wrapper quanh `renderCards()` component để normalize data.
 *
 * @param {Array<object>} items - Raw items từ API
 * @param {string} basePath - VD "/albums/details"
 * @returns {string} HTML
 */
function renderCartItemList(items, basePath) {
    if (!Array.isArray(items)) return "";
    const normalized = items.map((it) => normalizeCardItem(it, basePath));
    return renderCards(normalized);
}

/**
 * Render 1 section slider (heading + control + list).
 * Dùng `section` component.
 * @param {string} title
 * @param {Array} items
 * @param {string} basePath - VD "/albums/details"
 * @returns {string}
 */
export function renderSliderSection(title, items, basePath) {
    return renderSliderSectionComponent({
        title,
        items,
        basePath,
        listClass: "album__list home-album__list",
    });
}

// ======================================================
// FULL HOME — Compose all sections
// ======================================================

/**
 * Render toàn bộ Home page.
 *
 * Sections (theo base.js `rr()`):
 *   - Greeting            ← user (logged-in only)
 *   - Mood chips          ← moods
 *   - Nghe gần đây        ← ngheGanDay (playlistsByCountry VN, 4 cols × 4 items)
 *   - Quick Picks         ← quickPicks (slider ngang, 1 col × 4 items)
 *   - Album gợi ý cho bạn ← albumsForYou
 *   - Today's Hits        ← todaysHits
 *   - Nhạc Việt           ← playlistsByCountry
 *
 * @param {{
 *   user: object|null,
 *   moods: Array,
 *   ngheGanDay: Array,
 *   quickPicks: Array,
 *   albumsForYou: Array,
 *   todaysHits: Array,
 *   playlistsByCountry: Array,
 * }} data
 * @returns {string} HTML
 */
export function renderHome(data) {
    const {
        user = null,
        moods = [],
        ngheGanDay = [],
        quickPicks = [],
        albumsForYou = [],
        todaysHits = [],
        playlistsByCountry = [],
    } = data || {};

    return `
        ${renderGreeting(user)}
        ${renderMoodChips(moods)}
        ${renderQuickPicksSection("Nghe gần đây", ngheGanDay, "/songs/details")}
        ${renderQuickPicksSection("Quick Picks", quickPicks, "/songs/details")}
        ${renderSliderSection("Album gợi ý cho bạn", albumsForYou, "/albums/details")}
        ${renderSliderSection("Today's Hits", todaysHits, "/playlists/details")}
        ${renderSliderSection("Nhạc Việt", playlistsByCountry, "/playlists/details")}
    `;
}

// ======================================================
// HELPERS — page title cho country section
// ======================================================

/**
 * Lấy tên country từ code (VD VN → "Nhạc Việt").
 * Phase 7 giữ đơn giản, Phase 8+ có thể lấy từ COUNTRY_CODES constant.
 * @param {string} code
 * @returns {string}
 */
export function getCountrySectionTitle(code) {
    const map = {
        VN: "Nhạc Việt",
        US: "US Hits",
        KR: "K-Pop",
        JP: "J-Pop",
        GB: "UK Charts",
        GLOBAL: "Global Top",
    };
    return map[code] || `Top ${code}`;
}

// Re-export default country cho caller dễ sử dụng
export { DEFAULT_COUNTRY };
