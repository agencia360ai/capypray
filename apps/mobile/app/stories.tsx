import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getPack } from "@/content/pack";
import { availableStoryIds } from "@/content/stories";
import { useKid } from "@/store/kid";
import { CollectionScreen } from "@/ui/CollectionScreen";
import { CompanionIcon } from "@/ui/CompanionIcon";
import { T } from "@/ui/theme";

export default function Stories() {
  const pack = getPack(), completed = useKid(s => s.completed), copy = pack.companion.ui;
  const available = availableStoryIds(pack, completed);
  return <CollectionScreen title={copy.stories} subtitle={copy.storiesHint}>
    <View style={styles.grid}>{pack.stories.map((story, index) => {
      const open = available.has(story.id);
      return <Pressable key={story.id} accessibilityRole="button" accessibilityState={{ disabled: !open }} disabled={!open} onPress={() => router.push({ pathname: "/story/[id]", params: { id: story.id } })} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
        <View style={[styles.cover, { backgroundColor: ["#DCE9D5", "#F7DEBE", "#DCE8EF", "#E7E1EF"][index % 4] }]}><CompanionIcon name={open ? "book" : "lock"} size={66} /><View style={styles.coverLine} /></View>
        <View style={styles.copy}><Text style={styles.title}>{story.title}</Text><Text style={styles.hint}>{open ? copy.storyReady : copy.storyLocked}</Text></View>
      </Pressable>;
    })}</View>
  </CollectionScreen>;
}
const styles = StyleSheet.create({ grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, card: { width: "46%", flexGrow: 1, borderRadius: 23, overflow: "hidden", borderWidth: 1, borderColor: "#E8E6D9", backgroundColor: "white" }, cover: { height: 135, alignItems: "center", justifyContent: "center", gap: 14 }, coverLine: { width: 42, height: 4, borderRadius: 4, backgroundColor: "#FFFFFF80" }, copy: { padding: 15, gap: 8 }, title: { fontFamily: T.font.bold, fontSize: 17, lineHeight: 22, color: T.color.ink }, hint: { fontFamily: T.font.regular, fontSize: 11, lineHeight: 17, color: "#7B806E" } });
