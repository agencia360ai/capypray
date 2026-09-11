import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { lessonDoneToday } from "@/store/scenes";
import { isLessonLocked, useEntitlement } from "@/entitlements";
import { CollectionScreen } from "@/ui/CollectionScreen";
import { CompanionIcon } from "@/ui/CompanionIcon";
import { T } from "@/ui/theme";

export default function Journey() {
  const pack = getPack(), kid = useKid(), { premium } = useEntitlement();
  const lessons = pack.lessons.filter(l => l.routine === "any");
  const next = lessons.find(l => !kid.completed[l.id]);
  const doneToday = !kid.freePlay && lessonDoneToday(kid.completed, new Set(lessons.map(l => l.id)));
  return <CollectionScreen title={pack.companion.ui.journey} subtitle={pack.companion.ui.journeyHint}>
    {pack.worlds.map(world => <View key={world.id} style={styles.world}><Text style={styles.worldTitle}>{world.title}</Text>{lessons.filter(l => world.weeks.includes(l.week!)).map(lesson => {
      const completed = !!kid.completed[lesson.id], enabled = completed || kid.freePlay || (lesson.id === next?.id && !doneToday);
      return <Pressable key={lesson.id} disabled={!enabled} accessibilityRole="button" accessibilityState={{ disabled: !enabled }} onPress={() => router.push(isLessonLocked(lesson, premium) ? { pathname: "/parent/gate", params: { next: "paywall" } } : { pathname: "/lesson/[id]", params: { id: lesson.id } })} style={[styles.lesson, completed && styles.completed, !enabled && styles.locked]}>
        <View style={styles.marker}><CompanionIcon name={completed ? "check" : enabled ? "leaf" : "lock"} size={27} /></View><Text style={styles.title}>{lesson.title}</Text>{enabled && <CompanionIcon name="arrow" size={20} />}
      </Pressable>;
    })}</View>)}
  </CollectionScreen>;
}
const styles = StyleSheet.create({ world: { gap: 12, marginBottom: 12 }, worldTitle: { fontFamily: T.font.black, fontSize: 22, color: T.color.ink, marginBottom: 4 }, lesson: { minHeight: 76, padding: 14, gap: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#F8EFD9", borderRadius: 21 }, completed: { backgroundColor: "#E9F0E0" }, locked: { backgroundColor: "#F0EFE7" }, marker: { width: 37, alignItems: "center" }, title: { flex: 1, fontFamily: T.font.bold, fontSize: 15, lineHeight: 21, color: T.color.brown } });
