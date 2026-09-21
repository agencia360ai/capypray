# Capy's narration

The catalogue identifies Higgsfield's Juan voice as the voice for its recordings (`6b528d43-c056-4a2f-9d82-1591a7ba13b0`, speech rate -10), recorded in `audio/voice.json` beside the URLs. They are referenced by URL and absent from the repository, so an unprepared checkout falls back to device speech. `pnpm audio:prepare` downloads them and regenerates the static Metro manifest. Rebuild or restart Expo after preparing audio.

The catalogue contains 415 pack recordings and 8 parent-zone recordings (423 Juan files). A September 20 audit found 19 additional spoken strings that were not linked: the lantern reward line, ten story titles, and eight place titles. They now have stable audio IDs in the pack and UI; their recordings are still pending. Until supplied, those 19 strings continue to use device speech. See [the complete recording queue](voice-audit.md) and its [machine-readable JSON](voice-recording-queue.json). Parent-zone narration remains listed separately by `CAPY_LINES`.

The fetcher keeps `apps/mobile/assets/audio/urls.lock.json` and names the voice it filled the folder from, so re-rendering in another voice replaces the files instead of skipping them. Parent Corner reads that name through the generated manifest: `device` there means the folder is empty.

The legacy `mg_w1d2_prompt.mp3` says to drag items. Its updated screen says to tap, so the current pack uses a new audio ID and cannot accidentally play the stale instruction. Minigame success and retry responses now pass their recording through to the speech bubble. Successful games wait for the actual spoken completion, followed by a half-second pause, instead of cutting narration at 1.9 seconds.

Juan was chosen on 11 sep 2026 after auditioning Arthur, Barrett and Bob on real pack lines; Arthur was the previous set and Sam from ElevenLabs remains documented in `tools/tts-batch.ts` as an earlier candidate. Keep one voice for the whole set: render new lines with the voice in `audio/voice.json`, or re-render everything. `tools/voicestudio-batch.ts` can render the set locally instead, with no API key.

Two quirks of the hosted renderer are worth knowing. It refuses a line that ends in a sentence plus "Amen." often enough to block, which is why the mealtime grace closes with "Amen." as its own line, and it returns rate-limit errors under load, so a batch needs retries.

## Verification

Run `node --test tools/audio-lines.test.mjs`, mobile typecheck, content tests, and the avatar build. Export the web app, start `node tools/preview-server.mjs`, and run `node tools/audio-smoke.cjs` with `PLAYWRIGHT_CHROMIUM` set if needed. The audio smoke check observes real playback of the first greeting, a retry, and a success; it verifies that success narration is not cut off before the next beat. Headless playback permits autoplay explicitly; a real browser may require the user's first interaction. Physical iOS and Android playback still needs testing.

The content CLI's default warning checks the pack-local audio directory; downloaded app recordings live in `apps/mobile/assets/audio`. For the list of pack recordings still unavailable from the existing upload, run:

```sh
node tools/audio-lines.mjs packages/content/packs/christian-us-en-v1 --missing
```

All recordings are bundled for offline playback. No child voice is recorded or sent for generation. English is the only bundled narration locale; another language needs its own pack and audio catalog.
