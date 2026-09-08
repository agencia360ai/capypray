import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Redirect } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { isLessonLocked, useEntitlement } from "@/entitlements";
import { P } from "@/parent/strings";
import { BigButton, Chip, LanternMeter, Sheet } from "@/ui/components";
import { T } from "@/ui/theme";
import { glyph } from "@/ui/icons";

// Home = Capy on the pond + today's Prayer Moment + the path. Kid-facing strings come from the pack.
export default function Home() {
  const onboarded = useKid((s) => s.onboarded);
  const introDone = useKid((s) => s.introDone);
  const pack = getPack();
  if (!onboarded) return <Redirect href="/parent/onboarding" />;
  if (!introDone && pack.routines.intro) return <Redirect href={{ pathname: "/lesson/[id]", params: { id: pack.routines.intro.lessonId } }} />;
  return <KidHome />;
}

function KidHome() {
  const pack = getPack();
  const { completed, lanterns, beacons, streak, kidName } = useKid();
  const { premium } = useEntitlement();
  const avatar = useAvatar();
  const { setStage } = useStage();
  const curriculum = pack.lessons.filter((l) => l.routine === "any");
  const nextLesson = curriculum.find((l) => !completed[l.id]) ?? curriculum[curriculum.length - 1]!;
  const bedtime = pack.lessons.find((l) => l.id === pack.routines.bedtime.lessonId);
  const skill = (id: string) => pack.skills.find((s) => s.id === id);

  useEffect(() => {
    setStage({ dark: false });
    avatar.send({ type: "mood", value: "calm" });
    avatar.send({ type: "idle" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar]);

  const href = (l: (typeof curriculum)[number]) =>
    isLessonLocked(l, premium) ? ({ pathname: "/parent/gate", params: { next: "paywall" } } as const) : ({ pathname: "/lesson/[id]", params: { id: l.id } } as const);

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Link href="/pond" asChild>
          <Pressable style={styles.meter}>
            <LanternMeter lanterns={lanterns} />
            <Chip>⭐ {beacons}</Chip>
          </Pressable>
        </Link>
        <View style={styles.topRight}>
          <Chip>🔥 {streak.current}</Chip>
          <Link href={{ pathname: "/parent/gate", params: { next: "corner" } }} asChild>
            <Pressable style={styles.parent} hitSlop={8}>
              <Text style={styles.parentText}>👤</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.spacer} />

      <Sheet>
        <Text style={styles.hello}>Hi {kidName || "friend"}!</Text>
        <Link href={href(nextLesson)} asChild>
          <Pressable style={({ pressed }) => [styles.today, pressed && styles.todayPressed]}>
            <Text style={styles.todayIcon}>{glyph(skill(nextLesson.skillId)?.icon)}</Text>
            <View style={styles.todayText}>
              <Text style={styles.todayEyebrow}>{skill(nextLesson.skillId)?.title}</Text>
              <Text style={styles.todayTitle}>{nextLesson.title}</Text>
            </View>
            <Text style={styles.todayGo}>▶</Text>
          </Pressable>
        </Link>
        {bedtime && (
          <Link href={{ pathname: "/lesson/[id]", params: { id: bedtime.id } }} asChild>
            <Pressable>
              <BigButton label={`🌙 ${bedtime.title}`} onPress={() => {}} tone="night" />
            </Pressable>
          </Link>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.path}>
          {curriculum.map((l, i) => {
            const done = !!completed[l.id];
            const locked = isLessonLocked(l, premium);
            const current = l.id === nextLesson.id;
            return (
              <Link key={l.id} href={href(l)} asChild>
                <Pressable style={styles.node}>
                  <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent, locked && styles.dotLocked]}>
                    <Text style={styles.dotText}>{done ? "✓" : locked ? "🔒" : i + 1}</Text>
                  </View>
                  <Text style={styles.nodeLabel} numberOfLines={1}>
                    {l.week?.toUpperCase()}·{l.day}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </ScrollView>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  top: { paddingTop: 56, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meter: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.75)", borderRadius: T.radius.pill, paddingVertical: 6, paddingHorizontal: 10 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  parent: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
  parentText: { fontSize: 18 },
  hello: { fontFamily: T.font.black, fontSize: 24, color: T.color.ink },
  today: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: T.color.primary, borderRadius: T.radius.lg, padding: 16, borderBottomWidth: 6, borderBottomColor: T.color.primaryDark },
  todayPressed: { borderBottomWidth: 2, transform: [{ translateY: 4 }] },
  todayIcon: { fontSize: 40 },
  todayText: { flex: 1 },
  todayEyebrow: { fontFamily: T.font.bold, fontSize: 13, letterSpacing: 1, textTransform: "uppercase", color: T.color.brown },
  todayTitle: { fontFamily: T.font.black, fontSize: 22, color: T.color.ink },
  todayGo: { fontSize: 22, color: T.color.ink },
  path: { gap: 14, paddingVertical: 6, paddingHorizontal: 4 },
  node: { alignItems: "center", gap: 4 },
  dot: { width: 46, height: 46, borderRadius: 23, backgroundColor: T.color.paper, borderWidth: 3, borderColor: T.color.tan, alignItems: "center", justifyContent: "center" },
  dotDone: { backgroundColor: T.color.leaf, borderColor: "#6FB35A" },
  dotCurrent: { borderColor: T.color.primary, transform: [{ scale: 1.12 }] },
  dotLocked: { opacity: 0.6 },
  dotText: { fontFamily: T.font.black, fontSize: 16, color: T.color.ink },
  nodeLabel: { fontFamily: T.font.bold, fontSize: 11, color: T.color.brown },
});
