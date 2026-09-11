import { z } from "zod";

// GDD §6.2–6.5. The app is a pack runner: everything the kid sees or hears is here.

export const ID = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, "ids are lowercase kebab/snake");

export const AVATAR_CLIPS = [
  "idle_breathe",
  "idle_look",
  "wave_hello",
  "talk_a",
  "talk_b",
  "listen_nod",
  "pray_hands",
  "kneel_pray",
  "celebrate",
  "clap",
  "heart",
  "think",
  "yawn",
  "sleep",
  "chill_lie",
  "munch",
  // extras present in the Capy rig (see tools/avatar/clip-map.json)
  "rise",
  "to_sleep",
  "wake",
  "sad",
  "walk",
] as const;
export const AvatarClip = z.enum(AVATAR_CLIPS);
export type AvatarClip = z.infer<typeof AvatarClip>;

export const Mood = z.enum(["calm", "happy", "sad", "sleepy"]);

export const Tradition = z.enum(["christian", "catholic-addon", "jewish", "muslim", "secular"]);

export const Audio = z.string().regex(/^[a-z0-9_./-]+\.(mp3|m4a|ogg)$/);

const Line = z.object({
  text: z.string().max(140),
  audio: Audio.optional(),
});

export const Prayer = z.object({
  id: ID,
  skillId: ID,
  title: z.string().optional(),
  lines: z.array(Line).min(1).max(12),
  variables: z.array(z.enum(["kidName", "person", "thankfulFor", "mistake", "feeling", "need"])).default([]),
  source: z.enum(["original", "traditional-pd", "web-bible"]).default("original"),
});
export type Prayer = z.infer<typeof Prayer>;

const Card = z.object({
  id: ID,
  label: z.string().max(40),
  icon: z.string(),
  correct: z.boolean().optional(),
});

export const Minigame = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tap_choice"),
    id: ID,
    prompt: Line,
    cards: z.array(Card).min(2).max(4),
    successLine: Line,
    retryLine: Line,
  }),
  z.object({
    type: z.literal("collect"),
    id: ID,
    prompt: Line,
    target: z.number().int().min(1).max(6),
    items: z.array(Card).min(3).max(12),
    successLine: Line,
  }),
  z.object({
    type: z.literal("sequence"),
    id: ID,
    prompt: Line,
    cards: z.array(Card).min(3).max(5),
    order: z.array(ID).min(3).max(5),
    successLine: Line,
    retryLine: Line,
  }),
  z.object({
    type: z.literal("fill_blank"),
    id: ID,
    prompt: Line,
    sentence: z.string(),
    options: z.array(z.string()).min(2).max(4),
    answer: z.string(),
    successLine: Line,
    retryLine: Line,
  }),
  z.object({
    type: z.literal("listen_timer"),
    id: ID,
    prompt: Line,
    seconds: z.number().int().min(15).max(90),
    closingLine: Line,
  }),
  z.object({
    type: z.literal("people_picker"),
    id: ID,
    prompt: Line,
    min: z.number().int().min(1).max(4),
    max: z.number().int().min(1).max(4),
    allowAdd: z.boolean().default(false),
    prayerId: ID.optional(),
    successLine: Line,
  }),
]);
export type Minigame = z.infer<typeof Minigame>;

