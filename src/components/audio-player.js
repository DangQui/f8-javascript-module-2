import { formatDuration, escapeHtml } from "@/utils/format.js";
import { showLoading, hideLoading } from "@/libs/loading.js";
import { showPlayer, hidePlayer } from "@/state/playerState.js";
import { setActive, getActive } from "@/state/mediaState.js";
import {
    savePlayerState,
    clearPlayerState,
} from "@/state/playerPersistState.js";
import { toast } from "@/libs/toast.js";
import { navigate } from "@/libs/router.js";
// Lưu ý: KHÔNG ghi khi restoreFromPersist (chỉ ghi khi user CHỦ ĐỘNG load bài mới).
import { recordListen } from "@/state/listenHistory.js";

const DEBUG = false;

function log(...args) {
    if (DEBUG) console.log("[audioPlayer]", ...args);
}

// ======================================================
// CLASS
// ======================================================

class AudioPlayer {
    constructor() {
        this.queue = [];
        this.currentIndex = 0;
        this.currentSong = null;

        this.audio = new Audio();
        this.audio.preload = "auto";

        // Shuffle: dùng "deck" pattern — shuffle queue 1 lần, duyệt theo deck.
        // Khi đến cuối deck → tự re-shuffle (cho phép lặp lại bài cũ).
        this.isShuffle = false;
        this._shuffledOrder = []; // [songId, ...] — thứ tự phát khi shuffle ON

        // Repeat: 3 trạng thái độc lập với shuffle.
        // - "off": không lặp
        // - "all": hết queue thì quay lại bài đầu
        // - "one": lặp bài hiện tại
        this.repeatMode = "off";

        this.isLoading = false;
        this.isMuted = false;
        this.lastVolume = 100;

        this.playPromise = null;
        this._trackClickBound = false;

        this._listeners = new Set();
        this._onTimeUpdate = this._handleTimeUpdate.bind(this);
        this._onAudioEnded = this._handleSongEnd.bind(this);

        this._onAudioPlay = () => this._emitState();
        this._onAudioPause = () => this._emitState();

        // Race-condition guard: true khi đang restore từ localStorage
        // → setQueue + playSongById sẽ skip để tránh ghi đè state restore.
        this._isRestoring = false;

        this.audio.addEventListener("timeupdate", this._onTimeUpdate);
        this.audio.addEventListener("ended", this._onAudioEnded);
        this.audio.addEventListener("play", this._onAudioPlay);
        this.audio.addEventListener("pause", this._onAudioPause);
        this.audio.addEventListener("error", (e) => {
            console.warn("[audioPlayer] audio error:", e);
        });

        // Volume default 100%
        this.audio.volume = 1.0;
    }

    // ==================================================
    // SUBSCRIBE (custom event API)
    // ==================================================

    /**
     * Subscribe state changes.
     * @param {(state: object) => void} callback
     * @returns {() => void} unsubscribe
     */
    onStateChange(callback) {
        if (typeof callback !== "function") return () => {};
        this._listeners.add(callback);
        return () => this._listeners.delete(callback);
    }

    _emitState() {
        const state = this.getState();
        this._listeners.forEach((cb) => {
            try {
                cb(state);
            } catch (err) {
                console.error("[audioPlayer] listener error:", err);
            }
        });

        if (this._isRestored) {
            const hasStableAudio = this.audio.duration > 0;
            const hasUserInteraction =
                !!this.audio.src && !!this.currentSong?.audioUrl;
            if (hasStableAudio || hasUserInteraction) {
                this._isRestored = false;
            } else {
                return; // Skip save
            }
        }

        if (state.currentSong) {
            savePlayerState({
                audio: {
                    currentSong: state.currentSong,
                    currentTime: state.currentTime,
                    volume: state.volume,
                    shuffle: state.shuffle,
                    repeat: state.repeat, // string: "off" | "all" | "one"
                    queue: state.queue,
                    shuffledOrder: state.shuffledOrder || [],
                    currentIndex: state.currentIndex || 0,
                },
            });
        } else {
            clearPlayerState({ audio: true });
        }
    }

    getState() {
        return {
            playing: !this.audio.paused,
            currentTime: this.audio.currentTime || 0,
            duration: this.audio.duration || 0,
            volume: Math.round((this.audio.volume || 0) * 100),
            shuffle: this.isShuffle,
            repeat: this.repeatMode, // "off" | "all" | "one" (back-compat: !== "off")
            currentSong: this.currentSong,
            queue: this.queue,
            shuffledOrder: this._shuffledOrder,
            currentIndex: this.currentIndex,
        };
    }

    // ==================================================
    // QUEUE
    // ==================================================

