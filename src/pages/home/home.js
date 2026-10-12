/**
 * pages/home/home.js — Home page handler
 *
 * Flow:
 *   1. Render skeleton ngay (UX: user thấy structure trước khi data về)
 *   2. Fetch 6 endpoints song song (5 + 1 personalized cho "Nghe gần đây")
 *   3. Pad data để fill 16 items cho Quick Picks + Nghe gần đây
 *   4. Phase 14.9: Quyết định "Nghe gần đây" — ưu tiên localStorage history
 *   5. Render HTML + inject + re-init slider
 *
 * Sections (theo base.js `rr()`):
 *   - Greeting            ← user (logged-in only)
 *   - Mood chips          ← moods
 *   - Nghe gần đây        ← localHistory (ưu tiên) hoặc recentHistory (backend)
 *                          4 items/col × 4 cols = 16
 *   - Quick Picks         ← quickPicks
 *   - Album gợi ý cho bạn ← albumsForYou
 *   - Today's Hits        ← todaysHits
 *   - Nhạc Việt           ← playlistsByCountry(VN)
 *
 * Lưu ý:
 *   - Mỗi section fetch fail → fallback `[]` để page vẫn render được.
 *   - Personalized endpoint cần auth → nếu 401 thì bỏ qua (không block).
 *   - Sau khi render, PHẢI gọi `initSliders()` vì slider lib scan DOM
 *     một lần ở app init, không tự detect DOM mới.
 *
 * Exports:
 *   - homePage(route)  → page handler
 *
 * Consumed by:
 *   - `@/libs/router.js` (route "/")
 */

import { renderPage } from "@/pages/_shared.js";
import { renderHome } from "@/pages/home/home.render.js";
import { SKELETON_HOME } from "@/components/skeleton.js";

import { homeService } from "@/services/homeService.js";
import { getAuth, isLoggedIn } from "@/state/authState.js";
import { initSliders } from "@/libs/slider.js";

import { DEFAULT_COUNTRY } from "@/utils/constants.js";
import { toast } from "@/libs/toast.js";
// Phase 14.9: Đọc lịch sử nghe từ localStorage để hiển thị "Nghe gần đây"
// (workaround backend /home/personalized chưa track user-specific).
import {
    getListenHistory,
    historyItemToRenderItem,
} from "@/state/listenHistory.js";
/**
 * Wrapper: gọi async function, nếu throw → log + return fallback.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {T} fallback
 * @param {string} label - Log label
 * @returns {Promise<T>}
 */
async function safeFetch(fn, fallback, label) {
    try {
        return await fn();
    } catch (err) {
        console.warn(`[home] ${label} failed:`, err.message);
        return fallback;
    }
}
//
// Quick Picks + Nghe gần đây cần 16 items (4 cols × 4 items/col) để
// slider ngang giống design gốc. Hiện tại API chỉ trả 4 items/call.
// TODO: backend nên trả ≥ 16 items → bỏ helper này.

/**
 * Duplicate items để fill target slots.
 * @param {Array} items
 * @param {number} target - số items mong muốn (default 16)
 * @returns {Array}
 */
function padItems(items, target = 16) {
    if (!Array.isArray(items) || items.length === 0) return [];
    if (items.length >= target) return items;

    const out = [...items];
    let i = 0;
    while (out.length < target) {
        const src = items[i % items.length];
        // Tạo bản copy với id/slug unique để tránh key collision
        out.push({
            ...src,
            _id: `${src._id || src.id || "x"}-dup-${out.length}`,
            id: src.id ? `${src.id}-dup-${out.length}` : src.id,
            slug: src.slug ? `${src.slug}-dup-${out.length}` : src.slug,
        });
        i++;
    }
    return out;
}
/**
 * Render Home page.
 * @param {{params: object, query: object, url: string}} route
 */
export async function homePage(route = {}) {
    void route;
    try {
        // 0. Render skeleton ngay (UX: user thấy structure trước khi data về)
        renderPage(SKELETON_HOME());

        // 1. Lấy user từ auth state (sync — không cần await)
        const { user } = getAuth();

        // 2. Fetch 6 endpoints song song
        //    - 5 + 1 personalized cho "Nghe gần đây"
        //    - CẦN login (cần token). Nếu không login → endpoint trả 401 → empty.
        //    - safeFetch đã fallback [] cho mọi error → page vẫn render, section
        //      "Nghe gần đây" tự ẩn (check length trong renderQuickPicksSection).
        const [
            moods,
            quickPicks,
            albumsForYou,
            todaysHits,
            playlistsByCountry,
            recentHistory,
        ] = await Promise.all([
            safeFetch(() => homeService.getMoods(), [], "getMoods"),
            safeFetch(() => homeService.getQuickPicks(), [], "getQuickPicks"),
            safeFetch(() => homeService.getAlbumsForYou(), [], "getAlbumsForYou"),
            safeFetch(() => homeService.getTodaysHits(), [], "getTodaysHits"),
            safeFetch(
                () => homeService.getPlaylistsByCountry(DEFAULT_COUNTRY),
                [],
                "getPlaylistsByCountry"
            ),
            safeFetch(
                () => homeService.getPersonalized(),
                [],
                "getPersonalized"
            ),
        ]);

        // 3. Pad data để fill 16 items cho Quick Picks + Nghe gần đây
        const quickPicksPadded = padItems(quickPicks, 16);
        const playlistsPadded = padItems(playlistsByCountry, 16);

        // 4. Quyết định data cho "Nghe gần đây":
        //    - Nếu CHƯA login → return [] ngay (không có khái niệm "lịch sử cá nhân")
        //    - Nếu localStorage có lịch sử nghe → ưu tiên dùng
        //    - Ngược lại → dùng recentHistory từ backend
        //    - Nếu cả 2 rỗng → renderQuickPicksSection sẽ skip section
        const localHistory = isLoggedIn()
            ? getListenHistory({ limit: 16 }).map(historyItemToRenderItem)
            : [];
        const ngheGanDayFinal =
            localHistory.length > 0 ? localHistory : recentHistory;

        // 5. Render HTML
        const html = renderHome({
            user,
            moods,
            ngheGanDay: ngheGanDayFinal,
            quickPicks: quickPicksPadded,
            albumsForYou,
            todaysHits,
            playlistsByCountry: playlistsPadded,
        });

        // 6. Inject + re-init slider
        renderPage(html);
        initSliders();
    } catch (err) {
        console.error("[home] Critical error:", err);
        const fallback = "Không thể tải trang chủ. Vui lòng thử lại.";
        toast.error(err.message || fallback);
        renderPage(`
            <section class="page-placeholder">
                <h1 class="page-placeholder__title">Đã xảy ra lỗi</h1>
                <p class="page-placeholder__desc">${err.message || "Unknown error"}</p>
            </section>
        `);
    }
}

export default homePage;
