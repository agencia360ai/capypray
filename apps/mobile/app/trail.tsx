import { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { journeyView } from "@/store/journey";
import { lessonDoneToday } from "@/store/scenes";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { isLessonLocked, useEntitlement } from "@/entitlements";
import { CompanionIcon as Icon } from "@/ui/CompanionIcon";
import { JourneyTrail } from "@/ui/JourneyTrail";
import { Reveal } from "@/ui/motion";
import { T } from "@/ui/theme";
import { useStageInsets } from "@/ui/useStageInsets";

/** Phase 1 of docs/journey-plan.md: the first seven stops of one biome. */
const PHASE_1_STOPS = 7;

/**
 * The journey lobby prototype. A separate route on purpose: phase 1 compares the same lesson reached through the
 * current home and through this screen with parent-child pairs, so the shipping home must stay exactly as it is.
 * Reachable from Parent Corner, behind the existing gate.
 *
 * Everything authoritative stays where it was: entitlements, the daily gate, free play and the lesson runner are the
 * same calls the home screen makes. This screen only composes them differently.
 */
export default function Trail() {
  const onboarded = useKid((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/parent/onboarding" />;
  return <TrailLobby />;
}

function TrailLobby() {
  const pack = getPack(), copy = pack.companion.ui, kid = useKid();
  const { premium } = useEntitlement();
  const avatar = useAvatar(), { setStage } = useStage(), insets = useSafeAreaInsets();
  const onBottomLayout = useStageInsets(0.1);
  const view = journeyView(pack, kid.completed, { limit: PHASE_1_STOPS, windowSize: 4 });
  const curriculum = pack.lessons.filter((l) => l.routine === "any");
  const doneToday = !kid.freePlay && lessonDoneToday(kid.completed, new Set(curriculum.map((l) => l.id)));
  const world = pack.worlds.find((w) => w.id === view.next?.worldId) ?? pack.worlds[0];

  useEffect(() => {
    setStage({ biome: "trail", dark: false, night: false });
    avatar.send({ type: "skin", id: kid.skinId });
    avatar.send({ type: "mood", value: "calm" });
    avatar.send({ type: "idle" }); // greeting: facing the child, three-quarter only while he walks
    return () => setStage({ biome: "meadow" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar]);

  const next = view.next;
  const nextLesson = next ? pack.lessons.find((l) => l.id === next.id) : undefined;
  const go = () => {
    if (!nextLesson || doneToday) { router.push("/moments"); return; }
    router.push(isLessonLocked(nextLesson, premium) ? { pathname: "/parent/gate", params: { next: "paywall" } } : { pathname: "/lesson/[id]", params: { id: nextLesson.id } });
  };

  return (
    <View style={s.root}>
      <View style={[s.top, { paddingTop: insets.top + 14 }]}>
        <View>
          <Text style={s.brand}>{copy.journey}</Text>
          <Text style={s.tagline}>{interpolate(copy.progress, { count: String(view.doneCount), total: String(view.total) })}</Text>
        </View>
        <Link href="/parent/gate?next=corner" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.parents} style={s.parent}><Icon name="parent" size={23} /></Pressable>
        </Link>
      </View>

      <View style={s.stage} pointerEvents="box-none">
        <JourneyTrail view={view} copy={copy} worldTitle={world?.title ?? ""} onContinue={go} />
      </View>

      <View style={s.sheetWrap} onLayout={onBottomLayout}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <View style={s.handle} />
          <Reveal>
            <Text style={s.eyebrow}>{copy.today}</Text>
            <Text style={s.title}>{!nextLesson ? copy.allDone : doneToday ? copy.completed : nextLesson.title}</Text>
            <Pressable onPress={go} accessibilityRole="button" style={({ pressed }) => [s.primary, pressed && s.pressed]}>
              <Icon name="heart" size={23} color="#FFF8E9" />
              <Text style={s.primaryText}>{doneToday || !nextLesson ? copy.moments : (copy.trailContinue ?? copy.start)}</Text>
              <Icon name="arrow" size={22} color="#FFF8E9" />
            </Pressable>
            {doneToday && nextLesson ? <Text style={s.hint}>{copy.completedHint}</Text> : null}
          </Reveal>
          {/* a quick prayer and bedtime stay one tap away, including after today's curriculum step */}
          <Reveal delay={70}>
            <View style={s.row}>
              <Quick icon="heart" label={copy.moments} onPress={() => router.push("/moments")} />
              <Quick icon="moon" label={copy.bedtime} onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: pack.routines.bedtime.lessonId! } })} />
            </View>
          </Reveal>
          <Reveal delay={130}>
            <Text style={s.eyebrow}>{copy.explore}</Text>
            <View style={s.row}>
              <Quick icon="book" label={copy.stories} onPress={() => router.push("/stories")} />
              <Quick icon="garden" label={copy.places} onPress={() => router.push("/places")} />
              <Quick icon="lantern" label={copy.pond} onPress={() => router.push("/pond")} />
            </View>
          </Reveal>
        </ScrollView>
      </View>
    </View>
  );
}

function Quick({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.quick, pressed && s.pressed]}>
      <Icon name={icon} size={27} />
      <Text style={s.quickLabel} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, gap: 12 },
  brand: { fontFamily: T.font.black, fontSize: 21, color: T.color.ink },
  tagline: { fontFamily: T.font.regular, fontSize: 11, color: T.color.brown },
  parent: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFF9EAEF", alignItems: "center", justifyContent: "center" },
  stage: { flex: 1, minHeight: 190 },
  sheetWrap: { maxHeight: "48%", backgroundColor: "#FFFBF2", borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden", ...T.shadow },
  sheet: { paddingHorizontal: 24, gap: 17 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#DFD8C5", alignSelf: "center", marginTop: 10, marginBottom: -4 },
  eyebrow: { fontFamily: T.font.bold, fontSize: 10, letterSpacing: 1.8, color: "#768474" },
  title: { fontFamily: T.font.black, fontSize: 23, lineHeight: 28, color: T.color.ink, marginTop: 8, marginBottom: 12 },
  primary: { minHeight: 55, borderRadius: 19, backgroundColor: "#476D58", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 12, borderBottomWidth: 4, borderBottomColor: "#335641" },
  primaryText: { flexShrink: 1, textAlign: "center", fontFamily: T.font.bold, fontSize: 17, color: "#FFF8E9" },
  hint: { fontFamily: T.font.regular, fontSize: 12, lineHeight: 18, color: "#727666", marginTop: 8 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  row: { flexDirection: "row", gap: 10 },
  quick: { flex: 1, minWidth: 92, minHeight: 74, borderRadius: 18, backgroundColor: "#F5EEDE", alignItems: "center", justifyContent: "center", gap: 6, padding: 10 },
  quickLabel: { fontFamily: T.font.bold, fontSize: 12, color: T.color.brown, textAlign: "center" },
});
