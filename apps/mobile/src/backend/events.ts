import AsyncStorage from "@react-native-async-storage/async-storage";
import { currentParentId, supabase } from "./supabase";
import { logEvent } from "@/analytics/ga4";

// Usage events. Every event goes to GA4 over the Measurement Protocol (src/analytics/ga4.ts, anonymous, no SDK) and,
// when a Supabase backend is configured and the parent is signed in, to the `events` table too. Never kid PII.

const KEY = "events-queue";
type Ev = { name: string; props: Record<string, unknown>; ts: string; kid_id?: string };
let queue: Ev[] | null = null;
let flushing = false;

async function load() {
  if (queue) return queue;
  try {
    queue = JSON.parse((await AsyncStorage.getItem(KEY)) ?? "[]") as Ev[];
  } catch {
    queue = [];
  }
  return queue;
}

async function save() {
  await AsyncStorage.setItem(KEY, JSON.stringify((queue ?? []).slice(-500)));
}

export async function track(name: string, props: Record<string, unknown> = {}, kidId?: string) {
  void logEvent(name, props as Record<string, string | number | boolean>);
  if (!supabase) return;
  const q = await load();
  q.push({ name, props, ts: new Date().toISOString(), kid_id: kidId });
  await save();
  void flush();
}

export async function flush() {
  if (!supabase || flushing) return;
  const parentId = await currentParentId();
  if (!parentId) return;
  const q = await load();
  if (!q.length) return;
  flushing = true;
  try {
    const batch = q.slice(0, 100);
    const { error } = await supabase.from("events").insert(batch.map((e) => ({ ...e, parent_id: parentId })));
    if (!error) {
      q.splice(0, batch.length);
      await save();
    }
  } finally {
    flushing = false;
  }
}
