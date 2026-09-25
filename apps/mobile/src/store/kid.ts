import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "./persistence";

// Offline-first local state (GDD §12.4). AsyncStorage so the app runs in Expo Go during beta;
// swap to react-native-mmkv once we move to dev builds. Synced to Supabase in background (S2).
const storage = createJSONStorage(() => AsyncStorage);

export type PrayerPerson = { id: string; label: string; icon: string; prayedCount: number; note?: string };
export type AgeBand = "4-8" | "9-11";
export type Tradition = "christian" | "catholic-addon" | "jewish" | "muslim" | "secular";

export type Profile = {
  ageBand: AgeBand;
  tradition: Tradition;
  bedtimeHour: number;
  reminder: boolean;
  goal?: string;
};

type KidState = {
  onboarded: boolean;
  kidName: string;
  profile: Profile;
  /** Mirrors the RevenueCat `premium` entitlement (see src/entitlements). Sandbox toggle in Parent Corner. */
  premium: boolean;
  /** Things Capy learned about the kid (get-to-know-you answers): thankfulFor, favorite, feeling… */
  facts: Record<string, string>;
  introDone: boolean;
  /** Local visit counters select authored variations; they never award progress. */
  lessonVisits: Record<string, number>;
  /** Equipped reward skin id (pack.rewards type "skin"); undefined = default Capy. */
  skinId?: string;
  /** Chosen pond biome reward id (pack.rewards type "biome"); undefined = best unlocked. */
  biomeId?: string;
  /** Parent Corner: ignore the one-lesson-per-day pacing (testing / catch-up). */
  freePlay: boolean;
  /** Parent Corner: offer the child the prayer choice where a lesson has one (docs/journey-plan.md, phase 2). */
  intentions: boolean;
  people: PrayerPerson[];
  completed: Record<string, { at: number; lanterns: number }>;
  /** Completion keys whose arrival was already shown on the trail. Cosmetic only: it can never gate a reward. */
  celebrated: Record<string, true>;
  /** Home sections the child has already been shown (pack.companion.home). Cosmetic: what opens is derived from progress. */
  revealed: Record<string, true>;
  /** "Play with me": the level each little game is on. Never feeds lanterns, beacons or anything else. */
  gameLevels: Record<string, number>;
  lanterns: number;
  beacons: number;
  streak: { current: number; best: number; lastActive?: string; graceUsedWeek: number; weekStart?: string };
  setKidName: (n: string) => void;
  setProfile: (p: Partial<Profile>) => void;
  finishOnboarding: () => void;
  setPremium: (v: boolean) => void;
  setFact: (key: string, value: string) => void;
  finishIntro: () => void;
  beginLesson: (id: string) => void;
  setSkin: (id?: string) => void;
  setBiome: (id?: string) => void;
  setFreePlay: (v: boolean) => void;
  setIntentions: (v: boolean) => void;
  addPerson: (label: string, icon?: string) => void;
  removePerson: (id: string) => void;
  setPersonNote: (id: string, note: string) => void;
  prayedFor: (ids: string[]) => void;
  completeLesson: (lessonId: string, lanterns: number, today?: string) => void;
  markCelebrated: (key: string) => void;
  markRevealed: (ids: string[]) => void;
  setGameLevel: (game: string, level: number) => void;
  reset: () => void;
};

const initial = {
  onboarded: false,
  kidName: "",
  profile: { ageBand: "4-8", tradition: "christian", bedtimeHour: 19, reminder: false } as Profile,
  premium: false,
  facts: {} as Record<string, string>,
  introDone: false,
  lessonVisits: {} as Record<string, number>,
  freePlay: false,
  intentions: false,
  people: [] as PrayerPerson[],
  completed: {} as KidState["completed"],
  celebrated: {} as KidState["celebrated"],
  revealed: {} as KidState["revealed"],
  gameLevels: {} as KidState["gameLevels"],
  lanterns: 0,
  beacons: 0,
  streak: { current: 0, best: 0, graceUsedWeek: 0 },
};

