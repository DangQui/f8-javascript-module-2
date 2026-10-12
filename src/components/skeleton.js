/**
 * components/skeleton.js — Loading placeholders (Phase 11.2)
 *
 * Pulse animation placeholders khi page đang fetch data, thay vì để
 * trống hoặc chỉ spinner toàn trang.
 *
 * Mỗi page có skeleton riêng match đúng layout thật → UX chính xác
 * (user thấy structure ngay khi load).
 *
 * Pattern gốc base.js KHÔNG có skeleton (chỉ full overlay). Em design
 * riêng theo modern skeleton pattern (Facebook, YouTube Music).
 *
 * Pulse animation: linear-gradient background + skeleton-pulse keyframe
 * (1.4s ease-in-out infinite). CSS định nghĩa ở `_skeleton.scss`.
 *
 * Exports:
 *   Helpers:
 *   - skeletonBox(w, h, radius?)         → 1 box skeleton
 *   - skeletonLine(w, h?)                → 1 text line skeleton
 *   - skeletonCircle(size)               → 1 circle (avatar)
 *
 *   Per-page skeleton:
 *   - SKELETON_HOME()                    → 5 sections (greeting + 3 sliders)
 *   - SKELETON_DISCOVER()                → 3 sections
 *   - SKELETON_ALBUM_DETAIL()            → 2 cols (info + track-list)
 *   - SKELETON_PLAYLIST_DETAIL()         → giống album
 *   - SKELETON_SONG_DETAIL()             → giống album
 *   - SKELETON_VIDEO_DETAIL()            → 2 cols (info + video list)
 *   - SKELETON_PROFILE()                 → header card + form
 *   - SKELETON_CHANGE_PASSWORD()         → form 3 field
 *   - SKELETON_SEARCH()                  → 4 sections
 *   - SKELETON_AUTH()                    → form login/register
 *
 *   Sub-skeletons:
 *   - SKELETON_GREETING()                → 1 line "Chào {user}"
 *   - SKELETON_SECTION(slider, count)    → 1 section slider
 *   - SKELETON_QUICK_PICKS()             → 4 cols × 4 items
 *   - SKELETON_DISCOVER_NAV()            → 3 nav cards
 *   - SKELETON_INFO_DETAIL()             → info-detail column
 *   - SKELETON_TRACK_LIST(count)         → track-list column
 *   - SKELETON_VIDEO_LIST(count)         → video-list column
 *
 * Consumed by:
 *   - Mỗi page handler gọi trước khi fetch data, replace bằng data thật khi xong.
 */

/**
 * Render 1 box skeleton (pulse animation).
 * @param {string} w - width (vd "100%", "220px")
 * @param {string} h - height (vd "20px", "1rem")
 * @param {string} [radius="4px"] - border-radius
 * @returns {string} HTML
 */
export function skeletonBox(w, h, radius = "4px") {
    return `<div class="skeleton skeleton--box" style="width:${w};height:${h};border-radius:${radius}"></div>`;
}

/**
 * Render 1 line skeleton (text placeholder). Mặc định height 16px (text thường).
 * @param {string} w - width
 * @param {string} [h="16px"] - height
 * @returns {string} HTML
 */
export function skeletonLine(w, h = "16px") {
    return `<div class="skeleton skeleton--line" style="width:${w};height:${h}"></div>`;
}

/**
 * Render 1 circle skeleton (avatar placeholder).
 * @param {string} size - diameter (vd "40px", "5rem")
 * @returns {string} HTML
 */
export function skeletonCircle(size) {
    return `<div class="skeleton skeleton--circle" style="width:${size};height:${size}"></div>`;
}

/** Skeleton cho Home page. Match layout: greeting → 3 slider sections. */
export function SKELETON_HOME() {
    return `
        ${SKELETON_GREETING()}
        ${SKELETON_SECTION(true, 16)}
        ${SKELETON_SECTION(true, 6)}
        ${SKELETON_SECTION(true, 6)}
    `;
}

