import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Offline-first local state (GDD §12.4). AsyncStorage so the app runs in Expo Go during beta;
// swap to react-native-mmkv once we move to dev builds. Synced to Supabase in background (S2).
const storage = createJSONStorage(() => AsyncStorage);

export type PrayerPerson = { id: string; label: string; icon: string; prayedCount: number };

type KidState = {
  kidName: string;
  people: PrayerPerson[];
  completed: Record<string, { at: number; lanterns: number }>;
  lanterns: number;
  beacons: number;
  streak: { current: number; best: number; lastActive?: string; graceUsedWeek: number; weekStart?: string };
  setKidName: (n: string) => void;
  addPerson: (label: string, icon?: string) => void;
  prayedFor: (ids: string[]) => void;
  completeLesson: (lessonId: string, lanterns: number, today?: string) => void;
  reset: () => void;
};

const initial = {
  kidName: "",
  people: [] as PrayerPerson[],
  completed: {} as KidState["completed"],
  lanterns: 0,
  beacons: 0,
  streak: { current: 0, best: 0, graceUsedWeek: 0 },
};

export const useKid = create<KidState>()(
  persist(
    (set, get) => ({
      ...initial,
      setKidName: (kidName) => set({ kidName }),
      addPerson: (label, icon = "person") => set((s) => ({ people: [...s.people, { id: `${Date.now()}`, label, icon, prayedCount: 0 }] })),
      prayedFor: (ids) => set((s) => ({ people: s.people.map((p) => (ids.includes(p.id) ? { ...p, prayedCount: p.prayedCount + 1 } : p)) })),
      completeLesson: (lessonId, lanterns, today = isoDate(new Date())) => {
        const s = get();
        const total = s.lanterns + lanterns;
        set({
          completed: { ...s.completed, [lessonId]: { at: Date.now(), lanterns } },
          lanterns: total,
          beacons: Math.floor(total / 7),
          streak: bumpStreak(s.streak, today),
        });
      },
      reset: () => set(initial),
    }),
    { name: "kid", storage },
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

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
function startOfWeek(iso: string) {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return isoDate(d);
}
