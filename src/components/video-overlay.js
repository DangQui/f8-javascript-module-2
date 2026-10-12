/**
 * components/video-overlay.js — YouTube IFrame API video overlay
 *
 * "Video Player Overlay" giống YouTube Music. Player engine: YouTube IFrame
 * API (`window.YT.Player`) thay vì iframe embed thuần — cần biết currentTime
 * thực để sync progress bar + giữ vị trí khi pause/resume.
 *
 * API:
 *   - mount()                         → Inject HTML 1 lần (lazy, idempotent)
 *   - open(video, relatedList, opts)  → Mở overlay + load video
 *   - close()                         → Minimize (thu nhỏ về mini-player)
 *   - expand()                        → Mini → overlay full
 *   - closeFull()                     → Đóng hoàn toàn (destroy player)
 *   - ejectVideo()                    → Clear state (khi audio take over)
 *   - restoreFromState(persisted)     → F5 restore
 *   - togglePlay() / playNext() / playPrev()
 *   - toggleShuffle() / toggleRepeat() / toggleFullscreen()
 *   - isOpenNow()
 *
 * YouTube IFrame API:
 *   - Script load từ `https://www.youtube.com/iframe_api` (1 lần)
 *   - Globals: `window.YT`, `window.YT.Player`, `window.onYouTubeIframeAPIReady`
 *
 * Events broadcast (qua `document.dispatchEvent`):
 *   - `video-overlay:state-changed`  → { video, playing, shuffle, repeat,
 *                                       volume, currentTime, duration, ... }
 *   - `video-overlay:opened`         → khi mở overlay full
 *   - `video-overlay:minimized`      → khi thu nhỏ
 *   - `video-overlay:expanded`       → khi phóng to
 *   - `video-overlay:closed`         → khi đóng hoàn toàn
 *
 * Events listen:
 *   - `media:active-changed`         → mutual exclusion (eject khi audio take over)
 *   - `media:audio-takeover`         → defensive layer
 *   - `player:play-toggle / next / prev / shuffle-toggle / repeat-toggle / close`
 *                                    → central dispatch từ #player
 *   - `player:progress-seek`         → drag progress ở #player
 *   - `player:expand-request`        → click track ở #player
 *   - `player:menu-action`           → menu 3 chấm ở #player
 *
 * Consumed by:
 *   - `@/pages/video-detail/video-detail.js`
 *   - `@/pages/song-detail/song-detail.js` (related videos click)
 *   - `@/layout/player.js` (central dispatch)
 *   - `@/layout/init.js` (mount + restoreFromState)
 */

import { escapeHtml } from "@/utils/format.js";
import { toast } from "@/libs/toast.js";
import { playlistsService } from "@/services/playlistsService.js";
import { setActive, getActive } from "@/state/mediaState.js";
// Phase 14.9: Ghi nhận lịch sử nghe video vào localStorage.
// Chỉ ghi khi user CHỦ ĐỘNG load video (KHÔNG ghi khi next/prev internal).
import { recordListen } from "@/state/listenHistory.js";
// Phase 14.10: Lưu + khôi phục video state (currentVideo + currentTime + volume
// + relatedList) vào cùng store `playerPersistState.js` (unified audio + video).
import {
    savePlayerState,
    clearPlayerState,
} from "@/state/playerPersistState.js";

const OVERLAY_ID = "video-overlay";
const YT_API_SRC = "https://www.youtube.com/iframe_api";

/** Helper toast ngắn gọn. */
function showToast(message, variant = "success") {
    if (variant === "error") toast.error(message);
    else toast.success(message);
}
function buildOverlayHTML() {
    return `
        <div id="${OVERLAY_ID}" class="video-overlay" aria-hidden="true" hidden>
            <div class="video-overlay__drag-handle" aria-hidden="true"></div>

            <div class="video-overlay__top-actions">
                <button id="video-overlay-close-btn" class="video-overlay__top-btn" type="button"
                        aria-label="Đóng trình phát" title="Đóng">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="video-overlay__grid">
                <section class="video-overlay__player-col">
                    <div class="video-overlay__iframe-wrap">
                        <!-- YT.Player sẽ replace div này thành iframe.
                             controls=0 để ẩn controls YouTube — chỉ dùng controls custom. -->
                        <div id="video-overlay-iframe"></div>

                        <button id="video-overlay-mini-expand-btn" class="video-overlay__mini-btn video-overlay__mini-btn--expand" type="button"
                                aria-label="Phóng to" title="Phóng to overlay">
                            <i class="fa-solid fa-up-right-and-down-left-from-center"></i>
                        </button>
                        <button id="video-overlay-mini-close-btn" class="video-overlay__mini-btn video-overlay__mini-btn--close" type="button"
                                aria-label="Đóng" title="Đóng">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div class="video-overlay__meta">
                        <h2 id="video-overlay-title" class="video-overlay__title"></h2>
                        <p id="video-overlay-subtitle" class="video-overlay__subtitle"></p>
                    </div>

                    <div class="video-overlay__controls">
                        <div class="video-overlay__menu-wrap">
                            <button id="video-overlay-menu-btn" class="video-overlay__ctrl" type="button"
                                    aria-label="Tùy chọn">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </button>

                            <div id="video-overlay-menu" class="video-overlay__menu" hidden>
                                <button class="video-overlay__menu-item" type="button" data-action="add-playlist">
                                    <i class="fa-solid fa-list-ul"></i>
                                    <span>Thêm vào playlist</span>
                                    <i class="fa-solid fa-chevron-right video-overlay__menu-arrow"></i>
                                </button>

                                <div id="video-overlay-playlist-submenu" class="video-overlay__submenu" hidden>
                                    <div class="video-overlay__submenu-header">
                                        <button type="button" class="video-overlay__submenu-back" aria-label="Quay lại">
                                            <i class="fa-solid fa-chevron-left"></i>
                                        </button>
                                        <span>Chọn playlist</span>
                                    </div>
                                    <div id="video-overlay-playlist-list" class="video-overlay__submenu-list">
                                    </div>
                                </div>

                                <button class="video-overlay__menu-item" type="button" data-action="share">
                                    <i class="fa-solid fa-share-from-square"></i>
                                    <span>Chia sẻ</span>
                                </button>
                                <button class="video-overlay__menu-item" type="button" data-action="detail">
                                    <i class="fa-solid fa-circle-info"></i>
                                    <span>Chi tiết bài hát</span>
                                </button>
                            </div>
                        </div>

                        <button id="video-overlay-shuffle-btn" class="video-overlay__ctrl" type="button"
                                aria-label="Trộn bài">
                            <i class="fa-solid fa-shuffle"></i>
                        </button>
                        <button id="video-overlay-prev-btn" class="video-overlay__ctrl" type="button"
                                aria-label="Video trước">
                            <i class="fa-solid fa-backward-step"></i>
                        </button>
                        <button id="video-overlay-play-btn" class="video-overlay__ctrl video-overlay__ctrl--primary" type="button"
                                aria-label="Phát/Tạm dừng">
                            <i class="fa-solid fa-play"></i>
                        </button>
                        <button id="video-overlay-next-btn" class="video-overlay__ctrl" type="button"
                                aria-label="Video tiếp">
                            <i class="fa-solid fa-forward-step"></i>
                        </button>

                        <div class="video-overlay__volume">
                            <button id="video-overlay-volume-btn" class="video-overlay__ctrl" type="button"
                                    aria-label="Âm lượng">
                                <i class="fa-solid fa-volume-high"></i>
                            </button>
                            <div class="video-overlay__volume-popover" hidden>
                                <span id="video-overlay-volume-value" class="video-overlay__volume-value">100</span>
                                <div class="video-overlay__volume-track">
                                    <input id="video-overlay-volume-slider" type="range" min="0" max="100" value="100"
                                           class="video-overlay__volume-slider"
                                           aria-label="Thay đổi âm lượng" orient="vertical" />
                                </div>
                            </div>
                        </div>

                        <button id="video-overlay-repeat-btn" class="video-overlay__ctrl" type="button"
                                aria-label="Lặp lại">
                            <i class="fa-solid fa-repeat"></i>
                        </button>

                        <button id="video-overlay-fullscreen-btn" class="video-overlay__ctrl" type="button"
                                aria-label="Toàn màn hình" title="Toàn màn hình">
                            <i class="fa-solid fa-expand"></i>
                        </button>
                    </div>

                    <div class="video-overlay__progress">
                        <input id="video-overlay-progress-range" type="range" min="0" max="100" value="0"
                               class="video-overlay__progress-range"
                               aria-label="Thanh tiến trình" />
                        <div class="video-overlay__time">
                            <span id="video-overlay-current-time">00:00</span>
                            <span id="video-overlay-duration-time">00:00</span>
                        </div>
                    </div>
                </section>

                <aside class="video-overlay__related">
                    <h3 class="video-overlay__related-title">Danh sách phát liên quan</h3>
                    <div id="video-overlay-related-list" class="video-overlay__related-list">
                    </div>
                </aside>
            </div>
        </div>
    `;
}
let mounted = false;
let isOpen = false;
let isMinimized = false; // true = đang ở mini-player (góc), không phải overlay full
let currentList = []; // {id, title, thumbnails, duration, videoId}
let currentIndex = -1;
let ytPlayer = null;
let progressTimer = null;

