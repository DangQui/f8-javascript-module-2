import { defineConfig } from "vite";
import { createHtmlPlugin } from "vite-plugin-html";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const base = process.env.GHPAGES_BASE || "/";

export default defineConfig({
    base: "/",
    plugins: [
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
    css: {
        preprocessorOptions: {
            scss: {
                api: "modern-compiler",
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
