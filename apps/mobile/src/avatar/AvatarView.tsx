import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { ImageBackground, Platform, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Asset } from "expo-asset";
import { File } from "expo-file-system";
import { AvatarEvents, type AvatarCommand, type AvatarEvent, type IAvatarRenderer } from "./IAvatarRenderer";
import { backgroundFor } from "@/ui/backgrounds";

// Built by `pnpm --filter @capy/avatar-web build`: one HTML with the viewer and the GLB embedded (base64),
// so the WebView never fetches from file:// (iOS WKWebView blocks that). Loaded as an HTML string.
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
  const [source, setSource] = useState<{ html: string; baseUrl?: string } | { uri: string } | null>(null);
  const [stage, setStageState] = useState<StageState>({ biome: "meadow", dark: false });
  const setStage = (s: Partial<StageState>) => setStageState((p) => ({ ...p, ...s }));
  const renderer = useMemo(() => new WebViewAvatarRenderer((js) => webview.current?.injectJavaScript(js)), []);

  useEffect(() => {
    (async () => {
      const asset = await Asset.fromModule(AVATAR_HTML).downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      if (Platform.OS === "android") setSource({ uri });
      else setSource({ html: await new File(uri).text(), baseUrl: uri.replace(/\/[^/]*$/, "/") });
    })().catch((e) => renderer.events.emit({ type: "error", message: String(e) }));
  }, [renderer]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as AvatarEvent;
      if (msg.type === "ready") renderer.markReady();
      if (msg.type === "error" && __DEV__) console.warn("[avatar]", msg.message);
      renderer.events.emit(msg);
    } catch {
      renderer.events.emit({ type: "error", message: "bad message from webview" });
    }
  };

  return (
    <Ctx.Provider value={renderer}>
      <StageCtx.Provider value={{ stage, setStage }}>
        <View style={styles.stage} pointerEvents="none">
          <ImageBackground source={backgroundFor(stage.biome)} style={styles.bg} resizeMode="cover">
            {stage.dark && <View style={styles.dim} />}
            {source && (
              <WebView
                ref={webview}
                source={source}
                originWhitelist={["*"]}
                allowFileAccess
                allowFileAccessFromFileURLs
                allowUniversalAccessFromFileURLs
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                javaScriptEnabled
                domStorageEnabled={false}
                cacheEnabled={false}
                scrollEnabled={false}
                bounces={false}
                onMessage={onMessage}
                onError={(ev) => renderer.events.emit({ type: "error", message: ev.nativeEvent.description })}
                style={styles.webview}
                containerStyle={styles.webview}
              />
            )}
          </ImageBackground>
        </View>
        {children}
      </StageCtx.Provider>
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  stage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#FFF3DC" },
  bg: { flex: 1 },
  dim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(10,8,30,0.85)", zIndex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
});