// Flag: user đang drag progress bar ở BẤT KỲ thanh nào (overlay / #player)
// → progressTimer skip poll để không giật ngược lại vị trí
let isProgressDragging = false;

let isShuffleOn = false;
let isRepeatOn = false;

// History stack: track thứ tự đã phát để prev "back" theo history
// (không phải index-1, mà là bài ngay trước trong lịch sử nghe)
let playHistory = []; // [index, ...] thứ tự đã phát
let pendingVideoOnReady = null; // Queue YT.Player init nếu API chưa ready
/**
 * Load YouTube IFrame API script 1 lần.
 * - Nếu `window.YT` đã có → resolve ngay.
 * - Nếu chưa → inject `<script src="...?callback=onYouTubeIframeAPIReady">`.
 */
function loadYouTubeAPI() {
    return new Promise((resolve) => {
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }

        // Set callback TRƯỚC khi script load
        const prevCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prevCallback?.();
            resolve();
        };

        const existing = document.querySelector(`script[src="${YT_API_SRC}"]`);
        if (!existing) {
            const tag = document.createElement("script");
            tag.src = YT_API_SRC;
            tag.async = true;
            document.head.appendChild(tag);
        }
    });
}
/** Format seconds → "X:YY" hoặc "X:YY:ZZ". */
function fmtTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
}