export const Beat = z.discriminatedUnion("type", [
  z.object({ type: z.literal("avatar_say"), clip: AvatarClip.default("talk_a"), text: z.string().max(140), audio: Audio.optional(), mood: Mood.optional() }),
  z.object({ type: z.literal("repeat_after_me"), prayerId: ID, clip: AvatarClip.default("pray_hands") }),
  z.object({ type: z.literal("minigame"), minigameId: ID }),
  z.object({ type: z.literal("listen_timer"), seconds: z.number().int().min(15).max(90), text: z.string().max(140), audio: Audio.optional(), clip: AvatarClip.default("listen_nod") }),
  z.object({ type: z.literal("choose_people"), min: z.number().int().min(1).max(4), max: z.number().int().min(1).max(4), text: z.string().max(140), audio: Audio.optional() }),
  z.object({ type: z.literal("reward"), lantern: z.number().int().min(1).max(3).default(1) }),
  // get-to-know-you: Capy asks, the kid taps a card; the answer is stored as a prayer variable (kid facts)
  z.object({
    type: z.literal("ask"),
    key: z.enum(["thankfulFor", "person", "feeling", "need", "mistake", "favorite"]),
    text: z.string().max(140),
    audio: Audio.optional(),
    clip: AvatarClip.default("think"),
    options: z.array(z.object({ id: ID, label: z.string().max(30), icon: z.string() })).min(2).max(8),
  }),
  // Capy tells a Bible story / parable page by page (pack.stories)
  z.object({ type: z.literal("story"), storyId: ID }),
  z.object({ type: z.literal("parent_prompt"), text: z.string().max(400) }),
  z.object({ type: z.literal("lights_out"), seconds: z.number().int().min(10).max(120).default(30), text: z.string().max(140), audio: Audio.optional() }),
]);
export type Beat = z.infer<typeof Beat>;

export const Lesson = z.object({
  id: ID,
  week: ID.optional(),
  day: z.number().int().min(1).max(7).optional(),
  skillId: ID,
  title: z.string().max(60),
  free: z.boolean().default(false),
  // "any" = curriculum lesson (needs week/day); "bedtime"/"morning" = routine, replayable daily
  routine: z.enum(["any", "morning", "bedtime", "intro", "moment"]).default("any"),
  /** where this Prayer Moment happens (pack.scenes); default: the pond */
  scene: ID.optional(),
  beats: z.array(Beat).min(3).max(24),
});
export type Lesson = z.infer<typeof Lesson>;

export const Story = z.object({
  id: ID,
  free: z.boolean().default(false),
  title: z.string().max(40),
  /** scripture reference shown to grown-ups (e.g. "Luke 15:3-7") */
  ref: z.string().max(40),
  icon: z.string(),
  pages: z.array(z.object({ text: z.string().max(140), icon: z.string(), audio: Audio.optional() })).min(2).max(8),
  /** the one-line takeaway Capy says at the end */
  moral: z.string().max(140),
  moralAudio: Audio.optional(),
});
export type Story = z.infer<typeof Story>;

/** A place Capy can be: background art + time of day + the short prayer for that place. */
export const Scene = z.object({
  id: ID,
  title: z.string().max(30),
  icon: z.string(),
  /** background id (apps/mobile/src/ui/backgrounds.ts); "-night" variant is used when night */
  background: ID,
  time: z.enum(["day", "night", "auto"]).default("auto"),
  prayerId: ID.optional(),
  /** unlocked by completing this lesson; omit = always open */
  unlock: z.object({ lessonId: ID.optional(), beacons: z.number().int().min(0).optional() }).default({}),
});
export type Scene = z.infer<typeof Scene>;

export const Reward = z.object({
  id: ID,
  type: z.enum(["skin", "pond_decoration", "sticker", "verse_card", "biome", "badge"]),
  title: z.string().max(40),
  unlock: z.object({ beacons: z.number().int().min(0).optional(), lessonId: ID.optional(), streak: z.number().int().optional() }),
  asset: z.string().optional(),
  /** type "biome": stage background id (apps/mobile/src/ui/backgrounds.ts) */
  biome: ID.optional(),
});

/** Kid-facing chrome strings (buttons, greetings). Lives in the pack so nothing kid-visible is hardcoded. */
export const UiStrings = z.object({
  next: z.string().max(20),
  iSaidIt: z.string().max(20),
  yay: z.string().max(20),
  done: z.string().max(20),
  ok: z.string().max(20),
  forGrownUps: z.string().max(30),
  hi: z.string().max(40),
  /** fallback for {kidName} when the parent skipped the name */
  friend: z.string().max(20),
  beaconTitle: z.string().max(40),
  beaconLine: z.string().max(140),
  newUnlock: z.string().max(40),
  friendsTitle: z.string().max(40),
  lanternsTitle: z.string().max(40),
  rewardsTitle: z.string().max(40),
  biomesTitle: z.string().max(40),
  /** lobby */
  todayTitle: z.string().max(40),
  storiesTitle: z.string().max(40),
  placesTitle: z.string().max(40),
  pondTitle: z.string().max(40),
  bedtimeTitle: z.string().max(40),
  comeBackTomorrow: z.string().max(80),
  tomorrowHint: z.string().max(120),
  storyPage: z.string().max(20),
  theEnd: z.string().max(30),
  locked: z.string().max(30),
  /** streak, folded into the lobby greeting instead of a bare 🔥 chip ("{n} days in a row!"); optional */
  streak: z.string().max(40).optional(),
  /** Capy's spoken hints when the kid stalls (audio-first guidance, GDD §3 "UX audio-first") */
  nudgeTap: z.string().max(80),
  nudgeRepeat: z.string().max(80),
  nudgeChoose: z.string().max(80),
  /** what Capy says when the kid pokes him in the lobby (rotates) */
  tapLines: z.array(z.object({ text: z.string().max(80), audio: Audio.optional() })).min(1).max(8),
});
export type UiStrings = z.infer<typeof UiStrings>;

