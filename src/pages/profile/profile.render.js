/**
 * pages/profile/profile.render.js — Profile page render
 *
 * Cấu trúc:
 *   - Header card: avatar lớn + tên + email + joinedAt
 *   - Form #update-profile-form: name + email
 *   - Link "Đổi mật khẩu" → /auth/change-password
 *   - Button "Đăng xuất" (data-logout)
 *
 * UI structure port từ base.js `wr()` dòng 5572-5609.
 * Style dùng class `.auth` (modal centered + background image) +
 * `.form` (input + error) — đã có sẵn trong SCSS 7-1.
 *
 * Exports:
 *   - renderProfilePage(user) → HTML string
 *
 * Consumed by:
 *   - `@/pages/profile/profile.js`
 */

import { escapeHtml, escapeAttr } from "@/utils/format.js";

/**
 * Render trang profile.
 * @param {{ name?: string, email?: string, initial?: string, joinedAt?: string }} user
 * @returns {string} HTML string
 */
export function renderProfilePage(user = {}) {
    const name = user.name || "User";
    const email = user.email || "";
    const initial = user.initial || name.charAt(0).toUpperCase() || "U";
    const joinedAt = formatJoinedDate(user.joinedAt);

    return `
        <div class="auth">
            <div class="auth__inner auth__inner--profile">
                <!-- Profile header card -->
                <div class="profile-header">
                    <div class="profile-header__avatar avatar avatar--lg">
                        ${escapeHtml(initial)}
                    </div>
                    <h2 class="profile-header__name" data-profile-name>
                        ${escapeHtml(name)}
                    </h2>
                    <p class="profile-header__email" data-profile-email>
                        ${escapeHtml(email)}
                    </p>
                    ${
                        joinedAt
                            ? `<p class="profile-header__joined">
                                <i class="fa-regular fa-calendar"></i>
                                Tham gia ${joinedAt}
                              </p>`
                            : ""
                    }
                </div>

                <!-- Update form -->
                <h1 class="auth__heading auth__heading--sm">CẬP NHẬT THÔNG TIN</h1>
                <form id="update-profile-form" class="form auth__form" novalidate>
                    <div class="form__group">
                        <div class="form__text-input">
                            <label class="form__label" for="profile-name">
                                Tên hiển thị
                            </label>
                            <input
                                class="form__input"
                                id="profile-name"
                                type="text"
                                name="name"
                                value="${escapeAttr(name)}"
                                placeholder="Tên hiển thị của bạn" />
                        </div>
                        <p class="form__error hide" data-error="name">
                            <span>Vui lòng nhập tên hiển thị</span>
                        </p>
                    </div>

                    <div class="form__group">
                        <div class="form__text-input">
                            <label class="form__label" for="profile-email">
                                Email
                            </label>
                            <input
                                class="form__input"
                                id="profile-email"
                                type="email"
                                name="email"
                                value="${escapeAttr(email)}"
                                placeholder="Email của bạn"
                                autocomplete="email" />
                        </div>
                        <p class="form__error hide" data-error="email">
                            <span>Email không hợp lệ</span>
                        </p>
                    </div>

                    <div class="form__group">
                        <button type="submit" class="btn auth__btn-group">
                            Cập nhật
                        </button>
                    </div>
                </form>

                <p class="auth__text">
                    <a
                        href="/auth/change-password"
                        class="auth__link"
                        data-navigo>Đổi mật khẩu</a>
                    <span class="auth__text-sep">•</span>
                    <button
                        type="button"
                        class="auth__link"
                        data-logout>Đăng xuất</button>
                </p>
            </div>
        </div>
    `;
}

/**
 * Format ISO date string → "DD/MM/YYYY" (tiếng Việt).
 * Trả về "" nếu input không hợp lệ.
 */
function formatJoinedDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
}
