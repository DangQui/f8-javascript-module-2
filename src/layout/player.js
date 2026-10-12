/**
 * layout/player.js — Render player partial + bind controls
 *
 * SSOT (Single Source of Truth): player HTML chỉ tồn tại trong file partial,
 * không duplicate trong JS. Logic:
 *   1. Build time: index.html embed partials/player.html → FCP nhanh
 *   2. Runtime: fetch partial → inject innerHTML + bind events
 *
 * Player là "central dispatch" cho cả audio (audio-player.js) và video
 * (video-overlay.js). Mỗi button (play/next/prev/shuffle/repeat/close) chỉ
 * có 1 listener ở đây, route theo `getActive()`:
 *   - active="audio" → gọi audioPlayer.* trực tiếp
 *   - active="video" → emit event cho videoOverlay listen
 *
 * Exports:
 *   - renderPlayer(target) → inject player HTML + bind events
 *
 * Consumed by:
 *   - `@/layout/init.js` gọi trong Promise.all render layout
 *   - `@/state/playerPersistState.js` re-apply state khi restore từ localStorage
 */

import { audioPlayer } from "@/components/audio-player.js";
import { getActive } from "@/state/mediaState.js";

const PARTIAL_URL = "/partials/player.html";

/**
 * Fetch HTML partial từ server. Trả về string rỗng nếu lỗi
 * (app không crash, user vẫn thấy HTML build-time có sẵn).
 *
 * Dùng `cache: "default"` để Vite HMR + browser nhận file mới khi sửa.
 * KHÔNG dùng `force-cache` vì browser sẽ cache vĩnh viễn.
 */