/** Dispatch custom event. */
function emit(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * Emit trạng thái hiện tại của overlay cho các listener bên ngoài
 * (vd: #player, audio player khác) để đồng bộ UI.
 *
 * @param {object} extra - fields sẽ merge vào detail
 */
function emitStateChanged(extra = {}) {
    const video = currentList[currentIndex] || null;
    emit("video-overlay:state-changed", {
        video,
        playing: isPlayingNow(),
        shuffle: isShuffleOn,
        repeat: isRepeatOn,
        volume: getVolume(),
        currentTime: getCurrentTime(),
        duration: getDuration(),
        listSize: currentList.length,
        index: currentIndex,
        ...extra,
    });
}

/** @returns {boolean} YT.Player đang phát không? */
function isPlayingNow() {
    if (!ytPlayer || typeof ytPlayer.getPlayerState !== "function") return false;
    try {
        return ytPlayer.getPlayerState() === window.YT?.PlayerState?.PLAYING;
    } catch {
        return false;
    }
}

/** @returns {number} volume hiện tại (0-100). Trả 100 nếu không đọc được. */
function getVolume() {
    if (!ytPlayer || typeof ytPlayer.getVolume !== "function") return 100;
    try {
        return ytPlayer.getVolume();
    } catch {
        return 100;
    }
}

/** @returns {number} currentTime (giây). Trả 0 nếu không đọc được. */
function getCurrentTime() {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== "function") return 0;
    try {
        return ytPlayer.getCurrentTime() || 0;
    } catch {
        return 0;
    }
}

/** @returns {number} duration (giây). Trả 0 nếu không đọc được. */
function getDuration() {
    if (!ytPlayer || typeof ytPlayer.getDuration !== "function") return 0;
    try {
        return ytPlayer.getDuration() || 0;
    } catch {
        return 0;
    }
}
/**
 * Tạo (hoặc replace) YT.Player với videoId mới. Destroy player cũ để tránh leak.
 *
 * Phase L-2.5: nhận `options = {}` để truyền `autoplay: 0` (khi restoreFromState
 * hoặc page detail — KHÔNG auto-play).
 *
 * @param {string} videoId
 * @param {object} [options]
 * @param {number} [options.autoplay=1] - 0 = paused, 1 = autoplay
 * @param {number} [options.startTime=0] - seek tới giây này sau khi ready
 */
async function createPlayer(videoId, options = {}) {
    const { autoplay = 1, startTime = 0 } = options;

    await loadYouTubeAPI();

    // Đợi thêm 1 frame để chắc YT.Player sẵn sàng
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    if (!window.YT || !window.YT.Player) {
        console.error("[video-overlay] YT.Player not available after API load");
        return;
    }

    // Destroy player cũ
    if (ytPlayer && typeof ytPlayer.destroy === "function") {
        try { ytPlayer.destroy(); } catch (_) { /* ignore */ }
        ytPlayer = null;
    }

    const container = document.querySelector("#video-overlay-iframe");
    if (!container) return;

    ytPlayer = new window.YT.Player(container, {
        videoId,
        playerVars: {
            autoplay,
            controls: 0, // ẨN controls YouTube — chỉ dùng custom controls
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1, // Cho phép API đọc currentTime/duration
        },
        events: {
            onReady: (e) => onPlayerReady(e, { startTime }),
            onStateChange: onPlayerStateChange,
        },
    });
}

/**
 * YT.Player onReady → start progress tracker + sync duration từ YouTube
 * (chính xác hơn metadata) + seek tới startTime nếu có.
 */
function onPlayerReady(event, { startTime = 0 } = {}) {
    if (!ytPlayer || typeof ytPlayer.getDuration !== "function") return;
    const total = ytPlayer.getDuration() || 0;
    if (total > 0) {
        const durationEl = document.querySelector("#video-overlay-duration-time");
        if (durationEl) durationEl.textContent = fmtTime(total);
    }

    // Seek tới startTime nếu có (restore từ F5)
    if (startTime > 0) {
        try { ytPlayer.seekTo(startTime, true); } catch (_) {}
    }

    startProgressTimer();
}

/**
 * Đồng bộ UI icon/class cho play btn của overlay.
 * @param {boolean} isPlaying
 */
function syncPlayButtons(isPlaying) {
    const overlayBtn = document.querySelector("#video-overlay-play-btn");
    const iconClass = isPlaying ? "fa-solid fa-pause" : "fa-solid fa-play";

    if (overlayBtn) {
        overlayBtn.classList.toggle("is-playing", isPlaying);
        const icon = overlayBtn.querySelector("i");
        if (icon) icon.className = iconClass;
    }

    emitStateChanged({ playing: isPlaying });
}

/**
 * YT.Player onStateChange → update UI theo state.
 * -1 unstarted | 0 ended | 1 playing | 2 paused | 3 buffering | 5 cued
 */
function onPlayerStateChange(event) {
    switch (event.data) {
        case window.YT.PlayerState.PLAYING:
            syncPlayButtons(true);
            startProgressTimer();
            // Broadcast — mình đang active
            setActive("video");
            break;

        case window.YT.PlayerState.PAUSED:
            syncPlayButtons(false);
            stopProgressTimer();

            // Chuyển về null nếu mình đang active
            if (getActive() === "video") {
                setActive(null);
            }

            // Force save currentTime khi pause (KHÔNG throttle).
            // Pause là action cuối thường gặp trước khi user F5/đóng tab →
            // cần save ngay để restore chính xác.
            if (currentList.length > 0 && currentList[currentIndex]) {
                const currentTime = ytPlayer && typeof ytPlayer.getCurrentTime === "function"
                    ? ytPlayer.getCurrentTime() || 0
                    : 0;
                savePlayerState({
                    video: {
                        currentVideo: {
                            id: currentList[currentIndex].id,
                            videoId: currentList[currentIndex].videoId,
                            title: currentList[currentIndex].title,
                            thumbnails: currentList[currentIndex].thumbnails || [],
                            artists: currentList[currentIndex].artists || [],
                            duration: currentList[currentIndex].duration,
                        },
                        currentTime,
                        volume: getVolume(),
                        isRepeatOn,
                        isShuffleOn,
                        relatedList: currentList.map((v) => ({
                            id: v.id,
                            videoId: v.videoId,
                            title: v.title,
                            thumbnails: v.thumbnails || [],
                            artists: v.artists || [],
                            duration: v.duration,
                        })),
                        currentIndex,
                    },
                });
            }
            break;

        case window.YT.PlayerState.ENDED:
            syncPlayButtons(false);
            stopProgressTimer();

            // User đã xem hết → clear slot
            clearPlayerState({ video: true });

            // Repeat ON → replay current (không push history)
            if (isRepeatOn) {
                playAt(currentIndex, false);
            } else {
                playNext();
            }

            if (getActive() === "video") {
                setActive(null);
            }
            break;
    }
}
/**
 * Render playlist submenu: gọi API lấy playlist của user rồi list ra.
 * @param {object} video
 */
async function showPlaylistSubmenu(video) {
    const submenu = document.querySelector("#video-overlay-playlist-submenu");
    const listEl = document.querySelector("#video-overlay-playlist-list");
    if (!submenu || !listEl) return;

    submenu.removeAttribute("hidden");
    listEl.innerHTML = `<p class="video-overlay__submenu-loading">Đang tải playlist…</p>`;

    try {
        const playlists = await playlistsService.getMyPlaylists();
        if (!playlists || playlists.length === 0) {
            listEl.innerHTML = `<p class="video-overlay__submenu-empty">Bạn chưa có playlist nào.</p>`;
            return;
        }
        listEl.innerHTML = playlists
            .map((p) => {
                const title = escapeHtml(p.title || "Không rõ tên");
                const slug = escapeHtml(p.slug || p.id || "");
                return `
                    <button type="button" class="video-overlay__submenu-item" data-slug="${slug}">
                        <i class="fa-solid fa-music"></i>
                        <span>${title}</span>
                    </button>
                `;
            })
            .join("");
    } catch (err) {
        console.error("[video-overlay] getMyPlaylists error:", err);
        listEl.innerHTML = `<p class="video-overlay__submenu-empty">Không thể tải playlist.</p>`;
    }
}

let _lastVideoPersistSave = 0;
const VIDEO_PERSIST_THROTTLE_MS = 5000; // 5 giây

function startProgressTimer() {
    stopProgressTimer();
    progressTimer = setInterval(() => {
        if (!ytPlayer || typeof ytPlayer.getCurrentTime !== "function") return;
        if (isProgressDraggingGlobal()) return;
        const current = ytPlayer.getCurrentTime() || 0;
        const total = ytPlayer.getDuration() || 0;
        // Chỉ update UI khi player thật sự ready (total > 0)
        if (total > 0) {
            updateProgressUI(current, total);
        }

        // Throttled save currentTime vào localStorage (mỗi 5s).
        // KHÔNG save khi user đang drag (đã check ở trên).
        // KHÔNG save khi video ENDED (current ≈ total) → coi như đã xem hết.
        const now = Date.now();
        if (
            currentList.length > 0 &&
            currentList[currentIndex] &&
            total > 0 &&
            current < total - 1 && // skip khi gần hết (1s buffer)
            now - _lastVideoPersistSave >= VIDEO_PERSIST_THROTTLE_MS
        ) {
            _lastVideoPersistSave = now;
            savePlayerState({
                video: {
                    currentVideo: {
                        id: currentList[currentIndex].id,
                        videoId: currentList[currentIndex].videoId,
                        title: currentList[currentIndex].title,
                        thumbnails: currentList[currentIndex].thumbnails || [],
                        artists: currentList[currentIndex].artists || [],
                        duration: currentList[currentIndex].duration,
                    },
                    currentTime: current,
                    volume: getVolume(),
                    isRepeatOn,
                    isShuffleOn,
                    relatedList: currentList.map((v) => ({
                        id: v.id,
                        videoId: v.videoId,
                        title: v.title,
                        thumbnails: v.thumbnails || [],
                        artists: v.artists || [],
                        duration: v.duration,
                    })),
                    currentIndex,
                },
            });
        }
    }, 250);
}

function stopProgressTimer() {
    if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
    }
}

