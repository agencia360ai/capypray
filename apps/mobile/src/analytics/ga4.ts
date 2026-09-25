import AsyncStorage from "@react-native-async-storage/async-storage";
import { randomUUID } from "expo-crypto";
import Constants from "expo-constants";
import { AppState, Platform } from "react-native";

// GA4 over the Measurement Protocol: plain HTTPS, no SDK. Kids Category rules (Apple 1.3, COPPA): the only id is a
// random per-install uuid we generate; no IDFA/AAID, no device data, no kid name or free text. Configured through
// EXPO_PUBLIC_GA4_MEASUREMENT_ID / EXPO_PUBLIC_GA4_API_SECRET; without them every call is a no-op.

const MEASUREMENT_ID = process.env.EXPO_PUBLIC_GA4_MEASUREMENT_ID;
const API_SECRET = process.env.EXPO_PUBLIC_GA4_API_SECRET;
const ENDPOINT = "https://www.google-analytics.com/mp/collect";
const QUEUE_KEY = "ga4-queue";
const CLIENT_KEY = "ga4-client-id";
const SESSION_GAP_MS = 30 * 60 * 1000;
const MAX_QUEUE = 500;
const MAX_AGE_MS = 70 * 60 * 60 * 1000; // GA4 accepts timestamps up to 72 h back

export const ga4Enabled = !!(MEASUREMENT_ID && API_SECRET);

type Params = Record<string, string | number | boolean | null | undefined>;
type Queued = { name: string; params: Record<string, string | number>; ts: number };

let queue: Queued[] | null = null;
let clientId: string | null = null;
let sessionId = 0;
let lastEventAt = 0;
let flushing = false;
let listening = false;
let userProps: Record<string, string | number> = {};

const clean = (s: string) => s.replace(/[^A-Za-z0-9_]/g, "_").replace(/^[^A-Za-z]+/, "").slice(0, 40);

function sanitize(params: Params): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined) continue;
    const key = clean(k);
    if (!key || Object.keys(out).length >= 20) continue;
    out[key] = typeof v === "boolean" ? (v ? 1 : 0) : typeof v === "number" ? v : String(v).slice(0, 100);
  }
  return out;
}

async function load() {
  if (queue) return queue;
  try {
    queue = JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? "[]") as Queued[];
  } catch {
    queue = [];
  }
  return queue;
}

async function save() {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify((queue ?? []).slice(-MAX_QUEUE)));
  } catch {
    // storage full or unavailable: analytics is best-effort
  }
}

async function getClientId() {
  if (clientId) return clientId;
  let id = await AsyncStorage.getItem(CLIENT_KEY).catch(() => null);
  if (!id) {
    id = randomUUID();
    await AsyncStorage.setItem(CLIENT_KEY, id).catch(() => undefined);
  }
  clientId = id;
  return id;
}

function listen() {
  if (listening) return;
  listening = true;
  AppState.addEventListener("change", (s) => {
    if (s === "active") void logEvent("app_foreground");
    else if (s === "background") void flush();
  });
}

/** Anonymous segment dimensions (never personal): app version, platform, premium, pack. */
export function setUserProps(props: Params) {
  userProps = { ...userProps, ...sanitize(props) };
}

export async function logEvent(name: string, params: Params = {}) {
  if (!ga4Enabled) {
    if (__DEV__) console.log("[ga4 off]", name, params);
    return;
  }
  listen();
  const now = Date.now();
  if (!sessionId || now - lastEventAt > SESSION_GAP_MS) sessionId = Math.floor(now / 1000);
  const engagement = lastEventAt && now - lastEventAt < SESSION_GAP_MS ? Math.min(now - lastEventAt, 60_000) : 1;
  lastEventAt = now;
  const q = await load();
  q.push({ name: clean(name), ts: now, params: { ...sanitize(params), session_id: sessionId, engagement_time_msec: Math.max(1, engagement) } });
  await save();
  if (q.length >= 10) void flush();
  else scheduleFlush();
}

let timer: ReturnType<typeof setTimeout> | null = null;
function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, 5000);
}

export async function flush() {
  if (!ga4Enabled || flushing) return;
  const q = await load();
  const cutoff = Date.now() - MAX_AGE_MS;
  while (q.length && q[0]!.ts < cutoff) q.shift();
  if (!q.length) return;
  flushing = true;
  try {
    const id = await getClientId();
    const batch = q.slice(0, 25);
    const body = {
      client_id: id,
      non_personalized_ads: true,
      user_properties: Object.fromEntries(Object.entries({
        app_version: Constants.expoConfig?.version ?? "0",
        platform: Platform.OS,
        ...userProps,
      }).map(([k, v]) => [k, { value: v }])),
      events: batch.map((e) => ({ name: e.name, params: e.params, timestamp_micros: e.ts * 1000 })),
    };
    const res = await fetch(`${ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok || (res.status >= 400 && res.status < 500)) {
      q.splice(0, batch.length);
      await save();
    }
  } catch {
    // offline: keep the queue for the next flush
  } finally {
    flushing = false;
  }
  if (q.length) scheduleFlush();
}

/** Screen views show up in GA4 "Pages and screens" (app:// paths, never ids that point at a child). */
export function logScreen(route: string) {
  const path = route.replace(/\/[0-9a-f-]{36}/gi, "/:id");
  void logEvent("page_view", { page_location: `app://capyprayer${path}`, page_title: path === "/" ? "home" : path.slice(1) });
}
