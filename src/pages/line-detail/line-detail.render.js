import { escapeHtml } from "@/utils/format.js";
import { renderSliderSection } from "@/components/section.js";
import { renderVideoSlider } from "@/components/video-slider.js";
import { renderQuickPicksSection } from "@/pages/home/home.render.js";

// ======================================================
// MAIN RENDER
// ======================================================

/**
 * Render Line Detail page HTML.
 *
 *
 * @param {object} options
 * @param {Array<object>} [options.songs=[]] - songs
 * @param {Array<object>} [options.playlists=[]] - playlists
 * @param {Array<object>} [options.videos=[]] - videos
 * @param {Array<object>} [options.albums=[]] - albums
 * @returns {string} HTML
 */
export function renderLineDetail({
    songs = [],
    playlists = [],
    videos = [],
    albums = [],
} = {}) {
    // Port base.js pr() dòng 4488-4496 — 4 sections
    // (giống "Nghe gần đây" trên Home). `renderQuickPicksSection` đã tự
    // skip empty array → return "" → an toàn nếu songs rỗng.
    const songsHtml = renderQuickPicksSection(
        "Bài hát",
        songs,
        "/songs/details",
    );
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
