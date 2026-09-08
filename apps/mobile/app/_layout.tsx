import { useEffect } from "react";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from "@expo-google-fonts/nunito";
import { AvatarProvider } from "@/avatar/AvatarView";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Slot instead of a native Stack: native screens on iOS paint an opaque background over the stage
// (meadow + Capy WebView) that lives under the navigator. Plain views keep the stage visible and
// the single WebView mounted across screens (GDD §12.2). Route changes use router.replace/back.
export default function RootLayout() {
  const [loaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  if (!loaded) return null;
  return (
    <AvatarProvider>
      <StatusBar style="dark" />
      <Slot />
    </AvatarProvider>
  );
}