function updateProgressUI(current, total) {
    const rangeEl = document.querySelector("#video-overlay-progress-range");
    const currentEl = document.querySelector("#video-overlay-current-time");
    const durationEl = document.querySelector("#video-overlay-duration-time");
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    if (rangeEl) rangeEl.value = String(percent);
    if (currentEl) currentEl.textContent = fmtTime(current);
    if (durationEl) durationEl.textContent = fmtTime(total);

    // Broadcast progress cho #player
    emitStateChanged({ currentTime: current, duration: total });
}

/** @returns {boolean} có đang drag progress bar không */
function isProgressDraggingGlobal() {
    return isProgressDragging;
}

/**
 * Bind full-drag progress bar: click bất kỳ đâu trên thanh hoặc drag thumb
 * đều seek tới vị trí đó.
 *
 * Behavior:
 *   - pointerdown trên track: tính percent từ clientX → set value → seek
 *   - input (drag thumb): set value → seek real-time
 *   - pointerup: set isProgressDragging=false → resume poll
 *
 * Trick: native `<input type="range">` chỉ seek khi click vào thumb.
 * Để click anywhere → seek, dùng pointerdown tính percent từ vị trí click.
 */
function bindProgressDrag({ rangeSelector, getTotal, seekTo, onSeek }) {
    const rangeEl = document.querySelector(rangeSelector);
    if (!rangeEl) return;

    // Idempotent
    if (rangeEl.dataset.dragBound === "1") return;
    rangeEl.dataset.dragBound = "1";

    const handleSeek = (percent) => {
        const total = getTotal() || 0;
        if (total <= 0) return;
        const targetTime = (Math.max(0, Math.min(100, percent)) / 100) * total;
        seekTo(targetTime);
        if (onSeek) onSeek(targetTime, percent);
    };

    const seekFromPointer = (e) => {
        const rect = rangeEl.getBoundingClientRect();
        const clientX = e.clientX ?? (e.touches?.[0]?.clientX ?? 0);
        if (!clientX) return;
        const percent = ((clientX - rect.left) / rect.width) * 100;
        handleSeek(percent);
    };

    rangeEl.addEventListener("pointerdown", (e) => {
        isProgressDragging = true;
        seekFromPointer(e);
        rangeEl.setPointerCapture?.(e.pointerId);
    });

    rangeEl.addEventListener("pointermove", (e) => {
        if (!isProgressDragging) return;
        seekFromPointer(e);
    });

    rangeEl.addEventListener("pointerup", (e) => {
        isProgressDragging = false;
        rangeEl.releasePointerCapture?.(e.pointerId);
    });

    rangeEl.addEventListener("pointercancel", () => {
        isProgressDragging = false;
    });

    rangeEl.addEventListener("input", (e) => {
        handleSeek(Number(e.target.value));
    });
}
function renderRelatedList(videos) {
    const container = document.querySelector("#video-overlay-related-list");
    if (!container) return;

    const list = Array.isArray(videos) ? videos : [];
    if (list.length === 0) {
        container.innerHTML = `<p class="video-overlay__related-empty">Chưa có video liên quan.</p>`;
        return;
    }

    container.innerHTML = list
        .map((v, i) => {
            const thumb = v.thumbnails?.[0] || "/images/quick-picks-01.jpg";
            const title = escapeHtml(v.title || "Không rõ tên");
            const duration = fmtTime(v.duration);
            const isActive = v.id === currentList[currentIndex]?.id;

            return `
                <button type="button"
                        class="video-overlay__related-item ${isActive ? "is-active" : ""}"
                        data-index="${i}"
                        aria-label="Phát ${title}">
                    <span class="video-overlay__related-num">${i + 1}</span>
                    <div class="video-overlay__related-media">
                        <img src="${escapeHtml(thumb)}" alt="${title}" loading="lazy" />
                        <span class="video-overlay__related-play"><i class="fa-solid fa-play"></i></span>
                    </div>
                    <div class="video-overlay__related-info">
                        <span class="video-overlay__related-name">${title}</span>
                        <span class="video-overlay__related-duration">${duration}</span>
                    </div>
                </button>
            `;
        })
        .join("");
}
/**
 * Load video vào player. Reset UI + emit state.
 *
 * Phase L-2.5: nhận `options = {}` để truyền `autoplay: 0` (khi restoreFromState
 * hoặc page detail — KHÔNG auto-play).
 *
 * @param {object} video
 * @param {object} [options]
 * @param {number} [options.autoplay=1]
 * @param {number} [options.startTime=0]
 */
async function loadVideo(video, options = {}) {
    const { autoplay = 1, startTime = 0 } = options;

    const titleEl = document.querySelector("#video-overlay-title");
    const subEl = document.querySelector("#video-overlay-subtitle");
    const rangeEl = document.querySelector("#video-overlay-progress-range");
    const currentEl = document.querySelector("#video-overlay-current-time");
    const durationEl = document.querySelector("#video-overlay-duration-time");

    if (rangeEl) rangeEl.value = 0;
    if (rangeEl) rangeEl.style.setProperty("--progress-fill", "0%");
    if (currentEl) currentEl.textContent = fmtTime(0);
    if (durationEl) durationEl.textContent = fmtTime(video.duration);
    if (titleEl) titleEl.textContent = video.title || "Không rõ tên";
    if (subEl) subEl.textContent = `Video ${currentIndex + 1} / ${currentList.length}`;

    // Update play button → "is-playing"
    syncPlayButtons(autoplay === 1);

    // Ghi nhận lịch sử nghe video vào localStorage.
    if (video && video.id) {
        recordListen({
            id: video.id,
            type: "video",
            title: video.title,
            thumbnails: video.thumbnails || (video.thumbnail ? [video.thumbnail] : []),
            artists: video.artists || (video.artist ? [video.artist] : []),
        });
    }

    // Save video state vào localStorage (currentVideo + relatedList + index).
    // Volume + currentTime sẽ update qua progressTimer.
    if (video && video.id) {
        savePlayerState({
            video: {
                currentVideo: {
                    id: video.id,
                    videoId: video.videoId,
                    title: video.title,
                    thumbnails: video.thumbnails || [],
                    artists: video.artists || [],
                    duration: video.duration,
                },
                currentTime: 0,
                volume: getVolume(),
                isRepeatOn,
                isShuffleOn,
                relatedList: currentList.map((v) => ({
                    id: v.id,
                    videoId: v.videoId,
                    title: v.title,
                    thumbnails: v.thumbnails || [],
                    artists: v.artists || [],
                    duration: v.duration,
                })),
                currentIndex,
            },
        });
    }

    // Create new YT.Player
    if (video.videoId) {
        await createPlayer(video.videoId, { autoplay, startTime });
    }

    // Broadcast video mới ra ngoài (#player update title/cover)
    emitStateChanged({ video });
}

