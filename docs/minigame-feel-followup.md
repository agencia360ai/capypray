# Minigame feel and audio follow-up

Base: main at 8ce5c7a. English UI copy remains in the localization catalog.

- Color Pour now has two spare jars, undo, valid-target highlights, and feedback for invalid moves/dead ends. Bounded generation accepts only solver-proven boards and falls back to a known unfinished, solvable board. Previously the emergency fallback was already solved; gameplay also offered no escape from a dead end except restart.
- Every distinct game/level victory is saved immediately, advances the saved level, and contributes to permanent badges at 1, 5 and 10 wins per game. Replaying cannot duplicate a reward. Prayer lanterns and paid access are unchanged. Badges appear in the game cards, and the win card shows saved progress and an optional return to games.
- Prayer path has a back-to-lobby control. Its duplicate quick-prayer shortcut now opens the full path; collection pages return to their previous screen when available.
- Web narration reuses one HTML audio element, catches browser autoplay rejection and retries on the next gesture. File failures fall back to speech, and cancellation clears queued retries. Games offer Hear Capy again. Native audio configuration is only marked successful after it resolves, and playback explicitly clears mute.

Validation: TypeScript passed; 90 mobile tests passed, including first 100 Color Pour levels (deterministic, unfinished, legal move, solver-verified), badge deduplication/reset, and browser audio recovery/cancellation. Browser at 390x844: completed levels 1 and 2, exercised Undo, inspected celebration/badge and collection persistence after reload, and verified return to the next level. No physical-device listening test: the user's silence report is not yet conclusively reproduced on their device. Native haptics, Safari activation and VoiceOver still need device validation.

This is a focused gameplay update, not store-release approval. Badges are achievements; no additional 3D cosmetic models or paid rewards were introduced.
