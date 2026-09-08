import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AvatarProvider } from "@/avatar/AvatarView";

export default function RootLayout() {
  return (
    <AvatarProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" }, animation: "fade" }} />
    </AvatarProvider>
  );
}
