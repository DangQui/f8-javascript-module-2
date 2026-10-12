// ======================================================
// CARD ITEM COMPONENT — Album / Playlist card
// ======================================================
//

// Component này wrap lại `renderCartItem()` cũ trong `home.render.js`
// để có thể dùng lại ở Discover, Library, Album Detail, ...
//
// Style dùng class `.cart-item` có sẵn trong SCSS
// (`src/styles/components/_cart-item.scss`).
// Không thêm SCSS mới — chỉ wrap markup.
//
// API:
//   renderCard({ title, subtitle, thumb, href, type, size })
//     - title:   string  (required) — Tên album/playlist
//     - subtitle: string (optional) — VD: "Various Artists • Album"
//     - thumb:   string  (required) — URL ảnh
//     - href:    string  (required) — URL navigate (VD "/albums/details/slug")
//     - type:    string  (optional) — "album" | "playlist" | "song" (cho data)
//     - size:    string  (optional) — "default" | "large" (default = 220px,
//                  large = 400px dùng cho featured card)
//
// Returns: HTML string
//
// USAGE:
//   import { renderCard } from "@/components/card-item.js";
//   const cardHtml = renderCard({
//       title: "Nhạc Lofi Mới",
//       subtitle: "Various Artists • Album",
//       thumb: "https://...",
//       href: "/albums/details/lofi-moi",
//   });
//

import { escapeHtml } from "@/utils/format.js";

/**
 * Render 1 card (album/playlist/song).
 *
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   thumb: string,
 *   href: string,
 *   type?: "album"|"playlist"|"song",
 *   size?: "default"|"large",
 * }} item
 * @returns {string} HTML string
 */
export function renderCard(item) {
    if (!item || !item.title || !item.href) return "";

    const {
        title,
        subtitle = "",
        thumb = "",
        href,
        type = "",
        size = "default",
    } = item;

    const sizeClass = size === "large" ? "cart-item--large" : "";
    const mediaSizeClass = size === "large" ? "cart-item__media--large" : "";
    const dataType = type ? ` data-card-type="${escapeHtml(type)}"` : "";

    return `
        <a
            href="${escapeHtml(href)}"
            data-navigo${dataType}
            class="cart-item ${sizeClass}"
            data-slider-item>
            <div class="cart-item__media ${mediaSizeClass}">
                <img
                    src="${escapeHtml(thumb)}"
                    alt="${escapeHtml(title)}"
                    loading="lazy"
                    class="cart-item__img" />
                <div class="cart-item__overlay"></div>
                <div class="cart-item__icon">
                    <i class="fa-solid fa-play"></i>
                </div>
            </div>
            <div class="cart-item__content">
                <h3 class="cart-item__title">${escapeHtml(title)}</h3>
                ${subtitle
                    ? `<span class="cart-item__brand">${escapeHtml(subtitle)}</span>`
                    : ""}
            </div>
        </a>
    `;
}

/**
 * Normalize thumb từ nhiều format khác nhau:
 *   - Array `thumbnails[0]`
 *   - String `thumb`
 *   - Fallback "" nếu không có
 *
 * @param {string|string[]|undefined} thumbs
 * @returns {string}
 */
export function normalizeThumb(thumbs) {
    if (Array.isArray(thumbs)) return thumbs[0] || "";
    if (typeof thumbs === "string") return thumbs;
    return "";
}

/**
 * Normalize 1 item (album/playlist) từ API thành format cho renderCard.
 *
 * @param {object} item - Raw item từ API
 * @returns {{
 *   title: string,
 *   subtitle: string,
 *   thumb: string,
 *   href: string,
 *   type: string
 * }}
 */
export function normalizeCardItem(item, basePath) {
    const title = item.title || item.name || "Untitled";

    const artists = Array.isArray(item.artists)
        ? item.artists
              .map((a) => (typeof a === "string" ? a : a?.name || ""))
              .filter(Boolean)
              .join(", ")
        : "";

    const subtitle = [item.albumType, artists].filter(Boolean).join(" • ");

    return {
        title,
        subtitle,
        thumb: normalizeThumb(item.thumbnails || item.thumb),
        href: `${basePath}/${item.slug || item.id}`,
        type: item.type || "",
    };
}

/**
 * Render nhiều card cùng lúc.
 *
 * @param {Array<object>} items - Mảng các item đầu vào của renderCard
 * @returns {string} HTML string nhiều card nối tiếp nhau (hoặc "" nếu rỗng)
 */
export function renderCards(items) {
    if (!Array.isArray(items) || items.length === 0) return "";
    return items.map((it) => renderCard(it)).join("");
}

export default renderCard;