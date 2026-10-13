import { escapeHtml } from "@/utils/format.js";
import { toast } from "@/libs/toast.js";
import { playlistsService } from "@/services/playlistsService.js";
import { setActive, getActive } from "@/state/mediaState.js";
import { recordListen } from "@/state/listenHistory.js";
import {
    savePlayerState,
    clearPlayerState,
} from "@/state/playerPersistState.js";

const OVERLAY_ID = "video-overlay";
const Z_INDEX = 1000;
const YT_API_SRC = "https://www.youtube.com/iframe_api";

function showToast(message, variant = "success") {
    if (variant === "error") toast.error(message);
    else toast.success(message);
}

// ======================================================
// HTML TEMPLATE
// ======================================================

function buildOverlayHTML() {
    return `
        <div id="${OVERLAY_ID}" class="video-overlay" aria-hidden="true" hidden>
            <!-- Drag handle (chỉ visual, không draggable thật) -->
            <div class="video-overlay__drag-handle" aria-hidden="true"></div>

            <!-- Top action buttons: chỉ close -->
            <div class="video-overlay__top-actions">
                <button id="video-overlay-close-btn" class="video-overlay__top-btn" type="button"
                        aria-label="Đóng trình phát" title="Đóng">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <!-- Main grid: player (left, 2 cols) + related list (right, 1 col) -->
            <div class="video-overlay__grid">

                <!-- LEFT: Player + title + controls + progress -->
                <section class="video-overlay__player-col">
                    <div class="video-overlay__iframe-wrap">
                        <!-- YT.Player sẽ replace div này thành iframe.
                             controls=0 để ẩn controls của YouTube → chỉ dùng controls custom. -->
                        <div id="video-overlay-iframe"></div>

                        <!-- 2 nút absolute hiện khi is-minimized (góc trên-trái và trên-phải của iframe) -->
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

                    <!-- Custom controls -->
                    <div class="video-overlay__controls">
                        <div class="video-overlay__menu-wrap">
                            <button id="video-overlay-menu-btn" class="video-overlay__ctrl" type="button"
                                    aria-label="Tùy chọn">
                                <i class="fa-solid fa-ellipsis-vertical"></i>
                            </button>

                            <!-- 3 chấm dropdown menu -->
                            <div id="video-overlay-menu" class="video-overlay__menu" hidden>
                                <button class="video-overlay__menu-item" type="button" data-action="add-playlist">
                                    <i class="fa-solid fa-list-ul"></i>
                                    <span>Thêm vào playlist</span>
                                    <i class="fa-solid fa-chevron-right video-overlay__menu-arrow"></i>
                                </button>

                                <!-- Submenu: chọn playlist (ẩn mặc định, hiện khi hover/click "Thêm vào playlist") -->
                                <div id="video-overlay-playlist-submenu" class="video-overlay__submenu" hidden>
                                    <div class="video-overlay__submenu-header">
                                        <button type="button" class="video-overlay__submenu-back" aria-label="Quay lại">
                                            <i class="fa-solid fa-chevron-left"></i>
                                        </button>
                                        <span>Chọn playlist</span>
                                    </div>
                                    <div id="video-overlay-playlist-list" class="video-overlay__submenu-list">
                                        <!-- Render bằng renderPlaylistSubmenu() -->
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

                        <!-- Volume control (icon + popover với slider dọc + số 1-100) -->
                        <div class="video-overlay__volume">
                            <button id="video-overlay-volume-btn" class="video-overlay__ctrl" type="button"
                                    aria-label="Âm lượng">
                                <i class="fa-solid fa-volume-high"></i>
                            </button>
                            <!-- Popover hiện khi click nút volume -->
                            <div class="video-overlay__volume-popover" hidden>
                                <span id="video-overlay-volume-value" class="video-overlay__volume-value">100</span>
                                <!-- Wrapper fixed 100x4 quanh slider xoay dọc,
                                     giúp slider căn giữa trong popover -->
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

                        <!-- Fullscreen button (chuyển từ top-actions vào controls) -->
                        <button id="video-overlay-fullscreen-btn" class="video-overlay__ctrl" type="button"
                                aria-label="Toàn màn hình" title="Toàn màn hình">
                            <i class="fa-solid fa-expand"></i>
                        </button>
                    </div>

                    <!-- Progress bar (giống mẫu Tailwind: accent-red-500 + current/duration dưới) -->
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

                <!-- RIGHT: Related videos list -->
                <aside class="video-overlay__related">
                    <h3 class="video-overlay__related-title">Danh sách phát liên quan</h3>
                    <div id="video-overlay-related-list" class="video-overlay__related-list">
                        <!-- Render bằng renderRelatedList() -->
                    </div>
                </aside>
            </div>
        </div>
    `;
}

// ======================================================
// SINGLETON STATE
// ======================================================

let mounted = false;
let isOpen = false;
let isMinimized = false; // true = đang ở mini-player (góc), không phải overlay full
let currentList = []; // {id, title, thumbnails, duration, videoId}
let currentIndex = -1;
let ytPlayer = null;
let progressTimer = null;

// Flag: user đang drag progress bar ở BẤT KỲ thanh nào (overlay / #player)
// → progressTimer sẽ skip poll để không giật ngược lại vị trí
let isProgressDragging = false;

// Player mode
let isShuffleOn = false;
let isRepeatOn = false;

