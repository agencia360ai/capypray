import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import { AvatarEvents, type AvatarCommand, type AvatarEvent, type IAvatarRenderer } from "./IAvatarRenderer";
import { backgroundFor } from "@/ui/backgrounds";
import { getPack } from "@/content/pack";

class BrowserAvatarRenderer implements IAvatarRenderer {
  ready = false;
  events = new AvatarEvents();
  private queue: AvatarCommand[] = [];
  constructor(private post: (command: AvatarCommand) => void) {}
  send(command: AvatarCommand) { if (this.ready) this.post(command); else this.queue.push(command); }
  onEvent(handler: (event: AvatarEvent) => void) { return this.events.on(handler); }
  markReady() { this.ready = true; for (const command of this.queue.splice(0)) this.post(command); }
}
const AvatarContext = createContext<IAvatarRenderer | null>(null);
export function useAvatar() { const value = useContext(AvatarContext); if (!value) throw new Error("Missing AvatarProvider"); return value; }
export function useAvatarReady() {
  const avatar = useAvatar(); const [ready, setReady] = useState(avatar.ready);
  useEffect(() => { setReady(avatar.ready); return avatar.onEvent(event => { if (event.type === "ready") setReady(true); }); }, [avatar]);
  return ready;
}
type Stage = { biome: string; dark: boolean; night: boolean };
const StageContext = createContext<{ stage: Stage; setStage: (stage: Partial<Stage>) => void } | null>(null);
export function useStage() { const value = useContext(StageContext); if (!value) throw new Error("Missing AvatarProvider"); return value; }

/** Browser review uses the same embedded 3D renderer and command contract as native. */
export function AvatarProvider({ children }: PropsWithChildren) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [stage, set] = useState<Stage>({ biome: "meadow", night: false, dark: false });
  const renderer = useMemo(() => new BrowserAvatarRenderer(command => frame.current?.contentWindow?.postMessage(JSON.stringify(command), window.location.origin)), []);
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin) return;
      try { const message = JSON.parse(event.data) as AvatarEvent; if (message.type === "ready") renderer.markReady(); renderer.events.emit(message); } catch { /* Ignore non-bridge messages. */ }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [renderer]);
  return <AvatarContext.Provider value={renderer}><StageContext.Provider value={{ stage, setStage: patch => set(previous => ({ ...previous, ...patch })) }}>
    <View style={StyleSheet.absoluteFill} pointerEvents="none"><ImageBackground source={backgroundFor(stage.biome, stage.night)} style={{ flex: 1, backgroundColor: stage.night ? "#34625F" : "#BDCE7D" }} imageStyle={{ width: "100%", height: stage.biome === "meadow" ? "72%" : "100%" }} resizeMode="cover">
      {stage.night && stage.biome !== "meadow" && <View style={[StyleSheet.absoluteFill, { backgroundColor: "#14205073" }]} />}
      <iframe ref={frame} src="/avatar/index.html" title={getPack().companion.ui.brand} tabIndex={-1} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, pointerEvents: "none" }} />
      {stage.dark && <View style={[StyleSheet.absoluteFill, { backgroundColor: "#0A081ED9" }]} />}
    </ImageBackground></View>{children}
  </StageContext.Provider></AvatarContext.Provider>;
}
