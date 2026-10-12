import { escapeHtml, formatViews } from "@/utils/format.js";

/**
 * Render 1 quick pick item.
 *
 * @param {{type:string, id?:string, slug?:string, _id?:string, videoId?:string,
 *          title?:string, name?:string, thumbnails?:string[], thumb?:string,
 *          artists?:Array, popularity?:number}} item
 * @param {string} [basePath="/songs/details"] - Prefix cho href items
 * @returns {string} HTML
 */
export function renderQuickPickItem(item, basePath = "/songs/details") {
    const type = item.type || "song";
    let href = `${basePath}/${item.id || item.slug}`;

    if (type === "album" && basePath === "/songs/details") {
        href = `/albums/details/${item.slug || item.id}`;
    } else if (type === "playlist" && basePath === "/songs/details") {
        href = `/playlists/details/${item.slug || item.id}`;
    } else if (type === "video") {
        href = `/videos/details/${item.slug || item._id || item.id || item.videoId || ""}`;
    }

    const thumb =
        Array.isArray(item.thumbnails) && item.thumbnails.length
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
                    ${
                        artists && popularity
                            ? `<span class="quick-picks__separator"> • </span>`
                            : ""
                    }
                    ${popularity ? `<span>${popularity}</span>` : ""}
                </div>
            </section>
        </a>
    `;
}

export default renderQuickPickItem;
