import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { ImageBackground, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Asset } from "expo-asset";
import { AvatarEvents, type AvatarCommand, type AvatarEvent, type IAvatarRenderer } from "./IAvatarRenderer";
import { backgroundFor } from "@/ui/backgrounds";

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

type StageState = { biome: string; dark: boolean };
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
  const [stage, setStageState] = useState<StageState>({ biome: "meadow", dark: false });
  const setStage = (s: Partial<StageState>) => setStageState((p) => ({ ...p, ...s }));
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
      renderer.events.emit(msg);
    } catch {
      fail("bad message from webview");
    }
  };

  return (
    <Ctx.Provider value={renderer}>
      <StageCtx.Provider value={{ stage, setStage }}>
        <View style={styles.stage} pointerEvents="none">
          <ImageBackground source={backgroundFor(stage.biome)} style={styles.bg} resizeMode="cover">
            {stage.dark && <View style={styles.dim} />}
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
          </ImageBackground>
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

const styles = StyleSheet.create({
  stage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#FFF3DC" },
  bg: { flex: 1 },
  dim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,8,30,0.85)", zIndex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
  debug: { position: "absolute", top: 100, left: 12, zIndex: 50, backgroundColor: "rgba(59,42,26,0.8)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  debugText: { color: "#FFD9A8", fontSize: 11 },
});
