# How to test what exists today

## 1. Capy in the browser (no install)

Preview deployment (Vercel, auto-deploys on every push to the branch): see the URL in the README "Status" table.

- `/preview.html` — dropdown with every GDD clip. Clips marked "(fallback)" are the ones still missing from the rig (Mixamo step); they play the fallback clip.
- Buttons: `speak 4s` (random talk clip, back to idle), `lights out` (yawn → lie down → sleep), moods, `look →`.
- `/index.html` — the exact page the mobile WebView loads; it does nothing until it receives a `postMessage`.

## 2. The app in Expo Go (no native build)

```bash
git clone git@github.com:agencia360ai/capypray.git && cd capypray
git checkout claude/proyecto-componentes-existentes-cb6o9p
pnpm install
pnpm --filter @capy/avatar-web build   # builds the WebView bundle into apps/mobile/assets/avatar
pnpm --filter @capy/mobile start       # scan the QR with Expo Go (iOS/Android) — project targets Expo SDK 57
```

What to try:

0. After onboarding, Capy runs "Meet Capy": he asks 3 things (favorite, what made you happy, how you feel) and uses the answers in the first prayer. Capy stands on the meadow background; the WebView embeds the model, so no file loading is involved.
0b. First launch opens the parent onboarding (6 quick questions) and a sandbox paywall. "Continue in sandbox" flips premium on; "Not now" keeps only W1D1 + Bedtime unlocked (🔒 on the rest). The 👤 button on Home opens the parental gate (arithmetic + hold 3 s) → Parent Corner.
1. Home shows lanterns / beacons / streak and the list of Week 1 lessons. Tap the big card (next lesson).
2. A lesson runs beat by beat: Capy talks (subtitle + tap Next), "repeat after me" line by line, one minigame, a lantern reward, closing line. All text comes from `packages/content/packs/christian-us-en-v1/pack.json`.
3. W1D3 asks for Prayer People; they appear in the Pond (tap the counters on Home).
4. 🌙 Bedtime Prayer: 4 lines, then 30 s of dark screen while Capy lies down and sleeps.
5. Finish 7 lessons → first beacon → "Flower" reward unlocks in the Pond.

Known gaps while testing:

- No audio yet (ElevenLabs batch not run). Timing uses an estimate of ~2.6 words/s.
- Missing clips (`pray_hands`, `wave_hello`, `celebrate`, …) fall back to idle/talk clips.
- The paywall is a placeholder until the RevenueCat dev build; the premium switch in Parent Corner simulates the entitlement.
- Storage is AsyncStorage for Expo Go; MMKV comes back with dev builds.

## 3. Regenerate the avatar

```bash
pnpm avatar:build        # needs Blender ≥ 4.0 + numpy on PATH
pnpm --filter @capy/avatar-web screenshot   # PLAYWRIGHT_CHROMIUM=/path/to/chromium if Playwright has no browser
```
