import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar } from "@/avatar/AvatarView";

// Home = today's Prayer Moment + Capy's Pond counters. Kid-facing strings come from the pack.
export default function Home() {
  const pack = getPack();
  const { completed, lanterns, beacons, streak, kidName, setKidName } = useKid();
  const avatar = useAvatar();
  const curriculum = pack.lessons.filter((l) => l.routine === "any");
  const nextLesson = curriculum.find((l) => !completed[l.id]) ?? curriculum[curriculum.length - 1]!;
  const bedtime = pack.lessons.find((l) => l.id === pack.routines.bedtime.lessonId);

  useEffect(() => {
    if (!kidName) setKidName("friend"); // replaced by parent onboarding (S3)
    avatar.send({ type: "mood", value: "calm" });
  }, [avatar, kidName, setKidName]);

  return (
    <View style={styles.root}>
      <View style={styles.spacer} />
      <ScrollView contentContainerStyle={styles.sheet}>
        <Link href="/pond" asChild>
          <Pressable>
            <Text style={styles.counter}>🏮 {lanterns}   ⭐ {beacons}   🔥 {streak.current}</Text>
          </Pressable>
        </Link>
        <Link href={{ pathname: "/lesson/[id]", params: { id: nextLesson.id } }} asChild>
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
          <Link key={l.id} href={{ pathname: "/lesson/[id]", params: { id: l.id } }} asChild>
            <Pressable style={styles.row}>
              <Text style={styles.rowText}>
                {completed[l.id] ? "✅" : "○"} {l.title}
              </Text>
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
  sheet: { padding: 20, gap: 12, backgroundColor: "rgba(255,255,255,0.85)", borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  counter: { fontSize: 20, textAlign: "center", color: "#6b4a2b" },
  big: { backgroundColor: "#FFB84D", borderRadius: 24, padding: 22, alignItems: "center" },
  bigText: { fontSize: 24, fontWeight: "700", color: "#3b2a1a" },
  sub: { fontSize: 16, color: "#6b4a2b", marginTop: 4 },
  bedtime: { backgroundColor: "#2d2a4a", borderRadius: 24, padding: 18, alignItems: "center" },
  bedtimeText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  row: { padding: 12, borderRadius: 12, backgroundColor: "#fff" },
  rowText: { fontSize: 16, color: "#3b2a1a" },
});
