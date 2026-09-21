# Trail visual pass

The trail lobby now frames the painted background, landmarks and Capy in the space above its action sheet. Previously, the background continued behind the sheet while the landmarks used a different coordinate frame, leaving little visible ground and placing the arch in the sky.

- A trail-only scene height follows the measured sheet. The avatar receives viewport commands through the existing renderer interface. Leaving the trail clears this height and restores the usual framing.
- Capy occupies a foreground band with more visible scenery than the original lobby. The follow-up enlarges him by widening that band from 39% to 47% of the scene height.
- Flat, warm stone surfaces replace circular markers. The next stop retains a 68 × 56 touch target; the primary button remains an alternative.
- The arch ends at the distant path. Its caption moves beside it on short screens to avoid the header.
- The 44 px sheet handle toggles between the open panel and a compact primary-action bar. A vertical swipe of more than 30 px on the handle selects the corresponding position. The gesture is confined to the handle, leaving content scrolling independent.
- Explore expands the secondary destinations when the panel is open. Labels wrap, and the three-column row no longer imposes a 92 px minimum on each item.
- Distant scenery and completed/future stones render behind the avatar; the next actionable stone and foreground plants remain in front. Enlarging Capy therefore does not paint distant stones across his face.
- All child-facing copy still comes from the pack. No new imagery, recordings, currencies or progression rules were added.

## Verification

Tested in the real Expo web app with a fresh browser profile and synthetic progress:
- 390 × 844, 320 × 700, and 320 × 568 portraits, including expanded destinations.
- Expanded controls fit horizontally; the disclosure exposes its expanded state.
- Handle taps and swipes in both directions change the panel position; the primary action stays available when collapsed.
- Continue opens W1D3; returning restores the trail framing.
- Reduced motion and an aborted avatar request both leave the route usable.
- Opening a lesson and returning preserves completions and lanterns.

Also passed: 51 mobile tests, 24 content tests, mobile typecheck, content validation, and the avatar-web build. The content validator reports missing local audio files in this isolated checkout; voice playback was not tested. Physical-device performance and native screen-reader behavior still need device verification.

Run the app with `pnpm --filter @capy/mobile start --web --port 8086` after building avatar-web, then enter the prototype from Parent Corner.

## Body texture seams

The shipped body atlas has colored UV islands directly adjacent to black unused pixels. In the same frozen pose, removing the body texture removed the fine seams, and restoring it with base-level linear sampling also removed them. The body does not receive dynamic shadows. This isolates texture filtering as the source of these visible lines, rather than a bone or shadow issue.

The renderer now disables mip generation and uses LinearFilter for the body map only. Other maps, painted colors, geometry and animation data are unchanged. This is a runtime sampling fix; a future asset-pipeline improvement would add atlas gutters before restoring mipmaps. Device testing should check texture stability during motion.

![Collapsed panel](screenshots/trail-panel-collapsed.png)
![Trail lobby](screenshots/trail-polish-390.png)
![Compact portrait](screenshots/trail-polish-compact.png)
![Expanded destinations](screenshots/trail-polish-expanded.png)
![Actual avatar preview](screenshots/trail-polish-avatar.png)
