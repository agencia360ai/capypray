# Asset inventory — what already exists and how it maps to the GDD

Source: `Capibara.unitypackage` (25 MB) and `Capybara.zip` (8.6 MB), received 7 Sep 2026.

## 1. Verdict

| Asset | Reusable in the GDD stack (Expo + WebView/R3F)? | Where it lives now |
|---|---|---|
| `Capi_rig.fbx` — capybara mesh + Blender **Rigify** skeleton, 13 animation takes | **Yes, this is the core asset.** Bipedal humanoid rig with arms, hands (thumb + 3 fingers), full face rig (jaw, lips, brows, lids, eyes, tongue). Exactly what GDD §8.1–8.2 asks for. | `tools/avatar/src/Capi_rig.fbx` |
| 8 PNG textures, 4096², 4 material sets (Body, Eyes, hair, mouth), Albedo + MetallicSmoothness | **Yes.** Hand-painted cartoon albedo; downscaled to 1024 and merged by the pipeline. MetallicSmoothness is Unity-specific and dropped (GDD: 1 material, no fur shader). | `tools/avatar/src/*.png` |
| Unity `FriendlyPal.controller` (animator) | **Design reference only.** Its structure (idle blend by mood, talking blend tree, sleep sub-machine, reactions layer, face-expressions layer with mask) is re-implemented as the JS state machine in `packages/avatar-web`. | not imported |
| C# scripts (`Pet.cs`, `PetAnimatorController.cs`, `CustomizableCharacter.cs`, `RandomAnimation.cs`) | **No.** They depend on packages that are not in the export (FTF3 EventManager, NaughtyAttributes, DOTween, Sheol anchors). Ideas ported: random idle variant picker, accessories attached to the `head` bone with offset/rotation. | not imported |
| Customization prefabs (2 hats, glasses; attach to `HumanBodyBones.Head`, offset `(0,1.15,-0.32)`, rot `(-15,0,0)`) | **Concept yes, files no.** GDD skins = accessory nodes parented to `head`. The example hat/glasses meshes are MeshBaker demo assets, not Capy art. | not imported |
| Room (sofa, desk, TV, curtains… + textures) | **No for v1.** The GDD's world is Capy's Pond (meadow → river → mountain lake), not an indoor room. Keep in the Unity project for a possible "Capy's Room" cosmetic later. | not imported |
| FTF `CHR_Main@*.FBX` facial/idle/walk animations | **No.** They target a different human character rig, not Capy. | not imported |
| Toony Colors Pro shader, LeanTween, Pixel Crushers, MeshBaker fragments | **No.** Unity-only third-party fragments. | not imported |
| Concept image `file-DAJLhhAkspnPJMmQNgSFfA.png` (capybara reaching a hand), `Color Palette.png` | **Yes as brand reference.** Palette drives `theme.primary` of the pack. | `docs/reference/` |

Bottom line: the two hard, expensive parts of GDD §8 (a rigged bipedal Capy with a face rig, and painted textures) are done. What is missing is a set of prayer-specific animation clips.

## 2. Rig details (from the FBX)

- Exported by Blender 4.0.2 (stable FBX IO). Unity imported it as **Generic** (`animationType: 2`), not Humanoid.
- 294 bones total: Rigify `DEF-*` deform bones (~250) plus `ORG-*`, `MCH-*` and control bones. The pipeline keeps only `DEF-*` bones and bakes the animation onto them, which is what glTF needs.
- Meshes: `capi.body`, `eye.left`, `eye.right`, `hair`, `mouth`.
- Facial deform bones include `DEF-jaw_master`, `DEF-jaw`, `DEF-lip.*`, `DEF-brow.*`, `DEF-lid.*`, `DEF-eye.*`, `DEF-tongue*`, `DEF-teeth.*`, `DEF-cheek.*`, `DEF-ear.*`. This unlocks the GDD's lip-sync v1.5 (jaw rotated by audio amplitude) and blink via `DEF-lid.*` without commissioning blendshapes. The FBX ships no blendshapes.
- Hands: `DEF-hand.L/R`, `DEF-thumb.01–03`, `DEF-f_index`, `DEF-f_middle`, `DEF-f_pinky`, `DEF-palm.*`. Enough for `pray_hands`.
- Unity prefab adds a `MouthBone` empty at local `(0, 1.147, 1.458)` used as the "food eat point" — reused as the accessory anchor for the yuzu/orange skin.

