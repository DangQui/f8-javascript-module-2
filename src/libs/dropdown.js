/**
 * dropdown.js — Dropdown menu (avatar user menu, ...)
 *
 * Bind click handler cho `[data-dropdown]` elements. Hỗ trợ nhiều dropdown
 * độc lập trên cùng trang.
 *
 * HTML pattern:
 *   <div class="dropdown-wrapper" data-dropdown>
 *       <button data-dropdown-toggle>Avatar</button>
 *       <div class="dropdown d-none" data-dropdown-menu>
 *           <button data-dropdown-close>Đăng xuất</button>
 *       </div>
 *   </div>
 *
 * Exports:
 *   - initDropdowns() → bind handlers cho mọi [data-dropdown] trong DOM
 *
 * Consumed by:
 *   - `@/layout/init.js` gọi 1 lần sau khi layout render xong
 */

export function initDropdowns() {
    document.querySelectorAll("[data-dropdown]").forEach((wrapper) => {
        setupDropdown(wrapper);
    });
}

function setupDropdown(wrapper) {
    const toggle = wrapper.querySelector("[data-dropdown-toggle]");
    const menu = wrapper.querySelector("[data-dropdown-menu]");
    if (!toggle || !menu) return;

    // Click toggle → mở/đóng
    toggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = !menu.classList.contains("d-none");
        closeAllDropdowns();
        if (!isOpen) {
            menu.classList.remove("d-none");
            menu.classList.add("show");
        }
    });

    // Click bên trong menu → KHÔNG đóng,
    // TRỪ khi click vào [data-dropdown-close] (vd: nút Đăng xuất)
    menu.addEventListener("click", (e) => {
        if (e.target.closest("[data-dropdown-close]")) {
            closeDropdown(menu);
            return; // để event bubble lên document xử lý data-logout
        }
        e.stopPropagation();
    });

    // Click ra ngoài → đóng
    document.addEventListener("click", () => {
        closeDropdown(menu);
    });

    // ESC → đóng
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeDropdown(menu);
    });
}

function closeDropdown(menu) {
    menu.classList.add("d-none");
    menu.classList.remove("show");
}

function closeAllDropdowns() {
    document
        .querySelectorAll("[data-dropdown-menu].show")
        .forEach((menu) => closeDropdown(menu));
}
