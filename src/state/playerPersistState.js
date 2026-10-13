const STORAGE_KEY = "music.playerState.v2";
const SCHEMA_VERSION = 2;
const THROTTLE_MS = 5000; // 5 giây

// ======================================================
// SAVE
// ======================================================

/** @type {object|null} Pending save (chưa flush xuống localStorage). */
let _pendingSave = null;
/** @type {number} Last successful save timestamp (ms). */
let _lastSave = 0;
/** @type {ReturnType<typeof setTimeout>|null} Throttle timer. */
let _saveTimer = null;

/**
 *
 * @param {{ audio?: object, video?: object }} partial
 *
 */
export function savePlayerState(partial) {
    if (!partial) {
        clearPlayerState();
        return;
    }

    // Load state hiện tại để merge (không load nếu đang có pending → tránh stale)
    let current = _pendingSave || _readRaw();
    if (!current || current.version !== SCHEMA_VERSION) {
        current = {
            version: SCHEMA_VERSION,
            audio: null,
            video: null,
            savedAt: 0,
        };
    }

    // Merge audio (nếu partial có key 'audio')
    if ("audio" in partial) {
        if (partial.audio === null) {
            current.audio = null;
        } else if (partial.audio && partial.audio.currentSong) {
            current.audio = _normalizeAudio(partial.audio);
        } else {
            // partial.audio = {} mà không có currentSong → coi như clear
            current.audio = null;
        }
    }

    // Merge video (nếu partial có key 'video')
    if ("video" in partial) {
        if (partial.video === null) {
            current.video = null;
        } else if (partial.video && partial.video.currentVideo) {
            current.video = _normalizeVideo(partial.video);
        } else {
            current.video = null;
        }
    }

    current.savedAt = Date.now();
    _pendingSave = current;

    const now = Date.now();
    // Flush ngay nếu đã quá throttle; nếu không, set timer cho lần cuối
    if (now - _lastSave >= THROTTLE_MS) {
        _flush();
    } else {
        if (!_saveTimer) {
            _saveTimer = setTimeout(_flush, THROTTLE_MS - (now - _lastSave));
        }
    }
}

/** Normalize audio state trước khi save (validate + clamp). */
function _normalizeAudio(audio) {
    if (!audio || !audio.currentSong || !audio.currentSong.id) return null;
    return {
        currentSong: audio.currentSong,
        currentTime: Math.max(0, Number(audio.currentTime) || 0),
        volume: Math.max(0, Math.min(100, Number(audio.volume) || 100)),
        shuffle: !!audio.shuffle,
        // repeatMode mới: "off" | "all" | "one"
        // Back-compat: nếu audio.repeat là boolean → map sang "all" | "off"
        repeatMode:
            typeof audio.repeatMode === "string" &&
            ["off", "all", "one"].includes(audio.repeatMode)
                ? audio.repeatMode
                : typeof audio.repeat === "boolean"
                  ? audio.repeat
                      ? "all"
                      : "off"
                  : "off",
        // Lưu full queue + shuffled order để restore đúng
        // (tránh case restore chỉ có 1 bài → shuffle kẹt ở bài cũ)
        queue: Array.isArray(audio.queue)
            ? audio.queue.filter((s) => s && s.id).map((s) => ({
                  id: s.id,
                  title: s.title || "",
                  thumbnails: s.thumbnails || [],
                  artists: s.artists || [],
                  duration: s.duration || 0,
                  audioUrl: s.audioUrl || "",
              }))
            : [],
        shuffledOrder: Array.isArray(audio.shuffledOrder)
            ? audio.shuffledOrder.filter((s) => s && s.id).map((s) => ({
                  id: s.id,
                  title: s.title || "",
                  thumbnails: s.thumbnails || [],
                  artists: s.artists || [],
                  duration: s.duration || 0,
                  audioUrl: s.audioUrl || "",
              }))
            : [],
        currentIndex:
            Number.isInteger(audio.currentIndex) && audio.currentIndex >= 0
                ? audio.currentIndex
                : 0,
    };
}

/** Normalize video state trước khi save. */
function _normalizeVideo(video) {
    if (!video || !video.currentVideo || !video.currentVideo.id) return null;
    return {
        currentVideo: video.currentVideo,
        currentTime: Math.max(0, Number(video.currentTime) || 0),
        volume: Math.max(0, Math.min(100, Number(video.volume) || 100)),
        isRepeatOn: !!video.isRepeatOn,
        isShuffleOn: !!video.isShuffleOn,
        relatedList: Array.isArray(video.relatedList) ? video.relatedList : [],
        currentIndex: Number(video.currentIndex) || 0,
        // Flag: true = video overlay đang mở/mini (cần restore khi F5)
        //      false = user đã đóng hẳn → KHÔNG restore
        // Mặc định true (back-compat với state cũ — mặc định restore)
        wasActive: video.wasActive === false ? false : true,
    };
}

/** Flush pending save xuống localStorage ngay. */
function _flush() {
    if (!_pendingSave) return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_pendingSave));
        _lastSave = Date.now();
        _pendingSave = null;
        if (_saveTimer) {
            clearTimeout(_saveTimer);
            _saveTimer = null;
        }
    } catch (err) {
        console.warn("[playerPersistState] Lỗi khi save:", err);
    }
}

/** Force save ngay lập tức (dùng cho beforeunload). */
export function flushPlayerState() {
    _flush();
}

// ======================================================
// LOAD
// ======================================================

