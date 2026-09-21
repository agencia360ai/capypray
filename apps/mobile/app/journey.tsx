import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { lessonDoneToday } from "@/store/scenes";
import { isLessonLocked, useEntitlement } from "@/entitlements";
import { CollectionScreen } from "@/ui/CollectionScreen";
import { CompanionIcon } from "@/ui/CompanionIcon";
import { LockBadge } from "@/ui/LockBadge";
import { storyCover } from "@/ui/illustrations";
import { backgroundFor } from "@/ui/backgrounds";
import { T } from "@/ui/theme";

export default function Journey() {
  const pack = getPack(), kid = useKid(), { premium } = useEntitlement();
  const lessons = pack.lessons.filter(l => l.routine === "any");
  const next = lessons.find(l => !kid.completed[l.id]);
  const doneToday = !kid.freePlay && lessonDoneToday(kid.completed, new Set(lessons.map(l => l.id)));
  return <CollectionScreen title={pack.companion.ui.journey} subtitle={pack.companion.ui.journeyHint}>
    {pack.worlds.map(world => <View key={world.id} style={styles.world}><Text style={styles.worldTitle}>{world.title}</Text>{lessons.filter(l => world.weeks.includes(l.week!)).map(lesson => {
      const completed = !!kid.completed[lesson.id], enabled = completed || kid.freePlay || (lesson.id === next?.id && !doneToday);
      const paid = isLessonLocked(lesson, premium);
      const story = lesson.beats.find(b => b.type === "story");
      const cover = story?.type === "story" ? storyCover(story.storyId) : backgroundFor(pack.scenes.find(s => s.id === lesson.scene)?.background ?? pack.theme.pond);
      return <Pressable testID={"journey-" + lesson.id} key={lesson.id} disabled={!enabled} accessibilityRole="button" accessibilityState={{ disabled: !enabled }} onPress={() => router.push(isLessonLocked(lesson, premium) ? { pathname: "/parent/gate", params: { next: "paywall" } } : { pathname: "/lesson/[id]", params: { id: lesson.id } })} style={[styles.lesson, completed && styles.completed, !enabled && styles.locked]}>
        <ImageBackground source={cover} style={styles.preview} imageStyle={{ borderRadius: 15 }} accessible={false}>{(!enabled || paid) && <LockBadge small />}{completed && <View style={styles.completeBadge}><CompanionIcon name="check" size={19} /></View>}</ImageBackground>
        <View style={{ flex: 1, gap: 5 }}><Text style={styles.title}>{lesson.title}</Text>{(paid || !enabled) && <Text style={styles.hint}>{enabled && paid ? pack.companion.ui.grownUpUnlock : pack.companion.ui.pathLocked}</Text>}</View>{enabled && <CompanionIcon name="arrow" size={20} />}
      </Pressable>;
    })}</View>)}
  </CollectionScreen>;
}
const styles = StyleSheet.create({ world: { gap: 12, marginBottom: 12 }, worldTitle: { fontFamily: T.font.black, fontSize: 22, color: T.color.ink, marginBottom: 4 }, lesson: { minHeight: 92, padding: 10, gap: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#F8EFD9", borderRadius: 21 }, completed: { backgroundColor: "#E9F0E0" }, locked: { backgroundColor: "#F0EFE7" }, preview: { width: 67, height: 67 }, completeBadge: { position: "absolute", bottom: 4, right: 4, backgroundColor: "#EFF6E4", borderRadius: 12, padding: 3 }, hint: { fontFamily: T.font.regular, fontSize: 10, lineHeight: 14, color: "#728168" }, title: { fontFamily: T.font.bold, fontSize: 15, lineHeight: 21, color: T.color.brown } });
