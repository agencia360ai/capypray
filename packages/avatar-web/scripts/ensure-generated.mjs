// Placeholders so `tsc` works on a clean checkout; real files are written by build.mjs / build-artifact.mjs.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const dir = resolve(import.meta.dirname, "../src/generated");
mkdirSync(dir, { recursive: true });
for (const f of ["capy-glb-mobile.ts", "capy-glb-artifact.ts"]) {
  const p = resolve(dir, f);
  if (!existsSync(p)) writeFileSync(p, 'export const CAPY_GLB_B64 = "";\n');
}
