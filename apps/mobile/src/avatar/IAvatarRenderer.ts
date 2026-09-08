// GDD §12.2 — the only way the app talks to Capy. WebView today, react-native-filament later.
export type Mood = "calm" | "happy" | "sad" | "sleepy";

export type AvatarCommand =
  | { type: "load"; glb: string; skin?: string }
  | { type: "play"; clip: string; loop?: boolean; fade?: number }
  | { type: "speak"; durationMs: number; visemes?: Array<{ t: number; v: number }> }
  | { type: "look"; x: number; y: number }
  | { type: "mood"; value: Mood }
  | { type: "idle" }
  | { type: "lights_out" };

export type AvatarEvent = { type: "ready"; clips: string[] } | { type: "clipEnd"; clip: string } | { type: "error"; message: string };

export interface IAvatarRenderer {
  send(cmd: AvatarCommand): void;
  onEvent(handler: (e: AvatarEvent) => void): () => void;
  readonly ready: boolean;
}

/** Tiny event hub shared by renderer implementations. */
export class AvatarEvents {
  private handlers = new Set<(e: AvatarEvent) => void>();
  emit(e: AvatarEvent) {
    for (const h of this.handlers) h(e);
  }
  on(h: (e: AvatarEvent) => void) {
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }
}
