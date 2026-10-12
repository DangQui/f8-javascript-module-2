/**
 * pages/line-detail/line-detail.render.js — Line Detail page render
 *
 * Port từ `code chức năng gốc/base.js`:
 *   - `pr(e, t, n, r)` dòng 4488-4496 → render line detail
 *
 * Section "Bài hát" (songs) chuyển sang dùng `renderQuickPicksSection`
 * từ `home.render.js` để có cấu trúc 4 cols × 4 items + slider prev/next
 * GIỐNG "Nghe gần đây" trên Home.
 *
 * Flow render:
 *   1. Section "Bài hát" (songs) — 4 cols × 4 items slider
 *   2. Section "Danh sách phát nổi bật" (playlists) — slider
 *   3. Section "Video nhạc" (videos) — landscape slider
 *   4. Section "Đĩa nhạc" (albums) — slider basePath /albums/details
 *
 * Lưu ý:
 *   - Section videos dùng `renderVideoSlider()` — landscape 16:9
 *     khác với `cart-item--large` ở discover/charts/new-releases.
 *   - Code gốc `pr()` dùng Tailwind (`p-4 text-white`). Phase 17 convert
 *     sang SCSS class `.line-detail-page` theo Hard Rule #3.
 *
 * Phase 18 cleanup:
 *   - Xóa 4 helper cũ: `normalizeSongRowItem`, `renderSongRow`,
 *     `chunkArray`, `renderSongsSection` (port trực tiếp `nr()` base.js dòng 4152).
 *   - Lý do: `nr()` trong base.js CHIA songs thành 3 cols × N/3 rows
 *     (KHÔNG slider). Dùng `renderQuickPicksSection` cho đồng nhất pattern.
 *
 * Exports:
 *   - renderLineDetail(opts)      → full page HTML
 *   - renderLineDetailEmpty()     → empty state HTML
 *
 * Consumed by:
 *   - `@/pages/line-detail/line-detail.js`
 */

import { renderSliderSection } from "@/components/section.js";
import { renderVideoSlider } from "@/components/video-slider.js";
import { renderQuickPicksSection } from "@/pages/home/home.render.js";

/**
 * Render Line Detail page HTML.
 * Port 1:1 từ `pr()` base.js dòng 4488-4496, NHƯNG section "Bài hát"
 * dùng `renderQuickPicksSection` (Phase 18) thay vì port trực tiếp `nr()`.
 *
 * @param {object} options
 * @param {Array<object>} [options.songs=[]]
 * @param {Array<object>} [options.playlists=[]]
 * @param {Array<object>} [options.videos=[]]
 * @param {Array<object>} [options.albums=[]]
 * @returns {string} HTML
 */
export function renderLineDetail({ songs = [], playlists = [], videos = [], albums = [] } = {}) {
    // Phase 18: songs dùng `renderQuickPicksSection` cho slider 4 cols × 4 items
    // (giống "Nghe gần đây" trên Home). `renderQuickPicksSection` đã tự
    // skip empty array → return "" → an toàn nếu songs rỗng.
    const songsHtml = renderQuickPicksSection("Bài hát", songs, "/songs/details");
    const playlistsHtml = renderSliderSection({
        title: "Danh sách phát nổi bật",
        items: playlists,
        listClass: "album__list home-album__list",
        basePath: "/playlists/details",
    });
    const videosHtml = renderVideoSlider({ title: "Video nhạc", videos });
    const albumsHtml = renderSliderSection({
        title: "Đĩa nhạc",
        items: albums,
        listClass: "album__list home-album__list",
        basePath: "/albums/details",
    });

    return `
        <div class="line-detail-page">
            ${songsHtml}
            ${playlistsHtml}
            ${videosHtml}
            ${albumsHtml}
        </div>
    `;
}

/**
 * Empty state khi line không có data nào ở cả 4 endpoints.
 * @returns {string} HTML
 */
export function renderLineDetailEmpty() {
    return `
        <div class="line-detail-page">
            <p class="line-detail-page__empty">Dòng nhạc này chưa có dữ liệu.</p>
        </div>
    `;
}

export default renderLineDetail;