async function fetchPartial(url) {
    try {
        const res = await fetch(url, { cache: "default" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        return await res.text();
    } catch (err) {
        console.warn('[layout/player] Không fetch được "' + url + '":', err);
        return "";
    }
}
/** Format seconds → "m:ss" / "h:mm:ss". */
function fmtTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    return m + ":" + String(s).padStart(2, "0");
}

/** Dispatch custom event cho video-overlay listen. */
function emitPlayerEvent(name) {
    document.dispatchEvent(new CustomEvent(name));
}

/** Cập nhật icon play/pause. */
function setPlayerPlayIcon(playing) {
    const btn = document.querySelector(".player__control--play");
    if (!btn) return;
    btn.classList.toggle("is-playing", !!playing);
    const icon = btn.querySelector("i");
    if (icon) icon.className = playing ? "fa-solid fa-pause" : "fa-solid fa-play";
}

/** Toggle .is-active cho button. */
function setPlayerToggle(selector, active) {
    const btn = document.querySelector(selector);
    if (!btn) return;
    btn.classList.toggle("is-active", !!active);
}

/** Cập nhật icon âm lượng: muted / low / high. */
function setPlayerVolumeIcon(volume) {
    const btn = document.querySelector(".player__action--volume");
    if (!btn) return;
    const v = Math.max(0, Math.min(100, Number(volume) || 0));
    btn.classList.toggle("is-muted", v === 0);
    const icon = btn.querySelector("i");
    if (icon) {
        if (v === 0) icon.className = "fa-solid fa-volume-xmark";
        else if (v < 50) icon.className = "fa-solid fa-volume-low";
        else icon.className = "fa-solid fa-volume-high";
    }
}

/**
 * Lấy URL thumbnail từ field `thumbnails` (handle cả 2 shape từ API):
 *   - String: "https://..."
 *   - Array:  ["https://...", ...]
 *
 * Bối cảnh: API backend trả về `thumbnails` không nhất quán giữa các
 * endpoint. Helper này normalize → trả URL string hoặc undefined.
 *
 * @param {string|string[]|undefined} thumbnails
 * @returns {string|undefined}
 */
function getThumbnailUrl(thumbnails) {
    if (!thumbnails) return undefined;
    if (typeof thumbnails === "string") return thumbnails;
    if (Array.isArray(thumbnails)) return thumbnails[0];
    return undefined;
}

/** Cập nhật track info (title + cover) cho #player. */
function setPlayerTrackInfo(media) {
    const titleEl = document.querySelector(".player__title");
    const coverEl = document.querySelector(".player__cover");
    if (titleEl) titleEl.textContent = media?.title || "Chưa phát";
    if (coverEl) {
        // Ưu tiên `thumbnails` (canonical), fallback `thumb` (alias)
        const thumb =
            getThumbnailUrl(media?.thumbnails) ||
            (typeof media?.thumb === "string" ? media.thumb : undefined);
        coverEl.src = thumb || "/images/album-01.jpg";
        coverEl.alt = media?.title || "";
    }
}

/** Cập nhật time display "m:ss / m:ss". */
function setPlayerTime(currentTime, duration) {
    const timeEl = document.querySelector(".player__time");
    if (!timeEl) return;
    timeEl.textContent = fmtTime(currentTime) + " / " + fmtTime(duration);
}

/**
 * Cập nhật progress bar (range input + CSS custom property).
 * Skip update nếu user đang drag (tránh giật ngược).
 */
function setPlayerProgress(currentTime, duration) {
    const rangeEl = document.querySelector(".player__progress-bar");
    if (!rangeEl) return;
    if (rangeEl.dataset.dragging === "1") return;
    const percent = duration > 0 ? Math.round((currentTime / duration) * 100) : 0;
    rangeEl.value = String(percent);
    rangeEl.style.setProperty("--progress-fill", percent + "%");
}

/**
 * Apply toàn bộ audio state lên #player UI.
 *
 * Được gọi từ 2 nguồn:
 *   1. `audio:state-changed` (audioPlayer emit khi play/pause/seek/timeupdate/...)
 *   2. `video-overlay:state-changed` (overlay mirror audio khi user toggle ở overlay)
 *
 * State shape (từ audioPlayer.getState()):
 *   { playing, currentTime, duration, volume, shuffle, repeat,
 *     currentSong: { id, title, thumbnails[], artists[], duration } }
 */
function applyAudioState(state) {
    if (!state) return;

    // 1. Play icon
    if (typeof state.playing === "boolean") {
        setPlayerPlayIcon(state.playing);
    }

    // 2. Shuffle / Repeat toggle
    if (typeof state.shuffle === "boolean") {
        setPlayerToggle(".player__action--shuffle", state.shuffle);
    }
    if (typeof state.repeat === "boolean") {
        setPlayerToggle(".player__action--repeat", state.repeat);
    }

    // 3. Volume icon + slider
    if (typeof state.volume === "number") {
        setPlayerVolumeIcon(state.volume);
        const slider = document.querySelector(".player__volume-slider");
        // Check `userDragging` để tránh spam DOM khi user đang kéo slider
        if (slider && slider.dataset.userDragging !== "1") {
            slider.value = String(state.volume);
            slider.style.setProperty("--vol-fill", state.volume + "%");
        }
    }

    // 4. Track info (chỉ update khi id đổi, tránh spam DOM)
    if (state.currentSong) {
        const titleEl = document.querySelector(".player__title");
        const currentTitle = titleEl?.getAttribute?.("data-current-song-id");
        if (currentTitle !== state.currentSong.id) {
            setPlayerTrackInfo(state.currentSong);
            titleEl?.setAttribute("data-current-song-id", state.currentSong.id || "");
        }
    }

    // 5. Time + progress bar
    if (typeof state.currentTime === "number" && typeof state.duration === "number") {
        setPlayerTime(state.currentTime, state.duration);
        setPlayerProgress(state.currentTime, state.duration);
    }

    // 6. Auto show/hide #player
    //
    // Logic: chỉ toggle `is-visible` khi state có currentSong HOẶC playing truthy.
    // Khi state "rỗng" (currentSong=null + playing=false) do eject takeover
    // → KHÔNG remove is-visible (để event tiếp theo từ video overlay xử lý,
    //   tránh player nhấp nháy/flicker mỗi lần play/pause).
    if (state.currentSong || state.playing) {
        const hasTrack = !!state.currentSong;
        const isPlaying = !!state.playing;
        const player = document.querySelector("#player");
        if (player) {
            const shouldShow = hasTrack || isPlaying;
            const isVisible = player.classList.contains("is-visible");
            if (shouldShow && !isVisible) {
                player.classList.add("is-visible");
            } else if (!shouldShow && isVisible) {
                player.classList.remove("is-visible");
            }
        }
    }
}

/**
 * Bind full-drag cho progress bar của #player:
 * - Click anywhere → seek
 * - Drag thumb → seek real-time
 * - Dispatch `player:progress-seek` với percent (0-100)
 */
function bindPlayerProgressDrag() {
    const rangeEl = document.querySelector(".player__progress-bar");
    if (!rangeEl || rangeEl.dataset.dragBound === "1") return;
    rangeEl.dataset.dragBound = "1";

    const emit = (percent) => {
        document.dispatchEvent(
            new CustomEvent("player:progress-seek", { detail: { percent } })
        );
    };

    const seekFromPointer = (e) => {
        const rect = rangeEl.getBoundingClientRect();
        const clientX = e.clientX ?? (e.touches?.[0]?.clientX ?? 0);
        if (!clientX) return;
        const percent = ((clientX - rect.left) / rect.width) * 100;
        const clamped = Math.max(0, Math.min(100, percent));
        rangeEl.value = String(clamped);
        rangeEl.style.setProperty("--progress-fill", clamped + "%");
        emit(clamped);
    };

    rangeEl.addEventListener("pointerdown", (e) => {
        rangeEl.dataset.dragging = "1";
        seekFromPointer(e);
        rangeEl.setPointerCapture?.(e.pointerId);
    });

    rangeEl.addEventListener("pointermove", (e) => {
        if (rangeEl.dataset.dragging !== "1") return;
        seekFromPointer(e);
    });

    rangeEl.addEventListener("pointerup", (e) => {
        rangeEl.dataset.dragging = "";
        rangeEl.releasePointerCapture?.(e.pointerId);
    });

    rangeEl.addEventListener("pointercancel", () => {
        rangeEl.dataset.dragging = "";
    });

    rangeEl.addEventListener("input", (e) => {
        const percent = Number(e.target.value);
        rangeEl.style.setProperty("--progress-fill", percent + "%");
        emit(percent);
    });
}
let bound = false;

/**
 * Bind 3 chấm menu ở #player:
 * - Click nút 3 chấm → toggle dropdown
 * - Click item → dispatch `player:menu-action` với action name
 * - Click outside / ESC → đóng menu
 */
function bindPlayerMenu() {
    const menuBtn = document.querySelector("#player-menu-btn");
    const menu = document.querySelector("#player-menu");
    if (!menuBtn || !menu) return;

    menuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = !menu.hidden;
        menu.hidden = isOpen;
    });

    document.addEventListener("click", (e) => {
        if (!menu.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) {
            menu.hidden = true;
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !menu.hidden) {
            menu.hidden = true;
            e.stopPropagation();
        }
    });

    menu.addEventListener("click", (e) => {
        const btn = e.target.closest(".player__menu-item");
        if (!btn) return;
        const action = btn.dataset.action;
        if (!action) return;
        document.dispatchEvent(
            new CustomEvent("player:menu-action", { detail: { action } })
        );
    });
}