/** Skeleton cho greeting (chỉ hiện khi logged-in). */
export function SKELETON_GREETING() {
    return `
        <section class="home__container">
            <div class="home__row">
                ${skeletonLine("240px")}
            </div>
        </section>
    `;
}

/**
 * Skeleton cho 1 section slider (heading + items).
 * @param {boolean} slider - Có slider controls không
 * @param {number} itemCount - Số items
 * @returns {string} HTML
 */
export function SKELETON_SECTION(slider = true, itemCount = 6) {
    const items = Array.from({ length: itemCount }, () => `
        <div class="cart-item skeleton-card">
            <div class="cart-item__media">
                ${skeletonBox("100%", "100%", "12px")}
            </div>
            <div class="cart-item__content">
                ${skeletonLine("85%")}
                ${skeletonLine("60%")}
            </div>
        </div>
    `).join("");

    return `
        <section class="home__container">
            <div class="home__row">
                ${skeletonLine("220px", "32px")}
                ${slider ? skeletonBox("70px", "32px", "999px") : ""}
            </div>
            <div class="album__list home-album__list skeleton-row">
                ${items}
            </div>
        </section>
    `;
}

/** Skeleton cho Quick Picks (4 cols × 4 items). */
export function SKELETON_QUICK_PICKS() {
    const cols = Array.from({ length: 4 }, () => `
        <div class="col quick-picks-col skeleton-col">
            ${Array.from({ length: 4 }, () => `
                <div class="quick-picks skeleton-quickpick">
                    ${skeletonBox("64px", "64px", "8px")}
                    <div class="quick-picks__content">
                        ${skeletonLine("90%")}
                        ${skeletonLine("60%")}
                    </div>
                </div>
            `).join("")}
        </div>
    `).join("");

    return `
        <section class="home__container">
            <div class="home__row">
                ${skeletonLine("220px", "32px")}
                ${skeletonBox("70px", "32px", "999px")}
            </div>
            <div class="quick-picks__list hscroll" data-slider>
                <div class="hscroll-inner">
                    ${cols}
                </div>
            </div>
        </section>
    `;
}

/** Skeleton cho Discover page. */
export function SKELETON_DISCOVER() {
    return `
        ${SKELETON_DISCOVER_NAV()}
        ${SKELETON_SECTION(true, 6)}
        ${SKELETON_SECTION(true, 8)}
        ${SKELETON_SECTION(true, 6)}
    `;
}

/** Skeleton cho Discover navigation (3 cards). */
export function SKELETON_DISCOVER_NAV() {
    return `
        <div class="discover__navigation">
            <div class="row row-cols-3 gx-2">
                ${Array.from({ length: 3 }, () => `
                    <div class="col">
                        <div class="btn discover-item">
                            ${skeletonBox("40px", "40px", "50%")}
                            ${skeletonLine("80%")}
                        </div>
                    </div>
                `).join("")}
            </div>
        </div>
    `;
}

/** Skeleton cho Album Detail page (info col + track-list col). */
export function SKELETON_ALBUM_DETAIL() {
    return `
        <div class="row row-cols-2 gx-4">
            <div class="col">
                ${SKELETON_INFO_DETAIL()}
            </div>
            <div class="col">
                ${SKELETON_TRACK_LIST(10)}
            </div>
        </div>
    `;
}

/** Skeleton cho Playlist Detail (giống Album). */
export function SKELETON_PLAYLIST_DETAIL() {
    return SKELETON_ALBUM_DETAIL();
}

/** Skeleton cho info-detail column (img + title + meta rows). */
export function SKELETON_INFO_DETAIL() {
    return `
        <div class="info-detail">
            ${skeletonBox("100%", "400px", "12px")}
            ${skeletonLine("90%", "36px")}
            <div class="info-detail__meta">
                ${skeletonLine("60%")}
                ${skeletonLine("70%")}
                ${skeletonLine("50%")}
            </div>
        </div>
    `;
}