    /**
     * Set queue (danh sách bài hát).
     * Nếu shuffle đang ON → re-build deck mới từ queue mới (giữ currentSong ở đầu nếu có).
     * Nếu shuffle OFF → reset _shuffledOrder.
     *
     * Skip nếu đang restore (tránh race với restoreFromState).
     * @param {Array<object>} songs
     */
    setQueue(songs) {
        // Fix race: nếu đang restore từ localStorage, KHÔNG setQueue.
        // Vì restoreFromState sẽ tự set queue từ persisted state.
        // Nếu page khác cũng gọi setQueue ngay khi F5 → sẽ ghi đè queue restore.
        if (this._isRestoring) {
            log("setQueue: skip vì đang restore");
            return;
        }

        this.queue = Array.isArray(songs) ? songs : [];
        this.currentIndex = 0;

        if (this.isShuffle) {
            // Re-build deck: giữ currentSong (nếu có) ở vị trí đầu
            this._buildShuffleDeck();
        } else {
            this._shuffledOrder = [];
        }

        log("queue set:", this.queue.length, "songs");
        this._emitState();
    }

    /**
     * Thêm 1 bài vào queue.
     * @param {object} song
     */
    addToQueue(song) {
        if (!song || !song.id) return;
        if (this.queue.find((s) => s.id === song.id)) return;
        this.queue.push(song);
        this._emitState();
    }

    getQueue() {
        return this.queue;
    }

    // ==================================================
    // LOAD SONG
    // ==================================================

    /**
     * Load 1 bài (không play) — cập nhật UI.
     * @param {object} song - { id, title, audioUrl, thumbnails[], artists[], duration }
     */
    async loadSong(song) {
        if (!song || !song.id) return;

        try {
            this.isLoading = true;
            showLoading();

            // Pause bài trước nếu đang phát
            if (this.playPromise) {
                try {
                    this.audio.pause();
                } catch {}
                this.playPromise = null;
            }

            this.currentSong = song;
            // currentIndex ưu tiên tìm trong shuffledOrder (nếu shuffle ON)
            // → fallback queue
            if (
                this.isShuffle &&
                Array.isArray(this._shuffledOrder) &&
                this._shuffledOrder.length > 0
            ) {
                const idxInDeck = this._shuffledOrder.findIndex(
                    (s) => s.id === song.id,
                );
                this.currentIndex = idxInDeck >= 0 ? idxInDeck : 0;
            } else {
                this.currentIndex = this.queue.findIndex(
                    (s) => s.id === song.id,
                );
                if (this.currentIndex < 0) this.currentIndex = 0;
            }
            this.audio.src = song.audioUrl || "";
            this.audio.load();

            this._updatePlayerInfo(song);

            // Wait loadedmetadata để update duration
            await new Promise((resolve) => {
                const onLoaded = () => {
                    this._updatePlayerDuration();
                    resolve();
                };
                if (this.audio.readyState >= 1) {
                    onLoaded();
                    return;
                }
                this.audio.addEventListener("loadedmetadata", onLoaded, {
                    once: true,
                });
            });

            this._highlightActiveSong(song.id);
        } finally {
            this.isLoading = false;
            hideLoading();
        }

        this._emitState();
    }

    /**
     * Load + ghi nhận lịch sử nghe (chỉ dành cho user action).
     * Khác `loadSong()` ở chỗ: gọi thêm `recordListen()` để lưu localStorage.
     * Dùng cho: track-item click ở page, playSongById, addToQueue + play ngay.
     *
     * KHÔNG dùng cho: restoreFromState (user chỉ refresh tab, không tính là "nghe mới").
     *
     *
     * @param {object} song
     */
    async loadSongByUser(song) {
        await this.loadSong(song);
        recordListen({
            id: song.id,
            type: "song",
            title: song.title,
            thumbnails: song.thumbnails,
            artists: song.artists,
        });
    }

    // ==================================================
    // PLAY / PAUSE / TOGGLE
    // ==================================================

    async playSong() {
        if (this.isLoading) return;
        if (!this.currentSong) {
            // Hiện toast, KHÔNG resume bài cũ (vì currentSong = null rồi).
            toast.info("Vui lòng chọn bài để phát");
            return;
        }

        // Nếu audio chưa load xong (duration = 0), vẫn cho phép play —
        // _emitState sẽ skip save cho đến khi audio.duration > 0.
        this._isRestored = false;

        // Load lại từ currentSong.audioUrl trước khi play.
        if (!this.audio.src && this.currentSong.audioUrl) {
            this.audio.src = this.currentSong.audioUrl;
            this.audio.load();
        }

        // audio chưa có src → không thể play → hiện toast warning.
        if (!this.audio.src) {
            toast.warn("Không thể phát — bài hát chưa sẵn sàng");
            console.warn(
                "[audioPlayer] playSong: audio.src rỗng, currentSong:",
                this.currentSong,
            );
            return;
        }

        // Tránh 2 audio chạy song song (user vừa nghe video vừa click play
        // trên #player). Pause video overlay trước.
        if (getActive() === "video") {
            document.dispatchEvent(new CustomEvent("media:audio-takeover"));
        }

        try {
            if (this.playPromise) {
                try {
                    await this.playPromise;
                } catch (err) {
                    console.warn(
                        "[audioPlayer] previous play interrupted:",
                        err,
                    );
                }
            }
            this.playPromise = this.audio.play();
            await this.playPromise;

            // Show player
            showPlayer();

            // Broadcast: mình đang là active player
            setActive("audio");

            // update play/pause icon. Sau đó throttled save sẽ tự save.
            this._isRestored = false;
            this._emitState();
        } catch (err) {
            console.warn("[audioPlayer] play error:", err);
        }
    }

