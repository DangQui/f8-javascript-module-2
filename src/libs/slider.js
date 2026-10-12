/**
 * slider.js — Prev/next + drag-to-scroll cho mọi list có [data-slider]
 *
 * Dùng CSS scroll-snap + JS click handler + drag support. Scroll snap
 * đảm bảo card luôn căn đúng khi scroll. Drag scroll để kéo thả
 * bằng chuột/touch.
 *
 * Exports:
 *   - initSliders() → bind handlers cho mọi [data-slider] trong DOM
 *
 * Consumed by:
 *   - `@/layout/init.js` gọi 1 lần sau khi layout render xong
 *
 * HTML pattern:
 *   <section class="home__container">
 *       <button class="crt__prev">‹</button>
 *       <div class="album__list" data-slider>
 *           <div class="album__item">...</div>  <!-- hoặc data-slider-item -->
 *       </div>
 *       <button class="crt__next">›</button>
 *   </section>
 *
 * Lưu ý:
 *   - `getRealCard()` tìm card-width bằng cách measure DOM (vì SCSS grid có
 *     thể dùng fr units không predict được).
 *   - `markSnapItems()` auto-detect children nào là "card" (loại bỏ text
 *     node, empty element, spacer).
 */

export function initSliders() {
    document.querySelectorAll("[data-slider]").forEach((list) => {
        setupSlider(list);
    });
}

/**
 * Tìm "card thực tế" (đơn vị scroll step) của 1 slider list.
 * Ưu tiên [data-slider-item], không có thì lấy child rộng nhất.
 * @param {HTMLElement} list
 * @returns {HTMLElement|null}
 */
function getRealCard(list) {
    const explicit = list.querySelector("[data-slider-item]");
    if (explicit) return explicit;

    // Lọc bỏ text node, empty element, spacer
    const directChildren = [...list.children].filter(
        (el) => el.nodeType === 1 && el.getBoundingClientRect().width > 0
    );
    if (directChildren.length === 0) return null;

    // Lấy child có width nhỏ nhất (thường là card, không phải container lớn)
    let card = directChildren[0];
    let minWidth = card.getBoundingClientRect().width;
    for (let i = 1; i < directChildren.length; i++) {
        const w = directChildren[i].getBoundingClientRect().width;
        if (w > 0 && w < minWidth) {
            minWidth = w;
            card = directChildren[i];
        }
    }
    return card;
}

function setupSlider(list) {
    // Tìm section chứa prev/next buttons
    const section = list.closest(".home__container") || list.parentElement;
    if (!section) return;

    const prevBtn = section.querySelector(".crt__prev");
    const nextBtn = section.querySelector(".crt__next");
    if (!prevBtn || !nextBtn) return;

    list.classList.add("is-draggable");
    markSnapItems(list);

    // Enable CSS scroll-snap (bắt snap vào card)
    list.style.scrollSnapType = "x mandatory";
    list.style.scrollBehavior = list.style.scrollBehavior || "smooth";

    /**
     * Tính step scroll = cardWidth + gap (measure từ DOM).
     * Dùng getBoundingClientRect vì SCSS grid có thể dùng fr units.
     */
    function getStep() {
        const card = getRealCard(list);
        if (!card) return 0;
        const cardWidth = card.getBoundingClientRect().width;
        if (!cardWidth) return 0;

        const cards = list.querySelectorAll("[data-slider-item]");
        if (cards.length >= 2) {
            // Measure gap thực tế từ DOM
            const a = cards[0].getBoundingClientRect();
            const b = cards[1].getBoundingClientRect();
            const measuredGap = b.left - a.right;
            if (measuredGap > 0) return cardWidth + measuredGap;
        }

        // Fallback: đọc gap từ CSS
        const style = window.getComputedStyle(list);
        const gap = parseFloat(style.columnGap || style.gap || "0") || 0;
        return cardWidth + gap;
    }

    /** Update prev/next button disabled state theo scroll position. */
    function updateButtons() {
        const cards = list.querySelectorAll("[data-slider-item]");
        if (cards.length < 2) {
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            prevBtn.setAttribute("aria-disabled", "true");
            nextBtn.setAttribute("aria-disabled", "true");
            return;
        }

        const scrollLeft = list.scrollLeft;
        const scrollWidth = list.scrollWidth;
        const clientWidth = list.clientWidth;

        // Tolerance 1px tránh floating-point edge case
        const tolerance = 1;
        const atStart = scrollLeft <= tolerance;
        const atEnd = scrollLeft + clientWidth >= scrollWidth - tolerance;

        prevBtn.disabled = atStart;
        prevBtn.setAttribute("aria-disabled", atStart ? "true" : "false");
        nextBtn.disabled = atEnd;
        nextBtn.setAttribute("aria-disabled", atEnd ? "true" : "false");
    }

    nextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const step = getStep();
        if (step > 0) list.scrollBy({ left: step, behavior: "smooth" });
    });

    prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        const step = getStep();
        if (step > 0) list.scrollBy({ left: -step, behavior: "smooth" });
    });

    list.addEventListener("scroll", () => {
        updateButtons();
    }, { passive: true });

    // Re-check khi resize (card width có thể thay đổi)
    window.addEventListener("resize", () => {
        clearTimeout(list._resizeTimer);
        list._resizeTimer = setTimeout(updateButtons, 100);
    });

    setupDragScroll(list, updateButtons);

    // Init button state (2 lần để catch font load + layout settle)
    requestAnimationFrame(() => updateButtons());
    setTimeout(updateButtons, 300);
}