// History stack: track thứ tự đã phát để prev "back" theo history
// (không phải index-1, mà là bài ngay trước trong lịch sử nghe)
let playHistory = []; // [index, ...] thứ tự đã phát

// Queue YT.Player init nếu API chưa ready
let pendingVideoOnReady = null; // {videoId, containerId}

// ======================================================
// YOUTUBE IFRAME API LOADER
// ======================================================

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

        // Set callback TRƯỚC khi script load (YouTube sẽ gọi khi ready)
        const prevCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prevCallback?.();
            resolve();
        };

        // Inject script nếu chưa có
        const existing = document.querySelector(`script[src="${YT_API_SRC}"]`);
        if (!existing) {
            const tag = document.createElement("script");
            tag.src = YT_API_SRC;
            tag.async = true;
            document.head.appendChild(tag);
        }
    });
}

// ======================================================
// HELPERS
// ======================================================

/**
 * Format duration (giây) → "X:YY" hoặc "X:YY:ZZ".
 * @param {number} seconds
 */
function fmtTime(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0)
        return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Dispatch custom event.
 */
function emit(name, detail = {}) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
}

/**
 * Emit trạng thái hiện tại của overlay cho các listener bên ngoài
 * (vd: #player, audio player khác) để đồng bộ UI.
 *
 * Detail:
 *   - video      : video hiện tại (currentList[currentIndex]) hoặc null
 *   - playing    : boolean — YT.Player đang phát?
 *   - shuffle    : boolean — shuffle mode
 *   - repeat     : boolean — repeat mode
 *   - volume     : number 0-100
 *   - currentTime: number (giây) — vị trí hiện tại
 *   - duration   : number (giây) — tổng thời gian
 *   - listSize   : number — độ dài currentList
 *   - index      : number — currentIndex
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

/**
 * Helper: YT.Player đang phát không?
 */
function isPlayingNow() {
    if (!ytPlayer || typeof ytPlayer.getPlayerState !== "function")
        return false;
    try {
        return ytPlayer.getPlayerState() === window.YT?.PlayerState?.PLAYING;
    } catch {
        return false;
    }
}

/**
 * Helper: lấy volume hiện tại (0-100). Trả 100 nếu không đọc được.
 */
function getVolume() {
    if (!ytPlayer || typeof ytPlayer.getVolume !== "function") return 100;
    try {
        return ytPlayer.getVolume();
    } catch {
        return 100;
    }
}

/**
 * Helper: lấy currentTime (giây). Trả 0 nếu không đọc được.
 */
function getCurrentTime() {
    if (!ytPlayer || typeof ytPlayer.getCurrentTime !== "function") return 0;
    try {
        return ytPlayer.getCurrentTime() || 0;
    } catch {
        return 0;
    }
}

/**
 * Helper: lấy duration (giây). Trả 0 nếu không đọc được.
 */
function getDuration() {
    if (!ytPlayer || typeof ytPlayer.getDuration !== "function") return 0;
    try {
        return ytPlayer.getDuration() || 0;
    } catch {
        return 0;
    }
}

// ======================================================
// YT.PLAYER MANAGEMENT
// ======================================================

/**
 * Tạo (hoặc replace) YT.Player với videoId mới.
 * Destroy player cũ để tránh leak.
 * @param {string} videoId
 */
async function createPlayer(videoId) {
    await loadYouTubeAPI();

    // Đợi thêm 1 frame để chắc YT.Player sẵn sàng (fix edge case khi script vừa load xong)
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    if (!window.YT || !window.YT.Player) {
        console.error("[video-overlay] YT.Player not available after API load");
        return;
    }

    // Destroy player cũ
    if (ytPlayer && typeof ytPlayer.destroy === "function") {
        try {
            ytPlayer.destroy();
        } catch (_) {
            /* ignore */
        }
        ytPlayer = null;
    }

    // Container đã tồn tại (#video-overlay-iframe)
    const container = document.querySelector("#video-overlay-iframe");
    if (!container) return;

    ytPlayer = new window.YT.Player(container, {
        videoId,
        playerVars: {
            autoplay: 1,
            controls: 0, // ẨN controls YouTube — chỉ dùng custom controls
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            enablejsapi: 1, // Cho phép API đọc currentTime/duration
        },
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
        },
    });
}

/**
 * YT.Player onReady → start progress tracker + sync duration từ YouTube (chính xác hơn metadata).
 */
function onPlayerReady(event) {
    if (!ytPlayer || typeof ytPlayer.getDuration !== "function") return;
    const total = ytPlayer.getDuration() || 0;
    if (total > 0) {
        const durationEl = document.querySelector(
            "#video-overlay-duration-time",
        );
        if (durationEl) durationEl.textContent = fmtTime(total);
    }
    startProgressTimer();
}