function highlightActive() {
    // Sync active trong overlay (related list bên phải)
    const relatedItems = document.querySelectorAll(".video-overlay__related-item");
    relatedItems.forEach((el) => {
        const idx = Number(el.dataset.index);
        el.classList.toggle("is-active", idx === currentIndex);
    });

    // Sync active ở page bên ngoài (video-list__item ở sidebar / video-detail page)
    const current = currentList[currentIndex];
    const currentVideoId = current?.id || current?.videoId;
    if (!currentVideoId) return;

    const videoListItems = document.querySelectorAll(".video-list__item");
    videoListItems.forEach((el) => {
        const href = el.getAttribute("href") || "";
        const isMatch = href.endsWith(`/${encodeURIComponent(currentVideoId)}`)
            || href.endsWith(`/${currentVideoId}`);
        el.classList.toggle("is-active", isMatch);
    });
}

/**
 * Play video tại index, push vào history (nếu khác current).
 * Hàm play trung tâm — mọi entry point (initial open, click related,
 * next, prev, random) đều gọi qua đây.
 */
async function playAt(index, pushHistory = true) {
    if (index < 0 || index >= currentList.length) return;

    if (pushHistory && currentIndex !== -1 && currentIndex !== index) {
        playHistory.push(currentIndex);
        // Giữ history tối đa 50 phần tử
        if (playHistory.length > 50) playHistory.shift();
    }

    currentIndex = index;
    await loadVideo(currentList[index]);
    highlightActive();
}

/**
 * Next — shuffle-aware:
 * - shuffle ON  → random 1 bài khác current
 * - shuffle OFF → index+1 (wrap-around)
 */
function playNext() {
    if (currentList.length === 0) return;
    if (isShuffleOn) {
        playRandom();
    } else {
        playAt((currentIndex + 1) % currentList.length);
    }
}

/**
 * Prev — shuffle-aware:
 * - shuffle ON  → pop history (bài ngay trước trong lịch sử)
 * - shuffle OFF → index-1 (wrap-around)
 */
function playPrev() {
    if (currentList.length === 0) return;

    if (isShuffleOn && playHistory.length > 0) {
        const prevIndex = playHistory.pop();
        // Không push history khi đi theo history (tránh loop vô hạn)
        playAt(prevIndex, false);
    } else {
        playAt((currentIndex - 1 + currentList.length) % currentList.length);
    }
}

/** Random 1 bài khác current (cho shuffle). */
function playRandom() {
    if (currentList.length < 2) {
        playAt((currentIndex + 1) % currentList.length);
        return;
    }
    let r;
    let attempts = 0;
    do {
        r = Math.floor(Math.random() * currentList.length);
        attempts++;
    } while (r === currentIndex && attempts < 10);
    playAt(r);
}

/** Toggle shuffle ON/OFF. Cập nhật button `is-active` + icon. */
function toggleShuffle() {
    isShuffleOn = !isShuffleOn;
    const btn = document.querySelector("#video-overlay-shuffle-btn");
    btn?.classList.toggle("is-active", isShuffleOn);

    // Khi bật shuffle, reset history để prev bắt đầu từ current
    if (isShuffleOn) {
        playHistory = [];
    }

    emitStateChanged({ shuffle: isShuffleOn });
}

/** Toggle repeat ON/OFF (chỉ visual — ENDED event đã tự xử lý). */
function toggleRepeat() {
    isRepeatOn = !isRepeatOn;
    const btn = document.querySelector("#video-overlay-repeat-btn");
    btn?.classList.toggle("is-active", isRepeatOn);

    emitStateChanged({ repeat: isRepeatOn });
}

