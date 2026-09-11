import { useEffect } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { biomeFor } from "@/store/rewards";
import { lessonDoneToday } from "@/store/scenes";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { isLessonLocked, useEntitlement } from "@/entitlements";
import { CapyTapZone } from "@/ui/CapyTapZone";
import { CompanionIcon as Icon } from "@/ui/CompanionIcon";
import { Reveal } from "@/ui/motion";
import { T } from "@/ui/theme";
import { useStageInsets } from "@/ui/useStageInsets";
import { startSync } from "@/backend/sync";

export default function Home() {
  const onboarded = useKid((s) => s.onboarded);
  const introDone = useKid((s) => s.introDone);
  const pack = getPack();
  if (!onboarded) return <Redirect href="/parent/onboarding" />;
  if (!introDone && pack.routines.intro) return <Redirect href={{ pathname: "/lesson/[id]", params: { id: pack.routines.intro.lessonId } }} />;
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
  const onBottomLayout = useStageInsets(0.17);
  useEffect(() => {
    setStage({ dark: false, night: false, biome: biomeFor(pack, kid) });
    avatar.send({ type: "skin", id: kid.skinId });
    avatar.send({ type: "mood", value: "calm" }); avatar.send({ type: "idle" }); startSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar]);
  const pray = () => {
    if (!next || doneToday) { router.push("/moments"); return; }
    router.push(isLessonLocked(next, premium) ? { pathname: "/parent/gate", params: { next: "paywall" } } : { pathname: "/lesson/[id]", params: { id: next.id } });
  };
  return <View style={s.root}>
    <View style={[s.top, { paddingTop: insets.top + 14 }]}>
      <View><Text style={s.brand}>{copy.brand}</Text><Text style={s.tagline}>{copy.tagline}</Text></View>
      <Link href="/parent/gate?next=corner" asChild><Pressable accessibilityRole="button" accessibilityLabel={copy.parents} style={s.parent}><Icon name="parent" size={23} /></Pressable></Link>
    </View>
    <View style={s.stage}><View style={s.greeting}><Text style={s.greetingText}>{interpolate(copy.greeting, { kidName: kid.kidName || pack.ui.friend })}</Text><Text style={s.greetingSub}>{copy.welcome}</Text></View><CapyTapZone /></View>
    <View style={s.sheetWrap} onLayout={onBottomLayout}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
      <View style={s.handle} />
      <Reveal><View style={s.titleRow}><Text style={s.eyebrow}>{copy.today}</Text><Text style={s.time}>{copy.duration}</Text></View>
        <Text style={s.title}>{!next ? copy.allDone : doneToday ? copy.completed : next.title}</Text>
        {doneToday || !next ? <Text style={s.description}>{!next ? copy.allDoneHint : copy.completedHint}</Text> : null}
        <Pressable onPress={pray} accessibilityRole="button" style={({ pressed }) => [s.primary, pressed && s.pressed]}><Icon name="heart" size={23} color="#FFF8E9" /><Text style={s.primaryText}>{doneToday || !next ? copy.moments : copy.start}</Text><Icon name="arrow" size={22} color="#FFF8E9" /></Pressable>
      </Reveal>
      <Reveal delay={70} style={{ gap: 10 }}><Text style={s.sectionTitle}>{copy.feelings}</Text><View style={s.feelings}>{pack.companion.feelings.map(f => <Pressable key={f.id} onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: f.lessonId } })} accessibilityRole="button" accessibilityLabel={f.label} style={({ pressed }) => [s.feeling, pressed && s.pressed]}><Icon name={f.icon} size={38} /><Text style={s.feelingLabel}>{f.label}</Text></Pressable>)}</View></Reveal>
      <Reveal delay={130}><Pressable onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: pack.routines.bedtime.lessonId! } })} accessibilityRole="button" style={({ pressed }) => [s.bedtime, pressed && s.pressed]}><ImageBackground source={require("../assets/backgrounds/meadow-storybook-night.png")} style={s.bedArt}><View style={s.bedShade}><Icon name="moon" size={37} color="#F6D486" /><View style={{ flex: 1 }}><Text style={s.bedTitle}>{copy.bedtime}</Text><Text style={s.bedHint}>{copy.bedtimeHint}</Text></View><Icon name="arrow" size={22} color="#FFF8E9" /></View></ImageBackground></Pressable></Reveal>
      <Text style={s.eyebrow}>{copy.explore}</Text>
      <View style={s.doors}><Door href="/stories" icon="book" title={copy.stories} subtitle={copy.storiesHint} color="#FAEAD8" /><Door href="/places" icon="garden" title={copy.places} subtitle={copy.placesHint} color="#E8EFDE" /><Door href="/pond" icon="lantern" title={copy.pond} subtitle={copy.pondHint} color="#F9EFCF" /><Door href="/moments" icon="heart" title={copy.moments} subtitle={copy.momentsHint} color="#F7E6DF" /></View>
      <Link href="/journey" asChild><Pressable accessibilityRole="button" style={s.journey}><View style={s.titleRow}><Text style={s.sectionTitle}>{copy.journey}</Text><Icon name="arrow" size={20} /></View><View style={s.track}><View style={[s.fill, { width: `${curriculum.length ? doneCount / curriculum.length * 100 : 0}%` }]} /></View><Text style={s.description}>{interpolate(copy.progress, { count: String(doneCount), total: String(curriculum.length) })}</Text></Pressable></Link>
    </ScrollView></View>
  </View>;
}
function Door({ href, icon, title, subtitle, color }: { href: React.ComponentProps<typeof Link>["href"]; icon: string; title: string; subtitle: string; color: string }) {
  return <Pressable onPress={() => router.push(href)} accessibilityRole="button" style={({ pressed }) => [s.door, { backgroundColor: color }, pressed && s.pressed]}><Icon name={icon} size={35} /><Text style={s.doorTitle}>{title}</Text><Text style={s.doorHint}>{subtitle}</Text></Pressable>;
}
const s = StyleSheet.create({
  root: { flex: 1 }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24 }, brand: { fontFamily: T.font.black, fontSize: 21, color: T.color.ink }, tagline: { fontFamily: T.font.regular, fontSize: 11, color: T.color.brown }, parent: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFF9EAEF", alignItems: "center", justifyContent: "center" },
  stage: { flex: 1, minHeight: 150 }, greeting: { alignSelf: "center", marginTop: 10, paddingHorizontal: 18, paddingVertical: 7, backgroundColor: "#FFF9EAEF", borderRadius: 18 }, greetingText: { fontFamily: T.font.black, fontSize: 17, textAlign: "center", color: T.color.ink }, greetingSub: { fontFamily: T.font.regular, fontSize: 12, textAlign: "center", color: T.color.brown },
  sheetWrap: { maxHeight: "59%", backgroundColor: "#FFFBF2", borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden", ...T.shadow }, sheet: { paddingHorizontal: 24, gap: 19 }, handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#DFD8C5", alignSelf: "center", marginTop: 10, marginBottom: -4 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }, eyebrow: { fontFamily: T.font.bold, fontSize: 10, letterSpacing: 1.8, color: "#768474" }, time: { backgroundColor: "#EEF0E3", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, fontFamily: T.font.regular, fontSize: 10, color: "#65785C" }, title: { fontFamily: T.font.black, fontSize: 25, lineHeight: 30, color: T.color.ink, marginTop: 9, marginBottom: 13 },
  primary: { minHeight: 55, borderRadius: 19, backgroundColor: "#476D58", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 12, borderBottomWidth: 4, borderBottomColor: "#335641" }, primaryText: { flexShrink: 1, textAlign: "center", fontFamily: T.font.bold, fontSize: 17, color: "#FFF8E9" }, pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] }, sectionTitle: { fontFamily: T.font.bold, fontSize: 17, color: T.color.ink },
  feelings: { flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "space-between" }, feeling: { alignItems: "center", gap: 5, minWidth: 52, minHeight: 64, paddingVertical: 4, flex: 1 }, feelingLabel: { fontFamily: T.font.bold, fontSize: 11, color: T.color.brown },
  bedtime: { borderRadius: 20, overflow: "hidden" }, bedArt: { minHeight: 96, overflow: "hidden", borderRadius: 20 }, bedShade: { flex: 1, backgroundColor: "#23355490", flexDirection: "row", alignItems: "center", padding: 16, gap: 12 }, bedTitle: { fontFamily: T.font.bold, fontSize: 17, color: "#FFF4DB" }, bedHint: { fontFamily: T.font.regular, fontSize: 12, color: "#E5E5E7", marginTop: 3 },
  doors: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, door: { width: "47%", flexGrow: 1, borderRadius: 22, padding: 17, gap: 6, minHeight: 132 }, doorTitle: { fontFamily: T.font.bold, fontSize: 16, color: T.color.ink }, doorHint: { fontFamily: T.font.regular, fontSize: 12, lineHeight: 17, color: T.color.brown }, journey: { borderWidth: 1, borderColor: "#E5E7D9", borderRadius: 20, padding: 16, gap: 10 }, track: { height: 7, backgroundColor: "#E8EBDD", borderRadius: 5, overflow: "hidden" }, fill: { height: 7, backgroundColor: "#80A576", borderRadius: 5 }, description: { fontFamily: T.font.regular, fontSize: 12, lineHeight: 18, color: "#727666", marginBottom: 4 },
});