    pauseSong() {
        this.audio.pause();
        this.playPromise = null;

        this._emitState();
    }

    togglePlay() {
        if (this.audio.paused) {
            this.playSong();
        } else {
            this.pauseSong();
        }
    }

    ejectSong() {
        log("ejectSong()");

        // 1. Pause + reset audio time
        try {
            this.audio.pause();
        } catch (_) {
            /* ignore */
        }
        this.audio.currentTime = 0;
        this.playPromise = null;
        this.isLoading = false;

        // 2. Clear state
        this.currentSong = null;
        this.currentIndex = 0;
        this.queue = [];

        // 3. Clear active (sẽ trigger `media:active-changed` → player khác eject)
        //    Chỉ clear nếu mình đang active (tránh overwrite player khác)
        if (getActive() === "audio") {
            setActive(null);
        }

        // 4. Ẩn #player (vì không còn track nào)
        hidePlayer();

        // 5. Reset UI #player (title/cover/time → trống)
        this._resetPlayerUI();

        // 6. Emit state → listeners sync (sẽ tự ẩn #player qua applyAudioState)
        this._emitState();

        // 7. Phase 14: Clear audio slot (giữ nguyên video nếu có)
        clearPlayerState({ audio: true });
    }

    /**
     *
     * @param {object} persisted - { currentSong, currentTime, volume, shuffle, repeat }
     */
    async restoreFromState(persisted) {
        if (!persisted || !persisted.currentSong) {
            console.warn("[audioPlayer] restoreFromState: invalid state");
            return;
        }

        log("restoreFromState()", persisted);

        // Đánh dấu đang restore để playSongById biết mà skip auto-play race.
        // Fix bug race: F5 + click track ngay → setQueue của song-detail
        // bị conflict với restore. Khi restore xong → reset flag.
        this._isRestoring = true;

        // 1. Set queue + currentSong + currentIndex (state ban đầu — chưa có audioUrl)
        this.currentSong = persisted.currentSong;
        // Ưu tiên persisted.queue (mới) → fallback [currentSong] (back-compat)
        this.queue = Array.isArray(persisted.queue) && persisted.queue.length > 0
            ? persisted.queue
            : [persisted.currentSong];
        // currentIndex từ persisted; nếu không hợp lệ → tìm index của currentSong
        if (
            Number.isInteger(persisted.currentIndex) &&
            persisted.currentIndex >= 0 &&
            persisted.currentIndex < this.queue.length
        ) {
            this.currentIndex = persisted.currentIndex;
        } else {
            this.currentIndex = Math.max(
                0,
                this.queue.findIndex((s) => s.id === persisted.currentSong.id),
            );
        }

        // 1b. Restore shuffledOrder nếu có (và shuffle ON)
        this._shuffledOrder =
            Array.isArray(persisted.shuffledOrder) &&
            persisted.shuffledOrder.length > 0
                ? persisted.shuffledOrder
                : [];

        // 2. Set volume + shuffle + repeat TRƯỚC (UI update ngay lập tức)
        const vol = Math.max(0, Math.min(100, Number(persisted.volume) || 100));
        this.audio.volume = vol / 100;
        this.isShuffle = !!persisted.shuffle;
        // Back-compat: persisted cũ có `repeat: boolean` → map sang "all" | "off"
        if (typeof persisted.repeatMode === "string") {
            const r = persisted.repeatMode;
            this.repeatMode = ["off", "all", "one"].includes(r) ? r : "off";
        } else if (typeof persisted.repeat === "boolean") {
            this.repeatMode = persisted.repeat ? "all" : "off";
        } else {
            this.repeatMode = "off";
        }

        // 3. Update toggle UI (shuffle/repeat buttons)
        this._updateToggleUI();

        // 4. Show #player (KHÔNG gọi _emitState ở đây — tránh save lại state
        //    khi audio chưa load được, sẽ ghi đè currentTime = 0).
        //    Apply UI thủ công để hiển thị track info + volume + toggles.
        showPlayer();
        this._applyRestoredUI(persisted);

        // 5. Mark as "restored" — block save cho đến khi audio load xong
        //    (tránh state cũ ghi đè state mới).
        this._isRestored = true;

        //     layout/player.js route click play tới audioPlayer.togglePlay()
        //     thay vì emit event cho video overlay (no-op).
        setActive("audio");

        // 6. Fetch song details từ API để có audioUrl (background, không block UI)
        try {
            const { detailsService } =
                await import("@/services/detailsService.js");
            const fetched = await detailsService.getSong(
                persisted.currentSong.id,
            );
            const songWithUrl = {
                ...persisted.currentSong,
                id: fetched.id,
                title: fetched.title || persisted.currentSong.title,
                thumbnails:
                    fetched.thumbnails || persisted.currentSong.thumbnails,
                artists: Array.isArray(fetched.artists)
                    ? fetched.artists
                    : [fetched.artists || "Không rõ nghệ sĩ"],
                duration: fetched.duration || 0,
                audioUrl: fetched.audioUrl,
            };
            this.currentSong = songWithUrl;

            // Cập nhật currentSong trong queue + shuffledOrder (giữ nguyên thứ tự)
            const idxInQueue = this.queue.findIndex(
                (s) => s.id === songWithUrl.id,
            );
            if (idxInQueue >= 0) {
                this.queue[idxInQueue] = songWithUrl;
            } else {
                this.queue.push(songWithUrl);
            }
            if (this._shuffledOrder.length > 0) {
                const idxInShuffle = this._shuffledOrder.findIndex(
                    (s) => s.id === songWithUrl.id,
                );
                if (idxInShuffle >= 0) {
                    this._shuffledOrder[idxInShuffle] = songWithUrl;
                }
            }

            // 7. Load audio (KHÔNG play) + seek tới currentTime
            this.audio.src = songWithUrl.audioUrl || "";
            this.audio.load();
            this.audio.currentTime = persisted.currentTime || 0;
            // KHÔNG gọi pause() ở đây — chỉ set paused = true, vì pause() có thể
            // reset currentTime khi audio chưa load xong. Để playSong() tự handle.

            // 8. Wait loadedmetadata để có duration
            await new Promise((resolve) => {
                const onLoaded = () => {
                    this._updatePlayerDuration();
                    resolve();
                };
                if (this.audio.readyState >= 1) {
                    onLoaded();
                    return;
                }
                this.audio.addEventListener("loadedmetadata", onLoaded, {
                    once: true,
                });
            });

            // 9. Re-apply UI với audio loaded
            this._applyRestoredUI(persisted);
        } catch (err) {
            console.warn(
                "[audioPlayer] restoreFromState: không fetch được details:",
                err,
            );
            // Không có audioUrl → vẫn show track info cũ, user click play sẽ thấy toast
        } finally {
            // Restore xong (thành công hoặc fail) → reset flag
            // để các method khác (playSongById, setQueue...) chạy bình thường.
            this._isRestoring = false;
        }
    }