/** Toggle play/pause. Khi resume → player tự động phát tiếp từ currentTime. */
function togglePlay() {
    if (!ytPlayer || typeof ytPlayer.getPlayerState !== "function") return;
    const state = ytPlayer.getPlayerState();
    if (state === 1) {
        ytPlayer.pauseVideo();
    } else {
        ytPlayer.playVideo();
    }
}
function bindEvents() {
    document.querySelector("#video-overlay-close-btn")?.addEventListener("click", minimize);
    document.querySelector("#video-overlay-fullscreen-btn")?.addEventListener("click", toggleFullscreen);
    document.querySelector("#video-overlay-mini-expand-btn")?.addEventListener("click", expand);
    document.querySelector("#video-overlay-mini-close-btn")?.addEventListener("click", closeFull);

    // ===== OVERLAY CONTROLS =====
    document.querySelector("#video-overlay-play-btn")?.addEventListener("click", togglePlay);
    document.querySelector("#video-overlay-next-btn")?.addEventListener("click", playNext);
    document.querySelector("#video-overlay-prev-btn")?.addEventListener("click", playPrev);
    document.querySelector("#video-overlay-shuffle-btn")?.addEventListener("click", toggleShuffle);
    document.querySelector("#video-overlay-repeat-btn")?.addEventListener("click", toggleRepeat);

    // Lưu ý: khi minimize, isOpen=false nhưng player vẫn chạy (chỉ thu nhỏ).
    // Vậy phải check cả isMinimized.
    const isPlayerActive = () => isOpen || isMinimized;

    document.addEventListener("player:play-toggle", () => {
        if (!isPlayerActive()) return;
        togglePlay();
    });
    document.addEventListener("player:next", () => {
        if (!isPlayerActive()) return;
        playNext();
    });
    document.addEventListener("player:prev", () => {
        if (!isPlayerActive()) return;
        playPrev();
    });
    document.addEventListener("player:shuffle-toggle", () => {
        if (!isPlayerActive()) return;
        toggleShuffle();
    });
    document.addEventListener("player:repeat-toggle", () => {
        if (!isPlayerActive()) return;
        toggleRepeat();
    });

    // Close button ở #player → đóng overlay hoàn toàn (destroy player)
    document.addEventListener("player:close", () => {
        if (!isPlayerActive()) return;
        closeFull();
    });

    // User click vào track (cover/title) ở #player → expand mini lên overlay full
    document.addEventListener("player:expand-request", () => {
        if (!isPlayerActive()) return;
        if (isMinimized) {
            // Phase L-2.5: thay vì expand overlay full, navigate tới detail page
            // để UX khớp với audio (click cover → sang song detail).
            // Nếu vẫn muốn expand overlay, gọi expand().
            const current = currentList[currentIndex];
            const slug = current?.slug || current?.id;
            if (slug) {
                window.location.href = `/videos/details/${slug}`;
            }
        }
    });

    // User click action trong 3 chấm menu của #player → xử lý tương tự menu overlay
    document.addEventListener("player:menu-action", (e) => {
        if (!isPlayerActive()) return;
        const action = e.detail?.action;
        if (!action) return;

        document.querySelector("#player-menu")?.setAttribute("hidden", "");

        const video = currentList[currentIndex];
        if (!video) return;

        if (action === "add-playlist") {
            showPlaylistSubmenu(video);
        } else if (action === "share") {
            const slug = video.slug || video.id;
            const url = `${location.origin}/videos/details/${slug}`;
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(url).then(
                    () => showToast("Đã copy link vào clipboard"),
                    () => showToast("Không thể copy link", "error")
                );
            } else {
                showToast("Trình duyệt không hỗ trợ clipboard", "error");
            }
        } else if (action === "detail") {
            const slug = video.slug || video.id;
            if (slug) {
                emit("video-overlay:closed");
                window.location.href = `/videos/details/${slug}`;
            }
        }
    });

    // User kéo progress ở #player → seek tới percent đó
    document.addEventListener("player:progress-seek", (e) => {
        if (!isPlayerActive()) return;
        if (!ytPlayer || typeof ytPlayer.getDuration !== "function") return;
        const percent = e.detail?.percent;
        if (typeof percent !== "number") return;
        const total = ytPlayer.getDuration() || 0;
        if (total <= 0) return;
        const targetTime = (Math.max(0, Math.min(100, percent)) / 100) * total;
        ytPlayer.seekTo(targetTime, true);
        const currentEl = document.querySelector("#video-overlay-current-time");
        if (currentEl) currentEl.textContent = fmtTime(targetTime);
        emitStateChanged({ currentTime: targetTime, duration: total });
    });

    // User kéo volume slider ở #player → apply volume cho ytPlayer
    document.addEventListener("video-overlay:set-volume", (e) => {
        if (!isPlayerActive()) return;
        const v = e.detail?.volume;
        if (typeof v !== "number") return;
        updateVolumeUI(v);
    });

    // 3 chấm menu — toggle dropdown
    const menuBtn = document.querySelector("#video-overlay-menu-btn");
    const menuEl = document.querySelector("#video-overlay-menu");
    if (menuBtn && menuEl) {
        menuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = !menuEl.hidden;
            menuEl.hidden = isOpen;
        });
        // Click outside → đóng menu
        document.addEventListener("click", (e) => {
            if (!menuEl.contains(e.target) && e.target !== menuBtn) {
                menuEl.hidden = true;
            }
        });
        // ESC cũng đóng menu
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !menuEl.hidden) {
                menuEl.hidden = true;
                e.stopPropagation();
            }
        });
    }

    // Menu items
    document.querySelector("#video-overlay-menu")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".video-overlay__menu-item");
        if (!btn) return;
        const action = btn.dataset.action;
        const video = currentList[currentIndex];

        // "Thêm vào playlist" → mở submenu (KHÔNG đóng menu chính)
        if (action === "add-playlist") {
            showPlaylistSubmenu(video);
            return;
        }

        const menu = document.querySelector("#video-overlay-menu");
        if (menu) menu.hidden = true;

        if (action === "share") {
            const slug = video?.slug || video?.id;
            const url = `${location.origin}/videos/details/${slug}`;
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(url).then(
                    () => showToast("Đã copy link vào clipboard"),
                    () => showToast("Không thể copy link", "error")
                );
            } else {
                showToast("Trình duyệt không hỗ trợ clipboard", "error");
            }
        } else if (action === "detail") {
            const slug = video?.slug || video?.id;
            if (slug) {
                emit("video-overlay:closed");
                window.location.href = `/videos/details/${slug}`;
            }
        }
    });

    // Submenu — back button
    document.querySelector(".video-overlay__submenu-back")?.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelector("#video-overlay-playlist-submenu")?.setAttribute("hidden", "");
    });

    // Submenu — click playlist → add video
    document.querySelector("#video-overlay-playlist-list")?.addEventListener("click", async (e) => {
        const btn = e.target.closest(".video-overlay__submenu-item");
        if (!btn) return;
        const playlistSlug = btn.dataset.slug;
        const video = currentList[currentIndex];
        if (!playlistSlug || !video) return;

        btn.classList.add("is-loading");
        btn.disabled = true;

        try {
            await playlistsService.addVideoToPlaylist(playlistSlug, video.id);
            showToast(`Đã thêm "${video.title}" vào playlist`);
        } catch (err) {
            console.error("[video-overlay] add to playlist error:", err);
            showToast("Không thể thêm vào playlist", "error");
        } finally {
            btn.classList.remove("is-loading");
            btn.disabled = false;
            document.querySelector("#video-overlay-playlist-submenu")?.setAttribute("hidden", "");
            document.querySelector("#video-overlay-menu")?.setAttribute("hidden", "");
        }
    });

    // Volume — slider input → setVolume() + update number display
    const volSlider = document.querySelector("#video-overlay-volume-slider");
    const volValue = document.querySelector("#video-overlay-volume-value");
    const updateVolumeUI = (value) => {
        if (ytPlayer && typeof ytPlayer.setVolume === "function") {
            ytPlayer.setVolume(value);
        }
        if (volValue) volValue.textContent = String(value);

        // CSS var --vol để gradient track fill đúng % value
        if (volSlider) volSlider.style.setProperty("--vol", `${value}%`);

        const icon = document.querySelector("#video-overlay-volume-btn i");
        if (icon) {
            if (value === 0) icon.className = "fa-solid fa-volume-xmark";
            else if (value < 50) icon.className = "fa-solid fa-volume-low";
            else icon.className = "fa-solid fa-volume-high";
        }

        emitStateChanged({ volume: value });
    };
    volSlider?.addEventListener("input", (e) => {
        updateVolumeUI(Number(e.target.value));
    });

    // Init: set --vol ban đầu cho gradient track (mặc định 100)
    if (volSlider) {
        volSlider.style.setProperty("--vol", `${volSlider.value || 100}%`);
    }

    const volBtn = document.querySelector("#video-overlay-volume-btn");
    const volWrap = document.querySelector(".video-overlay__volume");
    const volPopover = document.querySelector(".video-overlay__volume-popover");

    // Track volume trước khi mute (để restore khi unmute)
    let lastVolume = 100;

    function showVolumePopover() {
        if (!volPopover) return;
        volPopover.hidden = false;
        volWrap?.classList.add("is-active");
    }
    function hideVolumePopover() {
        if (!volPopover) return;
        volPopover.hidden = true;
        volWrap?.classList.remove("is-active");
    }

    // Click button → toggle mute/unmute
    volBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        const currentSliderValue = Number(volSlider?.value || 0);
        if (currentSliderValue > 0) {
            lastVolume = currentSliderValue;
            if (volSlider) volSlider.value = "0";
            updateVolumeUI(0);
        } else {
            const restore = lastVolume > 0 ? lastVolume : 100;
            if (volSlider) volSlider.value = String(restore);
            updateVolumeUI(restore);
        }
    });

    volWrap?.addEventListener("mouseenter", showVolumePopover);
    volWrap?.addEventListener("mouseleave", hideVolumePopover);

    document.addEventListener("click", (e) => {
        if (!volPopover || volPopover.hidden) return;
        if (volWrap && !volWrap.contains(e.target)) {
            hideVolumePopover();
        }
    });

    volSlider?.addEventListener("mouseenter", () => {
        volValue?.classList.add("is-visible");
    });
    volSlider?.addEventListener("mouseleave", () => {
        volValue?.classList.remove("is-visible");
    });

    // Related list — event delegation
    document.querySelector("#video-overlay-related-list")?.addEventListener("click", (e) => {
        const btn = e.target.closest(".video-overlay__related-item");
        if (!btn) return;
        const idx = Number(btn.dataset.index);
        if (Number.isInteger(idx)) playAt(idx);
    });

    // Progress bar — full drag
    bindProgressDrag({
        rangeSelector: "#video-overlay-progress-range",
        getTotal: () =>
            ytPlayer && typeof ytPlayer.getDuration === "function"
                ? ytPlayer.getDuration() || 0
                : 0,
        seekTo: (seconds) => {
            if (ytPlayer && typeof ytPlayer.seekTo === "function") {
                ytPlayer.seekTo(seconds, true);
            }
        },
        onSeek: (targetTime) => {
            const currentEl = document.querySelector("#video-overlay-current-time");
            if (currentEl) currentEl.textContent = fmtTime(targetTime);
        },
    });

    // Esc để đóng overlay
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isOpen) close();
    });
}
/** Mount overlay vào body (idempotent). */
export function mount() {
    if (mounted) return;
    if (document.querySelector(`#${OVERLAY_ID}`)) {
        mounted = true;
        bindEvents();
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildOverlayHTML();
    while (wrapper.firstChild) {
        document.body.appendChild(wrapper.firstChild);
    }

    mounted = true;
    bindEvents();

    // Preload YouTube API (không đợi)
    loadYouTubeAPI().catch((err) => console.error("[video-overlay] YT API load fail:", err));
}

/**
 * Mở overlay với video + related list.
 *
 * Phase L-2.5: nhận `options = {}` để truyền `autoplay: 0` (khi restoreFromState
 * hoặc page detail — KHÔNG auto-play để tránh 2 media cùng chạy).
 *
 * @param {object} video - Video đang phát
 * @param {object[]} relatedList - Array video dedupe (current ở đầu)
 * @param {object} [options]
 * @param {boolean} [options.startAsMini=false] - Nếu true → chỉ hiện mini-player
 * @param {number} [options.autoplay=1] - 0 = paused, 1 = autoplay
 * @param {number} [options.startTime=0] - seek tới giây này
 */
export async function open(video, relatedList = [], options = {}) {
    if (!video || !video.id) return;

    const {
        startAsMini = false,
        autoplay = 1,
        startTime = 0,
    } = options;

    mount();

    // Set state
    currentList = Array.isArray(relatedList) && relatedList.length > 0
        ? relatedList
        : [video];
    currentIndex = currentList.findIndex((v) => v.id === video.id);
    if (currentIndex < 0) {
        currentIndex = 0;
        currentList = [video, ...currentList];
    }

    // Reset play history + mode state
    playHistory = [];
    isShuffleOn = false;
    isRepeatOn = false;

    document.querySelector("#video-overlay-shuffle-btn")?.classList.remove("is-active");
    document.querySelector("#video-overlay-repeat-btn")?.classList.remove("is-active");

    renderRelatedList(currentList);

    // Load video (truyền autoplay + startTime)
    await loadVideo(currentList[currentIndex], { autoplay, startTime });

    if (startAsMini) {
        const overlay = document.querySelector(`#${OVERLAY_ID}`);
        overlay?.classList.add("is-minimized");
        overlay?.setAttribute("aria-hidden", "true");

        isOpen = false;
        isMinimized = true;
        document.body.style.overflow = "";

        emit("video-overlay:minimized");
    } else {
        const overlay = document.querySelector(`#${OVERLAY_ID}`);
        overlay?.classList.remove("is-minimized");
        overlay?.removeAttribute("hidden");
        overlay?.classList.add("is-open");
        overlay?.setAttribute("aria-hidden", "false");

        document.body.style.overflow = "hidden";

        isOpen = true;
        isMinimized = false;
        emit("video-overlay:opened", { video });
    }

    highlightActive();
}

/** Đóng overlay → minimize (player vẫn phát nhạc, chỉ thu nhỏ UI). */
export function close() {
    minimize();
}

/** Thu nhỏ overlay về mini mode. */
export function minimize() {
    setMiniMode(true);
}

/** Phóng to từ mini mode lên overlay full. */
export function expand() {
    setMiniMode(false);
}

/**
 * Toggle mini mode. Internal — dùng chung cho minimize/expand.
 *
 * Phase 8.5 v9.2 fix: 2 class `is-open` + `is-minimized` phải EXCLUSIVE —
 * luôn remove class không liên quan trước khi add.
 */
function setMiniMode(mini) {
    const overlay = document.querySelector(`#${OVERLAY_ID}`);
    if (!overlay) return;

    if (mini) {
        overlay.classList.remove("is-open");
        overlay.classList.add("is-minimized");
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        isOpen = false;
        isMinimized = true;
        emit("video-overlay:minimized");
    } else {
        overlay.classList.remove("is-minimized");
        overlay.classList.add("is-open");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        isOpen = true;
        isMinimized = false;
        emit("video-overlay:expanded");
    }
}

/** Đóng hoàn toàn (destroy player, dừng video). */
export function closeFull() {
    const overlay = document.querySelector(`#${OVERLAY_ID}`);

    // Pause + destroy player
    if (ytPlayer && typeof ytPlayer.pauseVideo === "function") {
        try { ytPlayer.pauseVideo(); } catch (_) {}
    }
    if (ytPlayer && typeof ytPlayer.destroy === "function") {
        try { ytPlayer.destroy(); } catch (_) {}
        ytPlayer = null;
    }

    stopProgressTimer();

    // Clear current track
    currentList = [];
    currentIndex = -1;

    overlay?.classList.remove("is-open", "is-minimized");
    overlay?.setAttribute("hidden", "");
    overlay?.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
    isOpen = false;
    isMinimized = false;

    // Clear active
    if (getActive() === "video") {
        setActive(null);
    }

    // Force remove class is-visible ngay (giống ejectSong pattern)
    document.querySelector("#player")?.classList.remove("is-visible");
    resetPlayerUIForClose();

    // Clear video slot
    clearPlayerState({ video: true });

    // Emit state-changed
    emitStateChanged();
    emit("video-overlay:closed");
}

/**
 * Khôi phục video state từ localStorage.
 *
 * Hiển thị ở mini-player (góc dưới phải) dạng "stopped" (KHÔNG auto-play).
 *
 * @param {object} persisted - { currentVideo, currentTime, volume, isRepeatOn, isShuffleOn, relatedList, currentIndex }
 */
export async function restoreFromState(persisted) {
    if (!persisted || !persisted.currentVideo || !persisted.currentVideo.id) {
        console.warn("[videoOverlay] restoreFromState: invalid state");
        return;
    }

    log("restoreFromState()", persisted);

    // 1. Set state
    currentList = Array.isArray(persisted.relatedList) && persisted.relatedList.length > 0
        ? persisted.relatedList
        : [persisted.currentVideo];
    currentIndex = persisted.currentIndex || 0;
    if (currentIndex < 0 || currentIndex >= currentList.length) {
        currentIndex = 0;
    }
    isShuffleOn = !!persisted.isShuffleOn;
    isRepeatOn = !!persisted.isRepeatOn;
    playHistory = [];

    // 2. Reset toggle UI
    document.querySelector("#video-overlay-shuffle-btn")?.classList.toggle("is-active", isShuffleOn);
    document.querySelector("#video-overlay-repeat-btn")?.classList.toggle("is-active", isRepeatOn);

    // 3. Render related list UI
    renderRelatedList(currentList);

    // 4. Mở mini + load video (autoplay=0 để KHÔNG tự play)
    await open(currentList[currentIndex], currentList, {
        startAsMini: true,
        autoplay: 0,
        startTime: persisted.currentTime || 0,
    });

    // 5. Set volume (sau khi player ready — open đã đợi createPlayer)
    if (persisted.volume != null && ytPlayer && typeof ytPlayer.setVolume === "function") {
        try { ytPlayer.setVolume(persisted.volume); } catch (_) {}
    }

    // 6. Update toggle UI cho shuffle/repeat
    document.querySelector("#video-overlay-shuffle-btn")?.classList.toggle("is-active", isShuffleOn);
    document.querySelector("#video-overlay-repeat-btn")?.classList.toggle("is-active", isRepeatOn);
}

/**
 * Reset #player UI về empty state khi close video.
 * Mirror `_resetPlayerUI()` của audioPlayer.
 */
function resetPlayerUIForClose() {
    const titleEl = document.querySelector(".player__title");
    const coverEl = document.querySelector(".player__cover");
    const timeEl = document.querySelector(".player__time");
    const progressBar = document.querySelector(".player__progress-bar");

    if (titleEl) {
        titleEl.textContent = "Chưa phát";
        titleEl.removeAttribute("data-current-song-id");
    }
    if (coverEl) coverEl.src = "/images/album-01.jpg";
    if (timeEl) timeEl.textContent = "0:00 / 0:00";
    if (progressBar) {
        progressBar.value = "0";
        progressBar.style.setProperty("--progress-fill", "0%");
    }
}
//
// Port pattern từ code gốc `base.js:5396-5410` (class video destroy).
// Khi user chuyển sang audio hoặc load video mới, PHẢI eject sạch state
// của video cũ. KHÔNG pause-thuần (giữ iframe + currentList).
//
// Flow:
//   1. Pause + destroy YT.Player (xóa iframe khỏi DOM)
//   2. Clear currentList / currentIndex / playHistory / shuffle / repeat
//   3. Clear active → trigger `media:active-changed` (audio sẽ eject)
//   4. Ẩn overlay UI (giữ DOM sẵn sàng cho video mới)
//   5. Emit state-changed
//
// KHÁC closeFull(): closeFull cũng ẩn overlay hoàn toàn.
// ejectVideo() giữ overlay DOM sẵn sàng load video mới.
export function ejectVideo() {
    log("ejectVideo()");

    // 1. Pause + destroy YT.Player
    if (ytPlayer && typeof ytPlayer.pauseVideo === "function") {
        try { ytPlayer.pauseVideo(); } catch (_) {}
    }
    if (ytPlayer && typeof ytPlayer.destroy === "function") {
        try { ytPlayer.destroy(); } catch (_) {}
    }
    ytPlayer = null;

    // 2. Stop progress timer
    stopProgressTimer();

    // 3. Clear state
    currentList = [];
    currentIndex = -1;
    playHistory = [];
    isShuffleOn = false;
    isRepeatOn = false;

    // 4. Ẩn overlay UI
    const overlay = document.querySelector(`#${OVERLAY_ID}`);
    overlay?.classList.remove("is-open", "is-minimized");
    overlay?.setAttribute("hidden", "");
    overlay?.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    isOpen = false;
    isMinimized = false;

    // 5. Reset UI overlay
    const titleEl = document.querySelector("#video-overlay-title");
    const subEl = document.querySelector("#video-overlay-subtitle");
    const rangeEl = document.querySelector("#video-overlay-progress-range");
    const currentEl = document.querySelector("#video-overlay-current-time");
    const durationEl = document.querySelector("#video-overlay-duration-time");
    const iframeContainer = document.querySelector("#video-overlay-iframe");

    if (titleEl) titleEl.textContent = "";
    if (subEl) subEl.textContent = "";
    if (rangeEl) {
        rangeEl.value = "0";
        rangeEl.style.setProperty("--progress-fill", "0%");
    }
    if (currentEl) currentEl.textContent = fmtTime(0);
    if (durationEl) durationEl.textContent = fmtTime(0);

    if (iframeContainer) iframeContainer.innerHTML = "";

    // 6. Clear active
    if (getActive() === "video") {
        setActive(null);
    }

    // 7. Emit state-changed
    emitStateChanged();
    emit("video-overlay:closed");
}

// Helper log (debug)
const DEBUG = false;
function log(...args) {
    if (DEBUG) console.log("[video-overlay]", ...args);
}

/** Toggle fullscreen (dùng YouTube Player API nếu có, fallback native). */
export function toggleFullscreen() {
    const overlay = document.querySelector(`#${OVERLAY_ID}`);

    if (ytPlayer && typeof ytPlayer.getIframe === "function") {
        try {
            const iframe = ytPlayer.getIframe();
            if (iframe) {
                if (document.fullscreenElement) {
                    document.exitFullscreen?.();
                } else {
                    iframe.requestFullscreen?.() || overlay?.requestFullscreen?.();
                }
                return;
            }
        } catch (_) {
            /* fallback */
        }
    }

    if (document.fullscreenElement) {
        document.exitFullscreen?.();
    } else {
        overlay?.requestFullscreen?.();
    }
}

/** @returns {boolean} */
export function isOpenNow() {
    return isOpen;
}
//
// Khi audioPlayer setActive("audio") → video PHẢI eject (destroy + clear).
// Listen qua document event (không import audioPlayer) → tránh circular dep.
document.addEventListener("media:active-changed", (e) => {
    const active = e.detail?.active;
    if (active === "audio") {
        ejectVideo();
    }
});

// Backup: cũng listen `media:audio-takeover` (defensive layer).
document.addEventListener("media:audio-takeover", () => {
    ejectVideo();
});

export default { mount, open, close, restoreFromState, isOpen: isOpenNow };
