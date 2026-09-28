import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren, type ReactNode } from "react";
import { Animated, Easing, ImageBackground, LayoutAnimation, Platform, StyleSheet, Text, UIManager, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Asset } from "expo-asset";
import { AvatarEvents, type AvatarCommand, type AvatarEvent, type IAvatarRenderer } from "./IAvatarRenderer";
import { backgroundFor, backgroundHeight } from "@/ui/backgrounds";
import { useReducedMotion } from "@/ui/motion";

if (Platform.OS === "android") UIManager.setLayoutAnimationEnabledExperimental?.(true);

// Built by `pnpm --filter @capy/avatar-web build`: one HTML with the viewer and the GLB embedded (base64),
// so the page never fetches anything. Loaded from its file:// URL (no subresources → no WKWebView restrictions).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AVATAR_HTML = require("../../assets/avatar/index.html");

class WebViewAvatarRenderer implements IAvatarRenderer {
  ready = false;
  events = new AvatarEvents();
  private queue: AvatarCommand[] = [];
  constructor(private post: (js: string) => void) {}
  send(cmd: AvatarCommand) {
    if (!this.ready) {
      this.queue.push(cmd);
      return;
    }
    this.post(`window.capy && window.capy.send(${JSON.stringify(cmd)}); true;`);
  }
  onEvent(h: (e: AvatarEvent) => void) {
    return this.events.on(h);
  }
  markReady() {
    this.ready = true;
    for (const c of this.queue.splice(0)) this.send(c);
  }
}

const Ctx = createContext<IAvatarRenderer | null>(null);
export const useAvatar = () => {
  const r = useContext(Ctx);
  if (!r) throw new Error("useAvatar outside <AvatarProvider>");
  return r;
};

/** True once the WebView has parsed the model (first launch takes 1–2 s); screens that show Capy right away use it for a placeholder. */
export function useAvatarReady() {
  const r = useAvatar();
  const [ready, setReady] = useState(r.ready);
  useEffect(() => {
    if (r.ready) {
      setReady(true);
      return;
    }
    return r.onEvent((e) => {
      if (e.type === "ready") setReady(true);
    });
  }, [r]);
  return ready;
}

type StageState = { biome: string; dark: boolean; night: boolean; sceneHeight?: number; underlay?: ReactNode };
const StageCtx = createContext<{ stage: StageState; setStage: (s: Partial<StageState>) => void } | null>(null);
export const useStage = () => {
  const s = useContext(StageCtx);
  if (!s) throw new Error("useStage outside <AvatarProvider>");
  return s;
};

/** Mount once at the root (GDD §12.2: keep the WebView mounted, zero load latency between beats). */
export function AvatarProvider({ children }: PropsWithChildren) {
  const webview = useRef<WebView>(null);
  const [uri, setUri] = useState<string | null>(null);
  const [status, setStatus] = useState("asset…");
  const [stage, setStageState] = useState<StageState>({ biome: "meadow", dark: false, night: false });
  const setStage = useCallback((s: Partial<StageState>) => setStageState((p) => ({ ...p, ...s })), []);
  const renderer = useMemo(() => new WebViewAvatarRenderer((js) => webview.current?.injectJavaScript(js)), []);
  const fail = (message: string) => {
    setStatus(`error: ${message}`);
    console.warn("[avatar]", message);
    renderer.events.emit({ type: "error", message });
  };

  useEffect(() => {
    (async () => {
      const asset = await Asset.fromModule(AVATAR_HTML).downloadAsync();
      const u = asset.localUri ?? asset.uri;
      setUri(u);
      setStatus("loading page");
      console.log("[avatar] html", u);
    })().catch((e) => fail(`asset: ${String(e)}`));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as AvatarEvent | { type: "boot" };
      if (msg.type === "boot") return setStatus("page booted, parsing model…");
      if (msg.type === "ready") {
        setStatus("ready");
        renderer.markReady();
      }
      if (msg.type === "error") fail(msg.message);
      if (msg.type === "clipFallback" && __DEV__) console.warn(`[avatar] clip "${msg.clip}" is not in the rig, played "${msg.used}" (tools/avatar/clip-map.json)`);
      renderer.events.emit(msg);
    } catch {
      fail("bad message from webview");
    }
  };

  return (
    <Ctx.Provider value={renderer}>
      <StageCtx.Provider value={{ stage, setStage }}>
        <View style={styles.stage} pointerEvents="none">
          <StageBackdrop biome={stage.biome} night={stage.night} sceneHeight={stage.sceneHeight} />
          <FadeOverlay visible={stage.night && stage.biome !== "meadow" && !stage.dark} style={styles.nightTint} />
          <FadeOverlay visible={stage.dark} style={styles.dim} duration={500} />
          <UnderlayFade node={stage.underlay} />
          {uri && (
              <WebView
                ref={webview}
                source={{ uri }}
                originWhitelist={["*"]}
                allowFileAccess
                allowFileAccessFromFileURLs
                allowUniversalAccessFromFileURLs
                allowingReadAccessToURL={uri.replace(/\/[^/]*$/, "/")}
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                javaScriptEnabled
                domStorageEnabled={false}
                cacheEnabled={false}
                scrollEnabled={false}
                bounces={false}
                onMessage={onMessage}
                onLoadStart={() => setStatus("page loading…")}
                onLoadEnd={() => setStatus((s) => (s === "ready" ? s : "page loaded, waiting for viewer…"))}
                onError={(ev) => fail(`webview: ${ev.nativeEvent.description}`)}
                onHttpError={(ev) => fail(`http ${ev.nativeEvent.statusCode}`)}
                onContentProcessDidTerminate={() => {
                  fail("content process terminated, reloading");
                  webview.current?.reload();
                }}
                onRenderProcessGone={() => {
                  fail("render process gone, reloading");
                  webview.current?.reload();
                }}
                style={styles.webview}
                containerStyle={styles.webview}
              />
          )}
        </View>
        {children}
        {__DEV__ && status !== "ready" && (
          <View style={styles.debug} pointerEvents="none">
            <Text style={styles.debugText}>avatar: {status}</Text>
          </View>
        )}
      </StageCtx.Provider>
    </Ctx.Provider>
  );
}

