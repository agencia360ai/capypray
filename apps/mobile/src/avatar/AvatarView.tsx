import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Asset } from "expo-asset";
import { AvatarEvents, type AvatarCommand, type AvatarEvent, type IAvatarRenderer } from "./IAvatarRenderer";

// Built by `pnpm --filter @capy/avatar-web build` (copies dist → assets/avatar). Single-file HTML + GLB sibling.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AVATAR_HTML = require("../../assets/avatar/index.html");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AVATAR_GLB = require("../../assets/avatar/avatars/capy-v1.glb");

class WebViewAvatarRenderer implements IAvatarRenderer {
  ready = false;
  events = new AvatarEvents();
  private queue: AvatarCommand[] = [];
  constructor(private post: (js: string) => void) {}
  send(cmd: AvatarCommand) {
    if (!this.ready && cmd.type !== "load") {
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

/** Mount once at the root (GDD §12.2: keep the WebView mounted, zero load latency between beats). */
export function AvatarProvider({ children }: PropsWithChildren) {
  const webview = useRef<WebView>(null);
  const [uris, setUris] = useState<{ html: string; glb: string } | null>(null);
  const renderer = useMemo(() => new WebViewAvatarRenderer((js) => webview.current?.injectJavaScript(js)), []);

  useEffect(() => {
    (async () => {
      const [html, glb] = await Promise.all([Asset.fromModule(AVATAR_HTML).downloadAsync(), Asset.fromModule(AVATAR_GLB).downloadAsync()]);
      setUris({ html: html.localUri ?? html.uri, glb: glb.localUri ?? glb.uri });
    })();
  }, []);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as AvatarEvent;
      if (msg.type === "ready") renderer.markReady();
      renderer.events.emit(msg);
    } catch {
      renderer.events.emit({ type: "error", message: "bad message from webview" });
    }
  };

  return (
    <Ctx.Provider value={renderer}>
      <View style={styles.stage} pointerEvents="none">
        {uris && (
          <WebView
            ref={webview}
            source={{ uri: uris.html }}
            originWhitelist={["*"]}
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            allowingReadAccessToURL={uris.html.replace(/\/[^/]*$/, "/")}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback
            javaScriptEnabled
            domStorageEnabled={false}
            cacheEnabled={false}
            onMessage={onMessage}
            onLoadEnd={() => renderer.send({ type: "load", glb: uris.glb })}
            style={styles.webview}
            containerStyle={styles.webview}
          />
        )}
      </View>
      {children}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  stage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#FFF3DC" },
  webview: { flex: 1, backgroundColor: "transparent" },
});
