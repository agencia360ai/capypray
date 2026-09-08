#!/usr/bin/env bash
# FBX (Rigify) -> capy-v1.glb. Requires blender on PATH and pnpm.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/tools/avatar/out"
mkdir -p "$OUT"
EXTRA=()
if compgen -G "$ROOT/tools/avatar/src/mixamo/*.fbx" > /dev/null; then
  EXTRA=(--extra-fbx "$ROOT"/tools/avatar/src/mixamo/*.fbx)
fi

blender -b --python "$ROOT/tools/avatar/export_capy.py" -- \
  --fbx "$ROOT/tools/avatar/src/Capi_rig.fbx" \
  --clip-map "$ROOT/tools/avatar/clip-map.json" \
  --out "$OUT/capy-raw.glb" \
  --tex-size "${TEX_SIZE:-1024}" "${EXTRA[@]}"

# Optimize: dedup, prune, resample animation, quantize + meshopt, webp textures.
pnpm dlx @gltf-transform/cli@4 optimize "$OUT/capy-raw.glb" "$OUT/capy-v1.glb" \
  --compress meshopt --texture-compress webp --texture-size 1024 --simplify false

DEST="$ROOT/packages/avatar-web/public/avatars"
mkdir -p "$DEST"
cp "$OUT/capy-v1.glb" "$DEST/capy-v1.glb"
pnpm dlx @gltf-transform/cli@4 inspect "$DEST/capy-v1.glb" | sed -n '1,80p'
ls -la "$DEST/capy-v1.glb"
