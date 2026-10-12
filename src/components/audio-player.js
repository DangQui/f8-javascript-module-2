/**
 * components/audio-player.js — Core audio playback + queue
 *
 * Port từ class `yr` trong `code chức năng gốc/base.js` (dòng 4633+).
 * Modern ES module, clean API, dùng state `playerState` để show/hide UI
 * `#player` (player.html đã có sẵn ở Phase 5).
 *
 * Features:
 *   - Queue management (setQueue, next, prev, playRandom)
 *   - Play / pause / togglePlay
 *   - Volume + mute (toggleMute, remember lastVolume)
 *   - Progress / time updates (dispatch event → UI update)
 *   - Shuffle / Repeat (mutual exclusive — bật cái này tắt cái kia)
 *   - Track click → load + play
 *   - Highlight active track (`.track-list__item--active`)
 *
 * UI selectors (player.html — layout/player.js):
 *   - .player__title / .player__cover / .player__artist / .player__time
 *   - .player__progress-bar / .player__volume-slider
 *   - .player__control--play / --prev / --next
 *   - .player__action--shuffle / --repeat / --volume
 *
 * Event API:
 *   - Emit `audio:state-changed` (state = { playing, currentTime, duration,
 *     volume, shuffle, repeat, currentSong, queue })
 *   - Phase 8.5 v8: Mutual exclusion via `media:active-changed`
 *     (khi video active → audio eject sạch, KHÔNG pause thuần — tránh
 *     "bài ma" resume lại)
 *
 * Exports:
 *   - audioPlayer → singleton instance
 *   - getAudioPlayer()
 *   - bindAudioPlayerUI()
 *
 * Consumed by:
 *   - `@/layout/player.js` (central dispatch player buttons)
 *   - `@/layout/init.js` (init flow)
 *   - `@/pages/song-detail/song-detail.js` (setQueue + playSongById)
 *   - `@/pages/album-detail/...` + `@/pages/playlist-detail/...`
 */

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
// KHÔNG ghi khi restoreFromState (chỉ ghi khi user CHỦ ĐỘNG load bài mới).
import { recordListen } from "@/state/listenHistory.js";

