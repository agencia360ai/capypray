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

6. Capy talks (device voice). Every bubble line is spoken; the mouth moves while the voice plays and stops when it ends. Minigames: celebrate on a win, droop on a miss.
7. Weeks 1–4 are all there (28 lessons). Beacon 1 unlocks the Flower, Beacon 2 the Scarf, Beacon 3 the Sleepy Cap: tap them in the Pond to put them on Capy.
8. Parent Corner → "Back up progress" appears only when `apps/mobile/.env` has Supabase keys (see `.env.example`); otherwise it says backup is off.

Known gaps while testing:

- Voice is the phone's TTS for now (English). ElevenLabs pre-rendered audio replaces it once `tools/tts-batch.ts` runs.
- Missing clips (`pray_hands`, `wave_hello`, `celebrate`, …) fall back to idle/talk clips.
- The paywall is a placeholder until the RevenueCat dev build; the premium switch in Parent Corner simulates the entitlement.
- Storage is AsyncStorage for Expo Go; MMKV comes back with dev builds.

## 3. Regenerate the avatar

```bash
pnpm avatar:build        # needs Blender ≥ 4.0 + numpy on PATH
pnpm --filter @capy/avatar-web screenshot   # PLAYWRIGHT_CHROMIUM=/path/to/chromium if Playwright has no browser
# one pose at an exact clip time (software GL is slow, so scrub instead of waiting):
#   cd packages/avatar-web && node scripts/shot.mjs "clip=kneel_pray&t=3" out.png
# dump bone values over a clip: node scripts/dbg-clip.mjs kneel_pray
```

## Capy's voice (pre-rendered lines)

Every kid-facing line has a pre-rendered mp3 (Higgsfield "Arthur" voice). The URLs live in
`packages/content/packs/christian-us-en-v1/audio/urls.json`; the files are not committed. Bring them into the
bundle on your machine (no ffmpeg needed for mp3):

```powershell
node tools/audio-fetch.mjs packages/content/packs/christian-us-en-v1   # downloads to apps/mobile/assets/audio
node tools/audio-manifest.mjs                                          # regenerates src/audio/manifest.ts
pnpm --filter @capy/mobile start -c
```

Lines without a file fall back to the device voice. New lines: `node tools/audio-lines.mjs <packDir> --missing`
lists what still needs rendering. The set is complete: 362 pack lines + 8 Parent Corner lines = 370, all in one voice.
Parent Corner shows the count it found on the device.

### Rendering with VoiceStudio (local, no API key)

[VoiceStudio](https://github.com/debpalash/VoiceStudio) runs the text-to-speech on this machine, so re-rendering the
whole set costs nothing and the voice can be cloned from a sample you like. It is a build-time tool only: the app
bundles the resulting mp3 files, so the child's device still talks to no voice service.

1. Install VoiceStudio (desktop app, Docker or from source) and start it. Default server: `http://127.0.0.1:3900`.
2. In its window, pick the engine and the voice — or clone one from a short sample. Copy the voice profile id.
3. Render:

```powershell
pnpm tsx tools/voicestudio-batch.ts packages/content/packs/christian-us-en-v1 --list-voices
pnpm tsx tools/voicestudio-batch.ts packages/content/packs/christian-us-en-v1 --voice <profile-id> --only ob_,pw_
pnpm tsx tools/voicestudio-batch.ts packages/content/packs/christian-us-en-v1 --voice <profile-id>
```

The first render of a few lines (`--only`) is the cheap audition. A re-run only renders what changed
(`apps/mobile/assets/audio/manifest.json` keeps a hash per line); `--force` re-renders everything, `--speed`
tunes the pace (default 0.95). `VOICESTUDIO_API` and `VOICESTUDIO_MODEL` override the base URL and the engine.

Licence: VoiceStudio's app is AGPL-3.0 and its **default OmniVoice weights are CC-BY-NC — not usable in a paid app**.
Before rendering the shipping set, select an engine whose weights allow commercial use: CosyVoice 3, VoxCPM2 or
MOSS-TTS-Nano (Apache-2.0), or GPT-SoVITS (MIT). Avoid IndexTTS 2.5 and PocketTTS (gated licences).
Because a hosted render (`tools/audio-fetch.mjs`) and a local render write to the same folder, pick one voice for the
whole set — `--force` after switching engines, so no line keeps the old voice.
