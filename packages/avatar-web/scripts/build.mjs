// Cross-platform build: multi-page dist/ (preview) + single-file dist-single/ (RN WebView) + copy into apps/mobile.
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const run = (cmd, env = {}) => execSync(cmd, { stdio: "inherit", cwd: root, env: { ...process.env, ...env } });
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
mkdirSync(resolve(root, "src/generated"), { recursive: true });
writeFileSync(resolve(root, "src/generated/capy-glb-mobile.ts"), `export const CAPY_GLB_B64 = "${readFileSync(resolve(root, "public/avatars/capy-v1.glb")).toString("base64")}";\n`);
run("pnpm exec vite build");
run("pnpm exec vite build --outDir dist-single", { SINGLE: "1" });
run("node scripts/copy-to-mobile.mjs");
