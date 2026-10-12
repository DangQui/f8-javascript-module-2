import { defineConfig } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    plugins: [
        // vite-plugin-html: cho phép dùng EJS <%- include('partials/...') %>
        // trong index.html để inject header/sidebar/player partials.
        // - pages[0].injectOptions.ejsOptions: truyền `views` + `filename` để
        //   EJS resolve `<%- include('partials/header.html') %>` từ root project.
        // - async: true — match với mặc định của vite-plugin-html.
        createHtmlPlugin({
            pages: [
                {
                    filename: "index.html",
                    template: "./index.html",
                    injectOptions: {
                        ejsOptions: {
                            views: [__dirname],
                            filename: resolve(__dirname, "index.html"),
                            async: false,
                        },
                    },
                },
            ],
        }),
    ],

    // Alias giúp gọi từ src/ dễ dàng (giống f8-module)
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            "@styles": resolve(__dirname, "./src/styles"),
            "@services": resolve(__dirname, "./src/services"),
            "@components": resolve(__dirname, "./src/components"),
            "@pages": resolve(__dirname, "./src/pages"),
            "@libs": resolve(__dirname, "./src/libs"),
            "@utils": resolve(__dirname, "./src/utils"),
            "@layout": resolve(__dirname, "./src/layout"),
            "@state": resolve(__dirname, "./src/state"),
        },
    },

    // Cấu hình Sass modern API + tắt deprecation warnings
    // (warnings hiện tại là do code dùng if() syntax cũ - không phải lỗi)
    css: {
        preprocessorOptions: {
            scss: {
                api: "modern-compiler",
                // Tắt warnings để build output sạch (legacy syntax không fix ngay)
                silenceDeprecations: [
                    "if-function",
                    "import",
                    "global-builtin",
                    "color-functions",
                    "slash-div",
                    "abs-percent",
                ],
            },
        },
    },

    // Dev server
    server: {
        port: 5173,
        open: true,
    },

    // Build
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
});
