export const MESSAGES = {
    /** Error inline hiển thị dưới input khi user nhập sai. */
    VALIDATION: {
        EMAIL_REQUIRED: "Vui lòng nhập email",
        EMAIL_INVALID: "Email không đúng định dạng!",
        EMAIL_TOO_LONG: "Email quá dài (tối đa 254 ký tự)",
        PASSWORD_REQUIRED: "Vui lòng nhập mật khẩu",
        PASSWORD_TOO_SHORT: "Mật khẩu phải có ít nhất 6 ký tự!",
        PASSWORD_WEAK: "Mật khẩu nên có chữ hoa, chữ thường và số để mạnh hơn",
        CONFIRM_PASSWORD_REQUIRED: "Vui lòng nhập lại mật khẩu",
        CONFIRM_PASSWORD_MISMATCH: "Mật khẩu nhập lại không khớp!",
        NAME_REQUIRED: "Vui lòng nhập tên hiển thị",
        NAME_TOO_SHORT: "Tên hiển thị phải có ít nhất 2 ký tự",
        NAME_TOO_LONG: "Tên hiển thị tối đa 50 ký tự",
        OLD_PASSWORD_REQUIRED: "Vui lòng nhập mật khẩu hiện tại",
        NEW_PASSWORD_REQUIRED: "Vui lòng nhập mật khẩu mới",
        NEW_PASSWORD_SAME_AS_OLD: "Mật khẩu mới phải khác mật khẩu hiện tại",
    },

    /** Messages cho flow login/register/profile/change-password. */
    AUTH: {
        LOGIN_SUCCESS: "Đăng nhập thành công! Vui lòng đợi trong giây lát!",
        LOGIN_FAILED: "Đăng nhập thất bại! Vui lòng thử lại.",
        LOGIN_INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng",
        LOGIN_USER_NOT_FOUND: "Email chưa được đăng ký",
        REGISTER_SUCCESS: "Đăng ký thành công!",
        REGISTER_FAILED: "Đăng ký thất bại! Vui lòng thử lại.",
        REGISTER_EMAIL_TAKEN: "Email đã tồn tại",
        LOGOUT_SUCCESS: "Đăng xuất thành công!",
        LOGOUT_FAILED: "Đăng xuất thất bại! Vui lòng thử lại.",
        PROFILE_UPDATE_SUCCESS: "Cập nhật thông tin thành công!",
        PROFILE_UPDATE_FAILED: "Cập nhật thông tin thất bại! Vui lòng thử lại.",
        PROFILE_GUARD: "Vui lòng đăng nhập để xem hồ sơ!",
        CHANGE_PASSWORD_GUARD: "Vui lòng đăng nhập để đổi mật khẩu!",
        LIBRARY_GUARD: "Vui lòng đăng nhập để xem thư viện!",
        LOGIN_REQUIRED: "Vui lòng đăng nhập để sử dụng chức năng này!",
        CHANGE_PASSWORD_SUCCESS: "Đổi mật khẩu thành công!",
        CHANGE_PASSWORD_FAILED: "Đổi mật khẩu thất bại! Vui lòng thử lại.",
        CHANGE_PASSWORD_OLD_INCORRECT: "Mật khẩu hiện tại không chính xác",
        CHANGE_PASSWORD_MAINTENANCE:
            "Chức năng đang bảo trì. Vui lòng thử lại sau.",
        SESSION_EXPIRED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    },

    /** Network/timeout/server errors — dùng chung mọi flow. */
    COMMON: {
        NETWORK_ERROR: "Mất kết nối mạng. Vui lòng kiểm tra internet.",
        TIMEOUT: "Yêu cầu quá thời gian. Vui lòng thử lại.",
        SERVER_ERROR: "Lỗi máy chủ. Vui lòng thử lại sau.",
        RATE_LIMIT: "Bạn thao tác quá nhanh. Vui lòng đợi một chút.",
        UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        FORBIDDEN: "Bạn không có quyền truy cập.",
        NOT_FOUND: "Không tìm thấy dữ liệu.",
        BAD_REQUEST: "Yêu cầu không hợp lệ. Vui lòng thử lại.",
        UNKNOWN_ERROR: "Đã xảy ra lỗi. Vui lòng thử lại.",
    },
};

export default MESSAGES;
