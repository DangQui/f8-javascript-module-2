// ======================================================
// AUDIO PLAYER — Core audio playback + queue
// ======================================================
//

// dòng 4633+ → modern ES module, clean API, dùng state playerState
// để show/hide UI player.html đã có sẵn ở Phase 5.
//
// API export:
//   import { audioPlayer, getAudioPlayer, onAudioStateChange } from "@/components/audio-player.js";
//   audioPlayer.playSong(song);
//   audioPlayer.togglePlay();
//   audioPlayer.setVolume(80);
//   audioPlayer.setQueue(album.tracks);
//   audioPlayer.next(); audioPlayer.prev();
//
// FEATURES (port đầy đủ từ class `yr`):
//   - Queue management (setQueue, next, prev, playRandom)
//   - Play / pause / togglePlay
//   - Volume + mute (toggleMute, remember lastVolume)
//   - Progress / time updates (dispatch event → UI update)
//   - Shuffle / Repeat (mutual exclusive — bật cái này tắt cái kia)
//   - Track click → load + play
//   - Highlight active track (.playing class)
//   - Wire với player.html UI (Phase 5)
//
// UI SELECTORS (player.html — layout/player.js):
//   - .player__title / .player__cover / .player__artist / .player__time
//   - .player__progress-bar
//   - .player__volume-slider
//   - .player__control--play / --prev / --next
//   - .player__action--shuffle / --repeat / --volume
//
// EVENT API (broadcast qua `audio:state-changed`):
//   { playing, currentTime, duration, volume,
//     shuffle, repeat, currentSong, queue }
//
// Tích hợp với video-overlay (Phase 7): audio-player emit event
// `audio:state-changed` với shape tương tự `video-overlay:state-changed`
// để #player cập nhật UI (xem bindPlayerEvents trong layout/player.js).
//

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
// Phase 14.9: Wire listen history (lưu localStorage khi user thực sự load bài).
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

        this.isShuffle = false;
        this.isRepeat = false;
        this.isLoading = false;
        this.isMuted = false;
        this.lastVolume = 100;

        this.playPromise = null;
        this._trackClickBound = false;

        this._listeners = new Set();
        this._onTimeUpdate = this._handleTimeUpdate.bind(this);
        this._onAudioEnded = this._handleSongEnd.bind(this);
        // Phase 8.5 v5: khi audio play/pause (không qua API togglePlay),
        // vẫn phải emit state để #player UI update icon. Trước đó chỉ có
        // `timeupdate` + `ended` + `error` → khi user click play button của
        // #player, audio toggle nhưng UI KHÔNG đổi (icon vẫn fa-play dù
        // audio đang chạy). Thêm 2 listener này để bắn `audio:state-changed`
        // cho mọi thay đổi trạng thái playing/paused.
        this._onAudioPlay = () => this._emitState();
        this._onAudioPause = () => this._emitState();

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

        // Phase 14: Auto-save state vào localStorage (throttled 5s)
        // Lưu currentSong + currentTime + volume + shuffle + repeat
        // để khôi phục sau F5 / đóng tab / mất điện.
        //
        // QUAN TRỌNG: Skip save khi đang restore (this._isRestored === true)
        // vì audio chưa load xong → currentTime/duration = 0 → sẽ GHI ĐÈ
        // persisted state. Unblock khi user thực sự playSong() / pauseSong()
        // hoặc khi state đã stable (có audio.duration > 0).
        if (this._isRestored) {
            // Chỉ unblock save khi audio đã load metadata (duration > 0)
            // HOẶC khi user togglePlay (sẽ gọi _emitState qua playSong)
            // HOẶC khi user tương tác volume/shuffle/repeat (state stable).
            const hasStableAudio = this.audio.duration > 0;
            const hasUserInteraction = !!this.audio.src && !!this.currentSong?.audioUrl;
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
                    repeat: state.repeat,
                },
            });
        } else {
            // User vừa eject → clear audio slot (giữ nguyên video nếu có)
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
            repeat: this.isRepeat,
            currentSong: this.currentSong,
            queue: this.queue,
        };
    }

    // ==================================================
    // QUEUE
    // ==================================================

    /**
     * Set queue (danh sách bài hát).
     * @param {Array<object>} songs
     */
    setQueue(songs) {
        this.queue = Array.isArray(songs) ? songs : [];
        this.currentIndex = 0;
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
            this.currentIndex = this.queue.findIndex((s) => s.id === song.id);
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
     * Phase 14.9 — workaround backend chưa track /home/personalized user-specific.
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
            // Phase 8.5 v8: User click play khi đang empty state (sau khi eject) →
            // Hiện toast, KHÔNG resume bài cũ (vì currentSong = null rồi).
            toast.info("Vui lòng chọn bài để phát");
            return;
        }

        // Phase 14 fix: Unblock save khi user thực sự play (clear _isRestored).
        // Nếu audio chưa load xong (duration = 0), vẫn cho phép play —
        // _emitState sẽ skip save cho đến khi audio.duration > 0.
        this._isRestored = false;

        // Phase 14 fix: Nếu audio chưa có src (chưa load xong từ restore) →
        // Load lại từ currentSong.audioUrl trước khi play.
        if (!this.audio.src && this.currentSong.audioUrl) {
            this.audio.src = this.currentSong.audioUrl;
            this.audio.load();
        }

        // Phase 14 fix: Nếu đang ở "restored" state (chưa unblock save) mà
        // audio chưa có src → không thể play → hiện toast warning.
        if (!this.audio.src) {
            toast.warn("Không thể phát — bài hát chưa sẵn sàng");
            console.warn("[audioPlayer] playSong: audio.src rỗng, currentSong:", this.currentSong);
            return;
        }

        // Phase 8.5 v7: Nếu video đang active → KHÔNG play audio.
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
                    console.warn("[audioPlayer] previous play interrupted:", err);
                }
            }
            this.playPromise = this.audio.play();
            await this.playPromise;

            // Show player
            showPlayer();

            // Broadcast: mình đang là active player
            setActive("audio");

            // Phase 14 fix: Force unblock save + emit state ngay để UI
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

        // Phase 14.4 fix: KHÔNG setActive(null) khi pause — pause chỉ dừng
        // audio playback, KHÔNG deactive player. Nếu setActive(null) thì
        // user click play lần 2 ở #player → central dispatch ở
        // layout/player.js:397-404 emit `player:play-toggle` cho
        // videoOverlay listen → videoOverlay skip (no video active) →
        // NO-OP → user thấy "click play không phát".
        //
        // ĐÚNG behavior: chỉ ejectSong() (audio-player.js:386-392) + closeFull
        // (video-overlay.js:1397) mới nên setActive(null). Pause giữ
        // active = "audio" để user click play lần nữa vẫn route đúng.
        //
        // Mutual exclusion listener (audio-player.js:956-962) chỉ eject
        // khi active = "video" (player khác play) — KHÔNG bị ảnh hưởng
        // vì active vẫn = "audio" sau pause.

        this._emitState();
    }

    togglePlay() {
        if (this.audio.paused) {
            this.playSong();
        } else {
            this.pauseSong();
        }
    }

    // ==================================================
    // EJECT — Phase 8.5 v8: Replace media, not update
    // ==================================================
    //
    // Port pattern từ code gốc `base.js:4931-4934` (class `yr.destroy()`):
    //   this.audio?.pause(),
    //   this.currentSong = null,
    //   document.querySelector(`#player-wrapper`)?.classList.add(`hidden`),
    //
    // Khi user chuyển sang media khác (audio ↔ video) hoặc load media mới,
    // PHẢI eject sạch state của media cũ. KHÔNG pause-thuì giữ currentTime/queue
    // (tránh "bài ma" resume lại).
    //
    // Flow:
    //   1. Pause + reset currentTime = 0
    //   2. Clear currentSong / queue / currentIndex
    //   3. Clear active → trigger `media:active-changed`
    //   4. Ẩn #player (hidePlayer)
    //   5. Emit state để UI sync (title/cover sẽ reset về "Chưa phát")
    //
    // KHÔNG destroy `this.audio` element (giữ lại để load bài mới).
    // KHÔNG reset volume / shuffle / repeat (giữ setting user đã chọn).
    //
    // Sau khi eject → player ở "empty state", sẵn sàng nhận song mới
    // qua `loadSong()`. User click play btn lúc này sẽ thấy toast
    // "Vui lòng chọn bài để phát" (vì currentSong === null).
    //
    ejectSong() {
        log("ejectSong()");

        // 1. Pause + reset audio time
        try { this.audio.pause(); } catch (_) { /* ignore */ }
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
     * Phase 14: Khôi phục state từ localStorage.
     *
     * Được gọi bởi `initLayout()` (sau khi render player.html) khi phát hiện
     * có persisted state. Hiển thị ở #player minimized dạng "stopped" (không auto-play):
     *   - currentSong → fetch details từ API (nếu thiếu audioUrl) → set + show track info
     *   - volume → set slider
     *   - shuffle/repeat → set toggle UI
     *   - currentTime → set nhưng KHÔNG play (paused)
     *
     * User click play → sẽ resume từ currentTime đã lưu.
     *
     * @param {object} persisted - { currentSong, currentTime, volume, shuffle, repeat }
     */
    async restoreFromState(persisted) {
        if (!persisted || !persisted.currentSong) {
            console.warn("[audioPlayer] restoreFromState: invalid state");
            return;
        }

        log("restoreFromState()", persisted);

        // 1. Set queue + currentSong (state ban đầu — chưa có audioUrl)
        this.currentSong = persisted.currentSong;
        this.queue = [persisted.currentSong];
        this.currentIndex = 0;

        // 2. Set volume + shuffle + repeat TRƯỚC (UI update ngay lập tức)
        const vol = Math.max(0, Math.min(100, Number(persisted.volume) || 100));
        this.audio.volume = vol / 100;
        this.isShuffle = !!persisted.shuffle;
        this.isRepeat = !!persisted.repeat;

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

        // 5b. Phase 14 fix: Set active = "audio" để central dispatch ở
        //     layout/player.js route click play tới audioPlayer.togglePlay()
        //     thay vì emit event cho video overlay (no-op).
        setActive("audio");

        // 6. Fetch song details từ API để có audioUrl (background, không block UI)
        try {
            const { detailsService } = await import("@/services/detailsService.js");
            const fetched = await detailsService.getSong(persisted.currentSong.id);
            const songWithUrl = {
                ...persisted.currentSong,
                id: fetched.id,
                title: fetched.title || persisted.currentSong.title,
                thumbnails: fetched.thumbnails || persisted.currentSong.thumbnails,
                artists: Array.isArray(fetched.artists)
                    ? fetched.artists
                    : [fetched.artists || "Không rõ nghệ sĩ"],
                duration: fetched.duration || 0,
                audioUrl: fetched.audioUrl,
            };
            this.currentSong = songWithUrl;
            this.queue = [songWithUrl];

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
            console.warn("[audioPlayer] restoreFromState: không fetch được details:", err);
            // Không có audioUrl → vẫn show track info cũ, user click play sẽ thấy toast
        }
    }

    /**
     * Phase 14 fix: Apply UI state sau khi restore (KHÔNG gọi _emitState
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
                (typeof song.thumbnails === "string" ? song.thumbnails : song.thumbnails?.[0]) ||
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
            volSlider.style.setProperty("--vol-fill", `${persisted.volume || 100}%`);
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

    async next() {
        if (this.queue.length === 0) return;
        this.currentIndex = (this.currentIndex + 1) % this.queue.length;
        const song = this.queue[this.currentIndex];
        // Phase 14.9: Ghi nhận lịch sử nghe khi user click next.
        await this.loadSongByUser(song);
        await this.playSong();
    }

    async prev() {
        if (this.queue.length === 0) return;
        this.currentIndex =
            (this.currentIndex - 1 + this.queue.length) % this.queue.length;
        const song = this.queue[this.currentIndex];
        // Phase 14.9: Ghi nhận lịch sử nghe khi user click prev.
        await this.loadSongByUser(song);
        await this.playSong();
    }

    async playRandom() {
        if (this.queue.length === 0) return;
        let idx;
        do {
            idx = Math.floor(Math.random() * this.queue.length);
        } while (idx === this.currentIndex && this.queue.length > 1);
        this.currentIndex = idx;
        const song = this.queue[idx];
        // Phase 14.9: Ghi nhận lịch sử nghe khi shuffle play.
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
        // Phase 14.1 fix: Unblock save khi user tương tác volume.
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
        // Phase 14.1 fix: Unblock save khi user click mute/unmute.
        this._isRestored = false;
        this._emitState();
    }

    // ==================================================
    // PROGRESS / SEEK
    // ==================================================

    seekToPercent(percent) {
        const duration = this.audio.duration;
        if (!duration || Number.isNaN(duration)) return;
        this.audio.currentTime = (Math.max(0, Math.min(100, percent)) / 100) * duration;
    }

    // ==================================================
    // SHUFFLE / REPEAT
    // ==================================================

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        if (this.isShuffle) this.isRepeat = false;
        this._updateToggleUI();
        this._emitState();
    }

    toggleRepeat() {
        this.isRepeat = !this.isRepeat;
        if (this.isRepeat) this.isShuffle = false;
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
        if (this.isRepeat) {
            this.playSong();
        } else if (this.isShuffle) {
            this.playRandom();
        } else {
            this.next();
        }
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
        if (shuffleBtn) shuffleBtn.classList.toggle("is-active", this.isShuffle);
        if (repeatBtn) repeatBtn.classList.toggle("is-active", this.isRepeat);
    }

    _highlightActiveSong(songId) {
        if (!songId) return;
        // Phase 14.7 fix: Đổi class từ `.playing` (cũ) → `.track-list__item--active`
        // (match với class mà track-item.js render).
        //
        // BUG cũ: code này dùng `.playing` nhưng track-item.js (Phase 8+) render
        // class `track-list__item` + modifier `--active` → querySelector ở đây
        // không match, highlight không hoạt động.
        //
        // Selector dùng `[data-track-id]` (thuộc tính chung cho mọi track-item
        // render bởi track-item.js) để cover cả:
        //   - Album detail
        //   - Playlist detail
        //   - Song detail (album.tracks + playlists[].tracks + related)
        //   - Search results
        //   - Quick picks
        //
        // Remove .track-list__item--active khỏi tất cả track trước
        document
            .querySelectorAll(".track-list__item--active, [data-track-id].track-list__item--active")
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
        // 1. Tìm trong queue trước (đã set sẵn khi vào detail page)
        let song = this.queue.find((s) => s.id === songId);
        if (!song && this.currentSong && this.currentSong.id === songId) {
            song = this.currentSong;
        }

        // 2. Nếu chưa có trong queue → fetch từ API (1 lần)
        if (!song) {
            try {
                const { detailsService } = await import("@/services/detailsService.js");
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
                // Thêm vào queue (không thay currentIndex)
                this.queue.push(song);
            } catch (err) {
                console.warn("[audioPlayer] playSongById fetch failed:", err);
                return;
            }
        }

        // 3. Nếu có audioUrl → load + play
        if (!song.audioUrl) {
            console.warn(
                `[audioPlayer] Song "${song.title || songId}" không có audioUrl`
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
        new CustomEvent("audio:state-changed", { detail: state })
    );
});

// ======================================================
// PHASE 8.5 v8: MUTUAL EXCLUSION LISTENER (EJECT thay vì PAUSE)
// ======================================================
//
// Khi player khác setActive() → mình PHẢI eject sạch state
// (KHÔNG pause thuần — sẽ giữ currentTime/queue, gây "bài ma" resume).
//
// Flow:
//   1. setActive("video") / setActive("audio") → broadcast event này
//   2. Audio listen: nếu active = video → ejectSong() (clear toàn bộ state)
//   3. Video listen: nếu active = audio → ejectVideo() (destroy YT.Player + clear state)
//
// Trước Phase 8.5 v8: chỉ pause → state cũ vẫn còn → user click play lại sẽ
// resume bài cũ (BUG).
//
// Listen qua document event (không import trực tiếp video-overlay) → tránh
// circular dependency.
document.addEventListener("media:active-changed", (e) => {
    const active = e.detail?.active;

    // Nếu active = video (và KHÔNG phải audio) → eject audio sạch
    if (active === "video") {
        audioPlayer.ejectSong();
    }

    // KHÔNG làm gì khi active = null (pause bình thường không cần eject)
});

// ======================================================
// Phase 14.2: Handle player:expand-request + player:menu-action cho SONG
// ======================================================
//
// Vấn đề: video-overlay listen `player:expand-request` và `player:menu-action`
// nhưng check `isPlayerActive()` — chỉ true khi video đang phát. Khi SONG
// đang phát → event bị ignore → click track (cover/title) hoặc click menu
// "Chi tiết bài hát" ở #player KHÔNG navigate đến /songs/details/{id}.
//
// Fix: audio-player cũng listen 2 event này. Nếu đang phát song → navigate
// đến song detail. Video overlay vẫn handle như cũ (giữ nguyên behavior
// expand overlay full).
//
// KHÔNG check getActive() ở đây — để video overlay tự skip khi không phải
// video của nó. Audio listen sẽ skip khi không phải song (currentSong null).
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

/**
 * Wire với player.html UI ở layout/player.js (auto-bind 1 lần).
 *
 * Phase 8.5 v9 (Central Dispatch):
 *   - Click handlers cho buttons ở #player CHUYỂN VỀ `layout/player.js`
 *     (single source of truth). Handler ở dựa check `getActive()` rồi route
 *     đến audioPlayer hoặc videoOverlay.
 *   - Hàm này chỉ còn:
 *     + `bindTrackClicks()` — global click handler (click track ở page → play audio)
 *     + Init UI ban đầu (toggle icon + volume slider value)
 *
 * Lý do: Trước đó CẢ `audio-player.js` VÀ `layout/player.js` đều attach listener
 * vào `.player__control--play`. Khi user click:
 *   - Listener 1 (audioPlayer.togglePlay) → playSong() → check !currentSong
 *     → toast "Vui lòng chọn bài để phát" (BUG)
 *   - Listener 2 (emit player:play-toggle) → videoOverlay.togglePlay()
 *
 * BUG: Khi video đang active + audio chưa load → toast spam + UI flicker.
 * Fix: Chỉ giữ 1 listener ở `layout/player.js`. Handler sẽ check `getActive()`
 * rồi quyết định route (audioPlayer hoặc emit event cho videoOverlay).
 */
let _uiBound = false;
export function bindAudioPlayerUI() {
    if (_uiBound) return;
    _uiBound = true;

    const player = audioPlayer;

    // Global click → play track (click vào [data-track-id] ở page → play audio)
    player.bindTrackClicks();

    // Update toggle UI on init
    // Phase 14.1 fix: KHÔNG hardcode volume = 100 ở đây — nếu có persisted
    // state, restoreFromState (gọi từ initLayout) đã set đúng volume.
    // Chỉ set 100 khi chưa có persisted state (volume mặc định 100).
    player._updateToggleUI();
    if (!document.querySelector('[data-volume-restored]')) {
        player._updateVolumeUI(player.getState().volume);
    }
}

export default audioPlayer;