type Layer = { id: number; key: string; night: boolean; source: ImageSourcePropType; height: number | `${number}%`; fade: Animated.Value; zoom: Animated.Value; entering: boolean };
let layerSeq = 0;

/**
 * The scenery behind Capy. Scene changes crossfade under a half-strength wash: the wash mutes the contrast so two
 * busy prop-filled scenes never visibly double-expose, but it stays translucent so nothing reads as a flash. The
 * wash is warm paper between day scenes and a dusk tone whenever night is involved, and it only lifts once the
 * incoming bitmap is decoded and settled from a slight zoom.
 */
function StageBackdrop({ biome, night, sceneHeight }: { biome: string; night: boolean; sceneHeight?: number }) {
  const reduced = useReducedMotion();
  const key = `${biome}|${night ? "n" : "d"}|${sceneHeight ?? ""}`;
  const make = (entering: boolean): Layer => ({ id: ++layerSeq, key, night, source: backgroundFor(biome, night), height: sceneHeight ?? backgroundHeight(biome), fade: new Animated.Value(entering ? 0 : 1), zoom: new Animated.Value(1), entering });
  const [layers, setLayers] = useState<Layer[]>(() => [make(false)]);
  const live = useRef<Layer[]>([]);
  const veil = useRef(new Animated.Value(0)).current;
  const [veilColor, setVeilColor] = useState("#FFF3DC");
  live.current = layers;
  useEffect(() => {
    const last = live.current[live.current.length - 1]!;
    if (last.key === key) return;
    const next = make(!reduced);
    // Same picture (screens re-asserting the stage, or only the visible height moving with a sheet): adopt in
    // place, no transition — the wash is for actual scene changes, not the camera breathing.
    if (last.source === next.source) {
      // Adopt in place, keeping the layer's React identity (`id`) so the image never remounts or re-decodes;
      // an eased LayoutAnimation makes the frame glide with the sheet instead of snapping.
      if (last.height !== next.height && !reduced) LayoutAnimation.configureNext({ duration: 320, update: { type: "easeInEaseOut" } });
      setLayers((ls) => ls.map((l) => (l === last ? { ...l, key, height: next.height } : l)));
      return;
    }
    if (reduced) { setLayers([make(false)]); return; }
    setVeilColor(last.night || night ? "#332E52" : "#FFF3DC");
    Animated.timing(veil, { toValue: 0.55, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
    setLayers([...live.current.slice(-1), next]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reduced]);
  const reveal = (layer: Layer) => {
    layer.zoom.setValue(1.03);
    Animated.timing(layer.zoom, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    Animated.timing(layer.fade, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setLayers((ls) => (ls[ls.length - 1]!.key === layer.key ? [layer] : ls));
      Animated.timing(veil, { toValue: 0, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
  };
  return (
    <View style={StyleSheet.absoluteFill}>
      {layers.map((l) => (
        <Animated.View key={l.id} style={[StyleSheet.absoluteFill, { opacity: l.fade, transform: [{ scale: l.zoom }] }]}>
          <ImageBackground source={l.source} style={styles.bg} imageStyle={{ width: "100%", height: l.height }} resizeMode="cover" onLoadEnd={() => { if (l.entering && !reduced) reveal(l); }} />
        </Animated.View>
      ))}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: veilColor, opacity: veil }]} />
    </View>
  );
}

/** Holds the screen's scenery layer and fades it in and out, so props never pop when a screen mounts or leaves. */
function UnderlayFade({ node }: { node?: ReactNode }) {
  const reduced = useReducedMotion();
  const held = useRef<ReactNode>(node);
  const [, bump] = useState(0);
  const op = useRef(new Animated.Value(node ? 1 : 0)).current;
  if (node) held.current = node; // while visible, always show the freshest scenery
  const visible = !!node;
  useEffect(() => {
    if (reduced) { op.setValue(visible ? 1 : 0); if (!visible) { held.current = null; bump((n) => n + 1); } return; }
    const a = Animated.timing(op, { toValue: visible ? 1 : 0, duration: visible ? 420 : 240, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    a.start(({ finished }) => { if (finished && !visible) { held.current = null; bump((n) => n + 1); } });
    return () => a.stop();
  }, [visible, reduced, op]);
  if (!held.current) return null;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: op }]}>{held.current}</Animated.View>;
}

/** A tint that eases in and out instead of snapping (night wash, lights-out dim). Always mounted, opacity-driven. */
function FadeOverlay({ visible, style, duration = 360 }: { visible: boolean; style: StyleProp<ViewStyle>; duration?: number }) {
  const reduced = useReducedMotion();
  const op = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) { op.setValue(visible ? 1 : 0); return; }
    const a = Animated.timing(op, { toValue: visible ? 1 : 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [visible, reduced, duration, op]);
  return <Animated.View pointerEvents="none" style={[style, { opacity: op }]} />;
}

const styles = StyleSheet.create({
  stage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#FFF3DC" },
  bg: { flex: 1 },
  nightTint: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(20,24,80,0.45)" },
  dim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,8,30,0.85)", zIndex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
  debug: { position: "absolute", top: 100, left: 12, zIndex: 50, backgroundColor: "rgba(59,42,26,0.8)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  debugText: { color: "#FFD9A8", fontSize: 11 },
});
