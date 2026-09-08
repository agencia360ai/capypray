import { useEffect } from "react";
import { Stack } from "expo-router";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black } from "@expo-google-fonts/nunito";
import { AvatarProvider } from "@/avatar/AvatarView";

SplashScreen.preventAutoHideAsync().catch(() => {});

// The navigation container paints theme.colors.background over everything below it; the stage
// (background + Capy WebView) lives under the Stack, so the theme background must be transparent.
const stageTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: "transparent", card: "transparent" } };

export default function RootLayout() {
  const [loaded] = useFonts({ Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black });
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);
  if (!loaded) return null;
  return (
    <AvatarProvider>
      <StatusBar style="dark" />
      <ThemeProvider value={stageTheme}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" }, animation: "fade" }} />
      </ThemeProvider>
    </AvatarProvider>
  );
}
