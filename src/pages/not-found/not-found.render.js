/**
 * Render trang 404.
 * @param {string} [path] - Đường dẫn user đã gõ (echo lại)
 * @returns {string} HTML string
 */
export function renderNotFoundPage(path = "") {
    const safePath = escapeHtml(path);

    return `
        <section class="not-found">
            <div class="not-found__icon" aria-hidden="true">404</div>
            <h1 class="not-found__title">Không tìm thấy trang</h1>
            <p class="not-found__desc">
                Đường dẫn
                <code class="not-found__path">${safePath}</code>
                không tồn tại hoặc đã bị xoá.
            </p>
            <div class="not-found__actions">
                <a
                    href="/"
                    class="btn not-found__btn not-found__btn--primary"
                    data-navigo>
                    <i class="fa-solid fa-house"></i>
                    Về trang chủ
                </a>
                <a
                    href="/library"
                    class="btn not-found__btn"
                    data-navigo>
                    <i class="fa-solid fa-bookmark"></i>
                    Xem thư viện
                </a>
            </div>
            <p class="not-found__hint">
                <i class="fa-solid fa-circle-info"></i>
                Gợi ý: thử tìm bài hát, đĩa nhạc hoặc nghệ sĩ qua ô tìm kiếm
                phía trên cùng.
            </p>
        </section>
    `;
}

function escapeHtml(s) {
    return String(s).replace(
        /[&<>"']/g,
        (c) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[c],
    );
}
