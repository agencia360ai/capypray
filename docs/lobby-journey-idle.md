# Lobby as a walked journey — review of Capybara Go and what to take from it

Status: design proposal, nothing implemented. Written 17 sep 2026 at Joe's request: review Capybara Go, take its
main mechanic, show Capy in third person, and make that the lobby — an idle you keep advancing.

## 1. What Capybara Go actually is

Habby's Capybara Go is a text-based roguelike adventure RPG, not a platformer. The reviewed facts that matter:

| Piece | How it works |
|---|---|
| Structure | Chapters unlock linearly; a chapter is a run of ~60 "days" (steps) |
| A step | One event resolves: an auto battle, a treasure, a shop, or a choice |
| Combat | Auto. The player watches; they do not aim or time anything |
| Roguelite draft | Skills and blessings are offered randomly between steps; the player picks and a build emerges |
| Gear | Four slots (weapon, costume, ring, accessory) feeding two stats, attack and HP |
| Idle | Resources accrue while the app is closed |
| Gates | Stamina runs the exploration; multipliers of 15/25/50/100/250 stamina cost real money |

Reception is the useful part. It hooks fast, the early curve is generous, the art carries it, and it goes stale in
about a month: "hundreds of battles and stat upgrades to chase" that stop meaning anything. Reviewers also call it
surprisingly demanding for busy players, because the stamina and event calendar want daily attention.

## 2. The mechanic, distilled

Strip the RPG and the store and five beats remain. This is what is worth copying:

1. **A single visible path.** One line of progress, not a menu of modes. You always know where you are on it.
2. **It advances by itself.** The character moves without input; the player's job is to show up and decide.
3. **One cheap decision per step.** Pick one of three. No skill, no dexterity, no wrong answer that punishes.
4. **The step is short and the reward is immediate.** A step resolves in seconds and always gives something.
5. **Something accrued while you were away.** Coming back is rewarded before you do anything.

Beats 1 to 5 are why it hooks. The stamina, the paid multipliers and the event treadmill are why it burns out —
and they are exactly what the GDD forbids (§9, "anti-patrones prohibidos": pressure timers, progress loss, bought
currency, loot boxes, social comparison, purchase nudges aimed at the child). Apple's Kids Category rules out the
rest. So: take the five beats, refuse the economy. The closest legitimate relatives are Forest and Finch, where the
pet goes on a trip while you are away and comes back with findings, and nothing is ever lost.

## 3. Proposed lobby: "The Trail"

Replace the scrolling sheet of doors with a continuous trail Capy walks in third person.

**The camera** sits behind and slightly above Capy, over the shoulder, looking down the trail. Capy walks a spline
through the biome the child has unlocked. This is the single biggest visual change and the whole point of the ask.

**The trail is the curriculum.** Each of the 52 lessons is a stone on the path, in order. Capy stands on the last
stone completed. The next stone is a short walk ahead, lit; the ones after it fade into the distance.

**A day is a step.** Tapping the stone ahead starts today's Prayer Moment, which is unchanged: the existing lesson
runner with its beats, minigame and reward. When it ends, Capy *walks* to the stone, plants a lantern and sits. The
walk is the reward animation, and it is the thing the current lobby is missing: progress you watch happen.

**One cheap decision per step,** drafted before the lesson: three cards, pick one. A person to pray for, a place to
pray in, or a virtue to carry. The pack already has all three lists (`people`, `scenes`, and the skills), and the
`choose_people` beat already does the interaction, so this is a reshuffle, not new content.

**Something accrued while away.** Between visits Capy wanders a little off-trail and brings something back: a
verse card, a friend animal for the pond, a decoration. On reopening, he is holding it and gives it in one tap.
Non-negotiable: nothing expires, nothing overflows, no counter drains. If the child is away a week, one gift waits.
That is the whole difference between Finch and a slot machine.

**Milestones already exist in the GDD.** Seven lanterns light a Beacon (§4.1), twenty-eight steps finish a World and
open a biome (§5.2), each Beacon raises Capy's title (§5.2). The trail just makes them visible as distance walked
rather than rows in a list.

**What the sheet keeps.** Stories, Places, Moments, Pond and Feelings do not disappear; they become signposts along
the trail and a small drawer, not the primary surface.

## 4. What this costs, honestly

The content and the progression are done. The 3D is not, and that is where the work is.

`packages/avatar-web/src/CapyScene.tsx` deliberately pins the camera: "Standing Capy always gets the same frame …
the camera does not chase hip sway". There is no environment — a painted JPEG behind a transparent WebView, a
contact-shadow blob, and no ground plane. A walked trail needs the opposite of both decisions.

| Work | Where | Size |
|---|---|---|
| `walk` clip: already baked into the shipping GLB, no Blender rebuild | `tools/avatar/clip-map.json` | done |
| Follow camera + spline walk, new `path` mode | `CapyScene.tsx` | 2–3 days |
| New bridge messages (`walk to`, `camera mode`) | `packages/avatar-web/src/bridge.ts`, `apps/mobile/src/avatar/IAvatarRenderer.ts` | half a day |
| Trail geometry: ground, stones, lanterns, props per biome | new, in avatar-web | 3–5 days, and the art is the long pole |
| Lobby rewrite around the stage | `apps/mobile/app/index.tsx`, reusing `LessonTrail.tsx` | 2 days |
| Draft-of-three before a lesson | `apps/mobile/src/ui/BeatView.tsx` (reuse `choose_people`) | 1 day |
| Away-gift accrual, capped at one | `apps/mobile/src/store/` (new slice beside `rewards.ts`) | 1 day |

Two risks worth naming before starting. **Performance:** a walking camera through real geometry inside a WebView on
a low-end Android is a different budget than a static avatar on a JPEG, and the app already ships a 5.9 MB embedded
viewer. **Download size:** 3D environment assets land on top of the ~50 MB estimate, so the trail should reuse the
painted backgrounds as skyboxes rather than model a world.

## 5. Recommended first slice

Do not build the world first. Validate the feel in two days, on the lobby that exists:

1. Add a `walk` message and let Capy walk left-to-right across the current stage and sit, camera still fixed. The
   clip is already there: the GLB ships `idle_breathe, idle_look, talk_a, talk_b, munch, yawn, to_sleep, sleep, wake,
   sad, walk, rise`, so this is bridge and scene code only, no asset work.
2. Play it as the reward when a Prayer Moment ends, then park Capy on the new stone.
3. Put the draft-of-three in front of the lesson.

If watching Capy walk to his lantern is satisfying on a phone, the spline, the follow camera and the props are worth
the week. If it is not, the mechanic was the wrong graft and we stopped at two days.

## 6. What we are explicitly not taking

Stamina or any energy that gates play. Paid multipliers. Loot boxes or random paid rewards. A build to optimise
(gear, stats, damage). Time-limited events that punish absence. Streak anxiety: Grace Days (§5.3) stay as they are.