## 3. Clip mapping: existing takes → GDD §8.2 clip names

| GDD clip | Existing take | Frames | Status |
|---|---|---|---|
| `idle_breathe` | `stand.idle.01` | 360, loop | ✅ |
| `idle_look` | `stand.happy.idle` | 80, loop | ✅ |
| `talk_a` | `stand.talking` | 125, loop | ✅ |
| `talk_b` | `stand.talking.01` | 189, loop | ✅ |
| `munch` | `stand.eating.01` | 130 | ✅ |
| `yawn` | `stand.tired.idle` | 60, loop | ✅ (tired idle reads as a yawn/slouch) |
| `sleep` | `Sleeping.01` | 120, loop | ✅ |
| `chill_lie` | `Stand.to.sleep` → `Sleeping.01` | 50 + 120 | ⚠️ transition exists; the sleep pose is used for `lights_out`. A true four-legged lie-down is a nice-to-have. |
| `wake` (extra) | `Sleep.to.stand` | 95 | ✅ bonus, used when leaving bedtime |
| `sad` (extra) | `stand.sad.idle` | 110, loop | ✅ bonus, used for `mood: sad` (e.g. "I'm Sorry" lessons) |
| `walk` (extra) | `walk` | 24, loop | ✅ bonus, map navigation |
| `celebrate` | `rise` | 75 | ⚠️ "rise" is a stand-up flourish; acceptable placeholder |
| `capsule` (extra) | `capsule` | 160, loop | unused (Unity pet-capsule gimmick) |
| `wave_hello` | procedural | 1.8 s | ✅ additive gesture (`packages/avatar-web/src/gestures.ts`) |
| `listen_nod` | procedural | 2.4 s | ✅ additive gesture |
| `pray_hands` | procedural | 3.0 s | ✅ additive gesture (hands together, head bowed) |
| `kneel_pray` | — | — | ❌ missing (needs a real clip: whole-body pose) |
| `clap` | procedural | 1.6 s | ✅ additive gesture |
| `heart` | procedural | 2.0 s | ✅ additive gesture |
| `think` | procedural | 2.2 s | ✅ additive gesture (paw to chin, head tilt) |
| `celebrate` | procedural | 1.6 s | ✅ additive gesture (arms up + hop) replaces the `rise` placeholder |

The procedural gestures are keyframed in code on the Rigify DEF bones and played as **additive** three.js clips on top of `idle`/`talk`, so Capy can wave or press paws together while speaking (`speak { clip: "heart" }`). They are deliberately simple; a real Mixamo clip added to `tools/avatar/clip-map.json` under the same name wins automatically (GDD §8.3 steps 3–4: upload the Rigify FBX to Mixamo, download "Praying", "Kneeling", "Waving", "Clapping", "Thinking", "Head Nod", merge with `tools/avatar/export_capy.py`). Tune a gesture with the preview: `/preview?gesture=heart&bare=1`, learn a bone's axes with `?probe=DEF-upper_arm.R:0,0,-60`.

## 4. Textures

| Set | Files | Use |
|---|---|---|
| Body | `Capi_01_Body_Albedo*`, `*_MetallicSmoothness` | fur, paws, nose, inner ears — main atlas |
| hair | `Capi_01_hair_*` | dark tuft on the head |
| Eyes | `Capi_01_Eyes_*` | sclera + iris; the blink is bone-driven so no texture swap needed |
| mouth | `Capi_01_mouth_*` | tongue/teeth interior |

Pipeline output: 4 materials become 1 base-color texture per material at 1024², roughness 0.9, metallic 0, no normal map (GDD: pelaje pintado). Total GLB target < 5 MB.

## 5. Decisions taken

1. Keep the GDD stack (Expo + WebView R3F). The Unity project is not carried forward; its art is.
2. Rig stays Rigify. No re-rig in Meshy: the existing rig is better than an auto-rig and already has the `jaw` bone the GDD wanted for v1.5.
3. Clip names in the pack JSON follow GDD §8.2. The mapping above is encoded in `tools/avatar/clip-map.json` so renaming never touches code.
4. Yuzu/orange accessory is not in the FBX. It will be a separate small GLB parented to the `DEF-spine.006` (head) bone, like the Unity hats were.
