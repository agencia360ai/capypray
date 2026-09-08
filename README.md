# Capy Prayer

Prayer buddy for kids 4–8. Capy, a 3D capybara, guides 3–5 minute daily Prayer Moments. See `docs/GDD.md` (spec) and `docs/ASSET_INVENTORY.md` (what already existed and how it was reused).

## Quick start

```bash
pnpm install
pnpm content:validate                  # pack schema + references
pnpm --filter @capy/content test
pnpm --filter @capy/avatar-web build   # → apps/mobile/assets/avatar
pnpm --filter @capy/avatar-web dev     # http://localhost:5173/preview.html
pnpm --filter @capy/mobile start       # Expo
```

## Avatar pipeline

```bash
apt-get install blender python3-numpy   # or any Blender ≥ 4.0 on PATH
pnpm avatar:build                        # tools/avatar/src/Capi_rig.fbx → packages/avatar-web/public/avatars/capy-v1.glb
PLAYWRIGHT_CHROMIUM=/path/to/chromium pnpm --filter @capy/avatar-web screenshot idle_breathe talk_a
```

Clip names come from `tools/avatar/clip-map.json`. Drop Mixamo FBX clips (exported "without skin") into `tools/avatar/src/mixamo/<gdd_clip_name>.fbx` and rebuild; the file name becomes the clip name.

## Status

| Area | State |
|---|---|
| Avatar GLB (12 clips, 3.1 MB, face rig) | ✅ built from the existing Rigify FBX |
| avatar-web viewer, RN bridge, /preview + screenshots | ✅ |
| Content schema + validator + pack Weeks 1–2 (14 lessons) + bedtime routine | ✅ tests pass |
| Mobile: AvatarView, lesson runner, all 6 minigame types, Pond screen, streak + Grace Days, lights_out | ✅ typecheck + Metro export pass |
| Supabase schema + RLS, rc-webhook, weekly-report | ✅ migrations written, not yet applied |
| Missing clips: wave_hello, pray_hands, kneel_pray, listen_nod, clap, heart, think, celebrate | ⏳ Mixamo step (manual) |
| Audio (ElevenLabs) | ⏳ `tools/tts-batch.ts` ready, needs API key |
| Parent onboarding, parental gate, Parent Corner (bedtime, reminder, people + notes, delete data) | ✅ |
| Premium gating (`useEntitlement`, lock UI, sandbox switch) | ✅ · RevenueCat adapter on dev build (`apps/mobile/src/entitlements/revenuecat.md`) |
| Kids Category / COPPA checklist | `docs/COMPLIANCE.md` |
| Weeks 3–4, Supabase auth + sync, audio, Mixamo clips | ⏳ |
