/**
 * Render trang đổi mật khẩu.
 * @returns {string} HTML string
 */
export function renderChangePasswordPage() {
    return `
        <div class="auth">
            <div class="auth__inner">
                <h1 class="auth__heading">ĐỔI MẬT KHẨU</h1>

                <form id="change-password-form" class="form auth__form" novalidate>
                    <div class="form__group">
                        <div class="form__text-input">
                            <label class="form__label" for="old-password">
                                Mật khẩu hiện tại
                            </label>
                            <input
                                class="form__input"
                                id="old-password"
                                type="password"
                                name="oldPassword"
                                placeholder="Nhập mật khẩu hiện tại"
                                autocomplete="current-password" />
                        </div>
                        <p class="form__error hide" data-error="oldPassword">
                            <span>Vui lòng nhập mật khẩu hiện tại</span>
                        </p>
                    </div>

                    <div class="form__group">
                        <div class="form__text-input">
                            <label class="form__label" for="new-password">
                                Mật khẩu mới
                            </label>
                            <input
                                class="form__input"
                                id="new-password"
                                type="password"
                                name="password"
                                placeholder="Tối thiểu 6 ký tự"
                                autocomplete="new-password" />
                        </div>
                        <p class="form__error hide" data-error="password">
                            <span>Mật khẩu mới phải tối thiểu 6 ký tự</span>
                        </p>
                    </div>

                    <div class="form__group">
                        <div class="form__text-input">
                            <label class="form__label" for="confirm-new-password">
                                Xác nhận mật khẩu mới
                            </label>
                            <input
                                class="form__input"
                                id="confirm-new-password"
                                type="password"
                                name="confirmPassword"
                                placeholder="Nhập lại mật khẩu mới"
                                autocomplete="new-password" />
                        </div>
                        <p class="form__error hide" data-error="confirmPassword">
                            <span>Mật khẩu nhập lại không khớp</span>
                        </p>
                    </div>

                    <div class="form__group">
                        <button type="submit" class="btn auth__btn-group">
                            Đổi mật khẩu
                        </button>
                    </div>
                </form>

                <p class="auth__text">
                    <a
                        href="/auth/profile"
                        class="auth__link"
                        data-navigo
                        data-show-when="logged-in">
                        ← Quay lại hồ sơ
                    </a>
                </p>
            </div>
        </div>
    `;
}