    /**
     * vì sẽ trigger save state ngay → ghi đè persisted state).
     *
     * Sync thủ công: title, cover, time, progress, volume, toggles.
     */
    _applyRestoredUI(persisted) {
        const song = this.currentSong;
        if (!song) return;

        // 1. Title + cover
        const titleEl = document.querySelector(".player__title");
        const coverEl = document.querySelector(".player__cover");
        if (titleEl) {
            titleEl.textContent = song.title || "Chưa phát";
            titleEl.setAttribute("data-current-song-id", song.id || "");
        }
        if (coverEl) {
            const thumb =
                (typeof song.thumbnails === "string"
                    ? song.thumbnails
                    : song.thumbnails?.[0]) ||
                (typeof song.thumb === "string" ? song.thumb : undefined);
            coverEl.src = thumb || "/images/album-01.jpg";
            coverEl.alt = song.title || "";
        }

        // 2. Time
        const timeEl = document.querySelector(".player__time");
        if (timeEl) {
            const ct = persisted.currentTime || 0;
            const dur = this.audio.duration || 0;
            timeEl.textContent = `${this._fmt(ct)} / ${this._fmt(dur)}`;
        }

        // 3. Progress bar
        const progressEl = document.querySelector(".player__progress-bar");
        if (progressEl) {
            const ct = persisted.currentTime || 0;
            const dur = this.audio.duration || 0;
            const percent = dur > 0 ? Math.round((ct / dur) * 100) : 0;
            progressEl.value = String(percent);
            progressEl.style.setProperty("--progress-fill", `${percent}%`);
        }

        // 4. Volume slider + icon
        const volSlider = document.querySelector(".player__volume-slider");
        if (volSlider) {
            volSlider.value = String(persisted.volume || 100);
            volSlider.style.setProperty(
                "--vol-fill",
                `${persisted.volume || 100}%`,
            );
        }

        // 5. Shuffle/Repeat toggle
        this._updateToggleUI();
    }

    /**
     * Helper: format seconds → m:ss
     */
    _fmt(seconds) {
        const total = Math.max(0, Math.floor(Number(seconds) || 0));
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
    }