/**
 * YT.Player onStateChange → update UI theo state.
 * -1 unstarted | 0 ended | 1 playing | 2 paused | 3 buffering | 5 cued
 */
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

    // Broadcast state ra ngoài cho #player
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

            // Phase 8.5 v7: Broadcast — mình đang active
            setActive("video");
            break;
        case window.YT.PlayerState.PAUSED:
            syncPlayButtons(false);
            stopProgressTimer();

            // Broadcast — chuyển về null nếu mình đang active
            if (getActive() === "video") {
                setActive(null);
            }

            if (currentList.length > 0 && currentList[currentIndex]) {
                const currentTime =
                    ytPlayer && typeof ytPlayer.getCurrentTime === "function"
                        ? ytPlayer.getCurrentTime() || 0
                        : 0;
                savePlayerState({
                    video: {
                        currentVideo: {
                            id: currentList[currentIndex].id,
                            videoId: currentList[currentIndex].videoId,
                            title: currentList[currentIndex].title,
                            thumbnails:
                                currentList[currentIndex].thumbnails || [],
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
                        wasActive: true,
                    },
                });
            }
            break;
        case window.YT.PlayerState.ENDED:
            syncPlayButtons(false);
            stopProgressTimer();

            clearPlayerState({ video: true });

            // Repeat ON → replay current video (không push history)
            if (isRepeatOn) {
                playAt(currentIndex, false);
            } else {
                // shuffle ON/OFF đã được handle trong playNext()
                playNext();
            }

            // Broadcast — video ended → không còn active
            if (getActive() === "video") {
                setActive(null);
            }
            break;
    }
}

// ======================================================
// PROGRESS TRACKER (poll currentTime thật từ YT.Player)
// ======================================================

/**
 * Render playlist submenu: gọi API lấy playlist của user rồi list ra.
 * @param {object} video
 */
async function showPlaylistSubmenu(video) {
    const submenu = document.querySelector("#video-overlay-playlist-submenu");
    const listEl = document.querySelector("#video-overlay-playlist-list");
    if (!submenu || !listEl) return;

    // Hiện submenu + loading state
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
        // Skip poll nếu user đang drag progress bar (tránh giật ngược)
        if (isProgressDraggingGlobal()) return;
        const current = ytPlayer.getCurrentTime() || 0;
        const total = ytPlayer.getDuration() || 0;
        // Chỉ update UI khi player thật sự ready (total > 0)
        // Tránh ghi đè duration ban đầu từ API trong khi YT.Player đang buffer
        if (total > 0) {
            updateProgressUI(current, total);
        }

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
                    wasActive: true,
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

    // Broadcast progress cho #player (mỗi 250ms)
    // Lưu ý: poll đã check `isProgressDragging` → chỉ broadcast khi không drag
    emitStateChanged({ currentTime: current, duration: total });
}

/**
 * Helper: kiểm tra có đang drag progress bar không (dùng để skip progressTimer poll).
 */
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
 * @param {object} options
 * @param {string} options.rangeSelector - CSS selector cho <input type="range">
 * @param {() => number} options.getTotal - Trả về duration (giây) hiện tại
 * @param {(seconds: number) => void} options.seekTo - Seek video tới giây
 * @param {(targetTime: number, percent: number) => void} [options.onSeek] - Callback mỗi lần seek
 */
function bindProgressDrag({ rangeSelector, getTotal, seekTo, onSeek }) {
    const rangeEl = document.querySelector(rangeSelector);
    if (!rangeEl) return;

    // Idempotent: nếu đã bind rồi thì skip
    if (rangeEl.dataset.dragBound === "1") return;
    rangeEl.dataset.dragBound = "1";

    const handleSeek = (percent) => {
        const total = getTotal() || 0;
        if (total <= 0) return;
        const targetTime = (Math.max(0, Math.min(100, percent)) / 100) * total;
        seekTo(targetTime);
        if (onSeek) onSeek(targetTime, percent);
    };

    // --- Click anywhere trên track → seek ngay ---
    // Trick: native <input type="range"> chỉ seek khi click vào thumb.
    // Để click anywhere → seek, dùng pointerdown để tính percent từ vị trí click.
    const seekFromPointer = (e) => {
        const rect = rangeEl.getBoundingClientRect();
        const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
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

    // Native input event (drag thumb) → cũng seek
    rangeEl.addEventListener("input", (e) => {
        handleSeek(Number(e.target.value));
    });
}

// ======================================================
// RENDER RELATED LIST
// ======================================================

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

// ======================================================
// PLAYBACK HELPERS
// ======================================================

async function loadVideo(video) {
    const titleEl = document.querySelector("#video-overlay-title");
    const subEl = document.querySelector("#video-overlay-subtitle");
    const rangeEl = document.querySelector("#video-overlay-progress-range");
    const currentEl = document.querySelector("#video-overlay-current-time");
    const durationEl = document.querySelector("#video-overlay-duration-time");

    // Reset UI — dùng duration từ metadata API (fallback khi YT.Player chưa ready)
    if (rangeEl) rangeEl.value = 0;
    if (rangeEl) rangeEl.style.setProperty("--progress-fill", "0%");
    if (currentEl) currentEl.textContent = fmtTime(0);
    if (durationEl) durationEl.textContent = fmtTime(video.duration);
    if (titleEl) titleEl.textContent = video.title || "Không rõ tên";
    if (subEl)
        subEl.textContent = `Video ${currentIndex + 1} / ${currentList.length}`;

    // Update play button → "is-playing" (autoplay=1, cả overlay + mini)
    syncPlayButtons(true);

    // Phase 14.9: Ghi nhận lịch sử nghe video vào localStorage.
    // Chỉ ghi khi video có id hợp lệ (skip nếu null/undefined).
    if (video && video.id) {
        recordListen({
            id: video.id,
            type: "video",
            title: video.title,
            thumbnails:
                video.thumbnails || (video.thumbnail ? [video.thumbnail] : []),
            artists: video.artists || (video.artist ? [video.artist] : []),
        });
    }

    // Volume + currentTime sẽ được update qua progressTimer.
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
                currentTime: 0, // sẽ được update bởi progressTimer
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
                wasActive: true,
            },
        });
    }

    // Create new YT.Player (auto-destroy player cũ)
    if (video.videoId) {
        await createPlayer(video.videoId);
    }

    // Broadcast video mới ra ngoài (#player sẽ update title/cover)
    emitStateChanged({ video });
}

