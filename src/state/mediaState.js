/** @type {"audio" | "video" | null} */
let activePlayer = null;

/** @type {Set<(active: "audio" | "video" | null) => void>} */
const listeners = new Set();

/**
 * Get current active player.
 * @returns {"audio" | "video" | null}
 */
export function getActive() {
    return activePlayer;
}

/**
 * Set active player + notify listeners (nếu đổi).
 *
 * KHÔNG gọi setActive liên tục — chỉ gọi khi state đổi thực sự.
 * Nếu `active` giống giá trị hiện tại thì skip (no broadcast).
 *
 * @param {"audio" | "video" | null} active
 */
export function setActive(active) {
    if (activePlayer === active) return;
    activePlayer = active;

    // Broadcast event cho cross-module sync
    document.dispatchEvent(
        new CustomEvent("media:active-changed", { detail: { active } }),
    );

    // Internal listeners
    listeners.forEach((fn) => {
        try {
            fn(active);
        } catch (err) {
            console.error("[mediaState] listener error:", err);
        }
    });
}

/**
 * Listen active player change.
 * @param {(active: "audio" | "video" | null) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onActiveChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

/**
 * Listen qua document event (cho cross-module dùng window).
 * @param {(active: "audio" | "video" | null) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onActiveEvent(fn) {
    const handler = (e) => fn(e.detail?.active ?? null);
    document.addEventListener("media:active-changed", handler);
    return () => document.removeEventListener("media:active-changed", handler);
}

/** Public API object. */
export const mediaState = {
    getActive,
    setActive,
    onActiveChange,
    onActiveEvent,
};
