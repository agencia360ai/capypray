# Capy's narration

The catalogue identifies Higgsfield's "Capy Pirate" voice as the voice for its recordings (element `edf4c1f2-fb6c-47af-8900-11e2cca4e3b2`, speech rate -10, pitch -3), recorded in `audio/voice.json` beside the URLs. They are referenced by URL and absent from the repository, so an unprepared checkout falls back to device speech. `pnpm audio:prepare` downloads them and regenerates the static Metro manifest. Rebuild or restart Expo after preparing audio.

The catalogue contains 457 pack recordings and 8 parent-zone recordings (465 files total). Nothing kid-facing falls back to device speech. See [the audit](voice-audit.md) and its [machine-readable queue](voice-recording-queue.json) (empty), which the narration test holds to whatever `--missing` reports. Parent-zone narration remains listed separately by `CAPY_LINES`.

The fetcher keeps `apps/mobile/assets/audio/urls.lock.json` and names the voice it filled the folder from, so re-rendering in another voice replaces the files instead of skipping them. Parent Corner reads that name through the generated manifest: `device` there means the folder is empty.

The legacy `mg_w1d2_prompt.mp3` says to drag items. Its updated screen says to tap, so the current pack uses a new audio ID and cannot accidentally play the stale instruction. Minigame success and retry responses now pass their recording through to the speech bubble. Successful games wait for the actual spoken completion, followed by a half-second pause, instead of cutting narration at 1.9 seconds.

On 24 sep 2026 the whole catalogue was re-recorded in "Capy Pirate", a clone of a MiniMax "Angry Pirate" sample the user supplied, pitched down a further 3 semitones for a funny, cartoon-pirate-but-kid-friendly read (Juan's calmer preset voice was used for everything before that, chosen 11 sep 2026 after auditioning Arthur, Barrett and Bob). Keep one voice for the whole set: render new lines with the voice in `audio/voice.json`, or re-render everything. `tools/voicestudio-batch.ts` can render the set locally instead, with no API key.

Three quirks of the hosted renderer are worth knowing. It refuses a line that ends in a sentence plus "Amen." often enough to block, which is why the mealtime grace closes with "Amen." as its own line; it also intermittently refused two Lord's-Prayer lines containing "forgive" on the cloned voice's default `seed_audio` engine — those two rendered fine on `text2speech_v2`'s `minimax` variant with the same voice instead. It returns rate-limit errors under load (roughly 8-10 submissions per rolling window), so a batch needs retries and pacing.

## Verification

Run `node --test tools/audio-lines.test.mjs`, mobile typecheck, content tests, and the avatar build. Export the web app, start `node tools/preview-server.mjs`, and run `node tools/audio-smoke.cjs` with `PLAYWRIGHT_CHROMIUM` set if needed. The audio smoke check observes real playback of the first greeting, a retry, and a success; it verifies that success narration is not cut off before the next beat. Headless playback permits autoplay explicitly; a real browser may require the user's first interaction. Physical iOS and Android playback still needs testing.

The content CLI's default warning checks the pack-local audio directory; downloaded app recordings live in `apps/mobile/assets/audio`. For the list of pack recordings still unavailable from the existing upload, run:

```sh
node tools/audio-lines.mjs packages/content/packs/christian-us-en-v1 --missing
```

All recordings are bundled for offline playback. No child voice is recorded or sent for generation. English is the only bundled narration locale; another language needs its own pack and audio catalog.