function highlightActive() {
    // Sync active trong overlay (related list bên phải)
    const relatedItems = document.querySelectorAll(
        ".video-overlay__related-item",
    );
    relatedItems.forEach((el) => {
        const idx = Number(el.dataset.index);
        el.classList.toggle("is-active", idx === currentIndex);
    });

    // Sync active ở page bên ngoài (video-list__item ở sidebar / video-detail page)
    // dựa trên id của bài đang phát (vì href render từ `id` MongoDB).
    // Ưu tiên `id` (24-char MongoDB) vì href dùng id, fallback `videoId` (YouTube 11-char).
    const current = currentList[currentIndex];
    const currentVideoId = current?.id || current?.videoId;
    if (!currentVideoId) return;

    const videoListItems = document.querySelectorAll(".video-list__item");
    videoListItems.forEach((el) => {
        const href = el.getAttribute("href") || "";
        // href dạng /videos/details/:id — match id ở cuối
        const isMatch =
            href.endsWith(`/${encodeURIComponent(currentVideoId)}`) ||
            href.endsWith(`/${currentVideoId}`);
        el.classList.toggle("is-active", isMatch);
    });
}

/**
 * Play video tại index, push vào history (nếu khác current).
 * Đây là hàm play trung tâm — mọi entry point (initial open, click related,
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

/**
 * Random 1 bài khác current (cho shuffle).
 */
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

/**
 * Toggle shuffle ON/OFF. Cập nhật button `is-active` + icon.
 */
function toggleShuffle() {
    isShuffleOn = !isShuffleOn;
    const btn = document.querySelector("#video-overlay-shuffle-btn");
    btn?.classList.toggle("is-active", isShuffleOn);

    // Khi bật shuffle, reset history để prev bắt đầu từ current
    if (isShuffleOn) {
        playHistory = [];
    }

    // Broadcast state cho #player
    emitStateChanged({ shuffle: isShuffleOn });
}

/**
 * Toggle repeat ON/OFF (chỉ visual — ENDED event đã tự xử lý).
 */
function toggleRepeat() {
    isRepeatOn = !isRepeatOn;
    const btn = document.querySelector("#video-overlay-repeat-btn");
    btn?.classList.toggle("is-active", isRepeatOn);

    // Broadcast state cho #player
    emitStateChanged({ repeat: isRepeatOn });
}

/**
 * Toggle play/pause — dùng YT.Player.pauseVideo() / playVideo().
 * Khi resume → player tự động phát tiếp từ currentTime đã pause (KHÔNG reset).
 */
function togglePlay() {
    if (!ytPlayer || typeof ytPlayer.getPlayerState !== "function") return;
    const state = ytPlayer.getPlayerState();
    // 1 = PLAYING
    if (state === 1) {
        ytPlayer.pauseVideo();
    } else {
        ytPlayer.playVideo();
    }
}

// ======================================================
// EVENT BINDING (1 lần sau khi mount)
// ======================================================

