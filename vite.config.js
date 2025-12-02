// This Vite config file (vite.config.js) tells Rollup (production bundler) 
// to treat multiple HTML files as entry points so each becomes its own built page.

import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                faq: resolve(__dirname, "faq.html"),
                index: resolve(__dirname, "index.html"),
                leftovers: resolve(__dirname, "leftovers.html"),
                login: resolve(__dirname, "Login.html"),
                profile: resolve(__dirname, "profile.html"),
                profileEdit: resolve(__dirname, "profileEdit.html"),
                review: resolve(__dirname, "review.html"),
                search: resolve(__dirname, "search.html"),
                settings: resolve(__dirname, "settings.html"),
                swipe: resolve(__dirname, "swipe.html"),
            }
        }
    }
});
