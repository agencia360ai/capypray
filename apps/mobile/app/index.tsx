import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Redirect } from "expo-router";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { biomeFor } from "@/store/rewards";
import { lessonDoneToday } from "@/store/scenes";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { isLessonLocked, useEntitlement } from "@/entitlements";
import { Chip, LanternMeter } from "@/ui/components";
import { Friends } from "@/ui/Friends";
import { StageDecor } from "@/ui/StageDecor";
import { CapyTapZone } from "@/ui/CapyTapZone";
import { glyph } from "@/ui/icons";
import { T } from "@/ui/theme";
import { useStageInsets } from "@/ui/useStageInsets";
import { startSync } from "@/backend/sync";
import * as haptics from "@/ui/haptics";

// Lobby: Capy at the pond + four doors (today's Prayer Moment, Stories, Places, Pond) + bedtime.
// One curriculum lesson per day (GDD §4.2); the other doors keep the kid busy until tomorrow.
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
  const { completed, lanterns, beacons, streak, kidName, skinId, biomeId, freePlay } = useKid();
  const { premium } = useEntitlement();
  const avatar = useAvatar();
  const { setStage } = useStage();
  const curriculum = pack.lessons.filter((l) => l.routine === "any");
  const nextLesson = curriculum.find((l) => !completed[l.id]) ?? curriculum[curriculum.length - 1]!;
  const doneToday = !freePlay && lessonDoneToday(completed, new Set(curriculum.map((l) => l.id)));
  const bedtime = pack.lessons.find((l) => l.id === pack.routines.bedtime.lessonId);
  const skill = (id: string) => pack.skills.find((s) => s.id === id);
  const world = pack.worlds.find((w) => nextLesson.week && w.weeks.includes(nextLesson.week));
  const onBottomLayout = useStageInsets();

  useEffect(() => {
    setStage({ dark: false, night: false, biome: biomeFor(pack, { beacons, completed, biomeId }) });
    avatar.send({ type: "skin", id: skinId });
    avatar.send({ type: "mood", value: "calm" });
    avatar.send({ type: "idle" });
    startSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar]);

  const lessonHref = isLessonLocked(nextLesson, premium) ? ({ pathname: "/parent/gate", params: { next: "paywall" } } as const) : ({ pathname: "/lesson/[id]", params: { id: nextLesson.id } } as const);

  return (
    <View style={styles.root}>
      {/* Top bar = two things only: this week's lanterns (→ pond) and the grown-ups door. Beacons live in the pond,
          the streak is part of Capy's greeting — a 4–8 year old can't read four unlabeled counters. */}
      <View style={styles.top}>
        <Link href="/pond" asChild>
          <Pressable style={styles.meter} onPress={() => void haptics.tap()}>
            <LanternMeter lanterns={lanterns} />
          </Pressable>
        </Link>
        <Link href={{ pathname: "/parent/gate", params: { next: "corner" } }} asChild>
          <Pressable style={styles.parent} hitSlop={10} accessibilityLabel="Parents">
            <Text style={styles.parentText}>👤</Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.spacer}>
        <StageDecor />
        <CapyTapZone />
        <View style={styles.friends}>
          <Friends />
        </View>
      </View>

      <View onLayout={onBottomLayout}>
        <View style={styles.sheet}>
          <View style={styles.helloRow}>
            <Text style={styles.hello}>{interpolate(pack.ui.hi, { kidName: kidName || pack.ui.friend })}</Text>
            {streak.current > 1 && pack.ui.streak ? <Chip style={styles.streak}>🔥 {interpolate(pack.ui.streak, { n: String(streak.current) })}</Chip> : null}
          </View>

          {doneToday ? (
            <View style={styles.today}>
              <Text style={styles.todayIcon}>🌙</Text>
              <View style={styles.todayText}>
                <Text style={styles.todayTitle}>{pack.ui.comeBackTomorrow}</Text>
                <Text style={styles.todayEyebrow}>{pack.ui.tomorrowHint}</Text>
              </View>
            </View>
          ) : (
            <Link href={lessonHref} asChild>
              <Pressable style={({ pressed }) => [styles.today, styles.todayLive, pressed && styles.todayPressed]} onPress={() => void haptics.tap()}>
                <Text style={styles.todayIcon}>{glyph(skill(nextLesson.skillId)?.icon)}</Text>
                <View style={styles.todayText}>
                  <Text style={styles.todayEyebrow}>
                    {pack.ui.todayTitle} · {world?.title}
                  </Text>
                  <Text style={styles.todayTitle}>{nextLesson.title}</Text>
                </View>
                <Text style={styles.todayGo}>▶</Text>
              </Pressable>
            </Link>
          )}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.doors}>
            <Door href="/stories" icon="book" label={pack.ui.storiesTitle} color="#FFE7EE" />
            <Door href="/places" icon="city" label={pack.ui.placesTitle} color="#E3F4FF" />
            <Door href="/pond" icon="lantern" label={pack.ui.pondTitle} color="#EAF7DF" />
            {bedtime ? <Door href={{ pathname: "/lesson/[id]", params: { id: bedtime.id } }} icon="moon" label={pack.ui.bedtimeTitle} color="#E6E3F7" /> : null}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

function Door({ href, icon, label, color }: { href: React.ComponentProps<typeof Link>["href"]; icon: string; label: string; color: string }) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.door, { backgroundColor: color }, pressed && styles.doorPressed]} onPress={() => void haptics.tap()}>
        <Text style={styles.doorGlyph}>{glyph(icon)}</Text>
        <Text style={styles.doorLabel} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1, justifyContent: "flex-end" },
  friends: { marginBottom: -6 },
  top: { paddingTop: 56, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meter: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.75)", borderRadius: T.radius.pill, paddingVertical: 6, paddingHorizontal: 10 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  parent: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.6)", alignItems: "center", justifyContent: "center", opacity: 0.8 },
  parentText: { fontSize: 15 },
  sheet: { padding: 20, paddingBottom: 30, gap: 14, backgroundColor: "rgba(255,247,230,0.94)", borderTopLeftRadius: 32, borderTopRightRadius: 32, ...T.shadow },
  helloRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  hello: { fontFamily: T.font.black, fontSize: 24, color: T.color.ink },
  streak: { backgroundColor: "#FFE9C7" },
  today: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: T.color.paper, borderRadius: T.radius.lg, padding: 16, borderWidth: 3, borderColor: T.color.tan },
  todayLive: { backgroundColor: T.color.primary, borderWidth: 0, borderBottomWidth: 6, borderBottomColor: T.color.primaryDark },
  todayPressed: { borderBottomWidth: 2, transform: [{ translateY: 4 }] },
  todayIcon: { fontSize: 40 },
  todayText: { flex: 1 },
  todayEyebrow: { fontFamily: T.font.bold, fontSize: 12, letterSpacing: 0.5, color: T.color.brown },
  todayTitle: { fontFamily: T.font.black, fontSize: 20, color: T.color.ink },
  todayGo: { fontSize: 22, color: T.color.ink },
  doors: { gap: 12, paddingVertical: 4 },
  door: { width: 108, height: 96, borderRadius: T.radius.md, alignItems: "center", justifyContent: "center", gap: 4, borderBottomWidth: 5, borderBottomColor: "rgba(59,42,26,0.15)" },
  doorPressed: { borderBottomWidth: 2, transform: [{ translateY: 3 }] },
  doorGlyph: { fontSize: 36 },
  doorLabel: { fontFamily: T.font.bold, fontSize: 14, color: T.color.ink },
});
