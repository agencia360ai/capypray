# CapyPray — Journey lobby evaluation and staged plan
Date: 2026-09-19. Proposal only; no application, repository or production changes.
Reviewed: current GitHub docs/lobby-journey-idle.md, content pack 0.9.1, journey screen, LessonTrail, completion/reward helpers and CapyScene.

## Recommendation
Proceed with a small journey prototype. Frame it as a prayer companion with an evolving world. Optimize voluntary return to short prayer moments, clear agency and attachment to Capy. A continually running idle economy and a full follow-camera environment are not necessary to test those outcomes.

Capybara Go provides useful design hypotheses: readable progress, small decisions, variety, companionship and visible consequences. Its popularity does not establish which individual mechanic causes retention, and its audience/product differs from a prayer app for ages 4–8.

## Corrections to the proposal
1. The 52 lessons are not 52 sequential curriculum stones. Raw content includes 42 weekly curriculum lessons, one introduction, one bedtime routine and eight situational moments. Use explicit curriculum ordering and the existing parsed content model; keep other experiences accessible independently.
2. LessonTrail is an in-session beat indicator, not the curriculum map. Reusing it does not implement persistent journey progression.
3. Claims about burnout after one month and the five causes of engagement need supporting data. Treat them as hypotheses. The draft also overgeneralizes Apple's Kids Category; app review requirements and our own product choices are separate questions.
4. A three-card choice is only meaningful if it changes something the child perceives. Do not mix a person, location and virtue as equivalent options, or silently change theological/learning content based on an arbitrary choice. Existing choose_people does not automatically provide all of these semantics.
5. A one-gift cap removes accumulation pressure, but does not by itself remove repeated checking or reward dependence. Defer away gifts until the core experience works.
6. A baked walk clip does not prove correct foot contact during translation. Validate speed, stride, heading, camera framing and interruption behavior on phones.
7. A perspective illustration is not automatically a usable 3D skybox. Start with illustrated scenery plus shallow ground/path geometry, and preserve the current lesson camera.
8. Estimates in the draft exclude some content design, state migration, motion fallbacks, interruption handling and device QA. Re-estimate after the prototype.

## Product loop
Open the current clearing → see Capy and the next reachable stop → one optional, concrete choice inside the activity → short guided prayer → a visible world change → Capy settles and the experience ends.

The lobby should offer:
- One primary localized action: Continue our journey.
- Direct access to a quick prayer and bedtime, including after the daily curriculum step.
- A small secondary collection drawer for stories, places and pond customization.
- Three to five nearby stones and one next milestone; avoid displaying the entire curriculum as a task backlog.
- Capy facing the child or at three-quarter angle when greeting; side/three-quarter view while moving. Test a rear-follow camera later.

Proposed session timing: 5–10 seconds to start, an optional choice lasting about 5–10 seconds, the existing 3–5 minute prayer experience, a 3–6 second completion walk, then a quiet closure. These are design targets, not measured current results.

## Mechanics to implement or test
- Visible progress: one new curriculum completion lights one stone. Preview the next meaningful milestone.
- Personal agency: initially choose between two relevant prayer intentions, with voiced options. Use three only if younger children understand them. Allow the existing default to keep moving.
- Immediate feedback: lantern, short walk, Capy's acknowledgment and a lasting environmental detail. No scores for holiness or prayer quality.
- Authored novelty: a short bird, flower or weather encounter related to the day's learning goal, selected from local content. No runtime generation or random reward rarity.
- Collection and ownership: place or wear an earned item; collecting it should visibly change the world.
- Companion attachment: short familiar greetings and callbacks based on existing choices. No hunger, sadness or reproach caused by absence.
- Longer horizon: show the existing first-week lily pad, Grace Star and flower milestones. Use steps completed, not deadlines or calendar-perfect attendance.
- Closure: Capy sits, summarizes the moment and gives permission to leave. Bedtime uses a quieter treatment.

Keep existing entitlements, parental controls, availability and daily progression rules in the first experiment. Replays and quick prayers stay accessible. Preserve previously earned rewards. Separate curriculum position from the lantern/beacon economy; otherwise repeated situational prayers could move the child past uncompleted lessons.

## Example: gratitude clearing
A bird lands near a flower. Capy asks an optional voiced choice about thanking God for family or something in nature. The selected intention appears in an approved prayer variant. After the existing activity, Capy walks to the next stone and places a lantern. The flower remains in the clearing. Capy closes: “We noticed something good today.” This is an illustrative scenario requiring authored/localized content review, not existing shipped copy.