/**
 * Bind click handlers + listen state-changed từ video-overlay.
 * Idempotent — chỉ bind 1 lần.
 *
 * Phase 8.5 v9: Central Dispatch.
 * Mỗi button chỉ có 1 listener ở đây. Handler check `getActive()` → route
 * đến player tương ứng:
 *   - active="audio" → audioPlayer.{togglePlay,next,prev,toggleShuffle,toggleRepeat}
 *   - active="video" → emit event cho videoOverlay listen
 *
 * Trước đó (v8): `audio-player.js` + `layout/player.js` đều attach listener
 * vào `.player__control--play` → 2 listener cùng chạy → BUG toast spam +
 * UI flicker.
 */
function bindPlayerEvents() {
    if (bound) return;
    bound = true;

    const routeToActive = (audioFn, eventName) => {
        if (getActive() === "audio") {
            audioFn();
        } else {
            // active="video" hoặc null → dispatch cho videoOverlay listen
            emitPlayerEvent(eventName);
        }
    };

    document.querySelector(".player__control--play")?.addEventListener("click", () => {
        routeToActive(() => audioPlayer.togglePlay(), "player:play-toggle");
    });
    document.querySelector(".player__control--next")?.addEventListener("click", () => {
        routeToActive(() => audioPlayer.next(), "player:next");
    });
    document.querySelector(".player__control--prev")?.addEventListener("click", () => {
        routeToActive(() => audioPlayer.prev(), "player:prev");
    });
    document.querySelector(".player__action--shuffle")?.addEventListener("click", () => {
        routeToActive(() => audioPlayer.toggleShuffle(), "player:shuffle-toggle");
    });
    document.querySelector(".player__action--repeat")?.addEventListener("click", () => {
        routeToActive(() => audioPlayer.toggleRepeat(), "player:repeat-toggle");
    });

    // Close button: eject audio / close video
    document.querySelector(".player__action--close")?.addEventListener("click", () => {
        const active = getActive();
        if (active === "audio") {
            audioPlayer.ejectSong();
        } else if (active === "video") {
            emitPlayerEvent("player:close");
        }
        // else (no active) → no-op
    });

    // Progress bar: full drag → seek
    bindPlayerProgressDrag();

    // 3 chấm menu: dropdown
    bindPlayerMenu();

    // Listen state từ video-overlay (overlay mirror audio state)
    document.addEventListener("video-overlay:state-changed", (e) => {
        const detail = e.detail || {};
        applyAudioState({
            playing: detail.playing,
            shuffle: detail.shuffle,
            repeat: detail.repeat,
            volume: detail.volume,
            currentTime: detail.currentTime,
            duration: detail.duration,
            currentSong: detail.video
                ? {
                      id: detail.video.id,
                      title: detail.video.title,
                      thumbnails: detail.video.thumbnails || detail.video.thumb,
                      duration: detail.duration || 0,
                  }
                : undefined,
        });
    });

    // Listen `audio:state-changed` từ audioPlayer
    document.addEventListener("audio:state-changed", (e) => {
        applyAudioState(e.detail || {});
    });

    // Show/hide #player theo overlay state
    document.addEventListener("video-overlay:opened", () => {
        document.querySelector("#player")?.classList.add("is-hidden-by-overlay");
    });
    document.addEventListener("video-overlay:minimized", () => {
        document.querySelector("#player")?.classList.remove("is-hidden-by-overlay");
    });
    document.addEventListener("video-overlay:closed", () => {
        document.querySelector("#player")?.classList.remove("is-hidden-by-overlay");
    });

    // Volume slider: set volume qua audioPlayer (single source of truth)
    // + dispatch event cho video-overlay mirror UI
    const setPlayerVolume = (value) => {
        const v = Math.max(0, Math.min(100, Number(value) || 0));
        audioPlayer.setVolume(v);
        document.dispatchEvent(
            new CustomEvent("video-overlay:set-volume", { detail: { volume: v } })
        );
    };

    const volSlider = document.querySelector(".player__volume-slider");
    if (volSlider) {
        volSlider.addEventListener("input", (e) => {
            setPlayerVolume(Number(e.target.value));
        });
    }

    // Click nút volume → mute/unmute (toggle)
    const volBtn = document.querySelector(".player__action--volume");
    volBtn?.addEventListener("click", () => {
        audioPlayer.toggleMute();
    });

    // Khi video-overlay thay đổi volume → sync slider UI
    document.addEventListener("video-overlay:state-changed", (e) => {
        const detail = e.detail || {};
        if (typeof detail.volume === "number") {
            const slider = document.querySelector(".player__volume-slider");
            if (slider) {
                slider.value = String(detail.volume);
                slider.style.setProperty("--vol-fill", detail.volume + "%");
            }
        }
    });

    // Click vào .player__track (cover/title) → expand mini-player lên overlay full
    const playerEl = document.querySelector("#player");
    if (playerEl) {
        playerEl.addEventListener("click", (e) => {
            // Bỏ qua nếu click vào vùng có chức năng
            if (e.target.closest(".player__controls")) return;
            if (e.target.closest(".player__actions")) return;
            if (e.target.closest(".player__settings")) return;
            if (e.target.closest(".player__progress")) return;
            if (e.target.closest(".player__menu-wrap")) return;
            // Chỉ click vào track info mới expand
            if (!e.target.closest(".player__track")) return;
            document.dispatchEvent(new CustomEvent("player:expand-request"));
        });
    }
}
/**
 * Render player vào container + bind events.
 * Bind events bất kể fetch thành công hay không (HTML build-time cũng có markup).
 *
 * @param {string|HTMLElement} target - CSS selector hoặc element
 * @returns {Promise<void>}
 */
export async function renderPlayer(target) {
    const el = typeof target === "string"
        ? document.querySelector(target)
        : target;
    if (!el) {
        console.warn('[layout/player] Không tìm thấy container "' + target + '"');
        return;
    }

    const html = await fetchPartial(PARTIAL_URL);
    if (html) {
        el.innerHTML = html;
    } else {
        console.info("[layout/player] Dùng HTML build-time làm fallback");
    }

    bindPlayerEvents();
}
