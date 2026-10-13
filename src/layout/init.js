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
        console.info(
            "[initLayout] Khôi phục state từ localStorage:",
            persisted,
        );

        // Mount video overlay trước (cần DOM trước khi restore)
        videoOverlay.mount();

        if (persisted.audio) {
            audioPlayer.restoreFromState(persisted.audio);
        }
        // Chỉ restore video khi user CHƯA đóng hẳn trước đó.
        // Nếu closeFull() trước đó đã set wasActive=false → skip restore
        // → fix bug "F5 thì có video xuất hiện trong player".
        if (persisted.video && persisted.video.wasActive !== false) {
            videoOverlay.restoreFromState(persisted.video);
        } else if (persisted.video && persisted.video.wasActive === false) {
            console.info(
                "[initLayout] Skip restore video — user đã đóng trước đó",
            );
        }
    }

    // 5. Force save khi user F5/đóng tab
    bindBeforeUnloadSave();
}
