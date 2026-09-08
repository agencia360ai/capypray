import AsyncStorage from "@react-native-async-storage/async-storage";
import { currentParentId, supabase } from "./supabase";

// First-party analytics (GDD §11: no third-party SDKs). Events queue locally and flush to the
// `events` table when the parent is signed in. Never includes kid PII: kid_id is our own uuid.

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
  const q = await load();
  q.push({ name, props, ts: new Date().toISOString(), kid_id: kidId });
  await save();
  if (__DEV__) console.log("[event]", name, props);
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
