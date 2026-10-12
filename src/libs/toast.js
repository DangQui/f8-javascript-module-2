/**
 * toast.js — Lightweight toast helper (with icon + close button)
 *
 * Lightweight toast UI — không phụ thuộc thư viện ngoài, render thẳng vào DOM.
 * Cảm hứng từ `base.js` (line 3389-3416).
 *
 * Exports:
 *   - toast.success(message, duration?) → toast element
 *   - toast.error(message, duration?)   → toast element
 *   - toast.warning(message, duration?) → alias of toast.error (backward compat)
 *   - toast.info(message, duration?)    → alias of toast.error (backward compat)
 *   - toast.dismissAll()               → đóng mọi toast đang hiện
 *
 * Consumed by:
 *   - `@/services/authService.js` (login/register/logout success/error)
 *   - `@/libs/api.js` (force logout session expired)
 *   - Mọi page handler muốn show feedback ngắn
 *
 * Options:
 *   - duration (ms) mặc định 3000; truyền 0 = không auto-remove (user đóng thủ công)
 *
 * Stacking:
 *   - Container dùng flexbox column, mỗi toast tự stack.
 *
 * Accessibility:
 *   - role="status" + aria-live="polite" cho screen reader
 *   - Close button có aria-label
 *
 * Lưu ý:
 *   - Container lazy-create nếu chưa có (#toast-container).
 *   - Markup giữ class `toast--{variant}` để pages cũ không vỡ.
 *   - Message dùng textContent (không innerHTML) tránh XSS.
 */

const ICONS = {
    success: "fa-circle-check",
    error: "fa-circle-xmark",
};

const DEFAULT_DURATION = 3000;
const EXIT_TRANSITION_MS = 300; // match SCSS transition

/**
 * Lấy toast container (lazy create nếu chưa có).
 * @returns {HTMLElement}
 */
function getContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
        console.warn(
            "[toast] #toast-container không tồn tại trong DOM. Tạo tạm thời."
        );
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    return container;
}

/**
 * Đóng 1 toast (animate + remove).
 * Dùng class `hide` trigger transition, fallback setTimeout nếu transition
 * không fire (browser tab inactive, prefers-reduced-motion, ...).
 * @param {HTMLElement} el
 */
function dismissToast(el) {
    if (!el || !el.parentNode) return;
    el.classList.remove("show");
    el.classList.add("hide");
    const remove = () => {
        if (el.parentNode) el.parentNode.removeChild(el);
    };
    el.addEventListener("transitionend", remove, { once: true });
    // Fallback remove nếu transition không fire
    setTimeout(remove, EXIT_TRANSITION_MS + 50);
}

/**
 * Tạo & append 1 toast element vào container.
 * @param {string} message - Nội dung (textContent, auto-escape)
 * @param {"success"|"error"} variant - Loại toast
 * @param {number} duration - ms (0 = không auto-remove)
 * @returns {HTMLElement|null}
 */
function createToast(message, variant = "info", duration = DEFAULT_DURATION) {
    const container = getContainer();
    if (!container) return null;

    // 1. Wrapper
    const el = document.createElement("div");
    el.className = `toast toast--${variant}`;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");

    // 2. Icon
    const icon = document.createElement("i");
    icon.className = `toast__icon fa-solid ${ICONS[variant] || ICONS.error}`;
    icon.setAttribute("aria-hidden", "true");
    el.appendChild(icon);

    // 3. Message (textContent tránh XSS)
    const msg = document.createElement("span");
    msg.className = "toast__message";
    msg.textContent = String(message);
    el.appendChild(msg);

    // 4. Close button
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "toast__close";
    closeBtn.setAttribute("aria-label", "Đóng thông báo");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => dismissToast(el));
    el.appendChild(closeBtn);

    // 5. Mount + animate in (2 rAF để đảm bảo browser apply `show` class)
    container.appendChild(el);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => el.classList.add("show"));
    });

    // 6. Auto-remove
    if (duration > 0) {
        setTimeout(() => dismissToast(el), duration);
    }

    return el;
}

/** Toast helper object — chỉ giữ 2 variants: success / error. */
export const toast = {
    /** @param {string} message @param {number} [duration] */
    success: (message, duration) =>
        createToast(message, "success", duration),

    /** @param {string} message @param {number} [duration] */
    error: (message, duration) => createToast(message, "error", duration),

    /** Backward compat alias: fallback về error variant. */
    warning: (message, duration) => createToast(message, "error", duration),

    /** Backward compat alias: fallback về error variant. */
    info: (message, duration) => createToast(message, "error", duration),

    /**
     * Đóng tất cả toast hiện tại.
     * Dùng khi navigate page hoặc cần clear state.
     */
    dismissAll: () => {
        const container = document.getElementById("toast-container");
        if (!container) return;
        [...container.querySelectorAll(".toast")].forEach(dismissToast);
    },
};

export default toast;
