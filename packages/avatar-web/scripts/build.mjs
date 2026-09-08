// Cross-platform build: multi-page dist/ (preview) + single-file dist-single/ (RN WebView) + copy into apps/mobile.
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", cwd: root, env: { ...process.env, ...env } });
run("pnpm exec vite build");
run("pnpm exec vite build --outDir dist-single", { SINGLE: "1" });
run("node scripts/copy-to-mobile.mjs");
