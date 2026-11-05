/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" so the built site works from any path (GitHub Pages, Netlify, S3, a USB stick).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: { output: { manualChunks: { react: ["react", "react-dom", "react-router-dom"] } } },
  },
  test: { environment: "node" },
});