## Phase 1 — prove clarity and the completion moment
Build only the first seven curriculum stops, one biome, one completion walk and the existing first-week rewards. Keep the full prayer runner. Use shallow 2.5D scenery and a fixed camera.
Do not include away gifts, new currencies, randomized loot, a shop or a full 3D world.
Compare the same lesson reached through the current home and the prototype with 6–10 parent-child pairs, including ages 4–5 with a parent and ages 6–8.

Proposed usability gates:
- At least 8 of 10 children can locate the main action after the initial introduction without researcher instruction.
- At least 8 of 10 understand what changed after completing the lesson.
- Observe whether children watch/listen or repeatedly skip toward the reward; record this through moderated observation, not inferred prayer quality.
- A child can finish and leave without a required claim screen or lost reward.
These small-sample criteria guide design iteration; they are not population estimates.

## Phase 2 — test repeat value
After Phase 1, add a seven-session authored encounter sequence and one optional choice within selected sessions. Test across two weeks with about 15–25 families. This is a feasibility pilot, not a statistically powered causal A/B test.
Track completed guided prayer sessions per active week, start-to-complete rate, voluntary return, time to start and short parental feedback about independent prayer outside the app. Completion means the UI flow was completed; no microphone or claims of measuring whether prayer was sincere or spoken.
Track opens without starting a prayer, extra taps to reach prayer, rushed skipping, and parent-observed difficulty stopping as counter-metrics. More time in the app is not the success criterion.
Use separate iterations to test movement and optional choices so their effects are not conflated. A larger controlled comparison needs a sample calculation based on baseline rates and the minimum useful effect.

## Phase 3 — expand only after evidence
Extend the trail to the remaining curriculum, add biome transitions and milestone encounters. Consider a non-expiring postcard from Capy between completed sessions if return motivation is still weak.
If tested, one pending postcard can be revealed on a later visit; reopening does not create another, missed time does not remove it, it requires no online countdown, and it never advances curriculum. Prefer a meaningful discovery/story over currency.
Evaluate the full third-person camera as a separate visual improvement with frame-rate and usability checks.

## Engineering constraints and acceptance
- Add a separate lobby mode behind IAvatarRenderer, leaving lesson/prayer framing unchanged.
- Keep authoritative completion and rewards in the app store, not in the avatar animation. Persist completion before presentation; interruptions must neither lose nor duplicate rewards.
- Derive ordered nodes from content ids and completion data, including a migration that preserves existing progress. Verify out-of-order historical completions.
- Add pack-owned node, encounter and copy ids; stable asset ids remain language independent. No English-dependent behavior.
- A static trail must remain usable if WebGL fails, motion is reduced, or the device cannot sustain the effect.
- Test app backgrounding, rapid taps, offline use, re-entry after completion and existing daily gates/free-play behavior.
- Keep the prototype offline and bundled; no new child identifiers, recordings or third-party analytics.
- Proposed performance gate: at least 30 fps during the short walk on the agreed low-end Android test device, readable/tappable at 320 px, no camera motion required with reduced motion.
- Technical order: progression derivation and tests → lobby composition → completion transaction/presentation → walk/camera polish → optional content choices → moderated playtest.

## Evidence and limits
- Habby's current listing describes a text-based roguelike with randomized events, equipment, companions and choice/luck. It shows substantial adoption and an Everyone 10+ classification; it does not publish causal evidence that a lobby walk or offline gift drives retention.
  https://play.google.com/store/apps/details?hl=en-US&id=com.habby.capybara
- Ryan, Rigby & Przybylski (2006) report associations between autonomy/competence, enjoyment and future play. This supports testing agency and understandable progress, not guaranteeing a result in faith learning.
  https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf
- Li, Hew & Du (2024), 35 interventions and 2,500 participants, report a small average effect on intrinsic motivation (g=0.257). Educational gamification findings do not directly validate this app or age group.
  https://link.springer.com/article/10.1007/s11423-023-10337-7
- Finch's official guide links completed goals to adventures, subsequent stories and optional discoveries. It provides an adjacent reference for care/companion loops; its energy, shop and timed features are not a template to copy wholesale.
  https://help.finchcare.com/hc/en-us/articles/42149821015693-New-User-Guide
- Proposal reviewed:
  https://github.com/agencia360ai/capypray/blob/HEAD/docs/lobby-journey-idle.md