export const useKid = create<KidState>()(
  persist(
    (set, get) => ({
      ...initial,
      setKidName: (kidName) => set({ kidName: kidName.trim().slice(0, 20) }),
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      finishOnboarding: () => set({ onboarded: true }),
      setPremium: (premium) => set({ premium }),
      setFact: (key, value) => set((s) => ({ facts: { ...s.facts, [key]: value.trim().slice(0, 30) } })),
      finishIntro: () => set({ introDone: true }),
      beginLesson: (id) => set(s => ({ lessonVisits: { ...s.lessonVisits, [id]: (s.lessonVisits[id] ?? 0) + 1 } })),
      setSkin: (skinId) => set({ skinId }),
      setBiome: (biomeId) => set({ biomeId }),
      setFreePlay: (freePlay) => set({ freePlay }),
      setIntentions: (intentions) => set({ intentions }),
      addPerson: (label, icon = "person") =>
        set((s) => (s.people.some((p) => p.label === label) ? s : { people: [...s.people, { id: uid(), label: label.trim().slice(0, 30), icon, prayedCount: 0 }] })),
      removePerson: (id) => set((s) => ({ people: s.people.filter((p) => p.id !== id) })),
      setPersonNote: (id, note) => set((s) => ({ people: s.people.map((p) => (p.id === id ? { ...p, note: note.trim().slice(0, 120) || undefined } : p)) })),
      prayedFor: (ids) => set((s) => ({ people: s.people.map((p) => (ids.includes(p.id) ? { ...p, prayedCount: p.prayedCount + 1 } : p)) })),
      completeLesson: (lessonId, lanterns, today = isoDate(new Date())) => {
        const s = get();
        if (s.completed[lessonId]) return;
        const total = s.lanterns + lanterns;
        set({
          completed: { ...s.completed, [lessonId]: { at: Date.now(), lanterns } },
          lanterns: total,
          beacons: Math.floor(total / 7),
          streak: bumpStreak(s.streak, today),
        });
      },
      /** The arrival walk has played for this completion. Marked after the fact, so an interruption replays it at
       *  most once more and never touches lanterns, beacons or the completion itself. */
      setGameLevel: (game, level) => set((s) => ({ gameLevels: { ...s.gameLevels, [game]: Math.max(1, Math.floor(level)) } })),
      markRevealed: (ids) => set((s) => (ids.every((id) => s.revealed[id]) ? s : { revealed: { ...s.revealed, ...Object.fromEntries(ids.map((id) => [id, true as const])) } })),
      markCelebrated: (key) => set((s) => (s.celebrated[key] ? s : { celebrated: { ...s.celebrated, [key]: true } })),
      /** Parent Corner "delete my child's data": everything about the kid, in one tap (GDD §11). */
      reset: () => set({ ...initial, onboarded: false }),
    }),
    {
      name: "kid",
      storage,
      version: 4,
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<KidState>), ...(!__DEV__ ? { premium: false, freePlay: false } : {}) }),
      // v3: person ids were Date.now() and could collide; regenerate duplicates once.
      // v4: the trail arrival walk. Everything already completed counts as celebrated, so upgrading in the middle
      //     of the curriculum never replays a walk for a lesson prayed weeks ago.
      migrate: (persisted) => {
        const s = persisted as Partial<KidState>;
        const seen = new Set<string>();
        const people = (s.people ?? []).map((p) => {
          const dup = seen.has(p.id);
          seen.add(p.id);
          return dup ? { ...p, id: uid() } : p;
        });
        const celebrated = s.celebrated ?? Object.fromEntries(Object.keys(s.completed ?? {}).map((k) => [k, true as const]));
        return { ...s, people, celebrated } as KidState;
      },
    },
  ),
);

/** GDD §5.3: 2 grace days per week, gifted. Never breaks the streak within the grace budget. */
export function bumpStreak(st: KidState["streak"], today: string): KidState["streak"] {
  if (st.lastActive === today) return st;
  const weekStart = startOfWeek(today);
  const graceUsedWeek = st.weekStart === weekStart ? st.graceUsedWeek : 0;
  const gap = st.lastActive ? daysBetween(st.lastActive, today) : 1;
  let current = st.current;
  let grace = graceUsedWeek;
  if (gap === 1 || !st.lastActive) current += 1;
  else if (gap - 1 <= 2 - grace) {
    grace += gap - 1;
    current += 1;
  } else current = 1;
  return { current, best: Math.max(st.best, current), lastActive: today, graceUsedWeek: grace, weekStart };
}

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
function startOfWeek(iso: string) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
