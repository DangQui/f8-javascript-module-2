/**
 * pages/auth/auth.render.js — Auth page render (login + register)
 *
 * Form structure:
 *   - <div class="auth"> wrapper (background image, position: fixed)
 *   - <div class="auth__inner"> modal centered
 *   - 2 form:
 *       * #login-form    (email + password)
 *       * #register-form (email + name + password + confirmPassword)
 *
 * Toggle link dùng data-attribute `toggle-target` / `toggle-show` để
 * `libs/toggle.js` swap giữa 2 inner blocks.
 *
 * Lưu ý: Khác với code gốc là KHÔNG bọc `<main class="auth">` —
 * SPA router đã có `<main id="main" class="main-layout">` rồi,
 * page chỉ render inner. CSS `.auth` vẫn giữ `position: fixed` để
 * background phủ toàn viewport.
 *
 * Exports:
 *   - renderAuthPage(mode)  → HTML string
 *
 * Consumed by:
 *   - `@/pages/auth/auth.js`
 */

/**
 * Render form HTML theo route.
 * @param {"login"|"register"} mode - Active form khi mount
 * @returns {string} HTML string
 */
export function renderAuthPage(mode = "login") {
    const isLogin = mode === "login";

    return `
        <div class="auth">
            <!-- LOGIN -->
            <div id="auth-login" class="auth__inner ${isLogin ? "" : "hide"}">
                <h1 class="auth__heading">ĐĂNG NHẬP</h1>
                <form id="login-form" action="javascript:void(0)" class="form auth__form" novalidate>
                    <div class="form__group">
                        <div class="form__text-input">
                            <label class="form__label" for="email-login">
                                Email
                            </label>
                            <input
                                class="form__input"
                                id="email-login"
                                type="email"
                                name="email"
                                placeholder="Email của bạn"
                                autocomplete="email" />
                        </div>
                        <p class="form__error hide" data-error="email">
                            <span>Email không đúng định dạng!</span>
                        </p>
                    </div>
                    <div class="form__group">
                        <div class="form__text-input">
                            <label class="form__label" for="password-login">
                                Mật khẩu
                            </label>
                            <input
                                class="form__input"
                                id="password-login"
                                type="password"
                                name="password"
                                minlength="6"
                                placeholder="Mật khẩu"
                                autocomplete="current-password" />
                        </div>
                        <p class="form__error hide" data-error="password">
                            <span>Mật khẩu phải có ít nhất 6 ký tự!</span>
                        </p>
                    </div>
                    <div class="form__group">
                        <button type="submit" class="btn auth__btn-group">
                            Đăng nhập
                        </button>
                    </div>
                </form>

                <p class="auth__text">
                    Bạn chưa có tài khoản?
                    <a
                        href="#!"
                        class="js-toggle auth__link auth__text-link"
                        toggle-target="#auth-login"
                        toggle-show="#auth-register"
                        >Đăng ký</a>
                </p>
            </div>

            <!-- REGISTER -->
            <div id="auth-register" class="auth__inner ${isLogin ? "hide" : ""}">
                <h1 class="auth__heading">ĐĂNG KÝ</h1>
                <form id="register-form" action="javascript:void(0)" class="form auth__form" novalidate>
                    <div class="form__group">
                        <div class="form__text-input">
                            <label class="form__label" for="email-register">
                                Email
                            </label>
                            <input
                                class="form__input"
                                id="email-register"
                                type="email"
                                name="email"
                                placeholder="Email của bạn"
                                autocomplete="email" />
                        </div>
                        <p class="form__error hide" data-error="email">
                            <span>Email không đúng định dạng!</span>
                        </p>
                    </div>
                    <div class="form__group">
                        <div class="form__text-input">
                            <label class="form__label" for="name-register">
                                Tên hiển thị
                            </label>
                            <input
                                class="form__input"
                                id="name-register"
                                type="text"
                                name="name"
                                placeholder="Tên hiển thị của bạn"
                                autocomplete="name" />
                        </div>
                        <p class="form__error hide" data-error="name">
                            <span>Vui lòng nhập tên hiển thị!</span>
                        </p>
                    </div>
                    <div class="form__group">
                        <div class="form__text-input">
                            <label class="form__label" for="password-register">
                                Mật khẩu
                            </label>
                            <input
                                class="form__input"
                                id="password-register"
                                type="password"
                                name="password"
                                minlength="6"
                                placeholder="Mật khẩu"
                                autocomplete="new-password" />
                        </div>
                        <p class="form__error hide" data-error="password">
                            <span>Mật khẩu phải có ít nhất 6 ký tự!</span>
                        </p>
                    </div>
                    <div class="form__group">
                        <div class="form__text-input">
                            <label
                                class="form__label"
                                for="confirm-password-register">
                                Nhập lại mật khẩu
                            </label>
                            <input
                                class="form__input"
                                id="confirm-password-register"
                                type="password"
                                name="confirm-password"
                                minlength="6"
                                placeholder="Nhập lại mật khẩu"
                                autocomplete="new-password" />
                        </div>
                        <p class="form__error hide" data-error="confirm-password">
                            <span>Mật khẩu nhập lại không khớp!</span>
                        </p>
                    </div>
                    <div class="form__group">
                        <button type="submit" class="btn auth__btn-group">
                            Đăng ký
                        </button>
                    </div>
                </form>

                <p class="auth__text">
                    Bạn đã có tài khoản?
                    <a
                        href="#!"
                        class="js-toggle auth__link auth__text-link"
                        toggle-target="#auth-register"
                        toggle-show="#auth-login"
                        >Đăng nhập</a>
                </p>
            </div>
        </div>
    `;
}