const DEBUG = false;
function log(...args) {
    if (DEBUG) console.log("[audioPlayer]", ...args);
}
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
        // vẫn phải emit state để #player UI update icon. Thêm 2 listener
        // này để bắn `audio:state-changed` cho mọi thay đổi playing/paused.
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

    /**
     * Emit state tới tất cả listeners + auto-save (throttled 5s) vào localStorage.
     *
     * QUAN TRỌNG: Skip save khi đang restore (`this._isRestored === true`):
     * audio chưa load xong → currentTime/duration = 0 → sẽ GHI ĐÈ persisted
     * state. Unblock khi audio.duration > 0 hoặc user tương tác (playSong,
     * setVolume, togglePlay, toggleShuffle/Repeat).
     */
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
            // Chỉ unblock save khi audio đã load metadata hoặc user tương tác
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
    /** @param {Array<object>} songs */
    setQueue(songs) {
        this.queue = Array.isArray(songs) ? songs : [];
        this.currentIndex = 0;
        log("queue set:", this.queue.length, "songs");
        this._emitState();
    }

    /** @param {object} song */
    addToQueue(song) {
        if (!song || !song.id) return;
        if (this.queue.find((s) => s.id === song.id)) return;
        this.queue.push(song);
        this._emitState();
    }

    getQueue() {
        return this.queue;
    }
    /**
     * Load 1 bài (không play) — cập nhật UI.
     * @param {object} song - { id, title, audioUrl, thumbnails[], artists[], duration }
     */
    async loadSong(song) {
        if (!song || !song.id) return;

        try {
            this.isLoading = true;
            showLoading();

            if (this.playPromise) {
                try { this.audio.pause(); } catch {}
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
                this.audio.addEventListener("loadedmetadata", onLoaded, { once: true });
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
     * Dùng cho: track-item click ở page, playSongById, addToQueue + play ngay.
     * KHÔNG dùng cho restoreFromState (user chỉ refresh tab, không tính "nghe mới").
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
    async playSong() {
        if (this.isLoading) return;
        if (!this.currentSong) {
            // Empty state (sau khi eject) → hiện toast, KHÔNG resume bài cũ
            toast.info("Vui lòng chọn bài để phát");
            return;
        }

        this._isRestored = false;

        // Nếu audio chưa có src (chưa load xong từ restore) → load lại
        if (!this.audio.src && this.currentSong.audioUrl) {
            this.audio.src = this.currentSong.audioUrl;
            this.audio.load();
        }

        if (!this.audio.src) {
            toast.warn("Không thể phát — bài hát chưa sẵn sàng");
            console.warn("[audioPlayer] playSong: audio.src rỗng, currentSong:", this.currentSong);
            return;
        }

        // Nếu video đang active → PHẢI pause video trước (tránh 2 audio chạy song song)
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

            showPlayer();
            setActive("audio");

            this._isRestored = false;
            this._emitState();
        } catch (err) {
            console.warn("[audioPlayer] play error:", err);
        }
    }

    pauseSong() {
        this.audio.pause();
        this.playPromise = null;

        // KHÔNG setActive(null) khi pause — pause chỉ dừng audio playback,
        // KHÔNG deactive player. Nếu setActive(null) thì user click play lần 2
        // ở #player → central dispatch emit `player:play-toggle` cho
        // videoOverlay listen → videoOverlay skip (no video active) → NO-OP.
        // ĐÚNG: chỉ ejectSong() + closeFull mới nên setActive(null).
        this._emitState();
    }

    togglePlay() {
        if (this.audio.paused) {
            this.playSong();
        } else {
            this.pauseSong();
        }
    }
    //
    // Port pattern từ code gốc `base.js:4931-4934` (class `yr.destroy()`).
    // Khi user chuyển sang media khác (audio ↔ video) hoặc load media mới,
    // PHẢI eject sạch state của media cũ. KHÔNG pause-thuần (giữ currentTime/queue
    // → "bài ma" resume lại).
    //
    // Flow:
    //   1. Pause + reset currentTime = 0
    //   2. Clear currentSong / queue / currentIndex
    //   3. Clear active (nếu mình đang active) → trigger `media:active-changed`
    //   4. Ẩn #player (hidePlayer)
    //   5. Reset UI #player
    //   6. Emit state để UI sync
    //
    // KHÔNG destroy `this.audio` (giữ lại để load bài mới).
    // KHÔNG reset volume / shuffle / repeat (giữ setting user).
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

        // 3. Clear active (chỉ nếu mình đang active — tránh overwrite player khác)
        if (getActive() === "audio") {
            setActive(null);
        }

        // 4. Ẩn #player
        hidePlayer();

        // 5. Reset UI #player
        this._resetPlayerUI();

        // 6. Emit state → listeners sync
        this._emitState();

        // 7. Clear audio slot (giữ nguyên video nếu có)
        clearPlayerState({ audio: true });
    }

    /**
     * Phase 14: Khôi phục state từ localStorage.
     *
     * Hiển thị ở #player minimized dạng "stopped" (không auto-play):
     *   - currentSong → fetch details (nếu thiếu audioUrl) → set + show track info
     *   - volume → set slider
     *   - shuffle/repeat → set toggle UI
     *   - currentTime → set nhưng KHÔNG play (paused)
     *
     * @param {object} persisted - { currentSong, currentTime, volume, shuffle, repeat }
     */
    async restoreFromState(persisted) {
        if (!persisted || !persisted.currentSong) {
            console.warn("[audioPlayer] restoreFromState: invalid state");
            return;
        }

        log("restoreFromState()", persisted);

        // 1. Set queue + currentSong
        this.currentSong = persisted.currentSong;
        this.queue = [persisted.currentSong];
        this.currentIndex = 0;

        // 2. Set volume + shuffle + repeat TRƯỚC (UI update ngay)
        const vol = Math.max(0, Math.min(100, Number(persisted.volume) || 100));
        this.audio.volume = vol / 100;
        this.isShuffle = !!persisted.shuffle;
        this.isRepeat = !!persisted.repeat;

        // 3. Update toggle UI
        this._updateToggleUI();

        // 4. Show #player (KHÔNG _emitState ở đây — tránh save ngay khi
        //    audio chưa load được, sẽ ghi đè currentTime = 0)
        showPlayer();
        this._applyRestoredUI(persisted);

        // 5. Mark as "restored" — block save cho đến khi audio load xong
        this._isRestored = true;

        // 5b. Set active = "audio" để central dispatch route click play
        //     tới audioPlayer.togglePlay() thay vì emit event cho video overlay
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
            // KHÔNG pause() — chỉ set paused = true. playSong() tự handle.

            // 8. Wait loadedmetadata
            await new Promise((resolve) => {
                const onLoaded = () => {
                    this._updatePlayerDuration();
                    resolve();
                };
                if (this.audio.readyState >= 1) {
                    onLoaded();
                    return;
                }
                this.audio.addEventListener("loadedmetadata", onLoaded, { once: true });
            });

            // 9. Re-apply UI với audio loaded
            this._applyRestoredUI(persisted);
        } catch (err) {
            console.warn("[audioPlayer] restoreFromState: không fetch được details:", err);
            // Không có audioUrl → vẫn show track info cũ, user click play sẽ thấy toast
        }
    }

    /**
     * Apply UI state sau khi restore (KHÔNG gọi _emitState vì sẽ trigger
     * save state ngay → ghi đè persisted state).
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

    /** Format seconds → m:ss */
    _fmt(seconds) {
        const total = Math.max(0, Math.floor(Number(seconds) || 0));
        const m = Math.floor(total / 60);
        const s = total % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
    }

    /**
     * Reset #player UI về empty state. Internal — dùng trong ejectSong().
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
    async next() {
        if (this.queue.length === 0) return;
        this.currentIndex = (this.currentIndex + 1) % this.queue.length;
        const song = this.queue[this.currentIndex];
        await this.loadSongByUser(song);
        await this.playSong();
    }

    async prev() {
        if (this.queue.length === 0) return;
        this.currentIndex =
            (this.currentIndex - 1 + this.queue.length) % this.queue.length;
        const song = this.queue[this.currentIndex];
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
        await this.loadSongByUser(song);
        await this.playSong();
    }
    setVolume(percent) {
        const v = Math.max(0, Math.min(100, Number(percent) || 0));
        this.audio.volume = v / 100;
        this.isMuted = v === 0;
        if (v > 0) this.lastVolume = v;
        this._updateVolumeUI(v);
        // Phase 14.1 fix: Unblock save khi user tương tác volume
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
    seekToPercent(percent) {
        const duration = this.audio.duration;
        if (!duration || Number.isNaN(duration)) return;
        this.audio.currentTime = (Math.max(0, Math.min(100, percent)) / 100) * duration;
    }
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

    /**
     * Highlight active track (`.track-list__item--active`) + scrollIntoView.
     * Phase 14.7: dùng class `track-list__item--active` (match track-item.js)
     * thay vì `.playing` cũ.
     *
     * Selector dùng `[data-track-id]` (thuộc tính chung cho mọi track-item
     * render bởi track-item.js) → cover album/playlist/song/search/quick picks.
     */
    _highlightActiveSong(songId) {
        if (!songId) return;

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
    /**
     * Bind 1 lần global click trên `[data-track-id]`. Khi user click → load + play.
     *
     * Lưu ý navigation:
     *   - Code gốc `<a href="/songs/details/:id" data-navigo>` + global click play.
     *     Em KHÔNG `preventDefault()` → để Navigo link navigate sang detail page,
     *     ĐỒNG THỜI gọi `playSongById(id)` NGAY TRƯỚC → nhạc phát ngay
     *     (không phải đợi fetch xong).
     *
     * Modifier keys (Cmd/Ctrl/Shift/Alt hoặc middle-click) → bỏ qua để browser
     * mở tab mới hoặc download link track.
     */
    bindTrackClicks() {
        if (this._trackClickBound) return;
        this._trackClickBound = true;

        document.addEventListener("click", async (e) => {
            const trackEl = e.target.closest("[data-track-id]");
            if (!trackEl) return;

            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (e.button !== 0) return;

            const id = trackEl.dataset.trackId;
            if (!id) return;

            await this.playSongById(id);
        });
    }

    /**
     * Play 1 bài theo ID.
     * Flow:
     *   1. Tìm trong `queue` (đã set từ detail page).
     *   2. Nếu KHÔNG có → gọi `getSong(id)` API (cần audioUrl).
     *   3. Load + play + highlight.
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
                this.queue.push(song);
            } catch (err) {
                console.warn("[audioPlayer] playSongById fetch failed:", err);
                return;
            }
        }

        if (!song.audioUrl) {
            console.warn(`[audioPlayer] Song "${song.title || songId}" không có audioUrl`);
            return;
        }

        // Set currentIndex nếu tìm thấy trong queue
        const idx = this.queue.findIndex((s) => s.id === song.id);
        if (idx >= 0) this.currentIndex = idx;

        await this.loadSongByUser(song);
        await this.playSong();
    }
}
let _instance = null;

/** @returns {AudioPlayer} */
export function getAudioPlayer() {
    if (!_instance) {
        _instance = new AudioPlayer();
    }
    return _instance;
}

/** Default export — singleton. */
export const audioPlayer = getAudioPlayer();

/**
 * Bridge: emit `audio:state-changed` event cho #player / video-overlay listen.
 */
audioPlayer.onStateChange((state) => {
    document.dispatchEvent(
        new CustomEvent("audio:state-changed", { detail: state })
    );
});
//
// Khi player khác setActive() → PHẢI eject sạch state (KHÔNG pause thuần
// — sẽ giữ currentTime/queue → "bài ma" resume lại).
//
// Flow:
//   1. setActive("video") → broadcast `media:active-changed`
//   2. Audio listen: nếu active = video → ejectSong() (clear toàn bộ state)
//   3. Video listen: nếu active = audio → ejectVideo() (destroy YT.Player)
//
// Listen qua document event (không import video-overlay) → tránh circular dep.
document.addEventListener("media:active-changed", (e) => {
    const active = e.detail?.active;
    if (active === "video") {
        audioPlayer.ejectSong();
    }
    // KHÔNG làm gì khi active = null (pause bình thường không cần eject)
});
//
// Vấn đề: video-overlay listen `player:expand-request` và `player:menu-action`
// nhưng check `isPlayerActive()` — chỉ true khi video đang phát. Khi SONG
// đang phát → event bị ignore → click track (cover/title) hoặc click menu
// "Chi tiết bài hát" ở #player KHÔNG navigate đến /songs/details/{id}.
//
// Fix: audio-player cũng listen 2 event này.
document.addEventListener("player:expand-request", () => {
    if (getActive() !== "audio") return;
    if (!audioPlayer.currentSong) return;

    const id = audioPlayer.currentSong.id;
    if (id) {
        document.querySelector("#player-menu")?.setAttribute("hidden", "");
        navigate(`/songs/details/${id}`);
    }
});

document.addEventListener("player:menu-action", (e) => {
    if (getActive() !== "audio") return;
    if (!audioPlayer.currentSong) return;

    const action = e.detail?.action;
    if (!action) return;

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
 * Wire với player.html UI (auto-bind 1 lần).
 *
 * Phase 8.5 v9 (Central Dispatch): click handlers cho buttons ở #player CHUYỂN VỀ
 * `layout/player.js` (single source of truth). Hàm này chỉ còn:
 *   - bindTrackClicks() — global click handler (click track ở page → play audio)
 *   - Init UI ban đầu (toggle icon + volume slider value)
 */
let _uiBound = false;
export function bindAudioPlayerUI() {
    if (_uiBound) return;
    _uiBound = true;

    const player = audioPlayer;

    // Global click → play track
    player.bindTrackClicks();

    // Update toggle UI on init
    player._updateToggleUI();
    if (!document.querySelector("[data-volume-restored]")) {
        player._updateVolumeUI(player.getState().volume);
    }
}

export default audioPlayer;
