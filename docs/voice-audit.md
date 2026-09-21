# Voice audit — 20 September 2026

Expo Go is served from C:/Users/jofgu/capypray. At inspection it was on 6e487fc, with 423 bundled recordings labelled Juan. This is metadata and file coverage, not an acoustic identification of every recording.

The screenshot shows the third line of the introduction: **Please be with me today. Amen.** It is already linked to `first_prayer_v08_3.mp3`, which is catalogued and bundled. The following lantern reward says **A little light for today.** It had no recording reference and necessarily used device speech. Its new ID is `ui_saved_light.mp3`; recording is still pending.

## The 19 lines, recorded 21 September 2026

| Context | Exact English narration | Audio file |
| --- | --- | --- |
| Lantern reward | A little light for today. | `ui_saved_light.mp3` |
| Story shelf title | The Lost Sheep | `story_lost_sheep_title.mp3` |
| Story shelf title | The Kind Stranger | `story_good_samaritan_title.mp3` |
| Story shelf title | The Tiny Seed | `story_mustard_seed_title.mp3` |
| Story shelf title | Jesus Calms the Storm | `story_calm_storm_title.mp3` |
| Story shelf title | Five Loaves, Two Fish | `story_loaves_fish_title.mp3` |
| Story shelf title | Zacchaeus in the Tree | `story_zacchaeus_title.mp3` |
| Story shelf title | Jesus and the Children | `story_jesus_children_title.mp3` |
| Story shelf title | The Son Who Came Home | `story_prodigal_son_title.mp3` |
| Story shelf title | Two Houses | `story_two_houses_title.mp3` |
| Story shelf title | The Farmer and the Seeds | `story_sower_title.mp3` |
| Place visit title | The Pond | `scene_pond_title.mp3` |
| Place visit title | My Room | `scene_bedroom_title.mp3` |
| Place visit title | The Kitchen | `scene_kitchen_title.mp3` |
| Place visit title | The Garden | `scene_garden_title.mp3` |
| Place visit title | The Park | `scene_park_title.mp3` |
| Place visit title | The City | `scene_city_title.mp3` |
| Place visit title | School | `scene_school_title.mp3` |
| Place visit title | The Car | `scene_car_title.mp3` |

Each ID is wired through the content schema, runtime and narration inventory. All nineteen were rendered in the Juan voice recorded in `audio/voice.json` (preset, speech rate -10, mp3 at 24 kHz) and their URLs are in the English catalogue; the pending JSON queue is empty and its regression test now asserts that nothing is missing. Run `pnpm audio:prepare` and reload Expo Go to hear them.

## Already linked near the screenshot

- Introduction: `first_prayer_v08_1.mp3`, `first_prayer_v08_2.mp3`, `first_prayer_v08_3.mp3`.
- Completion after the light: `meet_capy_v08_5.mp3` — Our first little light! Come back whenever you’re ready.
- Prayer prompts, tap hints and Beacon Day have catalogue entries; they are not among the 19 gaps.

A catalogued file can still fall back to device speech if it is absent from a checkout or playback fails. The current English variants reuse existing recordings. The manifest in an unprepared worktree is not evidence that the iPhone has no audio.

## Reproduce

`node tools/audio-lines.mjs packages/content/packs/christian-us-en-v1 --audit` inventories each spoken file and all contexts, including UI prompts and titles. `--missing` prints the pending generation batch. Currently: 447 unique pack references, all catalogued, none pending. The eight parent-zone recordings are separate.
