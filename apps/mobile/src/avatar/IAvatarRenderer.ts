// GDD §12.2 — the only way the app talks to Capy. WebView today, react-native-filament later.
export type Mood = "calm" | "happy" | "sad" | "sleepy";

export type AvatarCommand =
  | { type: "load"; glb: string; skin?: string }
  | { type: "play"; clip: string; loop?: boolean; fade?: number }
  | { type: "speak"; durationMs: number; clip?: string; visemes?: Array<{ t: number; v: number }> }
  /** Fractions (0..1) of the stage covered by UI at the top/bottom; Capy is framed in the free band. */
  | { type: "viewport"; top: number; bottom: number; align?: "center" | "bottom" }
  | { type: "look"; x: number; y: number }
  | { type: "mood"; value: Mood }
  | { type: "idle" }
  | { type: "lights_out" }
  /** Equip a reward skin (procedural accessory on the head/neck bone); id undefined = none. */
  | { type: "skin"; id?: string };

export type AvatarEvent =
  | { type: "ready"; clips: string[] }
  | { type: "clipEnd"; clip: string }
  /** A pack asked for a clip the rig does not have; `used` is the fallback that played (dev warning). */
  | { type: "clipFallback"; clip: string; used: string }
  | { type: "error"; message: string };

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