/**
 * Skeleton cho track-list column.
 * @param {number} count - Số track items
 * @returns {string} HTML
 */
export function SKELETON_TRACK_LIST(count = 10) {
    const items = Array.from({ length: count }, () => `
        <div class="track-list__item skeleton-track">
            ${skeletonBox("24px", "24px", "50%")}
            ${skeletonBox("48px", "48px", "4px")}
            <div class="track-list__info">
                ${skeletonLine("70%")}
                ${skeletonLine("50%")}
            </div>
            ${skeletonBox("40px", "16px", "4px")}
        </div>
    `).join("");

    return `<div class="track-list">${items}</div>`;
}

/** Skeleton cho Song Detail (structure giống album). */
export function SKELETON_SONG_DETAIL() {
    return SKELETON_ALBUM_DETAIL();
}

/** Skeleton cho Video Detail (info col + video list col). */
export function SKELETON_VIDEO_DETAIL() {
    return `
        <div class="row row-cols-2 gx-4">
            <div class="col">
                ${SKELETON_INFO_DETAIL()}
            </div>
            <div class="col">
                ${SKELETON_VIDEO_LIST(10)}
            </div>
        </div>
    `;
}

/**
 * Skeleton cho video-list column.
 * @param {number} count
 * @returns {string} HTML
 */
export function SKELETON_VIDEO_LIST(count = 10) {
    const items = Array.from({ length: count }, () => `
        <div class="video-list__item skeleton-track">
            ${skeletonBox("120px", "68px", "8px")}
            <div class="video-list__info">
                ${skeletonLine("85%")}
                ${skeletonLine("60%")}
            </div>
        </div>
    `).join("");

    return `<div class="video-list">${items}</div>`;
}

/** Skeleton cho Auth page (login hoặc register — structure chung). */
export function SKELETON_AUTH() {
    return `
        <div class="auth__inner">
            ${skeletonLine("200px", "32px")}
            <form class="form">
                <div class="form__group">
                    ${skeletonBox("100%", "44px", "8px")}
                </div>
                <div class="form__group">
                    ${skeletonBox("100%", "44px", "8px")}
                </div>
                <div class="form__group">
                    ${skeletonBox("100%", "44px", "8px")}
                </div>
                ${skeletonBox("100%", "44px", "8px")}
            </form>
        </div>
    `;
}

/** Skeleton cho Profile page. */
export function SKELETON_PROFILE() {
    return `
        <div class="auth__inner auth__inner--profile">
            <div class="profile-header">
                ${skeletonCircle("80px")}
                ${skeletonLine("200px", "24px")}
                ${skeletonLine("240px", "16px")}
                ${skeletonLine("180px", "14px")}
            </div>
            <form class="form">
                <div class="form__group">
                    ${skeletonBox("100%", "44px", "8px")}
                </div>
                <div class="form__group">
                    ${skeletonBox("100%", "44px", "8px")}
                </div>
                ${skeletonBox("100%", "44px", "8px")}
            </form>
        </div>
    `;
}

/** Skeleton cho Change Password page. */
export function SKELETON_CHANGE_PASSWORD() {
    return `
        <div class="auth__inner">
            ${skeletonLine("200px", "32px")}
            <form class="form">
                <div class="form__group">${skeletonBox("100%", "44px", "8px")}</div>
                <div class="form__group">${skeletonBox("100%", "44px", "8px")}</div>
                <div class="form__group">${skeletonBox("100%", "44px", "8px")}</div>
                ${skeletonBox("100%", "44px", "8px")}
            </form>
        </div>
    `;
}

/** Skeleton cho Search page (4 sections). */
export function SKELETON_SEARCH() {
    return `
        <section class="home__container">
            <div class="home__row">
                ${skeletonLine("300px", "32px")}
            </div>
        </section>
        ${SKELETON_QUICK_PICKS()}
        ${SKELETON_SECTION(true, 6)}
        ${SKELETON_SECTION(true, 6)}
        ${SKELETON_SECTION(true, 6)}
    `;
}