/** Locale-owned copy and curated, replayable moments; IDs stay stable across translations. */
export const Companion = z.object({
  prayerDefaults: z.object({ person: z.string(), thankfulFor: z.string(), mistake: z.string(), feeling: z.string(), need: z.string(), favorite: z.string() }),
  ui: z.object({
    brand: z.string(), tagline: z.string(), welcome: z.string(), greeting: z.string(),
    today: z.string(), start: z.string(), duration: z.string(), completed: z.string(),
    completedHint: z.string(), explore: z.string(), feelings: z.string(), feelingsHint: z.string(),
    moments: z.string(), momentsHint: z.string(), bedtime: z.string(), bedtimeHint: z.string(),
    stories: z.string(), storiesHint: z.string(), places: z.string(), placesHint: z.string(),
    pond: z.string(), pondHint: z.string(), journey: z.string(), journeyHint: z.string(),
    back: z.string(), close: z.string(), parents: z.string(), tapCapy: z.string(),
    progress: z.string(), saved: z.string(), savedHint: z.string(), loading: z.string(),
    storyReady: z.string(), storyLocked: z.string(), allDone: z.string(), allDoneHint: z.string(), breatheIn: z.string(), breatheOut: z.string(),
  }),
  feelings: z.array(z.object({ id: ID, label: z.string(), icon: ID, lessonId: ID })).min(1),
  moments: z.array(z.object({ id: ID, title: z.string(), description: z.string(), icon: ID, lessonId: ID, minutes: z.number().int().min(1).max(5) })).min(1),
});

export const Pack = z.object({
  id: ID,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  locale: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/),
  tradition: Tradition,
  ageBand: z.enum(["4-8", "9-11"]),
  avatar: z.object({ id: ID, glb: z.string(), skinIds: z.array(ID).min(1) }),
  voice: z.object({ provider: z.enum(["elevenlabs", "none"]), voiceId: z.string().optional(), style: z.string().optional() }),
  theme: z.object({ primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/), pond: ID }),
  skills: z.array(z.object({ id: ID, title: z.string(), icon: z.string(), anchor: z.string().max(60) })).min(1),
  worlds: z.array(z.object({ id: ID, title: z.string(), weeks: z.array(ID).min(1) })).min(1),
  lessons: z.array(Lesson).min(1),
  prayers: z.array(Prayer).min(1),
  minigames: z.array(Minigame),
  stories: z.array(Story).default([]),
  scenes: z.array(Scene).default([]),
  rewards: z.array(Reward),
  people: z.object({ defaults: z.array(z.string()).min(1), friends: z.array(z.string()).min(1).default(["bird", "duck", "frog", "turtle", "bunny", "fish"]) }),
  ui: UiStrings,
  companion: Companion,
  routines: z.object({
    bedtime: z.object({ defaultHour: z.number().int().min(17).max(22), closingPrayerId: ID, lessonId: ID.optional(), notificationText: z.string().max(80).optional() }),
    meal: z.object({ prayerId: ID }),
    intro: z.object({ lessonId: ID }).optional(),
  }),
  calendar: z.array(z.object({ id: ID, start: z.string().date(), end: z.string().date(), lessonIds: z.array(ID) })).default([]),
});
export type Pack = z.infer<typeof Pack>;