/**
 * Load state từ localStorage (đã validate).
 * @returns {{ audio: object|null, video: object|null, savedAt: number } | null}
 */
export function loadPlayerState() {
    const data = _readRaw();
    if (!data) return null;

    // Validate version — bỏ qua + clear nếu schema khác
    if (data.version !== SCHEMA_VERSION) {
        console.info("[playerPersistState] Schema version khác, bỏ qua");
        clearPlayerState();
        return null;
    }

    // Validate: cần có ÍT NHẤT 1 slot (audio hoặc video)
    if (!data.audio && !data.video) {
        console.info("[playerPersistState] Không có audio/video hợp lệ");
        clearPlayerState();
        return null;
    }

    // Validate audio slot
    let audio = null;
    if (data.audio && data.audio.currentSong && data.audio.currentSong.id) {
        // Back-compat: nếu persisted cũ có `repeat: boolean` → map sang repeatMode
        let repeatMode = "off";
        if (typeof data.audio.repeatMode === "string" &&
            ["off", "all", "one"].includes(data.audio.repeatMode)) {
            repeatMode = data.audio.repeatMode;
        } else if (typeof data.audio.repeat === "boolean") {
            repeatMode = data.audio.repeat ? "all" : "off";
        }

        // Back-compat: nếu không có queue/shuffledOrder → fallback queue = [currentSong]
        const queueRaw = Array.isArray(data.audio.queue)
            ? data.audio.queue
            : [data.audio.currentSong];
        const queue = queueRaw
            .filter((s) => s && s.id)
            .map((s) => ({
                id: s.id,
                title: s.title || "",
                thumbnails: s.thumbnails || [],
                artists: s.artists || [],
                duration: s.duration || 0,
                audioUrl: s.audioUrl || "",
            }));

        const shuffledOrderRaw = Array.isArray(data.audio.shuffledOrder)
            ? data.audio.shuffledOrder
            : [];
        const shuffledOrder = shuffledOrderRaw
            .filter((s) => s && s.id)
            .map((s) => ({
                id: s.id,
                title: s.title || "",
                thumbnails: s.thumbnails || [],
                artists: s.artists || [],
                duration: s.duration || 0,
                audioUrl: s.audioUrl || "",
            }));

        audio = {
            currentSong: data.audio.currentSong,
            currentTime: Number(data.audio.currentTime) || 0,
            volume: Number(data.audio.volume) || 100,
            shuffle: !!data.audio.shuffle,
            repeatMode,
            queue,
            shuffledOrder,
            currentIndex:
                Number.isInteger(data.audio.currentIndex) &&
                data.audio.currentIndex >= 0
                    ? data.audio.currentIndex
                    : 0,
        };
    }

    // Validate video slot
    let video = null;
    if (data.video && data.video.currentVideo && data.video.currentVideo.id) {
        // Back-compat: nếu persisted cũ không có wasActive → mặc định true (restore)
        const wasActive = data.video.wasActive === false ? false : true;
        video = {
            currentVideo: data.video.currentVideo,
            currentTime: Number(data.video.currentTime) || 0,
            volume: Number(data.video.volume) || 100,
            isRepeatOn: !!data.video.isRepeatOn,
            isShuffleOn: !!data.video.isShuffleOn,
            relatedList: Array.isArray(data.video.relatedList)
                ? data.video.relatedList
                : [],
            currentIndex: Number(data.video.currentIndex) || 0,
            wasActive,
        };
    }

    return { audio, video, savedAt: data.savedAt || 0 };
}

/** Read raw từ localStorage (không validate). */
function _readRaw() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (err) {
        console.warn("[playerPersistState] Lỗi khi read raw:", err);
        return null;
    }
}

// ======================================================
// CLEAR
// ======================================================

/**
 * Clear state khỏi localStorage.
 *
 * @param {{ audio?: boolean, video?: boolean, all?: boolean }} [options]

 */
export function clearPlayerState(options) {
    const clearAudio = !options || options.all || options.audio;
    const clearVideo = !options || options.all || options.video;

    // Nếu clear cả 2 → remove key + reset pending
    if (clearAudio && clearVideo) {
        try {
            localStorage.removeItem(STORAGE_KEY);
            _pendingSave = null;
            if (_saveTimer) {
                clearTimeout(_saveTimer);
                _saveTimer = null;
            }
        } catch (err) {
            console.warn("[playerPersistState] Lỗi khi clear:", err);
        }
        return;
    }

    // Clear selective → update pending (hoặc load + update)
    let current = _pendingSave || _readRaw();
    if (!current) return;

    if (clearAudio) current.audio = null;
    if (clearVideo) current.video = null;

    // Nếu cả 2 đều null → remove hẳn
    if (!current.audio && !current.video) {
        try {
            localStorage.removeItem(STORAGE_KEY);
            _pendingSave = null;
            if (_saveTimer) {
                clearTimeout(_saveTimer);
                _saveTimer = null;
            }
        } catch (err) {
            console.warn("[playerPersistState] Lỗi khi clear selective:", err);
        }
        return;
    }

    // Còn 1 slot → save lại
    current.savedAt = Date.now();
    _pendingSave = current;
    _flush();
}

// ======================================================
// LISTENERS
// ======================================================

let _beforeUnloadBound = false;

/** Bind `beforeunload` để force save trước khi user F5/đóng tab. Idempotent. */
export function bindBeforeUnloadSave() {
    if (_beforeUnloadBound) return;
    _beforeUnloadBound = true;

    window.addEventListener("beforeunload", () => {
        flushPlayerState();
    });
}
