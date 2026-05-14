import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, "renderer"),
  base: "./",
  server: { port: 5174, strictPort: true },
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  // Don't inherit the parent recap/postcss config — desktop uses plain CSS.
  css: { postcss: { plugins: [] } },
});
