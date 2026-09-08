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
  z.object({ type: z.literal("listen_timer"), seconds: z.number().int().min(15).max(90), text: z.string().max(140), audio: Audio.optional() }),
  z.object({ type: z.literal("choose_people"), min: z.number().int().min(1).max(4), max: z.number().int().min(1).max(4), text: z.string().max(140), audio: Audio.optional() }),
  z.object({ type: z.literal("reward"), lantern: z.number().int().min(1).max(3).default(1) }),
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
  routine: z.enum(["any", "morning", "bedtime"]).default("any"),
  beats: z.array(Beat).min(3).max(20),
});
export type Lesson = z.infer<typeof Lesson>;

export const Reward = z.object({
  id: ID,
  type: z.enum(["skin", "pond_decoration", "sticker", "verse_card", "biome", "badge"]),
  title: z.string().max(40),
  unlock: z.object({ beacons: z.number().int().min(0).optional(), lessonId: ID.optional(), streak: z.number().int().optional() }),
  asset: z.string().optional(),
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
  rewards: z.array(Reward),
  people: z.object({ defaults: z.array(z.string()).min(1) }),
  routines: z.object({
    bedtime: z.object({ defaultHour: z.number().int().min(17).max(22), closingPrayerId: ID, lessonId: ID.optional(), notificationText: z.string().max(80).optional() }),
    meal: z.object({ prayerId: ID }),
  }),
  calendar: z.array(z.object({ id: ID, start: z.string().date(), end: z.string().date(), lessonIds: z.array(ID) })).default([]),
});
export type Pack = z.infer<typeof Pack>;
