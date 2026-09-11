# Capy's narration

The existing uploaded recordings use Higgsfield's Arthur voice. They were referenced by URL but absent from the app bundle, so the local preview used device speech. `pnpm audio:prepare` downloads the recordings and regenerates the static Metro manifest. Rebuild or restart Expo after preparing audio.

The 352 downloads total approximately 12.3 MiB. Of the current content pack's 404 audio references, 339 have a recording and 65 still need narration. Thirteen downloaded files belong to retired references. New prayer moments, revised introduction lines, story morals, and the revised tap instruction remain on the device-speech fallback. Spoken UI nudges without an audio reference also use the fallback. Parent-zone narration is managed separately by `CAPY_LINES`.

The legacy `mg_w1d2_prompt.mp3` says to drag items. Its updated screen says to tap, so the current pack uses a new audio ID and cannot accidentally play the stale instruction. Minigame success and retry responses now pass their recording through to the speech bubble. Successful games wait for the actual spoken completion, followed by a half-second pause, instead of cutting narration at 1.9 seconds.

Sam from ElevenLabs is documented as a previous candidate, with settings in `tools/tts-batch.ts`, but no Sam recordings or ElevenLabs API key were available in this checkout. Arthur is available for review; the final voice choice remains open. Do not generate the remaining lines in a different voice by accident. The narration tools now include both tap reactions and story morals.

## Verification

Run `node --test tools/audio-lines.test.mjs`, mobile typecheck, content tests, and the avatar build. Export the web app, start `node tools/preview-server.mjs`, and run `node tools/audio-smoke.cjs` with `PLAYWRIGHT_CHROMIUM` set if needed. The audio smoke check observes real playback of the first greeting, a retry, and a success; it verifies that success narration is not cut off before the next beat. Headless playback permits autoplay explicitly; a real browser may require the user's first interaction. Physical iOS and Android playback still needs testing.

The content CLI's default warning checks the pack-local audio directory; downloaded app recordings live in `apps/mobile/assets/audio`. For the list of pack recordings still unavailable from the existing upload, run:

```sh
node tools/audio-lines.mjs packages/content/packs/christian-us-en-v1 --missing
```

All recordings are bundled for offline playback. No child voice is recorded or sent for generation. English is the only bundled narration locale; another language needs its own pack and audio catalog.
