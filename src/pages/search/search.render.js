/**
 * pages/search/search.render.js — Search results page render
 *
 * HARD RULE #0: Port logic + thuật toán 1:1 từ code gốc `base.js`.
 *
 * Reference từ base.js:
 *   - Hàm `Dr` (dòng 5668-5696): render search results page
 *   - Filter completed by type (song/album/playlist/video)
 *   - Render sections dùng helpers: nr/Y/J/q
 *   - Empty states: "Không thể tải kết quả..." / "Không tìm thấy kết quả phù hợp."
 *
 * Port 1:1 với helpers có sẵn trong project (áp dụng pattern y hệt Home page):
 *   - Songs    → `renderQuickPicksSection` (pages/home/home.render.js)
 *   - Albums   → `renderSliderSection` (components/section.js)
 *   - Playlists → giống Albums (dùng `renderSliderSection` cùng pattern)
 *   - Videos   → `renderSliderSection` với custom `renderItem`
 *                 (giữ duration overlay)
 *
 * State machine (4 states):
 *   1. !keyword (no query)    → "Hãy nhập từ khóa..." placeholder
 *   2. !data (fetch error)    → "Không thể tải kết quả tìm kiếm..."
 *   3. data + no results      → "Không tìm thấy kết quả phù hợp."
 *   4. data + sections        → render 4 sections (Bài hát / Albums / Playlists / Videos)
 *
 * Exports:
 *   - renderSearchPage({ keyword, data, error }) → full page HTML
 *
 * Consumed by:
 *   - `@/pages/search/search.js`
 */

import { escapeHtml } from "@/utils/format.js";
import { renderQuickPicksSection } from "@/pages/home/home.render.js";
import { renderSliderSection } from "@/components/section.js";
import { renderVideoItem } from "@/pages/discover/discover.render.js";

/**
 * Render section Videos trong Search page — copy y hệt pattern Discover.
 *
 * Pattern từ `src/pages/discover/discover.render.js`:
 *   - `listClass: "album__list home-album__list"`
 *   - `modifierClass: "home-album"`
 *   - Item: `renderVideoItem` (cart-item--large — landscape thumb)
 */
function renderVideosSearchSection(title, videos) {
    if (!Array.isArray(videos) || videos.length === 0) return "";

    return renderSliderSection({
        title,
        items: videos,
        basePath: "/videos/details",
        listClass: "album__list home-album__list",
        modifierClass: "home-album",
        renderItem: (video) => renderVideoItem(video, "/videos/details"),
    });
}

/**
 * Render toàn bộ search results page.
 *
 * @param {object} options
 * @param {string} [options.keyword=""] - Từ khóa user search
 * @param {object|null} [options.data=null] - Response từ searchService.getResults()
 * @param {string|null} [options.error=null] - Error message nếu fetch fail
 * @returns {string} HTML
 */
export function renderSearchPage({ keyword = "", data = null, error = null } = {}) {
    // === STATE 1: no keyword ===
    if (!keyword.trim()) {
        return `
            <div class="search-results">
                <div class="search-results__placeholder">
                    <div class="search-results__placeholder-icon">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <h2 class="search-results__placeholder-title">Hãy nhập từ khóa để tìm kiếm</h2>
                    <p class="search-results__placeholder-desc">
                        Tìm bài hát, album, playlist, video hoặc nghệ sĩ bạn yêu thích.
                    </p>
                </div>
            </div>
        `;
    }

    // === STATE 2: fetch error ===
    if (error || !data) {
        return `
            <div class="search-results">
                <div class="search-results__placeholder">
                    <div class="search-results__placeholder-icon">
                        <i class="fa-solid fa-circle-exclamation"></i>
                    </div>
                    <h2 class="search-results__placeholder-title">Không thể tải kết quả</h2>
                    <p class="search-results__placeholder-desc">
                        Không thể tải kết quả tìm kiếm cho: <b>${escapeHtml(keyword)}</b>
                        ${error ? `<br><small>${escapeHtml(error)}</small>` : ""}
                    </p>
                </div>
            </div>
        `;
    }

    // === STATE 3 & 4: có data, filter theo type ===
    const { completed = [] } = data;

    const songs = completed.filter((c) => c.type === "song");
    const albums = completed.filter((c) => c.type === "album");
    const playlists = completed.filter((c) => c.type === "playlist");
    const videos = completed.filter((c) => c.type === "video");

    // Empty state: tất cả đều rỗng
    if (!songs.length && !albums.length && !playlists.length && !videos.length) {
        return `
            <div class="search-results">
                <h1 class="search-results__title">
                    Kết quả cho <b>"${escapeHtml(keyword)}"</b>
                </h1>
                <div class="search-results__placeholder">
                    <div class="search-results__placeholder-icon">
                        <i class="fa-solid fa-magnifying-glass"></i>
                    </div>
                    <p class="search-results__placeholder-desc">
                        Không tìm thấy kết quả phù hợp.
                    </p>
                </div>
            </div>
        `;
    }

    // === STATE 4: render sections theo đúng pattern Home page ===

    // Songs → quick-picks (slider ngang, 4 items/cột)
    const songsSection = songs.length
        ? renderQuickPicksSection("Bài hát", songs, "/songs/details")
        : "";

    // Albums → slider cards (album__list home-album__list)
    const albumsSection = renderSliderSection({
        title: "Albums",
        items: albums,
        basePath: "/albums/details",
        listClass: "album__list home-album__list",
    });

    // Playlists → slider cards (cùng pattern albums)
    const playlistsSection = renderSliderSection({
        title: "Playlists",
        items: playlists,
        basePath: "/playlists/details",
        listClass: "album__list home-album__list",
    });

    // Videos → dùng pattern y hệt Discover page
    const videosSection = renderVideosSearchSection("Videos", videos);

    return `
        <div class="search-results">
            <h1 class="search-results__title">
                Kết quả cho <b>"${escapeHtml(keyword)}"</b>
            </h1>
            ${songsSection}
            ${albumsSection}
            ${playlistsSection}
            ${videosSection}
        </div>
    `;
}

export default renderSearchPage;