    /**
     * Reset #player UI về empty state (title "Chưa phát", cover mặc định,
     * time "0:00 / 0:00", progress 0%).
     * Internal — dùng trong ejectSong().
     */
    _resetPlayerUI() {
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

    // ==================================================
    // NEXT / PREV / RANDOM
    // ==================================================

    /**
     * Lấy index tiếp theo (đã tính shuffle deck).
     * Nếu queue chỉ có 1 bài → luôn trả về 0.
     */
    _getNextIndex() {
        const list = this.isShuffle ? this._shuffledOrder : this.queue;
        if (list.length === 0) return -1;
        if (list.length === 1) return 0;
        return (this.currentIndex + 1) % list.length;
    }

    /**
     * Lấy index trước (đã tính shuffle deck).
     */
    _getPrevIndex() {
        const list = this.isShuffle ? this._shuffledOrder : this.queue;
        if (list.length === 0) return -1;
        if (list.length === 1) return 0;
        return (this.currentIndex - 1 + list.length) % list.length;
    }

    /**
     * Lấy song tại index hiện tại (tôn trọng shuffle).
     */
    _getCurrentSong() {
        const list = this.isShuffle ? this._shuffledOrder : this.queue;
        if (list.length === 0) return null;
        const safeIdx = Math.max(0, Math.min(this.currentIndex, list.length - 1));
        return list[safeIdx];
    }

    /**
     * Tạo deck shuffle mới:
     * - Giữ nguyên bài đang phát ở vị trí đầu
     * - Shuffle phần còn lại (Fisher-Yates)
     * Lưu vào `this._shuffledOrder`.
     *
     * Edge case: queue chỉ có 1 bài → deck = [currentSong] (không có gì để shuffle).
     * Lúc này next() sẽ re-shuffle (vẫn chỉ 1 bài) → nếu repeat = off, sẽ kẹt.
     * Caller (next/songEnded) cần tự check queue.length > 1 trước khi gọi shuffle.
     */
    _buildShuffleDeck() {
        if (this.queue.length === 0) {
            this._shuffledOrder = [];
            return;
        }

        // Bài hiện tại (hoặc bài đầu nếu chưa có)
        const currentSong =
            this.currentSong ||
            this.queue[this.currentIndex] ||
            this.queue[0];

        // Phần còn lại: loại bỏ bài hiện tại (theo id)
        const rest = this.queue.filter((s) => s.id !== currentSong.id);

        // Fisher-Yates shuffle
        for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rest[i], rest[j]] = [rest[j], rest[i]];
        }

