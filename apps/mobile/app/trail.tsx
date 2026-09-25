import { getCopy } from "@/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { Link, Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { journeyView, pendingArrival } from "@/store/journey";
import { lessonDoneToday } from "@/store/scenes";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { isLessonLocked, useEntitlement } from "@/entitlements";
import { CompanionIcon as Icon } from "@/ui/CompanionIcon";
import { JourneyTrail, stoneStageX } from "@/ui/JourneyTrail";
import { Reveal, useReducedMotion } from "@/ui/motion";
import { SheetHandle } from "@/ui/SheetHandle";
import { T } from "@/ui/theme";

/** Phase 1 of docs/journey-plan.md: the first seven stops of one biome. */
const PHASE_1_STOPS = 7;

/**
 * The journey lobby prototype. A separate route on purpose: phase 1 compares the same lesson reached through the
 * current home and through this screen with parent-child pairs.
 * Reachable from the home path card and Parent Corner.
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
  const { height } = useWindowDimensions();
  const [sheetHeight, setSheetHeight] = useState(290);
  const [exploring, setExploring] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const sceneHeight = Math.max(220, height - sheetHeight + 22);
  const onBottomLayout = useCallback((e: LayoutChangeEvent) => setSheetHeight(e.nativeEvent.layout.height), []);
  useEffect(() => {
    setStage({ sceneHeight });
    avatar.send({ type: "viewport", top: sceneHeight * 0.45 / height, bottom: 1 - sceneHeight * 0.92 / height });
  }, [avatar, height, sceneHeight, setStage]);
  const view = useMemo(() => journeyView(pack, kid.completed, { limit: PHASE_1_STOPS, windowSize: 4 }), [pack, kid.completed]);
  const curriculum = pack.lessons.filter((l) => l.routine === "any");
  const doneToday = !kid.freePlay && lessonDoneToday(kid.completed, new Set(curriculum.map((l) => l.id)));
  const world = pack.worlds.find((w) => w.id === view.next?.worldId) ?? pack.worlds[0];
  useEffect(() => {
    setStage({ underlay: <View style={[s.scenery, { height: sceneHeight }]} pointerEvents="none">
      <JourneyTrail view={view} copy={copy} worldTitle={world?.title ?? ""} onContinue={() => {}} compact={sceneHeight < 400} layer="back" />
    </View> });
  }, [setStage, sceneHeight, view, copy, world]);
  const reduced = useReducedMotion();
  const arrival = pendingArrival(pack, kid.completed, kid.celebrated, { limit: PHASE_1_STOPS });

  // the stone he is standing on, and the one he came from: they alternate sides, so an arrival is a walk across
  const nextAt = view.window.findIndex((n) => n.state === "next");
  const standAt = nextAt < 0 ? Math.max(0, view.window.length - 1) : nextAt;
  const standX = stoneStageX(standAt);

  useEffect(() => {
    setStage({ biome: "trail", dark: false, night: false });
    avatar.send({ type: "skin", id: kid.skinId });
    avatar.send({ type: "mood", value: "calm" });
    avatar.send({ type: "walk", to: standX, from: standX }); // no distance to cover: he is placed, not walked
    avatar.send({ type: "idle" }); // greeting: facing the child, three-quarter only while he walks
    return () => { setStage({ biome: "meadow", sceneHeight: undefined, underlay: undefined }); avatar.send({ type: "viewport", top: 0.1, bottom: 0.45 }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar]);

  // The arrival walk: from the stone he lit to the one he is standing on now. The lantern, the beacon and the
  // completion were persisted the moment the lesson ended, so this only decides what the child watches. It is
  // marked when the walk reports back, again when the screen goes away (a tap during the walk is not a reason to
  // owe him the same celebration twice) and, if the stage never reports at all — WebGL refused, a slow cold start —
  // by the fallback timer. No duration is asked for: the stage paces the leg so the stride matches the ground.
  useEffect(() => {
    if (!arrival) return;
    const key = arrival.id;
    const mark = () => kid.markCelebrated(key);
    if (reduced) {
      avatar.send({ type: "play", clip: "heart", loop: false });
      mark();
      return;
    }
    const off = avatar.onEvent((e) => {
      if (e.type === "clipEnd" && e.clip === "walk") mark();
    });
    avatar.send({ type: "walk", from: stoneStageX(Math.max(0, standAt - 1)), to: standX, then: "heart_full" });
    const fallback = setTimeout(mark, 9000);
    return () => { off(); clearTimeout(fallback); mark(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrival?.id, reduced]);

  const next = view.next;
  const nextLesson = next ? pack.lessons.find((l) => l.id === next.id) : undefined;
  const go = () => {
    if (!nextLesson || doneToday) { router.push("/moments"); return; }
    router.push(isLessonLocked(nextLesson, premium) ? { pathname: "/parent/gate", params: { next: "paywall" } } : { pathname: "/lesson/[id]", params: { id: nextLesson.id, from: "trail" } });
  };

  return (
    <View style={s.root}>
      <View style={[s.scenery, { height: sceneHeight }]} pointerEvents="box-none">
        <JourneyTrail view={view} copy={copy} worldTitle={world?.title ?? ""} onContinue={go} compact={sceneHeight < 400} layer="front" />
      </View>
      <View style={[s.top, { paddingTop: insets.top + 14 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.back} onPress={() => router.replace("/")} style={s.parent}><Icon name="back" size={23} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.brand}>{copy.journey}</Text>
          <Text style={s.tagline}>{interpolate(copy.progress, { count: String(view.doneCount), total: String(view.total) })}</Text>
        </View>
        <Link href="/parent/gate?next=corner" asChild>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.parents} style={s.parent}><Icon name="parent" size={23} /></Pressable>
        </Link>
      </View>

      <View style={s.stage} pointerEvents="none" />

      <View style={s.sheetWrap} onLayout={onBottomLayout} testID="trail-sheet">
        <SheetHandle collapsed={collapsed} onChange={setCollapsed} expandLabel={copy.trailExpand ?? copy.explore} collapseLabel={copy.trailCollapse ?? copy.journey} testID="trail-sheet-handle" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <Reveal>
            {!collapsed && <>
            <Text style={s.eyebrow}>{copy.today}</Text>
            <Text style={s.title}>{!nextLesson ? copy.allDone : doneToday ? copy.completed : nextLesson.title}</Text>
            </>}
            <Pressable onPress={go} accessibilityRole="button" style={({ pressed }) => [s.primary, pressed && s.pressed]}>
              <Icon name="heart" size={23} color="#FFF8E9" />
              <Text style={s.primaryText}>{doneToday || !nextLesson ? copy.moments : (copy.trailContinue ?? copy.start)}</Text>
              <Icon name="arrow" size={22} color="#FFF8E9" />
            </Pressable>
            {!collapsed && doneToday && nextLesson ? <Text style={s.hint}>{copy.completedHint}</Text> : null}
          </Reveal>
          {/* a quick prayer and bedtime stay one tap away, including after today's curriculum step */}
          {!collapsed && <Reveal delay={70}>
            <View style={s.row}>
              <Quick icon="book" label={getCopy().playRewards.pathMap} onPress={() => router.push("/journey")} />
              <Quick icon="moon" label={copy.bedtime} onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: pack.routines.bedtime.lessonId!, from: "trail" } })} />
            </View>
          </Reveal>}
          {!collapsed && <Reveal delay={130}>
            <Pressable accessibilityRole="button" accessibilityLabel={copy.explore} accessibilityState={{ expanded: exploring }} aria-expanded={exploring} onPress={() => setExploring(value => !value)} style={s.exploreToggle}>
              <Icon name="book" size={19} /><Text style={s.exploreLabel}>{copy.explore}</Text>
              <Text style={s.chevron} accessibilityElementsHidden importantForAccessibility="no">{exploring ? "−" : "+"}</Text>
            </Pressable>
            {exploring && <View style={s.row}>
              <Quick icon="book" label={copy.stories} onPress={() => router.push("/stories")} />
              <Quick icon="garden" label={copy.places} onPress={() => router.push("/places")} />
              <Quick icon="lantern" label={copy.pond} onPress={() => router.push("/pond")} />
            </View>}
          </Reveal>}
        </ScrollView>
      </View>
    </View>
  );
}

