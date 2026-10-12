import Navigo from "navigo";

import { homePage } from "@/pages/home/home.js";
import { discoverPage } from "@/pages/discover/discover.js";
import { libraryPage } from "@/pages/library/library.js";
import { songDetailPage } from "@/pages/song-detail/song-detail.js";
import { albumDetailPage } from "@/pages/album-detail/album-detail.js";
import { playlistDetailPage } from "@/pages/playlist-detail/playlist-detail.js";
import { videoDetailPage } from "@/pages/video-detail/video-detail.js";
import { loginPage, registerPage } from "@/pages/auth/auth.js";
import { profilePage } from "@/pages/profile/profile.js";
import { changePasswordPage } from "@/pages/change-password/change-password.js";
import { notFoundPage } from "@/pages/not-found/not-found.js";
import { searchPage } from "@/pages/search/search.js";
import { newReleasesPage } from "@/pages/new-releases/new-releases.js";
import { chartsPage } from "@/pages/charts/charts.js";
import { moodDetailPage } from "@/pages/mood-detail/mood-detail.js";
import { moodsAndGenresPage } from "@/pages/moods-and-genres/moods-and-genres.js";
import { categoryDetailPage } from "@/pages/category-detail/category-detail.js";
import { lineDetailPage } from "@/pages/line-detail/line-detail.js";

import { loading, withErrorBoundary } from "@/pages/_shared.js";
import * as videoOverlay from "@/components/video-overlay.js";

/** Navigo instance — singleton, dùng cho mọi SPA navigation. */
export const router = new Navigo("/", {
    hash: false,
    strategy: "ONE",
});

/**
 * Đăng ký tất cả routes.
 * Wrap pageFn để:
 *   1. Close video overlay (nếu đang mở) trước khi render
 *   2. AWAIT async pageFn (chờ DOM render xong)
 *   3. Re-bind Navigo link handlers cho DOM mới (track-items, ...)
 *   4. Catch lỗi render qua withErrorBoundary
 *
 * Mỗi handler nhận `match` object từ Navigo:
 *   match.url     — URL hiện tại
 *   match.data    — params từ URL pattern (vd { id: '123' } cho /songs/details/123)
 *   match.params  — parsed query string (vd { keyword: "A" } cho ?keyword=A)
 *
 * Em wrap match → route object `{ params, query, url }` để page module
 * dễ dùng hơn (giống convention của các framework khác).
 */
function registerRoutes() {
    const wrap = (pageFn) => (match) => {
        // Navigo 8.x match shape:
        //   { url, queryString, hashString, route, data, params }
        // Trong đó `params` = parsed query string (vd: ?keyword=A → { keyword: "A" })
        // và `data` = params từ URL pattern (vd: :slug → { slug: "abc" })
        const route = {
            params: match?.data || {},
            query: match?.params || {},
            url: match?.url || window.location.pathname,
        };

        return (async () => {
            try {
                // Phase 13.2: Đóng + destroy video overlay (nếu đang mở) trước
                // khi render page mới.
                //
                // Bối cảnh: Khi user navigate từ video-detail (overlay full
                // đang phát YouTube) sang bất kỳ page nào khác, YouTube IFrame
                // vẫn phát audio nền → 2 audio chạy song song.
                //
                // Lưu ý: KHÔNG gọi khi navigate trong cùng video-detail (vd click
                // related video trong overlay) vì `open()` tự destroy player cũ.
                if (videoOverlay.isOpenNow()) {
                    videoOverlay.closeFull();
                }
                await withErrorBoundary(
                    pageFn,
                    "Đã xảy ra lỗi không xác định",
                )(route);
            } finally {
                // Bind Navigo link handler cho DOM mới (track-items, buttons, ...)
                // để click `<a href data-navigo>` → SPA navigate (không reload).
                router.updatePageLinks();
            }
        })();
    };

    router
        .on("/", wrap(homePage))
        .on("/discover", wrap(discoverPage))
        .on("/library", wrap(libraryPage))
        .on("/songs/details/:id", wrap(songDetailPage))
        .on("/albums/details/:slug", wrap(albumDetailPage))
        .on("/playlists/details/:slug", wrap(playlistDetailPage))
        .on("/videos/details/:id", wrap(videoDetailPage))
        .on("/auth/login", wrap(loginPage))
        .on("/auth/register", wrap(registerPage))
        .on("/auth/profile", wrap(profilePage))
        .on("/auth/change-password", wrap(changePasswordPage))
        .on("/search", wrap(searchPage))
        .on("/new-releases", wrap(newReleasesPage))
        .on("/charts", wrap(chartsPage))
        .on("/moods/:slug", wrap(moodDetailPage))
        .on("/moods-and-genres", wrap(moodsAndGenresPage))
        .on("/categories/:slug", wrap(categoryDetailPage))
        .on("/lines/:slug", wrap(lineDetailPage))
        .notFound(wrap(notFoundPage));
}

/**
 * Register before/after hooks.
 *   - before: show loading overlay (safety net — page tự show/hide trong try/finally)
 *   - after: hide loading overlay (đảm bảo ẩn nếu page throw error)
 */
function registerHooks() {
    router.hooks({
        before(next) {
            loading.show();
            next();
        },
        after(next) {
            loading.hide();
            next();
        },
    });
}

let initialized = false;

/**
 * Khởi tạo router (gọi 1 lần sau khi DOM ready + layout render).
 * Wire routes + hooks + resolve URL hiện tại.
 */
export function initRouter() {
    if (initialized) {
        console.warn("[router] Đã init rồi, bỏ qua");
        return;
    }
    initialized = true;

    registerRoutes();
    registerHooks();

    // Resolve URL hiện tại — kích hoạt route handler tương ứng
    router.resolve();

    console.info("[router] Navigo router ready");
}

/**
 * Navigate tới path (programmatic).
 * @param {string} path - Path tương đối (vd "/discover")
 * @returns {Promise<void>}
 */
export function navigate(path) {
    return router.navigate(path);
}

/**
 * Lấy Navigo instance (cho advanced usage như updatePageLinks).
 * @returns {Navigo}
 */
export function getRouter() {
    return router;
}

/** @deprecated Backward compat alias của `initRouter().router.resolve()`. */
export function resolveRouter() {
    return router.resolve();
}