        this._shuffledOrder = [currentSong, ...rest];
        this.currentIndex = 0;
        log("shuffle deck built:", this._shuffledOrder.length, "songs");
    }

    async next() {
        if (this.queue.length === 0) return;

        // Repeat-one: lặp lại bài hiện tại
        if (this.repeatMode === "one") {
            const song = this._getCurrentSong();
            if (!song) return;
            this.audio.currentTime = 0;
            await this.playSong();
            return;
        }

        // Edge case: queue chỉ có 1 bài
        if (this.queue.length === 1) {
            const song = this._getCurrentSong();
            if (!song) return;
            if (this.repeatMode === "all") {
                this.audio.currentTime = 0;
                await this.playSong();
            } else {
                // repeat=off + 1 bài + không repeat-one → re-play bài hiện tại
                this.audio.currentTime = 0;
                await this.playSong();
            }
            return;
        }

        const list = this.isShuffle ? this._shuffledOrder : this.queue;
        const isLastSong = this.currentIndex >= list.length - 1;

        // Hết bài cuối
        if (isLastSong) {
            if (this.repeatMode === "all") {
                // Repeat all: về đầu queue
                this.currentIndex = 0;
            } else if (this.isShuffle) {
                // Hết deck shuffle: build deck mới (cho phép lặp lại bài cũ)
                this._buildShuffleDeck();
            } else {
                // repeat=off + không shuffle + hết queue → next sẽ wrap về 0
                this.currentIndex = 0;
            }
        } else {
            this.currentIndex = this._getNextIndex();
        }

        const song = this._getCurrentSong();
        if (!song) return;
        await this.loadSongByUser(song);
        await this.playSong();
    }

    async prev() {
        if (this.queue.length === 0) return;

        // Repeat-one: lặp lại bài hiện tại
        if (this.repeatMode === "one") {
            const song = this._getCurrentSong();
            if (!song) return;
            this.audio.currentTime = 0;
            await this.playSong();
            return;
        }

        this.currentIndex = this._getPrevIndex();
        const song = this._getCurrentSong();
        if (!song) return;
        await this.loadSongByUser(song);
        await this.playSong();
    }

    /**
     * Random 1 bài (dùng khi user click vào nút random riêng, hoặc fallback).
     * Hiện tại không bind UI cho nút này, giữ method để dùng nội bộ.
     */
    async playRandom() {
        if (this.queue.length === 0) return;
        this._buildShuffleDeck();
        const song = this._shuffledOrder[0];
        if (!song) return;
        this.currentIndex = 0;
        await this.loadSongByUser(song);
        await this.playSong();
    }

    // ==================================================
    // VOLUME / MUTE
    // ==================================================

    setVolume(percent) {
        const v = Math.max(0, Math.min(100, Number(percent) || 0));
        this.audio.volume = v / 100;
        this.isMuted = v === 0;
        if (v > 0) this.lastVolume = v;
        this._updateVolumeUI(v);
        // Volume thay đổi là dấu hiệu user đang dùng app, không phải restore state.
        this._isRestored = false;
        this._emitState();
    }

    toggleMute() {
        if (this.audio.volume > 0) {
            this.lastVolume = this.audio.volume * 100;
            this.audio.volume = 0;
            this.isMuted = true;
        } else {
            const restore = this.lastVolume > 0 ? this.lastVolume : 100;
            this.audio.volume = restore / 100;
            this.isMuted = false;
        }
        this._updateVolumeUI(this.audio.volume * 100);
        this._isRestored = false;
        this._emitState();
    }

    // ==================================================
    // PROGRESS / SEEK
    // ==================================================

    seekToPercent(percent) {
        const duration = this.audio.duration;
        if (!duration || Number.isNaN(duration)) return;
        this.audio.currentTime =
            (Math.max(0, Math.min(100, percent)) / 100) * duration;
    }

    // ==================================================
    // SHUFFLE / REPEAT
    // ==================================================

    /**
     * Toggle shuffle. Bật shuffle:
     *  1. Build deck shuffle mới (giữ bài hiện tại ở vị trí đầu)
     *  2. Hoạt động độc lập với repeat
     *  3. Khi user next/prev: dùng deck shuffle
     *  4. Khi hết deck: tự build deck mới (cho phép lặp lại bài cũ)
     */
    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        if (this.isShuffle) {
            this._buildShuffleDeck();
        } else {
            // Tắt shuffle → reset về queue gốc, currentIndex theo currentSong
            this._shuffledOrder = [];
            if (this.currentSong) {
                const idx = this.queue.findIndex(
                    (s) => s.id === this.currentSong.id,
                );
                this.currentIndex = idx >= 0 ? idx : 0;
            }
        }
        this._updateToggleUI();
        this._emitState();
    }

    /**
     * Toggle repeat qua 3 trạng thái: off → all → one → off.
     * Hoạt động độc lập với shuffle.
     */
    toggleRepeat() {
        const order = ["off", "all", "one"];
        const idx = order.indexOf(this.repeatMode);
        this.repeatMode = order[(idx + 1) % order.length];
        log("repeatMode:", this.repeatMode);
        this._updateToggleUI();
        this._emitState();
    }

    // ==================================================
    // INTERNAL HANDLERS
    // ==================================================

    _handleTimeUpdate() {
        this._updateTimeUI();
        this._emitState();
    }

    _handleSongEnd() {
        // Repeat-one: lặp lại bài hiện tại
        if (this.repeatMode === "one") {
            this.audio.currentTime = 0;
            this.playSong();
            return;
        }

        // Edge case: queue chỉ có 1 bài
        if (this.queue.length === 1) {
            this.audio.currentTime = 0;
            this.playSong();
            return;
        }

        // Hết bài cuối của deck/queue?
        const list = this.isShuffle ? this._shuffledOrder : this.queue;
        const isLastSong = this.currentIndex >= list.length - 1;

        if (isLastSong) {
            if (this.repeatMode === "all") {
                // Repeat all: quay về đầu
                this.currentIndex = 0;
                const song = list[0];
                if (song) {
                    this.loadSongByUser(song).then(() => this.playSong());
                }
                return;
            }
            if (this.isShuffle) {
                // Hết deck shuffle: build deck mới (cho phép lặp lại bài cũ)
                this._buildShuffleDeck();
                const song = this._shuffledOrder[0];
                if (song) {
                    this.loadSongByUser(song).then(() => this.playSong());
                }
                return;
            }
        }

        // Default: next bài tiếp theo
        this.next();
    }

    // ==================================================
    // UI SYNC (write to player.html)
    // ==================================================

    _updatePlayerInfo(song) {
        const titleEl = document.querySelector(".player__title");
        const coverEl = document.querySelector(".player__cover");
        const artistEl = document.querySelector(".player__artist");
        const thumb = Array.isArray(song.thumbnails)
            ? song.thumbnails[0]
            : song.thumb || "/images/album-01.jpg";
        const artist = Array.isArray(song.artists)
            ? song.artists[0]
            : song.artists || "Không rõ nghệ sĩ";

        if (titleEl) titleEl.textContent = song.title || "Chưa phát";
        if (coverEl) {
            coverEl.src = thumb;
            coverEl.alt = song.title || "";
        }
        if (artistEl) artistEl.textContent = artist;
    }

    _updatePlayerDuration() {
        const timeEl = document.querySelector(".player__time");
        if (!timeEl) return;
        const dur = this.audio.duration;
        if (!dur || Number.isNaN(dur)) return;
        const current = this.audio.currentTime || 0;
        timeEl.textContent = `${formatDuration(current)} / ${formatDuration(dur)}`;
    }

    _updateTimeUI() {
        const timeEl = document.querySelector(".player__time");
        const progressBar = document.querySelector(".player__progress-bar");
        if (!this.audio.duration || Number.isNaN(this.audio.duration)) return;

        const current = this.audio.currentTime || 0;
        const dur = this.audio.duration;

        if (timeEl) {
            timeEl.textContent = `${formatDuration(current)} / ${formatDuration(dur)}`;
        }
        if (progressBar && progressBar.dataset.dragging !== "1") {
            const percent = Math.round((current / dur) * 100);
            progressBar.value = String(percent);
            progressBar.style.setProperty("--progress-fill", `${percent}%`);
        }
    }

    _updateVolumeUI(volume) {
        const v = Math.max(0, Math.min(100, Number(volume) || 0));
        const volBtn = document.querySelector(".player__action--volume");
        const volSlider = document.querySelector(".player__volume-slider");

        if (volBtn) {
            const icon = volBtn.querySelector("i");
            if (icon) {
                if (v === 0) icon.className = "fa-solid fa-volume-xmark";
                else if (v < 50) icon.className = "fa-solid fa-volume-low";
                else icon.className = "fa-solid fa-volume-high";
            }
        }
        if (volSlider) {
            volSlider.value = String(v);
            volSlider.style.setProperty("--vol-fill", `${v}%`);
        }
    }

    _updateToggleUI() {
        const shuffleBtn = document.querySelector(".player__action--shuffle");
        const repeatBtn = document.querySelector(".player__action--repeat");
        if (shuffleBtn) {
            shuffleBtn.classList.toggle("is-active", this.isShuffle);
        }
        if (repeatBtn) {
            // Active khi repeat ≠ "off"
            repeatBtn.classList.toggle(
                "is-active",
                this.repeatMode !== "off",
            );
            // Phân biệt repeat-one (lặp 1 bài) để hiển thị số "1"
            repeatBtn.classList.toggle(
                "is-repeat-one",
                this.repeatMode === "one",
            );
            // Cập nhật icon theo trạng thái
            const icon = repeatBtn.querySelector("i");
            if (icon) {
                // Repeat-all: fa-repeat (vòng tròn)
                // Repeat-one: fa-repeat (giống + có ::after "1" ở SCSS)
                // Tạm thời dùng chung fa-repeat, phân biệt bằng class
                // is-repeat-one (CSS ::after thêm số "1")
                icon.className = "fa-solid fa-repeat";
            }
        }
    }

    _highlightActiveSong(songId) {
        if (!songId) return;

        document
            .querySelectorAll(
                ".track-list__item--active, [data-track-id].track-list__item--active",
            )
            .forEach((el) => el.classList.remove("track-list__item--active"));

        // Add .track-list__item--active cho track hiện tại
        document
            .querySelectorAll(`[data-track-id="${escapeHtml(songId)}"]`)
            .forEach((el) => {
                el.classList.add("track-list__item--active");
                setTimeout(() => {
                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 200);
            });
    }

    // ==================================================
    // CLICK BINDING — global click → play track
    // ==================================================

    /**
     * Bind 1 lần global click trên `.track-item` / `[data-track-id]`.
     * Khi user click → load + play (giống base.js `setupListEvents` dòng 4832-4845).
     *
     * Logic port từ base.js (line 4830-4845):
     *   - `e.target.closest(".track-item")` → check có data-track-id không
     *   - Tìm song trong queue (`this.songs` = `this.queue` trong class em)
     *   - `await loadSong(song)` → `await playSong()` → show player + highlight
     *
     * Lưu ý navigation (so với code gốc):
     *   - Code gốc `<a href="/songs/details/:id" data-navigo>` + global click play.
     *     Vì là Navigo link, browser cũng navigate đồng thời → URL đổi sang
     *     /songs/details/:id → route handler chạy → render info-detail mới + play lại.
     *   - Em KHÔNG `preventDefault()` để giữ Navigo navigate → URL đổi đúng,
     *     info-detail update, page render đúng bài mới.
     *   - ĐỒNG THỜI em vẫn gọi `playSongById(id)` NGAY TRƯỚC khi navigate
     *     → nhạc phát ngay (không phải đợi fetch xong). Khi song-detail page
     *     load xong sẽ gọi lại `playSongById(id)` ở handler → setQueue +
     *     playSongById → ensure currentSong đúng + play tiếp nếu cần.
     */
    bindTrackClicks() {
        if (this._trackClickBound) return;
        this._trackClickBound = true;

        document.addEventListener("click", async (e) => {
            // Track-item: bất kỳ element nào có data-track-id (track-list__item, .track-item, ...)
            const trackEl = e.target.closest("[data-track-id]");
            if (!trackEl) return;

            // Bỏ qua nếu user giữ modifier key (Cmd/Ctrl/middle-click) → để browser
            // mở tab mới hoặc download link track
            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (e.button !== 0) return; // chỉ left-click

            // KHÔNG preventDefault → để Navigo link `<a href data-navigo>`
            // navigate sang /songs/details/:id như bình thường.
            // Song-detail page sẽ tự fetch + render info-detail mới + auto-play.

            const id = trackEl.dataset.trackId;
            if (!id) return;

            await this.playSongById(id);
        });
    }

    /**
     * Play 1 bài theo ID.
     *
     * Flow:
     *   1. Tìm trong `queue` (đã set từ detail page).
     *   2. Nếu KHÔNG có trong queue → gọi `getSong(id)` API lấy chi tiết + audioUrl
     *      (port pattern `yr.playSongFromDetail` từ base.js:4847 — cần song có audioUrl).
     *   3. Nếu có → loadSong + playSong + show player + highlight.
     *
     * @param {string} songId
     */
    async playSongById(songId) {
        // Nếu đang restore từ localStorage → skip playSongById.
        // Fix race: F5 + click track ngay khi restore chưa xong.
        // Vì restoreFromState đã set currentSong = persisted.currentSong
        // → bài sẽ tự phát khi user click play.
        if (this._isRestoring) {
            log("playSongById: skip vì đang restore");
            return;
        }

        // 1. Tìm trong queue trước (đã set sẵn khi vào detail page)
        let song = this.queue.find((s) => s.id === songId);
        if (!song && this.currentSong && this.currentSong.id === songId) {
            song = this.currentSong;
        }

        // 2. Nếu chưa có trong queue → fetch từ API (1 lần)
        if (!song) {
            try {
                const { detailsService } =
                    await import("@/services/detailsService.js");
                const fetched = await detailsService.getSong(songId);
                // Chuẩn hoá shape giống track trong queue (cần audioUrl)
                song = {
                    id: fetched.id,
                    title: fetched.title || "Chưa rõ tên",
                    thumbnails: fetched.thumbnails || [],
                    artists: Array.isArray(fetched.artists)
                        ? fetched.artists
                        : [fetched.artists || "Không rõ nghệ sĩ"],
                    duration: fetched.duration || 0,
                    audioUrl: fetched.audioUrl,
                };
                // Thêm vào queue
                this.queue.push(song);
                // Nếu shuffle ON: thêm vào shuffledOrder ở vị trí random
                // (giữ cảm giác "random" khi user click 1 bài lẻ từ page khác)
                if (this.isShuffle) {
                    const insertIdx =
                        Math.floor(Math.random() * (this._shuffledOrder.length + 1));
                    this._shuffledOrder.splice(insertIdx, 0, song);
                }
            } catch (err) {
                console.warn("[audioPlayer] playSongById fetch failed:", err);
                return;
            }
        }

        // 3. Nếu có audioUrl → load + play
        if (!song.audioUrl) {
            console.warn(
                `[audioPlayer] Song "${song.title || songId}" không có audioUrl`,
            );
            return;
        }

        // Set currentIndex nếu tìm thấy trong queue
        const idx = this.queue.findIndex((s) => s.id === song.id);
        if (idx >= 0) this.currentIndex = idx;

        // Phase 14.9: Dùng loadSongByUser (ghi nhận lịch sử nghe).
        await this.loadSongByUser(song);
        await this.playSong();
    }
}

