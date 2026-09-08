import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import { resolve } from "node:path";

// Two entries: index.html (embedded in the RN WebView, single file, offline)
// and preview.html (dev tool with a clip dropdown, GDD §8.3 step 5).
// SINGLE=1 builds index.html as one self-contained HTML (GLB stays a sibling file).
const single = process.env.SINGLE === "1";

export default defineConfig({
  plugins: [react(), ...(single ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: single
      ? undefined
      : { input: { index: resolve(__dirname, "index.html"), preview: resolve(__dirname, "preview.html") } },
  },
});
