import { StyleSheet, Text, View } from "react-native";
import type { Lesson } from "@capy/content";
import { glyph } from "./icons";
import { T } from "./theme";

const BEAT_ICON: Record<Lesson["beats"][number]["type"], string> = {
  avatar_say: "chat",
  repeat_after_me: "pray",
  minigame: "game",
  listen_timer: "ear",
  choose_people: "heart",
  reward: "lantern",
  parent_prompt: "parent",
  lights_out: "moon",
  ask: "question",
  story: "book",
};

/** Where am I in today's Prayer Moment: one bead per beat, the current one glowing. */
export function LessonTrail({ lesson, index }: { lesson: Lesson; index: number }) {
  return (
    <View style={styles.row} pointerEvents="none">
      {lesson.beats.map((b, i) => {
        const done = i < index;
        const now = i === index;
        return (
          <View key={i} style={[styles.bead, done && styles.done, now && styles.now]}>
            <Text style={[styles.icon, now && styles.iconNow]}>{done ? "✓" : glyph(BEAT_ICON[b.type])}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 60 },
  bead: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.55)", alignItems: "center", justifyContent: "center" },
  done: { backgroundColor: T.color.leaf },
  now: { width: 34, height: 34, borderRadius: 17, backgroundColor: T.color.primary, borderWidth: 3, borderColor: T.color.paper, ...T.shadow },
  icon: { fontSize: 11 },
  iconNow: { fontSize: 18 },
});
