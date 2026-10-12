/**
 * components/quick-picks-item.js — Quick-pick item (shared)
 *
 * Render 1 quick-pick item (bài/playlist/album/video). Share giữa:
 *   - Home page: "Nghe gần đây" + "Quick Picks"
 *   - Mood detail page: "Quick Picks"
 *   - Line detail page: "Bài hát"
 *
 * Phase 18.5: tách ra component riêng để mood-detail reuse mà không
 * duplicate logic xử lý type → href.
 *
 * Markup class `.quick-picks` + `.quick-picks__*` có sẵn ở
 * `_quick-picks-item.scss` + override ở `_home.scss` (slider ngang).
 * KHÔNG đổi markup — giữ 1:1 với code gốc.
 *
 * Exports:
 *   - renderQuickPickItem(item, basePath?)  → 1 item HTML
 *
 * Consumed by:
 *   - `@/pages/home/home.render.js` ("Nghe gần đây" + "Quick Picks")
 *   - `@/pages/mood-detail/mood-detail.render.js`
 *   - `@/pages/line-detail/line-detail.render.js`
 *
 * Type → href mapping (port từ base.js:4156-4157):
 *   - "song"     → /songs/details/{id|slug}
 *   - "album"    → /albums/details/{slug|id}
 *   - "playlist" → /playlists/details/{slug|id}
 *   - "video"    → /videos/details/{slug|_id|id|videoId}
 *
 * Phase 14.12 fix: video items từ `/charts/videos` chỉ có `videoId`+`_id`
 * (không có `slug`/`id`) → fallback chain đầy đủ.
 */

import { escapeHtml, formatViews } from "@/utils/format.js";

/**
 * Render 1 quick pick item.
 * @param {{type: string, id?: string, slug?: string, _id?: string, videoId?: string,
 *          title?: string, name?: string, thumbnails?: string[], thumb?: string,
 *          artists?: Array, popularity?: number}} item
 * @param {string} [basePath="/songs/details"] - Prefix cho href items
 * @returns {string} HTML
 */
export function renderQuickPickItem(item, basePath = "/songs/details") {
    const type = item.type || "song";
    let href = `${basePath}/${item.id || item.slug}`;

    // Cập nhật: thêm nhánh `video` vì Phase 14.9 lưu cả video vào listen history.
    // Nếu không, click video items ở "Nghe gần đây" sẽ redirect về /songs/details/{id}
    // → 404 "không tìm thấy dữ liệu".
    if (type === "album" && basePath === "/songs/details") {
        href = `/albums/details/${item.slug || item.id}`;
    } else if (type === "playlist" && basePath === "/songs/details") {
        href = `/playlists/details/${item.slug || item.id}`;
    } else if (type === "video") {
        // Phase 14.12 fix: thêm `_id` fallback vì `/charts/videos` items
        // chỉ có `videoId` + `_id` (không có `slug`/`id`).
        href = `/videos/details/${item.slug || item._id || item.id || item.videoId || ""}`;
    }

    const thumb = Array.isArray(item.thumbnails) && item.thumbnails.length
        ? item.thumbnails[0]
        : item.thumb || "";

    const title = escapeHtml(item.title || item.name || "Untitled");
    const artists = Array.isArray(item.artists)
        ? item.artists
              .map((a) => (typeof a === "string" ? a : a?.name || ""))
              .filter(Boolean)
              .join(", ")
        : "";
    const popularity = item.popularity
        ? `${formatViews(item.popularity)} lượt nghe`
        : "";

    return `
        <a
            href="${href}"
            data-navigo
            class="quick-picks btn btn--rounded-lg">
            <img
                src="${escapeHtml(thumb)}"
                alt=""
                loading="lazy"
                class="quick-picks__media" />
            <section class="quick-picks__content">
                <h3 class="quick-picks__name">${title}</h3>
                <div class="quick-picks__meta">
                    ${artists ? `<span>${escapeHtml(artists)}</span>` : ""}
                    ${artists && popularity
                        ? `<span class="quick-picks__separator"> • </span>`
                        : ""}
                    ${popularity ? `<span>${popularity}</span>` : ""}
                </div>
            </section>
        </a>
    `;
}

export default renderQuickPickItem;
