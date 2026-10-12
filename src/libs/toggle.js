/**
 * toggle.js — Show/hide element by class .hide / .show
 *
 * Bind click handler cho `[data-toggle-target]` / `.js-toggle` elements.
 * Mô hình:
 *   - Simple toggle: ẩn → hiện, hiện → ẩn.
 *   - Swap: ẩn target, hiện showTarget.
 *
 * HTML pattern:
 *   Simple:  <button class="js-toggle" toggle-target="#box">Click</button>
 *   Swap:    <button toggle-target="#box1" toggle-show="#box2">Click</button>
 *
 * Exports:
 *   - initJsToggle() → bind handlers cho mọi .js-toggle trong DOM
 *
 * Consumed by:
 *   - `@/layout/init.js` gọi 1 lần sau khi layout render xong
 */

import { $, $$ } from "@/utils/dom-helpers.js";

export function initJsToggle() {
    $$(".js-toggle").forEach((button) => {
        const target = button.getAttribute("toggle-target");
        const showTarget = button.getAttribute("toggle-show");

        if (!target) {
            console.error(`Cần thêm toggle-target cho: ${button.outerHTML}`);
            return;
        }

        button.onclick = (e) => {
            // Cho phép link bên trong dropdown chuyển trang bình thường
            if (
                e.target.closest("a[href]") &&
                !e.target.closest(".js-toggle")
            ) {
                return;
            }

            e.preventDefault();

            const targetElement = $(target);
            if (!targetElement) {
                console.error(`Không tìm thấy phần tử "${target}"`);
                return;
            }

            // Nếu có toggle-show → swap giữa 2 element
            if (showTarget) {
                const showElement = $(showTarget);
                if (!showElement) {
                    console.error(`Không tìm thấy phần tử "${showTarget}"`);
                    return;
                }

                targetElement.classList.add("hide");
                targetElement.classList.remove("show");
                showElement.classList.remove("hide");
                showElement.classList.add("show");
                return;
            }

            // Toggle đơn giản
            const isHidden = targetElement.classList.contains("hide");
            requestAnimationFrame(() => {
                targetElement.classList.toggle("hide", !isHidden);
                targetElement.classList.toggle("show", isHidden);
            });
        };

        // Click outside để đóng
        document.onclick = function (e) {
            if (showTarget) return; // không xử lý cho swap mode

            const dropdown =
                button.querySelector(".top-act__dropdown") || $(target);

            if (
                !e.target.closest(target) &&
                !e.target.closest(".top-act__dropdown")
            ) {
                const isHidden = $(target).classList.contains("hide");
                if (!isHidden) button.click();
            }
        };
    });
}
