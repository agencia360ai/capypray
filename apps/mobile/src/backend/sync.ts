import { randomUUID } from "expo-crypto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useKid } from "@/store/kid";
import { currentParentId, supabase } from "./supabase";
import { flush } from "./events";
import { getPack } from "@/content/pack";
import { unlockedRewards } from "@/store/rewards";

// Offline-first sync (GDD §12.4): local store is the source of truth; we push snapshots to Supabase
// (kid_profiles, progress, streaks, prayer_people, pond) whenever state changes, debounced.
// Pull happens once after sign-in when the device has no progress yet (restore on a new phone).

const KID_ID_KEY = "kid-id";
const PACK_ID = "christian-us-en-v1";
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

export async function getKidId(): Promise<string> {
  let id = await AsyncStorage.getItem(KID_ID_KEY);
  if (!id) {
    id = randomUUID();
    await AsyncStorage.setItem(KID_ID_KEY, id);
  }
  return id;
}

export function startSync() {
  if (started || !supabase) return;
  started = true;
  useKid.subscribe(() => schedule());
  schedule();
}

function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void push(), 4000);
}

export async function push() {
  if (!supabase) return;
  const parentId = await currentParentId();
  if (!parentId) return;
  const s = useKid.getState();
  if (!s.onboarded) return;
  const kidId = await getKidId();
  const db = supabase;
  await db.from("kid_profiles").upsert({ id: kidId, parent_id: parentId, nickname: s.kidName || "friend", age_band: s.profile.ageBand, skin_id: s.skinId ?? "capy-default", pond_biome: "meadow" });
  await db.from("parents").update({ tradition: s.profile.tradition, bedtime_hour: s.profile.bedtimeHour }).eq("id", parentId);
  const progress = Object.entries(s.completed).map(([lessonId, c]) => ({ kid_id: kidId, pack_id: PACK_ID, lesson_id: lessonId, status: "completed", score: c.lanterns, completed_at: new Date(c.at).toISOString() }));
  if (progress.length) await db.from("progress").upsert(progress);
  await db.from("streaks").upsert({ kid_id: kidId, current: s.streak.current, best: s.streak.best, last_active_date: s.streak.lastActive ?? null, grace_used_week: s.streak.graceUsedWeek, week_start: s.streak.weekStart ?? null });
  await db.from("pond").upsert({ kid_id: kidId, lanterns_total: s.lanterns, beacons: s.beacons, unlocked: [...unlockedRewards(getPack(), s)] });
  if (s.people.length) await db.from("prayer_people").upsert(s.people.map((p) => ({ id: uuidFor(p.id), kid_id: kidId, label: p.label, icon: p.icon, prayed_count: p.prayedCount, note_from_parent: p.note ?? null, active: true })));
  await flush();
}

/** Restore from the cloud onto an empty device (after sign-in). Returns true when something was restored. */
export async function pullIfEmpty(): Promise<boolean> {
  if (!supabase) return false;
  const parentId = await currentParentId();
  if (!parentId) return false;
  const s = useKid.getState();
  if (Object.keys(s.completed).length > 0) return false;
  const { data: kid } = await supabase.from("kid_profiles").select("id, nickname, age_band").eq("parent_id", parentId).order("created_at").limit(1).maybeSingle();
  if (!kid) return false;
  await AsyncStorage.setItem(KID_ID_KEY, kid.id);
  const [{ data: progress }, { data: streak }, { data: pond }, { data: people }] = await Promise.all([
    supabase.from("progress").select("lesson_id, score, completed_at").eq("kid_id", kid.id),
    supabase.from("streaks").select("*").eq("kid_id", kid.id).maybeSingle(),
    supabase.from("pond").select("*").eq("kid_id", kid.id).maybeSingle(),
    supabase.from("prayer_people").select("*").eq("kid_id", kid.id).eq("active", true),
  ]);
  useKid.setState({
    onboarded: true,
    introDone: true,
    kidName: kid.nickname,
    profile: { ...s.profile, ageBand: kid.age_band },
    completed: Object.fromEntries((progress ?? []).map((p) => [p.lesson_id, { at: Date.parse(p.completed_at), lanterns: p.score ?? 1 }])),
    lanterns: pond?.lanterns_total ?? 0,
    beacons: pond?.beacons ?? 0,
    streak: streak ? { current: streak.current, best: streak.best, lastActive: streak.last_active_date ?? undefined, graceUsedWeek: streak.grace_used_week, weekStart: streak.week_start ?? undefined } : s.streak,
    people: (people ?? []).map((p) => ({ id: p.id, label: p.label, icon: p.icon, prayedCount: p.prayed_count, note: p.note_from_parent ?? undefined })),
  });
  return true;
}

// local ids are short strings; the table wants uuids. Deterministic mapping keeps upserts idempotent.
function uuidFor(localId: string): string {
  if (/^[0-9a-f-]{36}$/i.test(localId)) return localId;
  let h1 = 0x811c9dc5;
  for (const ch of localId) h1 = Math.imul(h1 ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  const hex = (h1.toString(16).padStart(8, "0") + localId.padEnd(24, "0").replace(/[^0-9a-f]/gi, "0").slice(0, 24)).toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
