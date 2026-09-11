import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getPack } from "@/content/pack";
import { availableStoryIds } from "@/content/stories";
import { useKid } from "@/store/kid";
import { CollectionScreen } from "@/ui/CollectionScreen";
import { CompanionIcon } from "@/ui/CompanionIcon";
import { T } from "@/ui/theme";
import { storyCover } from "@/ui/illustrations";

export default function Stories() {
  const pack = getPack(), completed = useKid(s => s.completed), copy = pack.companion.ui;
  const available = availableStoryIds(pack, completed);
  return <CollectionScreen title={copy.stories} subtitle={copy.storiesHint}>
    <View style={styles.grid}>{pack.stories.map((story) => {
      const open = available.has(story.id);
      return <Pressable key={story.id} accessibilityRole="button" accessibilityState={{ disabled: !open }} disabled={!open} onPress={() => router.push({ pathname: "/story/[id]", params: { id: story.id } })} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}>
        <ImageBackground source={storyCover(story.id)} style={styles.cover} imageStyle={{ width: "100%", height: "100%" }} resizeMode="cover" accessible={false} testID={`story-cover-${story.id}`}>
          {!storyCover(story.id) && <CompanionIcon name="book" size={54} />}
          {!open && <View style={styles.lock}><CompanionIcon name="lock" size={19} /></View>}
        </ImageBackground>
        <View style={styles.copy}><Text style={styles.title}>{story.title}</Text><Text style={styles.hint}>{open ? copy.storyReady : copy.storyLocked}</Text></View>
      </Pressable>;
    })}</View>
  </CollectionScreen>;
}
const styles = StyleSheet.create({ grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, card: { width: "46%", flexGrow: 1, borderRadius: 23, overflow: "hidden", borderWidth: 1, borderColor: "#E8E6D9", backgroundColor: "white" }, cover: { width: "100%", aspectRatio: 1, backgroundColor: "#E9ECDC", alignItems: "center", justifyContent: "center" }, lock: { position: "absolute", bottom: 9, right: 9, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFBF2F0" }, copy: { padding: 15, gap: 8 }, title: { fontFamily: T.font.bold, fontSize: 17, lineHeight: 22, color: T.color.ink }, hint: { fontFamily: T.font.regular, fontSize: 11, lineHeight: 17, color: "#7B806E" } });
