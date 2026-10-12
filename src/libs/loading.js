export function showLoading() {
    document.documentElement.classList.add("app-loading");
}

export function hideLoading() {
    document.documentElement.classList.remove("app-loading");
}

export const loading = {
    show: showLoading,
    hide: hideLoading,
};