/**
 * Auto-detect children nào là "card" (slider item).
 * - Ưu tiên children có [data-slider-item] attribute.
 * - Nếu không có, lọc bỏ spacer/empty, chỉ mark những child có width > 0.
 * - Không mark nếu tất cả children có cùng width (vì có thể là text nodes,
 *   không phải card).
 */
function markSnapItems(list) {
    const existing = list.querySelectorAll("[data-slider-item]");
    if (existing.length > 0) {
        existing.forEach((el) => el.classList.add("slider-item"));
        return;
    }

    const directChildren = [...list.children].filter(
        (el) => el.nodeType === 1 && el.getBoundingClientRect().width > 0
    );
    if (directChildren.length === 0) return;

    const widths = directChildren.map((el) => el.getBoundingClientRect().width);
    // Nếu tất cả bằng nhau → không phải grid cards, có thể là text
    const allEqual = widths.every((w) => Math.abs(w - widths[0]) < 1);
    if (allEqual && directChildren.length > 1) return;

    directChildren.forEach((el) => {
        el.setAttribute("data-slider-item", "");
        el.classList.add("slider-item");
    });
}

/**
 * Drag-to-scroll support (mouse + touch).
 * `moved > 5px` trước khi preventDefault để tránh break link clicks.
 */
function setupDragScroll(list, onUpdate) {
    let isDown = false;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = 0;

    function onDown(e) {
        isDown = true;
        moved = 0;

        const point = getPoint(e);
        startX = point.x;
        startScrollLeft = list.scrollLeft;
        list.classList.add("is-dragging");
    }

    function onMove(e) {
        if (!isDown) return;

        const point = getPoint(e);
        const dx = point.x - startX;
        moved = Math.abs(dx);

        // Chỉ preventDefault khi đã di chuyển đủ (tránh break link clicks)
        if (moved > 5) {
            e.preventDefault();
            list.scrollLeft = startScrollLeft - dx;
            if (onUpdate) onUpdate();
        }
    }

    function onUp() {
        if (!isDown) return;
        isDown = false;
        list.classList.remove("is-dragging");
    }

    function getPoint(e) {
        if (e.touches && e.touches[0]) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    list.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    list.addEventListener("touchstart", onDown, { passive: true });
    list.addEventListener("touchmove", onMove, { passive: false });
    list.addEventListener("touchend", onUp);
    list.addEventListener("touchcancel", onUp);

    // Disable default drag image cho img (tránh ghost image khi drag)
    list.addEventListener("dragstart", (e) => {
        if (e.target.tagName === "IMG") e.preventDefault();
    });
}
