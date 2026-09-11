// GDD §12.2 — message contract between React Native and the WebView.
// Kept dependency-free so apps/mobile can import the same types.

export type Mood = "calm" | "happy" | "sad" | "sleepy";

export type RNToWeb =
  | { type: "load"; glb: string; skin?: string }
  | { type: "play"; clip: string; loop?: boolean; fade?: number }
  | { type: "speak"; durationMs: number; clip?: string; visemes?: Array<{ t: number; v: number }> }
  | { type: "viewport"; top: number; bottom: number; align?: "center" | "bottom" }
  | { type: "look"; x: number; y: number }
  | { type: "mood"; value: Mood }
  | { type: "idle" }
  | { type: "lights_out" }
  /** Equip a reward skin (procedural accessory on the head/neck bone); id undefined = none. */
  | { type: "skin"; id?: string };

export type WebToRN =
  | { type: "ready"; clips: string[] }
  | { type: "clipEnd"; clip: string }
  /** A pack asked for a clip the rig does not have; `used` is the fallback that played (dev warning in the app). */
  | { type: "clipFallback"; clip: string; used: string }
  | { type: "error"; message: string };

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (msg: string) => void };
    capy?: { send: (msg: RNToWeb) => void };
  }
}

export function sendToRN(msg: WebToRN) {
  const s = JSON.stringify(msg);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
  else window.parent?.postMessage(s, "*");
  if (import.meta.env.DEV) console.debug("[web→rn]", msg);
}

/** Listen for RN → Web messages. RN sends them via `injectJavaScript(window.capy.send(...))`
 *  or `postMessage`; both land here. */
export function onRNMessage(handler: (msg: RNToWeb) => void) {
  const parse = (data: unknown) => {
    try {
      const msg = typeof data === "string" ? (JSON.parse(data) as RNToWeb) : (data as RNToWeb);
      if (msg && typeof msg === "object" && "type" in msg) handler(msg);
    } catch (e) {
      sendToRN({ type: "error", message: `bad message: ${String(e)}` });
    }
  };
  window.addEventListener("message", (e) => parse(e.data));
  document.addEventListener("message", (e) => parse((e as MessageEvent).data)); // Android WebView
  window.capy = { send: handler };
  return () => {
    delete window.capy;
  };
}