function bindEvents() {
    // Close button → minimize (thu nhỏ về mini-player, không destroy)
    document
        .querySelector("#video-overlay-close-btn")
        ?.addEventListener("click", minimize);

    // Fullscreen button (đã chuyển vào video-overlay__controls)
    document
        .querySelector("#video-overlay-fullscreen-btn")
        ?.addEventListener("click", toggleFullscreen);

    // === MINI MODE events (2 nút absolute trong iframe) ===
    // Expand (mini → overlay full)
    document
        .querySelector("#video-overlay-mini-expand-btn")
        ?.addEventListener("click", expand);

    // Close hoàn toàn (destroy player)
    document
        .querySelector("#video-overlay-mini-close-btn")
        ?.addEventListener("click", closeFull);

    // ===== OVERLAY CONTROLS =====
    // overlay play/pause tương tự mini — onPlayerStateChange sync tự động.
    document
        .querySelector("#video-overlay-play-btn")
        ?.addEventListener("click", togglePlay);
    document
        .querySelector("#video-overlay-next-btn")
        ?.addEventListener("click", playNext);
    document
        .querySelector("#video-overlay-prev-btn")
        ?.addEventListener("click", playPrev);
    document
        .querySelector("#video-overlay-shuffle-btn")
        ?.addEventListener("click", toggleShuffle);
    document
        .querySelector("#video-overlay-repeat-btn")
        ?.addEventListener("click", toggleRepeat);

    // ============================================================
    // Listen events từ #player (player.js dispatch) để sync ngược lại
    // ============================================================
    // Lưu ý: khi minimize, isOpen=false nhưng player vẫn chạy (chỉ thu nhỏ).
    // Vậy phải check cả isMinimized.
    const isPlayerActive = () => isOpen || isMinimized;

    document.addEventListener("player:play-toggle", () => {
        if (!isPlayerActive()) return; // overlay chưa mở → ignore
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

    // Phase 8.5 v10: Close button ở #player → đóng overlay hoàn toàn (destroy player).
    // Tương tự `#video-overlay-mini-close-btn` (gọi `closeFull()`).
    document.addEventListener("player:close", () => {
        if (!isPlayerActive()) return;
        closeFull();
    });

    // User click vào track (cover/title) ở #player → expand mini lên overlay full
    document.addEventListener("player:expand-request", () => {
        if (!isPlayerActive()) return;
        if (isMinimized) {
            expand(); // Đang mini → expand lên full (giữ nguyên track)
        }
        // Nếu !isOpen && !isMinimized: chưa có track → bỏ qua
        // Nếu đã full (isOpen=true && !isMinimized): không làm gì
    });

    // User click action trong 3 chấm menu của #player → xử lý tương tự menu overlay
    document.addEventListener("player:menu-action", (e) => {
        if (!isPlayerActive()) return;
        const action = e.detail?.action;
        if (!action) return;

        // Ẩn menu của #player
        document.querySelector("#player-menu")?.setAttribute("hidden", "");

        const video = currentList[currentIndex];
        if (!video) return;

        if (action === "add-playlist") {
            // Mở submenu playlist ngay trên overlay (nếu overlay đang mở)
            // hoặc mở submenu mini tạm thời (Phase 8.6: làm UI riêng)
            if (isOpen) {
                showPlaylistSubmenu(video);
            } else {
                // Mini mode: hiện submenu bên cạnh mini player
                showPlaylistSubmenu(video);
            }
        } else if (action === "share") {
            // Copy URL
            const slug = video.slug || video.id;
            const url = `${location.origin}/videos/details/${slug}`;
            if (navigator.clipboard?.writeText) {
                navigator.clipboard.writeText(url).then(
                    () => showToast("Đã copy link vào clipboard"),
                    () => showToast("Không thể copy link", "error"),
                );
            } else {
                showToast("Trình duyệt không hỗ trợ clipboard", "error");
            }
        } else if (action === "detail") {
            // Navigate tới detail page
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
        // Update time label ngay (real-time feedback cho cả overlay + #player)
        const currentEl = document.querySelector("#video-overlay-current-time");
        if (currentEl) currentEl.textContent = fmtTime(targetTime);
        // Broadcast ngay để không bị delay 250ms
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

    // Menu items — log action (sẽ nối service sau)
    document
        .querySelector("#video-overlay-menu")
        ?.addEventListener("click", (e) => {
            const btn = e.target.closest(".video-overlay__menu-item");
            if (!btn) return;
            const action = btn.dataset.action;
            const video = currentList[currentIndex];

            // "Thêm vào playlist" → mở submenu (KHÔNG đóng menu chính)
            if (action === "add-playlist") {
                showPlaylistSubmenu(video);
                return;
            }

            // Các action khác → ẩn menu sau khi click
            const menu = document.querySelector("#video-overlay-menu");
            if (menu) menu.hidden = true;

            if (action === "share") {
                // Copy URL dùng slug (ưu tiên) hoặc id
                const slug = video?.slug || video?.id;
                const url = `${location.origin}/videos/details/${slug}`;
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(url).then(
                        () => showToast("Đã copy link vào clipboard"),
                        () => showToast("Không thể copy link", "error"),
                    );
                } else {
                    showToast("Trình duyệt không hỗ trợ clipboard", "error");
                }
            } else if (action === "detail") {
                // Navigate sang trang detail (overlay close → page load)
                const slug = video?.slug || video?.id;
                if (slug) {
                    emit("video-overlay:closed");
                    window.location.href = `/videos/details/${slug}`;
                }
            }
        });

    // Submenu — back button (ẩn submenu, hiện main menu)
    document
        .querySelector(".video-overlay__submenu-back")
        ?.addEventListener("click", (e) => {
            e.stopPropagation();
            document
                .querySelector("#video-overlay-playlist-submenu")
                ?.setAttribute("hidden", "");
        });

    // Submenu — click playlist → add video
    document
        .querySelector("#video-overlay-playlist-list")
        ?.addEventListener("click", async (e) => {
            const btn = e.target.closest(".video-overlay__submenu-item");
            if (!btn) return;
            const playlistSlug = btn.dataset.slug;
            const video = currentList[currentIndex];
            if (!playlistSlug || !video) return;

            // Disable + visual feedback
            btn.classList.add("is-loading");
            btn.disabled = true;

            try {
                await playlistsService.addVideoToPlaylist(
                    playlistSlug,
                    video.id,
                );
                showToast(`Đã thêm "${video.title}" vào playlist`);
            } catch (err) {
                console.error("[video-overlay] add to playlist error:", err);
                showToast("Không thể thêm vào playlist", "error");
            } finally {
                btn.classList.remove("is-loading");
                btn.disabled = false;
                // Đóng cả submenu + main menu
                document
                    .querySelector("#video-overlay-playlist-submenu")
                    ?.setAttribute("hidden", "");
                document
                    .querySelector("#video-overlay-menu")
                    ?.setAttribute("hidden", "");
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

        // Update CSS var --vol để gradient track fill đúng % value
        // (Slider ngang 0-100%, rotate -90deg → giá trị vẫn tuyến tính)
        if (volSlider) volSlider.style.setProperty("--vol", `${value}%`);

        // Update icon (volume-high / volume-low / volume-xmark)
        const icon = document.querySelector("#video-overlay-volume-btn i");
        if (icon) {
            if (value === 0) icon.className = "fa-solid fa-volume-xmark";
            else if (value < 50) icon.className = "fa-solid fa-volume-low";
            else icon.className = "fa-solid fa-volume-high";
        }

        // Broadcast volume state cho #player (để đổi icon mute ở #player nếu cần)
        emitStateChanged({ volume: value });
    };
    volSlider?.addEventListener("input", (e) => {
        updateVolumeUI(Number(e.target.value));
    });

    // Init: set --vol ban đầu cho gradient track (mặc định 100)
    if (volSlider) {
        volSlider.style.setProperty("--vol", `${volSlider.value || 100}%`);
    }

    // Volume button — click toggle mute/unmute (tắt/bật âm lượng hẳn)
    // Hover vào .video-overlay__volume → hiện popover (slider + value)
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
            // Đang có âm → lưu lại rồi mute
            lastVolume = currentSliderValue;
            if (volSlider) volSlider.value = "0";
            updateVolumeUI(0);
        } else {
            // Đang mute → restore volume
            const restore = lastVolume > 0 ? lastVolume : 100;
            if (volSlider) volSlider.value = String(restore);
            updateVolumeUI(restore);
        }
    });

    // Hover vào .video-overlay__volume → hiện popover (CSS sẽ ẩn/hiện qua is-active)
    volWrap?.addEventListener("mouseenter", showVolumePopover);
    volWrap?.addEventListener("mouseleave", hideVolumePopover);

    // Click outside → đóng popover
    document.addEventListener("click", (e) => {
        if (!volPopover || volPopover.hidden) return;
        if (volWrap && !volWrap.contains(e.target)) {
            hideVolumePopover();
        }
    });

    // Volume popover — chỉ hiện số 1-100 khi hover slider
    volSlider?.addEventListener("mouseenter", () => {
        volValue?.classList.add("is-visible");
    });
    volSlider?.addEventListener("mouseleave", () => {
        volValue?.classList.remove("is-visible");
    });

    // Related list — event delegation
    document
        .querySelector("#video-overlay-related-list")
        ?.addEventListener("click", (e) => {
            const btn = e.target.closest(".video-overlay__related-item");
            if (!btn) return;
            const idx = Number(btn.dataset.index);
            if (Number.isInteger(idx)) playAt(idx);
        });

    // Progress bar — full drag: click anywhere hoặc drag thumb → seekTo()
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
            // Update time label ngay khi seek (real-time feedback)
            const currentEl = document.querySelector(
                "#video-overlay-current-time",
            );
            if (currentEl) currentEl.textContent = fmtTime(targetTime);
        },
    });

    // Esc để đóng overlay
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isOpen) close();
    });
}

