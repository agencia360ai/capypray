import { useEffect, useState } from "react";
import { View } from "react-native";
import { Slot, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from "@expo-google-fonts/nunito";
import { AvatarProvider } from "@/avatar/AvatarView";
import { useKid } from "@/store/kid";
import { logEvent, logScreen, setUserProps } from "@/analytics/ga4";
import { initPurchases } from "@/entitlements/purchase";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Slot instead of a native Stack: native screens on iOS paint an opaque background over the stage
// (meadow + Capy WebView) that lives under the navigator. Plain views keep the stage visible and
// the single WebView mounted across screens (GDD §12.2). Route changes use router.replace/back.
export default function RootLayout() {
  const [loaded, error] = useFonts({ Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  const [hydrated, setHydrated] = useState(useKid.persist.hasHydrated());
  useEffect(() => {
    const unsubscribe = useKid.persist.onFinishHydration(() => setHydrated(true));
    if (useKid.persist.hasHydrated()) setHydrated(true);
    return unsubscribe;
  }, []);
  useEffect(() => {
    if ((loaded || error) && hydrated) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    const k = useKid.getState();
    setUserProps({ premium: k.premium, onboarded: k.onboarded, age_band: k.profile.ageBand });
    void logEvent("app_launch", { lessons_done: Object.keys(k.completed).length, streak: k.streak.current });
    void initPurchases();
  }, [hydrated]);
  const path = usePathname();
  useEffect(() => { if (hydrated) logScreen(path); }, [path, hydrated]);
  if ((!loaded && !error) || !hydrated) return null;
  return (
    <View style={{ flex: 1, backgroundColor: "#E5E9DB", alignItems: "center" }}><View style={{ flex: 1, width: "100%", maxWidth: 600, overflow: "hidden" }}><AvatarProvider>
      <StatusBar style="dark" />
      <Slot />
    </AvatarProvider></View></View>
  );
}
