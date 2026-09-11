import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { gate } from "@/parent/gate";
import { getCopy, formatCopy, formatHour } from "@/i18n";
import { CompanionIcon as Icon } from "@/ui/CompanionIcon";
import { Reveal } from "@/ui/motion";
import { useStageInsets } from "@/ui/useStageInsets";
import { T } from "@/ui/theme";

export default function Onboarding() {
  const onboarded = useKid(s => s.onboarded);
  if (onboarded && !gate.isOpen()) return <Redirect href="/" />;
  return <Welcome />;
}
function Welcome() {
  const pack = getPack(), copy = getCopy(pack.locale).onboarding, kid = useKid();
  const avatar = useAvatar(), { setStage } = useStage(), insets = useSafeAreaInsets();
  const [step, setStep] = useState(0), [name, setName] = useState(kid.kidName), [hour, setHour] = useState(kid.profile.bedtimeHour);
  const onLayout = useStageInsets(0.12);
  useEffect(() => {
    setStage({ biome: "meadow", night: false, dark: false });
    avatar.send({ type: "idle" }); avatar.send({ type: "mood", value: "happy" });
    avatar.send({ type: "play", clip: step === 2 ? "yawn" : step === 0 ? "wave_hello" : "heart" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar, step]);
  const next = () => {
    if (step < 3) { setStep(step + 1); return; }
    kid.setKidName(name); kid.setProfile({ ageBand: pack.ageBand, tradition: pack.tradition, bedtimeHour: hour }); kid.finishOnboarding(); gate.close();
    router.replace({ pathname: "/lesson/[id]", params: { id: pack.routines.intro!.lessonId } });
  };
  const titles = [copy.welcomeTitle, copy.nameTitle, copy.rhythmTitle, copy.readyTitle], bodies = [copy.welcomeBody, copy.nameBody, copy.rhythmBody, copy.readyBody];
  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={[s.top, { paddingTop: insets.top + 16 }]}><Text style={s.brand}>{pack.companion.ui.brand}</Text><View style={s.dots} accessibilityLabel={formatCopy(copy.step, { current: step + 1, total: 4 })}>{[0, 1, 2, 3].map(i => <View key={i} style={[s.dot, i <= step && s.dotOn]} />)}</View></View>
    <View style={s.stage} />
    <View onLayout={onLayout} style={s.sheet}><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.content}><Reveal key={step}>
      <Text style={s.eyebrow}>{step === 3 ? copy.familyPlan : copy.eyebrow}</Text><Text accessibilityRole="header" style={s.title}>{titles[step]}</Text><Text style={s.body}>{bodies[step]}</Text>
      {step === 0 && <View style={s.benefits}>{[["moon", copy.benefitCalm], ["heart", copy.benefitPrayer], ["leaf", copy.benefitGrow]].map(([icon, text]) => <View key={icon} style={s.benefit}><Icon name={icon!} size={31} /><Text style={s.benefitText}>{text}</Text></View>)}</View>}
      {step === 1 && <><Text style={s.label}>{copy.nameLabel}</Text><TextInput autoComplete="off" accessibilityLabel={copy.nameLabel} value={name} onChangeText={setName} placeholder={copy.namePlaceholder} placeholderTextColor="#8F9588" maxLength={20} style={s.input} returnKeyType="next" onSubmitEditing={next} /><Text style={s.note}>{copy.editLater}</Text></>}
      {step === 2 && <><View style={s.hours}>{[18, 19, 20, 21].map(h => <Pressable key={h} accessibilityRole="radio" accessibilityState={{ checked: h === hour }} onPress={() => setHour(h)} style={[s.hour, h === hour && s.hourOn]}><Icon name="moon" size={25} /><Text style={s.hourText}>{formatHour(h, pack.locale)}</Text></Pressable>)}</View><Text style={s.note}>{copy.rhythmNote}</Text></>}
      {step === 3 && <View style={s.plan}><Icon name="leaf" size={36} /><View style={{ flex: 1 }}><Text style={s.planTitle}>{copy.readyDetail}</Text><Text style={s.note}>{formatCopy(copy.timeLabel, { time: formatHour(hour, pack.locale) })}</Text></View></View>}
    </Reveal></ScrollView>
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 18) }]}><Pressable accessibilityRole="button" onPress={next} style={({ pressed }) => [s.cta, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}><Text style={s.ctaText}>{step === 0 ? copy.start : step === 3 ? copy.finish : copy.next}</Text><Icon name="arrow" size={23} color="#FFF8EA" /></Pressable>
        {step > 0 ? <Pressable accessibilityRole="button" onPress={() => setStep(step - 1)} style={s.back}><Text style={s.backText}>{copy.back}</Text></Pressable> : <Text style={s.note}>{copy.parentNote}</Text>}{step === 0 && <Text style={s.trust}>{copy.trust}</Text>}
      </View>
    </View>
  </KeyboardAvoidingView>;
}
const s = StyleSheet.create({
  root: { flex: 1 }, top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24 }, brand: { fontFamily: T.font.black, fontSize: 22, color: T.color.ink }, dots: { flexDirection: "row", gap: 6 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#D5D8B9" }, dotOn: { width: 19, backgroundColor: "#50745C" }, stage: { flex: 1, minHeight: 130 },
  sheet: { maxHeight: "62%", backgroundColor: "#FFFBF2", borderTopLeftRadius: 34, borderTopRightRadius: 34, ...T.shadow }, content: { paddingHorizontal: 26, paddingTop: 28, paddingBottom: 10 }, eyebrow: { fontFamily: T.font.bold, fontSize: 9, letterSpacing: 1.8, color: "#75866C", textAlign: "center" }, title: { fontFamily: T.font.black, fontSize: 31, lineHeight: 36, textAlign: "center", color: T.color.ink, marginVertical: 12 }, body: { fontFamily: T.font.regular, fontSize: 15, lineHeight: 23, textAlign: "center", color: "#727462" },
  benefits: { flexDirection: "row", gap: 12, marginTop: 24, marginBottom: 6 }, benefit: { flex: 1, alignItems: "center", gap: 8 }, benefitText: { fontFamily: T.font.bold, fontSize: 11, textAlign: "center", lineHeight: 16, color: T.color.brown }, label: { fontFamily: T.font.bold, fontSize: 12, color: T.color.brown, marginTop: 24, marginBottom: 8 }, input: { minHeight: 58, borderWidth: 2, borderColor: "#D9DFC9", borderRadius: 18, backgroundColor: "white", padding: 16, fontFamily: T.font.bold, fontSize: 18, color: T.color.ink },
  hours: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 20 }, hour: { width: "47%", flexGrow: 1, minHeight: 62, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9, borderRadius: 18, borderWidth: 2, borderColor: "#EBE8DA", backgroundColor: "white" }, hourOn: { backgroundColor: "#EDF2E5", borderColor: "#70916A" }, hourText: { fontFamily: T.font.bold, color: T.color.ink, fontSize: 15 }, footer: { paddingHorizontal: 26, paddingTop: 14, gap: 8 },
  cta: { minHeight: 57, flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center", padding: 14, borderRadius: 20, backgroundColor: "#476D58", borderBottomWidth: 4, borderBottomColor: "#345340" }, ctaText: { fontFamily: T.font.bold, fontSize: 18, color: "#FFF8EA", flexShrink: 1, textAlign: "center" }, back: { alignItems: "center", justifyContent: "center", minHeight: 44 }, backText: { fontFamily: T.font.bold, fontSize: 14, color: T.color.brown }, note: { fontFamily: T.font.regular, fontSize: 11, lineHeight: 17, textAlign: "center", color: "#747D6A", marginTop: 8 }, trust: { fontFamily: T.font.regular, fontSize: 10, textAlign: "center", color: "#878C7C" }, plan: { marginTop: 22, padding: 18, flexDirection: "row", gap: 14, backgroundColor: "#EEF2E5", borderRadius: 20, alignItems: "center" }, planTitle: { fontFamily: T.font.bold, fontSize: 14, lineHeight: 21, color: T.color.ink },
});
