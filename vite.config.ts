import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globIgnores: [
          "**/TodoDetail-*.js",
          "**/TodoListEmojiPickerContent-*.js",
          "**/todo-list-emoji-data-*.js",
        ],
        runtimeCaching: [
          {
            urlPattern:
              /\/assets\/(?:TodoDetail|TodoListEmojiPickerContent|todo-list-emoji-data)-[^/]+\.js$/,
            handler: "CacheFirst",
            options: {
              cacheName: "ritodo-optional-features",
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "apple-touch-icon-180x180.png",
      ],
      manifest: {
        id: "/",
        name: "RiTodo",
        short_name: "RiTodo",
        description:
          "A simple, fast, and intuitive to-do list app built with React, Vite, and Convex.",
        theme_color: "#f6f1e8",
        background_color: "#f6f1e8",
        display: "standalone",
        start_url: "/",
        categories: ["productivity"],
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@convex": path.resolve(__dirname, "./convex"),
    },
  },
});