function Quick({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [s.quick, pressed && s.pressed]}>
      <Icon name={icon} size={27} />
      <Text style={s.quickLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, gap: 12 },
  brand: { fontFamily: T.font.black, fontSize: 21, color: T.color.ink },
  tagline: { fontFamily: T.font.regular, fontSize: 11, color: T.color.brown },
  parent: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFF9EAEF", alignItems: "center", justifyContent: "center" },
  scenery: { position: "absolute", top: 0, left: 0, right: 0 },
  stage: { flex: 1, minHeight: 170 },
  sheetWrap: { maxHeight: "52%", backgroundColor: "#FFFBF2", borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden", ...T.shadow },
  sheet: { paddingHorizontal: 20, gap: 10 },
  eyebrow: { fontFamily: T.font.bold, fontSize: 10, letterSpacing: 1.8, color: "#768474" },
  title: { fontFamily: T.font.black, fontSize: 21, lineHeight: 25, color: T.color.ink, marginTop: 4, marginBottom: 10 },
  primary: { minHeight: 55, borderRadius: 19, backgroundColor: "#476D58", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 12, borderBottomWidth: 4, borderBottomColor: "#335641" },
  primaryText: { flexShrink: 1, textAlign: "center", fontFamily: T.font.bold, fontSize: 17, color: "#FFF8E9" },
  hint: { fontFamily: T.font.regular, fontSize: 12, lineHeight: 18, color: "#727666", marginTop: 8 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  row: { flexDirection: "row", gap: 10 },
  quick: { flex: 1, minWidth: 0, minHeight: 64, borderRadius: 18, backgroundColor: "#F5EEDE", alignItems: "center", justifyContent: "center", gap: 6, padding: 10 },
  exploreToggle: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 9 },
  exploreLabel: { flex: 1, fontFamily: T.font.bold, fontSize: 10, letterSpacing: 1, color: T.color.brown },
  chevron: { fontSize: 22, color: T.color.brown },
  quickLabel: { fontFamily: T.font.bold, fontSize: 12, lineHeight: 16, color: T.color.brown, textAlign: "center" },
});
