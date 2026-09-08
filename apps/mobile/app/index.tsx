import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Redirect } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar } from "@/avatar/AvatarView";
import { isLessonLocked, useEntitlement } from "@/entitlements";
import { P } from "@/parent/strings";

// Home = today's Prayer Moment + Capy's Pond counters. Kid-facing strings come from the pack.
export default function Home() {
  const onboarded = useKid((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/parent/onboarding" />;
  return <KidHome />;
}

function KidHome() {
  const pack = getPack();
  const { completed, lanterns, beacons, streak } = useKid();
  const { premium } = useEntitlement();
  const avatar = useAvatar();
  const curriculum = pack.lessons.filter((l) => l.routine === "any");
  const nextLesson = curriculum.find((l) => !completed[l.id]) ?? curriculum[curriculum.length - 1]!;
  const bedtime = pack.lessons.find((l) => l.id === pack.routines.bedtime.lessonId);

  useEffect(() => {
    avatar.send({ type: "mood", value: "calm" });
  }, [avatar]);

  const href = (l: (typeof curriculum)[number]) =>
    isLessonLocked(l, premium) ? ({ pathname: "/parent/gate", params: { next: "paywall" } } as const) : ({ pathname: "/lesson/[id]", params: { id: l.id } } as const);

  return (
    <View style={styles.root}>
      <Link href={{ pathname: "/parent/gate", params: { next: "corner" } }} asChild>
        <Pressable style={styles.parent} hitSlop={8}>
          <Text style={styles.parentText}>👤</Text>
        </Pressable>
      </Link>
      <View style={styles.spacer} />
      <ScrollView contentContainerStyle={styles.sheet}>
        <Link href="/pond" asChild>
          <Pressable>
            <Text style={styles.counter}>🏮 {lanterns}   ⭐ {beacons}   🔥 {streak.current}</Text>
          </Pressable>
        </Link>
        <Link href={href(nextLesson)} asChild>
          <Pressable style={styles.big}>
            <Text style={styles.bigText}>{nextLesson.title}</Text>
            <Text style={styles.sub}>{pack.skills.find((s) => s.id === nextLesson.skillId)?.title}</Text>
          </Pressable>
        </Link>
        {bedtime && (
          <Link href={{ pathname: "/lesson/[id]", params: { id: bedtime.id } }} asChild>
            <Pressable style={styles.bedtime}>
              <Text style={styles.bedtimeText}>🌙 {bedtime.title}</Text>
            </Pressable>
          </Link>
        )}
        {curriculum.map((l) => (
          <Link key={l.id} href={href(l)} asChild>
            <Pressable style={styles.row}>
              <Text style={styles.rowText}>
                {completed[l.id] ? "✅" : isLessonLocked(l, premium) ? "🔒" : "○"} {l.title}
              </Text>
              {isLessonLocked(l, premium) && <Text style={styles.lock}>{P.lock}</Text>}
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  parent: { position: "absolute", top: 48, right: 20, zIndex: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center" },
  parentText: { fontSize: 18 },
  sheet: { padding: 20, gap: 12, backgroundColor: "rgba(255,255,255,0.85)", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  counter: { fontSize: 20, textAlign: "center", color: "#6b4a2b" },
  big: { backgroundColor: "#FFB84D", borderRadius: 24, padding: 22, alignItems: "center" },
  bigText: { fontSize: 24, fontWeight: "700", color: "#3b2a1a" },
  sub: { fontSize: 16, color: "#6b4a2b", marginTop: 4 },
  bedtime: { backgroundColor: "#2d2a4a", borderRadius: 24, padding: 18, alignItems: "center" },
  bedtimeText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  row: { padding: 12, borderRadius: 12, backgroundColor: "#fff", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowText: { fontSize: 16, color: "#3b2a1a" },
  lock: { fontSize: 12, color: "#8a6a48", textTransform: "uppercase", letterSpacing: 1 },
});
