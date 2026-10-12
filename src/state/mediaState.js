/**
 * state/mediaState.js — Single source of truth cho "media player nào đang active"
 *
 * Phase 8.5 v7 — giải quyết vấn đề 2 player (audio + video) chạy song song
 * dẫn đến 2 audio cùng phát.
 *
 * Concept:
 *   - `activePlayer`: 'audio' | 'video' | null
 *     + 'audio' = audioPlayer (HTMLAudio) đang phát
 *     + 'video' = videoOverlay (YouTube IFrame) đang phát
 *     + null    = không có gì phát
 *
 *   - Các player KHÔNG gọi trực tiếp nhau. Thay vào đó:
 *     1. Khi state player đổi → broadcast `media:active-changed` event
 *     2. Player khác listen event → nếu `active !== self` thì PAUSE mình
 *
 * Centralized để tránh:
 *   - Circular dependency giữa audio-player.js ↔ video-overlay.js
 *   - Race condition khi cả 2 cùng PLAYING
 *
 * Exports:
 *   - getActive()              → 'audio' | 'video' | null
 *   - setActive(active)        → set + broadcast (no-op nếu giá trị không đổi)
 *   - onActiveChange(fn)       → subscribe, returns unsubscribe
 *   - onActiveEvent(fn)        → listen document event
 *   - mediaState               → object gộp các hàm trên
 *
 * Consumed by:
 *   - `@/components/audio-player.js` setActive("audio") khi play/pause
 *   - `@/components/video-overlay.js` setActive("video") khi YT play/pause
 *   - `@/layout/player.js` getActive() để route button clicks
 */

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
        new CustomEvent("media:active-changed", { detail: { active } })
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
