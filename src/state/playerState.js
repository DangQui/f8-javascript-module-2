const SELECTOR = "#player";

/** @returns {HTMLElement|null} */
function getPlayerEl() {
    return document.querySelector(SELECTOR);
}

let visible = false;
/** @type {Set<(visible: boolean) => void>} */
const listeners = new Set();

function notify() {
    window.dispatchEvent(
        new CustomEvent("player-visibility-changed", {
            detail: { visible },
        }),
    );
    listeners.forEach((cb) => {
        try {
            cb(visible);
        } catch (err) {
            console.error("[playerState] listener error:", err);
        }
    });
}

/** Hiện player (slide-up từ dưới). Idempotent. */
export function showPlayer() {
    if (visible) return;
    visible = true;
    const el = getPlayerEl();
    if (el) el.classList.add("is-visible");
    else console.warn('[playerState] Không tìm thấy "' + SELECTOR + '"');
    notify();
}

/** Ẩn player (slide-down xuống dưới). Idempotent. */
export function hidePlayer() {
    if (!visible) return;
    visible = false;
    const el = getPlayerEl();
    if (el) el.classList.remove("is-visible");
    notify();
}

/** Toggle show/hide player. */
export function togglePlayer() {
    if (visible) hidePlayer();
    else showPlayer();
}

/** @returns {boolean} true nếu player đang visible. */
export function isPlayerVisible() {
    return visible;
}

/**
 * Subscribe visibility changes.
 * @param {(visible: boolean) => void} callback
 * @returns {() => void} unsubscribe
 */
export function onPlayerVisibilityChange(callback) {
    if (typeof callback !== "function") return () => {};
    listeners.add(callback);
    return () => listeners.delete(callback);
}
