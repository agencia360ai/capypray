// Builds dist-artifact/artifact.html: one HTML with the viewer + Capy GLB embedded (for claude.ai Artifacts).
// usage: node scripts/build-artifact.mjs [raw.glb]
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const raw = process.argv[2] ?? resolve(root, "../../tools/avatar/out/capy-raw.glb");
const tmp = resolve(root, "node_modules/.cache/capy-artifact");
mkdirSync(tmp, { recursive: true });
execSync(`pnpm dlx @gltf-transform/cli@4 optimize "${raw}" "${tmp}/nocomp.glb" --compress false --texture-compress webp --texture-size 1024 --simplify false`, { stdio: "inherit" });
execSync(`node "${resolve(root, "scripts/glb-for-artifact.mjs")}" "${tmp}/nocomp.glb" "${tmp}/artifact.glb"`, { stdio: "inherit" });
mkdirSync(resolve(root, "src/generated"), { recursive: true });
writeFileSync(resolve(root, "src/generated/capy-glb.ts"), `export const CAPY_GLB_B64 = "${readFileSync(`${tmp}/artifact.glb`).toString("base64")}";\n`);
execSync("pnpm exec vite build --outDir dist-artifact", { stdio: "inherit", cwd: root, env: { ...process.env, ARTIFACT: "1" } });
console.log("artifact:", resolve(root, "dist-artifact/artifact.html"), (statSync(resolve(root, "dist-artifact/artifact.html")).size / 1e6).toFixed(1), "MB");
