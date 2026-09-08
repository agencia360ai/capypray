# Capy Prayer — rules for Claude Code

- Read `docs/GDD.md` before any feature. The GDD is the source of truth. `docs/ASSET_INVENTORY.md` explains what already exists (Capy rig, textures, clips) and how it maps to the GDD.
- Every text, prayer, clip name, reward and minigame comes from a Content Pack JSON (`packages/content/packs/*`). Zero hardcoded strings in the kid-facing UI.
- Forbidden: third-party analytics/ads SDKs, `localStorage`, runtime LLM talking to the child, collecting kid PII (photos, voice, location).
- Avatar is only driven through `IAvatarRenderer` (`apps/mobile/src/avatar`). Visual changes → run `/preview` in `packages/avatar-web` and attach a screenshot to the PR.
- New content → `pnpm content:validate` must pass (schema + referenced ids exist + audio files listed).
- Avatar source of truth: `tools/avatar/src/Capi_rig.fbx` (Blender Rigify). Rebuild with `pnpm avatar:build` (Blender headless + gltf-transform). Never hand-edit the GLB.
- Each PR: content validator tests + avatar-web build + mobile typecheck.
- Code and commits in English. Minimal comments.

## Layout
```
apps/mobile/          Expo (expo-router, TS)  — kid app + Parent Corner
packages/avatar-web/  Vite + R3F viewer, built into apps/mobile/assets/avatar
packages/content/     Zod schema, packs, validate CLI
packages/ui/          shared RN components
supabase/             migrations (RLS), edge functions
tools/avatar/         FBX → GLB pipeline (Blender headless + gltf-transform)
docs/                 GDD, asset inventory
```