// ======================================================
// PUBLIC API
// ======================================================

/**
 * Mount overlay vào body (idempotent).
 */
export function mount() {
    if (mounted) return;
    if (document.querySelector(`#${OVERLAY_ID}`)) {
        mounted = true;
        bindEvents();
        return;
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = buildOverlayHTML();
    // Inject tất cả elements (overlay + mini-player) vào body
    while (wrapper.firstChild) {
        document.body.appendChild(wrapper.firstChild);
    }

    mounted = true;
    bindEvents();

    // Preload YouTube API (không đợi)
    loadYouTubeAPI().catch((err) =>
        console.error("[video-overlay] YT API load fail:", err),
    );
}

/**
 * Mở overlay với video + related list.
 * @param {object} video - Video đang phát
 * @param {object[]} relatedList - Array video dedupe (current ở đầu)
 * @param {object} options
 * @param {boolean} options.startAsMini - Nếu true → chỉ hiện mini-player ở góc, không mở overlay full
 */
export async function open(video, relatedList = [], options = {}) {
    if (!video || !video.id) return;

    mount();

    // Set state
    currentList =
        Array.isArray(relatedList) && relatedList.length > 0
            ? relatedList
            : [video];
    currentIndex = currentList.findIndex((v) => v.id === video.id);
    if (currentIndex < 0) {
        currentIndex = 0;
        currentList = [video, ...currentList];
    }

    // Reset play history + mode state (mỗi lần mở overlay = fresh state)
    playHistory = [];
    isShuffleOn = false;
    isRepeatOn = false;

    // Reset shuffle/repeat buttons UI
    document
        .querySelector("#video-overlay-shuffle-btn")
        ?.classList.remove("is-active");
    document
        .querySelector("#video-overlay-repeat-btn")
        ?.classList.remove("is-active");

    // Render UI (related list chỉ dùng cho overlay full, mini sẽ render riêng)
    renderRelatedList(currentList);

    // Luôn load video đầu tiên
    await loadVideo(currentList[currentIndex]);

    if (options.startAsMini) {
        // Mở ở mini mode (iframe thu nhỏ góc dưới-phải, không full overlay)
        const overlay = document.querySelector(`#${OVERLAY_ID}`);
        overlay?.classList.add("is-minimized");
        overlay?.setAttribute("aria-hidden", "true");

        isOpen = false;
        isMinimized = true;
        document.body.style.overflow = "";

        emit("video-overlay:minimized");
    } else {
        // Mở overlay full như cũ
        const overlay = document.querySelector(`#${OVERLAY_ID}`);
        overlay?.classList.remove("is-minimized");
        overlay?.removeAttribute("hidden");
        overlay?.classList.add("is-open");
        overlay?.setAttribute("aria-hidden", "false");

        // Lock scroll body
        document.body.style.overflow = "hidden";

        isOpen = true;
        isMinimized = false;
        emit("video-overlay:opened", { video });
    }

    highlightActive();
}

/**
 * Đóng overlay → minimize (thu nhỏ về mini-player ở góc màn hình).
 * Player vẫn phát nhạc, chỉ thu nhỏ UI.
 */
export function close() {
    minimize();
}

/**
 * Thu nhỏ overlay về mini mode (iframe thu nhỏ ở góc dưới-phải).
 * - Overlay vẫn hiện (fixed) nhưng chỉ thấy iframe thu nhỏ + 2 nút absolute
 * - KHÔNG destroy player → audio vẫn chạy liên tục
 * - KHÔNG có DOM mini riêng — dùng chung iframe
 */
export function minimize() {
    setMiniMode(true);
}

/**
 * Phóng to từ mini mode lên overlay full.
 */
export function expand() {
    setMiniMode(false);
}

/**
 * Toggle mini mode. Internal — dùng chung cho minimize/expand.
 * @param {boolean} mini - true = mini, false = full
 */
function setMiniMode(mini) {
    const overlay = document.querySelector(`#${OVERLAY_ID}`);
    if (!overlay) return;

    if (mini) {
        // Mini mode: phải xóa `is-open` để CSS `.is-open` (opacity:1) không áp dụng
        overlay.classList.remove("is-open");
        overlay.classList.add("is-minimized");
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        isOpen = false;
        isMinimized = true;
        emit("video-overlay:minimized");
    } else {
        // Full mode: phải xóa `is-minimized` để CSS `.is-minimized` (display:none các
        // phần tử con) không áp dụng. Code này ĐÃ có sẵn.
        overlay.classList.remove("is-minimized");
        overlay.classList.add("is-open");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        isOpen = true;
        isMinimized = false;
        emit("video-overlay:expanded");
    }
}

/**
 * Đóng hoàn toàn (destroy player, dừng video).
 */
export function closeFull() {
    const overlay = document.querySelector(`#${OVERLAY_ID}`);

    // Pause + destroy player
    if (ytPlayer && typeof ytPlayer.pauseVideo === "function") {
        try {
            ytPlayer.pauseVideo();
        } catch (_) {}
    }
    if (ytPlayer && typeof ytPlayer.destroy === "function") {
        try {
            ytPlayer.destroy();
        } catch (_) {}
        ytPlayer = null;
    }

    stopProgressTimer();

    // Clear current track (để state-changed biết không còn track → ẩn #player)
    currentList = [];
    currentIndex = -1;

    overlay?.classList.remove("is-open", "is-minimized");
    overlay?.setAttribute("hidden", "");
    overlay?.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
    isOpen = false;
    isMinimized = false;

    // Phase 8.5 v7: Clear active — mình vừa đóng
    if (getActive() === "video") {
        setActive(null);
    }

    document.querySelector("#player")?.classList.remove("is-visible");
    resetPlayerUIForClose();

    // Fix bug "F5 thì có video xuất hiện trong player":
    // Đánh dấu video.wasActive = false trước khi clear, để init.js biết
    // không nên restore video overlay khi user F5.
    // Lưu ý: dùng savePlayerState với video.wasActive=false thay vì clear hẳn,
    // vì cần giữ thông tin để initLayout skip restore đúng cách.
    if (currentList.length > 0 && currentList[currentIndex >= 0 ? currentIndex : 0]) {
        const v = currentList[currentIndex >= 0 ? currentIndex : 0];
        savePlayerState({
            video: {
                currentVideo: v,
                currentTime: 0,
                volume: getVolume(),
                isRepeatOn: false,
                isShuffleOn: false,
                relatedList: [],
                currentIndex: 0,
                wasActive: false, // ← KEY: đánh dấu đã đóng
            },
        });
    } else {
        clearPlayerState({ video: true });
    }

    // Emit state-changed để #player biết track đã bị destroy → ẩn player
    emitStateChanged();
    emit("video-overlay:closed");
}

/**
 * @param {object} persisted - { currentVideo, currentTime, volume, isRepeatOn, isShuffleOn, relatedList, currentIndex }
 */
export async function restoreFromState(persisted) {
    if (!persisted || !persisted.currentVideo || !persisted.currentVideo.id) {
        console.warn("[videoOverlay] restoreFromState: invalid state");
        return;
    }

    log("restoreFromState()", persisted);

    // 1. Set state trước
    currentList =
        Array.isArray(persisted.relatedList) && persisted.relatedList.length > 0
            ? persisted.relatedList
            : [persisted.currentVideo];
    currentIndex = persisted.currentIndex || 0;
    if (currentIndex < 0 || currentIndex >= currentList.length) {
        currentIndex = 0;
    }
    isShuffleOn = !!persisted.isShuffleOn;
    isRepeatOn = !!persisted.isRepeatOn;
    playHistory = [];

    // 2. Reset shuffle/repeat buttons UI
    document
        .querySelector("#video-overlay-shuffle-btn")
        ?.classList.toggle("is-active", isShuffleOn);
    document
        .querySelector("#video-overlay-repeat-btn")
        ?.classList.toggle("is-active", isRepeatOn);

    // 3. Render related list UI (mini + overlay)
    renderRelatedList(currentList);

    // 4. Load video vào player (KHÔNG tự play — chỉ set state)
    //    Dùng `open({ startAsMini: true })` để hiển thị mini-player + load video.
    //    Lưu ý: `open()` mặc định tạo YT.Player với autoplay=1 → YouTube vẫn
    //    có thể tự play. Để chắc chắn paused, ta sẽ pause ngay sau khi player ready.
    await open(currentList[currentIndex], currentList, { startAsMini: true });

    // 5. Seek tới currentTime đã lưu (sau khi player ready)
    //    Dùng setInterval ngắn để đợi ytPlayer ready (YouTube API load async)
    let attempts = 0;
    const seekWhenReady = setInterval(() => {
        attempts++;
        if (
            ytPlayer &&
            typeof ytPlayer.seekTo === "function" &&
            typeof ytPlayer.getDuration === "function"
        ) {
            try {
                const duration = ytPlayer.getDuration() || 0;
                if (duration > 0) {
                    ytPlayer.seekTo(persisted.currentTime || 0, true);
                    // Pause để chắc chắn KHÔNG auto-play
                    if (typeof ytPlayer.pauseVideo === "function") {
                        ytPlayer.pauseVideo();
                    }
                    clearInterval(seekWhenReady);
                    log(
                        "restoreFromState: seek to",
                        persisted.currentTime,
                        "paused",
                    );
                }
            } catch (err) {
                console.warn(
                    "[videoOverlay] restoreFromState: seek failed:",
                    err,
                );
                clearInterval(seekWhenReady);
            }
        } else if (attempts > 40) {
            // Timeout sau 10s (40 * 250ms)
            console.warn(
                "[videoOverlay] restoreFromState: timeout waiting for ytPlayer ready",
            );
            clearInterval(seekWhenReady);
        }
    }, 250);

    // 6. Set volume
    if (
        persisted.volume != null &&
        ytPlayer &&
        typeof ytPlayer.setVolume === "function"
    ) {
        try {
            ytPlayer.setVolume(persisted.volume);
        } catch (_) {}
    }

    // 7. Update toggle UI cho shuffle/repeat (apply lại sau open)
    document
        .querySelector("#video-overlay-shuffle-btn")
        ?.classList.toggle("is-active", isShuffleOn);
    document
        .querySelector("#video-overlay-repeat-btn")
        ?.classList.toggle("is-active", isRepeatOn);
}

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

export function ejectVideo() {
    log("ejectVideo()");

    // 1. Pause + destroy YT.Player (xóa iframe khỏi DOM)
    if (ytPlayer && typeof ytPlayer.pauseVideo === "function") {
        try {
            ytPlayer.pauseVideo();
        } catch (_) {}
    }
    if (ytPlayer && typeof ytPlayer.destroy === "function") {
        try {
            ytPlayer.destroy();
        } catch (_) {}
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

    // 4. Ẩn overlay UI (giữ DOM sẵn sàng cho video mới)
    const overlay = document.querySelector(`#${OVERLAY_ID}`);
    overlay?.classList.remove("is-open", "is-minimized");
    overlay?.setAttribute("hidden", "");
    overlay?.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    isOpen = false;
    isMinimized = false;

    // 5. Reset UI overlay (title/subtitle/time → trống)
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

    // Reset iframe container (sau khi destroy YT.Player, container rỗng → reset)
    if (iframeContainer) iframeContainer.innerHTML = "";

    // 6. Clear active (chỉ clear nếu mình đang active)
    if (getActive() === "video") {
        setActive(null);
    }

    // 7. Emit state-changed → #player biết track đã bị destroy → ẩn player
    emitStateChanged();
    emit("video-overlay:closed");
}

// Helper log (debug)
const DEBUG = false;
function log(...args) {
    if (DEBUG) console.log("[video-overlay]", ...args);
}

/**
 * Toggle fullscreen (dùng YouTube Player API nếu có, fallback native).
 */
export function toggleFullscreen() {
    const overlay = document.querySelector(`#${OVERLAY_ID}`);

    // Cách 1: YouTube Player API
    if (ytPlayer && typeof ytPlayer.getIframe === "function") {
        try {
            const iframe = ytPlayer.getIframe();
            if (iframe) {
                if (document.fullscreenElement) {
                    document.exitFullscreen?.();
                } else {
                    iframe.requestFullscreen?.() ||
                        overlay?.requestFullscreen?.();
                }
                return;
            }
        } catch (_) {
            /* fallback */
        }
    }

    // Cách 2: Native fullscreen cho overlay element
    if (document.fullscreenElement) {
        document.exitFullscreen?.();
    } else {
        overlay?.requestFullscreen?.();
    }
}

/**
 * @returns {boolean}
 */
export function isOpenNow() {
    return isOpen;
}

document.addEventListener("media:active-changed", (e) => {
    const active = e.detail?.active;

    // Không pause thuần (vì iframe + state cũ vẫn còn → leak + "video ma" resume).
    if (active === "audio") {
        ejectVideo();
    }
    // KHÔNG làm gì khi active = null (pause bình thường không cần eject)
});

// Backup: cũng listen `media:audio-takeover` (audioPlayer bắn khi bắt
// đầu playSong nếu video đang active) — defensive layer. Cũng eject sạch.
document.addEventListener("media:audio-takeover", () => {
    ejectVideo();
});

export default { mount, open, close, restoreFromState, isOpen: isOpenNow };