// ======================================================
// SINGLETON + EVENT BRIDGE
// ======================================================

let _instance = null;

/**
 * Get singleton instance.
 * @returns {AudioPlayer}
 */
export function getAudioPlayer() {
    if (!_instance) {
        _instance = new AudioPlayer();
    }
    return _instance;
}

/**
 * Default export — singleton.
 */
export const audioPlayer = getAudioPlayer();

/**
 * Bridge: khi state thay đổi → emit `audio:state-changed` event
 * để #player / video-overlay listen.
 */
audioPlayer.onStateChange((state) => {
    document.dispatchEvent(
        new CustomEvent("audio:state-changed", { detail: state }),
    );
});

document.addEventListener("media:active-changed", (e) => {
    const active = e.detail?.active;

    // Nếu active = video (và KHÔNG phải audio) → eject audio sạch
    if (active === "video") {
        audioPlayer.ejectSong();
    }

    // KHÔNG làm gì khi active = null (pause bình thường không cần eject)
});

document.addEventListener("player:expand-request", () => {
    // Chỉ navigate khi đang phát SONG
    if (getActive() !== "audio") return;
    if (!audioPlayer.currentSong) return;

    const id = audioPlayer.currentSong.id;
    if (id) {
        // Đóng menu 3 chấm nếu đang mở
        document.querySelector("#player-menu")?.setAttribute("hidden", "");
        navigate(`/songs/details/${id}`);
    }
});

document.addEventListener("player:menu-action", (e) => {
    // Chỉ xử lý khi đang phát SONG
    if (getActive() !== "audio") return;
    if (!audioPlayer.currentSong) return;

    const action = e.detail?.action;
    if (!action) return;

    // Đóng menu 3 chấm (cả audio và video)
    document.querySelector("#player-menu")?.setAttribute("hidden", "");

    if (action === "detail") {
        const id = audioPlayer.currentSong.id;
        if (id) {
            navigate(`/songs/details/${id}`);
        }
    }
    // Các action khác (add-playlist, share) — TODO Phase sau
});

let _uiBound = false;
export function bindAudioPlayerUI() {
    if (_uiBound) return;
    _uiBound = true;

    const player = audioPlayer;

    // Global click → play track (click vào [data-track-id] ở page → play audio)
    player.bindTrackClicks();

    player._updateToggleUI();
    if (!document.querySelector("[data-volume-restored]")) {
        player._updateVolumeUI(player.getState().volume);
    }
}

export default audioPlayer;
