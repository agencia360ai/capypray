import { type PropsWithChildren, useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPack } from "@/content/pack";
import { stopSpeaking } from "@/audio/voice";
import { CompanionIcon } from "./CompanionIcon";
import { T } from "./theme";

export function CollectionScreen({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  const insets = useSafeAreaInsets();
  useEffect(() => { stopSpeaking(); }, []);
  return <View style={styles.root}><ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
    <Pressable accessibilityRole="button" style={styles.back} onPress={() => router.replace("/")}><CompanionIcon name="back" size={24} /><Text style={styles.backText}>{getPack().companion.ui.back}</Text></Pressable>
    <Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text>{children}
  </ScrollView></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: "#FFFBF2" }, content: { padding: 24, gap: 16 }, back: { flexDirection: "row", gap: 8, alignItems: "center", minHeight: 48, alignSelf: "flex-start" }, backText: { fontFamily: T.font.bold, fontSize: 13, color: "#5E765F" }, title: { fontFamily: T.font.black, fontSize: 33, lineHeight: 39, color: T.color.ink }, subtitle: { fontFamily: T.font.regular, fontSize: 15, color: "#7A7C6D", lineHeight: 22, marginBottom: 12 } });
