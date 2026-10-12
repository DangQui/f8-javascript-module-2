/**
 * layout/init.js — Init layout shells + UI handlers
 *
 * Render header/sidebar/player partials (async, parallel) sau đó init
 * các UI modules cần DOM đã sẵn sàng.
 *
 * Consumed by:
 *   - `@/main.js` gọi 1 lần ở entry point
 *
 * Thứ tự:
 *   1. renderHeader + renderSidebar + renderPlayer (Promise.all parallel)
 *   2. init UI modules (toggle, dropdown, slider, sidebar, auth)
 *   3. applyAuthVisibility (hide/show header login vs avatar)
 *   4. restorePlayerState (load from localStorage)
 *   5. bindBeforeUnloadSave
 *
 * Lưu ý:
 *   - renderPlayer visibility được điều khiển hoàn toàn bởi state-changed event
 *     từ video-overlay. Xem `layout/player.js` → bindPlayerEvents().
 */

import { renderHeader } from "@/layout/header.js";
import { renderSidebar } from "@/layout/sidebar.js";
import { renderPlayer } from "@/layout/player.js";

import { initJsToggle } from "@/libs/toggle.js";
import { initDropdowns } from "@/libs/dropdown.js";
import { initSliders } from "@/libs/slider.js";
import { initSidebarActive, initUpgradeLink } from "@/libs/sidebar.js";
import { initAuthUI } from "@/state/authState.js";
import { audioPlayer } from "@/components/audio-player.js";
import videoOverlay from "@/components/video-overlay.js";
import {
    loadPlayerState,
    bindBeforeUnloadSave,
} from "@/state/playerPersistState.js";

/**
 * Render toàn bộ layout + init các UI handlers cần thiết.
 * Chạy 1 lần sau khi DOM ready.
 */
export async function initLayout() {
    // 1. Render layout shells (parallel — 3 partials cùng fetch)
    await Promise.all([
        renderHeader("#header"),
        renderSidebar("#sidebar"),
        renderPlayer("#player"),
    ]);

    // 2. Init UI modules SAU khi layout đã render
    initJsToggle();
    initSidebarActive();
    initUpgradeLink();
    initDropdowns();
    initSliders();

    // 3. Apply auth visibility (hide/show header login vs avatar)
    initAuthUI();

    // 4. Khôi phục player state từ localStorage (audio + video)
    //    User click play để resume từ currentTime đã lưu.
    const persisted = loadPlayerState();
    if (persisted) {
        console.info("[initLayout] Khôi phục state từ localStorage:", persisted);

        // Mount video overlay trước (cần DOM trước khi restore)
        videoOverlay.mount();

        if (persisted.audio) {
            audioPlayer.restoreFromState(persisted.audio);
        }
        if (persisted.video) {
            videoOverlay.restoreFromState(persisted.video);
        }
    }

    // 5. Force save khi user F5/đóng tab
    bindBeforeUnloadSave();
}
