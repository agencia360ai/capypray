# Backgrounds

`apps/mobile/assets/backgrounds/<biome>.jpg`, 1080×1920, portrait. Referenced from `apps/mobile/src/ui/backgrounds.ts` by the pack's `theme.pond` (meadow → river → mountain lake).

- `meadow.svg` is the placeholder scene (vector, rendered with `node tools/art/render.mjs meadow`).
- Preferred art comes from Higgsfield. Prompt that worked (nano_banana_pro, 9:16):

  > Soft 3D-rendered children's app background, a calm meadow pond at golden hour: gentle grassy bank in the foreground left empty as a stage for a character, still turquoise water with two lily pads and a few floating paper lanterns glowing warm orange, rounded pastel hills, a few fluffy clouds, tiny wildflowers, warm cream and peach sky. Toy-like matte materials, no characters, no text, no people, no animals. Soft depth of field, cozy, peaceful, Toca Boca / Pengu style, vertical phone wallpaper composition with quiet space in the lower third.

  Download the chosen image from Higgsfield, resize to 1080×1920 (JPEG, quality ~82, under 400 KB) and save it as `apps/mobile/assets/backgrounds/meadow.jpg`. No code change needed.
- Keep the lower third quiet: Capy stands there and the bottom sheet covers part of it.
