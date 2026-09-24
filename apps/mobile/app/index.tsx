import { useEffect, useState } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { biomeFor } from "@/store/rewards";
import { freshSections, homeSections, pendingReveal, type HomeSectionId } from "@/store/home";
import { speak, stopSpeaking } from "@/audio/voice";
import { estimateMs } from "@/engine/lessonRunner";
import { lessonDoneToday } from "@/store/scenes";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { isLessonLocked, useEntitlement } from "@/entitlements";
import { CapyTapZone } from "@/ui/CapyTapZone";
import { CompanionIcon as Icon } from "@/ui/CompanionIcon";
import { Reveal } from "@/ui/motion";
import { FeelingArt } from "@/ui/FeelingArt";
import { T } from "@/ui/theme";
import { useStageInsets } from "@/ui/useStageInsets";
import { SheetHandle } from "@/ui/SheetHandle";
import { startSync } from "@/backend/sync";

export default function Home() {
  const onboarded = useKid((s) => s.onboarded);
  const introDone = useKid((s) => s.introDone);
  const pack = getPack();
  // Capy first: the app opens on him talking, and the phone goes to a grown-up only after the first prayer
  if (!introDone && pack.routines.intro) return <Redirect href={{ pathname: "/lesson/[id]", params: { id: pack.routines.intro.lessonId } }} />;
  if (!onboarded) return <Redirect href="/parent/onboarding" />;
  return <KidHome />;
}
function KidHome() {
  const pack = getPack(), copy = pack.companion.ui, kid = useKid();
  const { premium } = useEntitlement();
  const avatar = useAvatar(), { setStage } = useStage(), insets = useSafeAreaInsets();
  const curriculum = pack.lessons.filter((l) => l.routine === "any");
  const next = curriculum.find((l) => !kid.completed[l.id]);
  const doneToday = !kid.freePlay && lessonDoneToday(kid.completed, new Set(curriculum.map((l) => l.id)));
  const doneCount = curriculum.filter((l) => kid.completed[l.id]).length;
  const [collapsed, setCollapsed] = useState(false);
  const onBottomLayout = useStageInsets(0.17);
  // The home opens up one door at a time (pack.companion.home). What is open comes from progress; the doors that
  // opened since the last visit wear a chip for this visit only, and Capy announces one of them.
  const open = new Set(homeSections(pack, kid).map((sct) => sct.id));
  const [fresh] = useState(() => {
    const first = !Object.keys(kid.revealed).length;
    const ids = freshSections(pack, kid, kid.revealed).map((sct) => sct.id);
    return new Set(first ? [] : ids); // the first visit ever (or an upgrade mid-curriculum) is not "new", it is the baseline
  });
  const [reveal] = useState(() => pendingReveal(pack, kid, kid.revealed));
  useEffect(() => {
    setStage({ dark: false, night: false, biome: biomeFor(pack, kid) });
    avatar.send({ type: "skin", id: kid.skinId });
    avatar.send({ type: "mood", value: "calm" }); avatar.send({ type: "idle" }); startSync();
    kid.markRevealed(homeSections(pack, kid).map((sct) => sct.id));
    if (!reveal?.reveal) return;
    const text = reveal.reveal.text, audio = reveal.reveal.audio;
    const t = setTimeout(() => {
      avatar.send({ type: "mood", value: "happy" });
      avatar.send({ type: "speak", durationMs: estimateMs(text) * 2, clip: "celebrate" });
      speak(text, { language: pack.locale, audio, onDone: () => avatar.send({ type: "idle" }) });
    }, 900);
    return () => { clearTimeout(t); stopSpeaking(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar]);
  // once today is prayed, the button points at the nearest open door: the moments, else the path, else bedtime
  const rest = open.has("moments") ? { label: copy.moments, href: "/moments" as const } : open.has("journey") ? { label: copy.journey, href: "/trail" as const } : { label: copy.bedtime, href: { pathname: "/lesson/[id]" as const, params: { id: pack.routines.bedtime.lessonId! } } };
  const pray = () => {
    if (!next || doneToday) { router.push(rest.href); return; }
    router.push(isLessonLocked(next, premium) ? { pathname: "/parent/gate", params: { next: "paywall" } } : { pathname: "/lesson/[id]", params: { id: next.id } });
  };
  const chip = (id: HomeSectionId) => (fresh.has(id) && copy.newDoor ? <Text style={s.newChip}>{copy.newDoor}</Text> : null);
  const doors = (["games", "stories", "places", "pond", "moments"] as const).filter((id) => open.has(id));
  return <View style={s.root}>
    <View style={[s.top, { paddingTop: insets.top + 14 }]}>
      <View><Text style={s.brand}>{copy.brand}</Text><Text style={s.tagline}>{copy.tagline}</Text></View>
      <Link href="/parent/gate?next=corner" asChild><Pressable accessibilityRole="button" accessibilityLabel={copy.parents} style={s.parent}><Icon name="parent" size={23} /></Pressable></Link>
    </View>
    <View style={s.stage}><View style={s.greeting}><Text style={s.greetingText}>{interpolate(copy.greeting, { kidName: kid.kidName || pack.ui.friend })}</Text><Text style={s.greetingSub}>{copy.welcome}</Text></View><CapyTapZone /></View>
    <View style={s.sheetWrap} onLayout={onBottomLayout} testID="home-sheet">
      <SheetHandle collapsed={collapsed} onChange={setCollapsed} expandLabel={copy.trailExpand ?? copy.explore} collapseLabel={copy.trailCollapse ?? copy.journey} testID="home-sheet-handle" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
      <Reveal>{!collapsed && <><View style={s.titleRow}><Text style={s.eyebrow}>{copy.today}</Text><Text style={s.time}>{copy.duration}</Text></View>
        <Text style={s.title}>{!next ? copy.allDone : doneToday ? copy.completed : next.title}</Text>
        {doneToday || !next ? <Text style={s.description}>{!next ? copy.allDoneHint : copy.completedHint}</Text> : null}</>}
        <Pressable onPress={pray} accessibilityRole="button" style={({ pressed }) => [s.primary, pressed && s.pressed]}><Icon name="heart" size={23} color="#FFF8E9" /><Text style={s.primaryText}>{doneToday || !next ? rest.label : copy.start}</Text><Icon name="arrow" size={22} color="#FFF8E9" /></Pressable>
      </Reveal>
      {!collapsed && <>
      {open.has("journey") && <Reveal><Pressable onPress={() => router.push("/trail")} accessibilityRole="button" style={s.pathEntry} testID="home-trail-link"><Icon name="garden" size={29} /><View style={{ flex: 1 }}><View style={s.titleRow}><Text style={s.sectionTitle}>{copy.journey}</Text>{chip("journey")}</View><Text style={s.description}>{copy.journeyHint}</Text></View><Icon name="arrow" size={22} /></Pressable></Reveal>}
      {open.has("feelings") && <Reveal delay={70} style={{ gap: 10 }}><View style={s.titleRow}><Text style={s.sectionTitle}>{copy.feelings}</Text>{chip("feelings")}</View><View style={s.feelings}>{pack.companion.feelings.map(f => <Pressable key={f.id} onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: f.lessonId } })} accessibilityRole="button" accessibilityLabel={f.label} style={({ pressed }) => [s.feeling, pressed && s.pressed]}><FeelingArt id={f.id} icon={f.icon} size={48} /><Text style={s.feelingLabel}>{f.label}</Text></Pressable>)}</View></Reveal>}
      {open.has("bedtime") && <Reveal delay={130}><Pressable onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: pack.routines.bedtime.lessonId! } })} accessibilityRole="button" style={({ pressed }) => [s.bedtime, pressed && s.pressed]}><ImageBackground source={require("../assets/backgrounds/meadow-storybook-night.png")} style={s.bedArt}><View style={s.bedShade}><Icon name="moon" size={37} color="#F6D486" /><View style={{ flex: 1 }}><Text style={s.bedTitle}>{copy.bedtime}</Text><Text style={s.bedHint}>{copy.bedtimeHint}</Text></View><Icon name="arrow" size={22} color="#FFF8E9" /></View></ImageBackground></Pressable></Reveal>}
      {doors.length > 0 && <>
      <Text style={s.eyebrow}>{copy.explore}</Text>
      <View style={s.doors}>
        {doors.includes("games") && pack.companion.games && <Door href="/games" icon="play" title={pack.companion.games.title} subtitle={pack.companion.games.subtitle} color="#E3F1EE" chip={chip("games")} />}
        {doors.includes("stories") && <Door href="/stories" icon="book" title={copy.stories} subtitle={copy.storiesHint} color="#FAEAD8" chip={chip("stories")} />}
        {doors.includes("places") && <Door href="/places" icon="garden" title={copy.places} subtitle={copy.placesHint} color="#E8EFDE" chip={chip("places")} />}
        {doors.includes("pond") && <Door href="/pond" icon="lantern" title={copy.pond} subtitle={copy.pondHint} color="#F9EFCF" chip={chip("pond")} />}
        {doors.includes("moments") && <Door href="/moments" icon="heart" title={copy.moments} subtitle={copy.momentsHint} color="#F7E6DF" chip={chip("moments")} />}
      </View></>}
      {open.has("memories") && <Link href="/journey" asChild><Pressable accessibilityRole="button" style={s.journey}><View style={s.titleRow}><Text style={s.sectionTitle}>{copy.journeyHistory ?? copy.journey}</Text>{chip("memories")}<Icon name="arrow" size={20} /></View><View style={s.track}><View style={[s.fill, { width: `${curriculum.length ? doneCount / curriculum.length * 100 : 0}%` }]} /></View><Text style={s.description}>{interpolate(copy.progress, { count: String(doneCount), total: String(curriculum.length) })}</Text></Pressable></Link>}
      </>}
    </ScrollView></View>
  </View>;
}
function Door({ href, icon, title, subtitle, color, chip }: { href: React.ComponentProps<typeof Link>["href"]; icon: string; title: string; subtitle: string; color: string; chip?: React.ReactNode }) {
  return <Pressable onPress={() => router.push(href)} accessibilityRole="button" style={({ pressed }) => [s.door, { backgroundColor: color }, pressed && s.pressed]}><View style={s.titleRow}><Icon name={icon} size={35} />{chip}</View><Text style={s.doorTitle}>{title}</Text><Text style={s.doorHint}>{subtitle}</Text></Pressable>;
}
const s = StyleSheet.create({
  root: { flex: 1 }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24 }, brand: { fontFamily: T.font.black, fontSize: 21, color: T.color.ink }, tagline: { fontFamily: T.font.regular, fontSize: 11, color: T.color.brown }, parent: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFF9EAEF", alignItems: "center", justifyContent: "center" },
  stage: { flex: 1, minHeight: 150 }, greeting: { alignSelf: "center", marginTop: 10, paddingHorizontal: 18, paddingVertical: 7, backgroundColor: "#FFF9EAEF", borderRadius: 18 }, greetingText: { fontFamily: T.font.black, fontSize: 17, textAlign: "center", color: T.color.ink }, greetingSub: { fontFamily: T.font.regular, fontSize: 12, textAlign: "center", color: T.color.brown },
  sheetWrap: { maxHeight: "59%", backgroundColor: "#FFFBF2", borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden", ...T.shadow }, sheet: { paddingHorizontal: 24, gap: 19 },
  pathEntry: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, backgroundColor: "#EDF2E5", padding: 14, minHeight: 64 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }, eyebrow: { fontFamily: T.font.bold, fontSize: 10, letterSpacing: 1.8, color: "#768474" }, time: { backgroundColor: "#EEF0E3", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, fontFamily: T.font.regular, fontSize: 10, color: "#65785C" }, title: { fontFamily: T.font.black, fontSize: 25, lineHeight: 30, color: T.color.ink, marginTop: 9, marginBottom: 13 },
  primary: { minHeight: 55, borderRadius: 19, backgroundColor: "#476D58", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 12, borderBottomWidth: 4, borderBottomColor: "#335641" }, primaryText: { flexShrink: 1, textAlign: "center", fontFamily: T.font.bold, fontSize: 17, color: "#FFF8E9" }, pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] }, sectionTitle: { fontFamily: T.font.bold, fontSize: 17, color: T.color.ink },
  feelings: { flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "space-between" }, feeling: { alignItems: "center", gap: 5, minWidth: 44, minHeight: 74, paddingVertical: 4, flex: 1 }, feelingLabel: { fontFamily: T.font.bold, fontSize: 11, color: T.color.brown },
  bedtime: { borderRadius: 20, overflow: "hidden" }, bedArt: { minHeight: 96, overflow: "hidden", borderRadius: 20 }, bedShade: { flex: 1, backgroundColor: "#23355490", flexDirection: "row", alignItems: "center", padding: 16, gap: 12 }, bedTitle: { fontFamily: T.font.bold, fontSize: 17, color: "#FFF4DB" }, bedHint: { fontFamily: T.font.regular, fontSize: 12, color: "#E5E5E7", marginTop: 3 },
  newChip: { fontFamily: T.font.black, fontSize: 10, letterSpacing: 0.6, color: "#5B3F1C", backgroundColor: "#FFD98A", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: "hidden" },
  doors: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, door: { width: "47%", flexGrow: 1, borderRadius: 22, padding: 17, gap: 6, minHeight: 132 }, doorTitle: { fontFamily: T.font.bold, fontSize: 16, color: T.color.ink }, doorHint: { fontFamily: T.font.regular, fontSize: 12, lineHeight: 17, color: T.color.brown }, journey: { borderWidth: 1, borderColor: "#E5E7D9", borderRadius: 20, padding: 16, gap: 10 }, track: { height: 7, backgroundColor: "#E8EBDD", borderRadius: 5, overflow: "hidden" }, fill: { height: 7, backgroundColor: "#80A576", borderRadius: 5 }, description: { fontFamily: T.font.regular, fontSize: 12, lineHeight: 18, color: "#727666", marginBottom: 4 },
});
