import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, AppState, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPack } from "@/content/pack";
import { useAvatar } from "@/avatar/AvatarView";
import { speak, type SpeakHandle } from "@/audio/voice";
import { formatCopy } from "@/i18n";
import { speakCapMs } from "@/engine/lessonRunner";
import { CompanionIcon as Icon } from "./CompanionIcon";
import { useReducedMotion } from "./motion";
import { breathingFrame, breathingKeyframes } from "./breathing";
import { T } from "./theme";

type Status = "ready" | "running" | "paused" | "complete";
export function BreathingMoment({ seconds, text, audio, onDone }: { seconds: number; text: string; audio?: string; onDone: () => void }) {
  const pack = getPack(), copy = pack.companion.breathing;
  const avatar = useAvatar(), reduced = useReducedMotion(), { height } = useWindowDimensions(), insets = useSafeAreaInsets();
  const duration = seconds * 1000, compact = height < 700;
  const [status, setStatus] = useState<Status>("ready");
  const [frame, setFrame] = useState(() => breathingFrame(0, duration));
  const elapsed = useRef(new Animated.Value(0)).current;
  const time = useRef(0), finished = useRef(false), narration = useRef<SpeakHandle | null>(null);
  const keyframes = useMemo(() => breathingKeyframes(duration), [duration]);
  const wave = elapsed.interpolate(keyframes);
  useEffect(() => {
    narration.current = speak(text, {
      audio,
      onStart: () => avatar.send({ type: "speak", durationMs: speakCapMs(text), clip: "listen_nod" }),
      onDone: () => avatar.send({ type: "play", clip: "idle_breathe", loop: true }),
    });
    return () => { narration.current?.cancel(); elapsed.stopAnimation(); };
  }, [text, audio, avatar, elapsed]);
  useEffect(() => {
    const listener = elapsed.addListener(({ value }) => {
      time.current = value;
      const next = breathingFrame(value, duration);
      setFrame(previous => previous.inhale === next.inhale && previous.current === next.current && previous.complete === next.complete ? previous : next);
    });
    return () => elapsed.removeListener(listener);
  }, [elapsed, duration]);
  useEffect(() => {
    if (status !== "running") return;
    const animation = Animated.timing(elapsed, { toValue: duration, duration: Math.max(0, duration - time.current), easing: Easing.linear, useNativeDriver: true });
    animation.start(({ finished: ended }) => { if (ended) setStatus("complete"); });
    return () => animation.stop();
  }, [status, elapsed, duration]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => { if (state !== "active") setStatus(current => current === "running" ? "paused" : current); });
    return () => subscription.remove();
  }, []);
  const finish = () => {
    if (finished.current) return;
    finished.current = true; narration.current?.cancel(); elapsed.stopAnimation(); onDone();
  };
  const primary = () => {
    if (status === "complete") { finish(); return; }
    narration.current?.cancel();
    avatar.send({ type: "play", clip: "idle_breathe", loop: true });
    setStatus(status === "running" ? "paused" : "running");
  };
  const phase = status === "ready" ? copy.ready : status === "paused" ? copy.paused : status === "complete" ? copy.complete : frame.inhale ? pack.companion.ui.breatheIn : pack.companion.ui.breatheOut;
  const hint = status === "ready" ? copy.pace : status === "paused" ? copy.pausedHint : status === "complete" ? copy.completeHint : frame.inhale ? copy.inhaleHint : copy.exhaleHint;
  const button = status === "ready" ? copy.start : status === "running" ? copy.pause : status === "paused" ? copy.resume : copy.continue;
  const scale = reduced ? 0.9 : wave.interpolate({ inputRange: [0, 1], outputRange: [0.73, 1] });
  return <ScrollView style={[s.sheet, { maxHeight: height * 0.74 }]} contentContainerStyle={[s.content, compact && s.compact, { paddingBottom: Math.max(insets.bottom, 14) }]} bounces={false}>
    <Text style={s.eyebrow}>{copy.eyebrow}</Text>
    <Text style={s.title}>{copy.title}</Text>
    <Text style={s.intro}>{text}</Text>
    <View style={[s.glowStage, compact && { height: 134 }]} accessible={false} importantForAccessibility="no-hide-descendants">
      <View style={[s.orbit, compact && { width: 124, height: 124 }]} />
      <Animated.View style={[s.halo, compact && { width: 134, height: 134, borderRadius: 67 }, { transform: [{ scale }] }]} />
      <Animated.View testID="breathing-glow" style={[s.glow, compact && { width: 105, height: 105, borderRadius: 53 }, { transform: [{ scale }] }]}>
        <View style={s.seed}><Icon name={status === "complete" ? "check" : "leaf"} size={40} color="#41675D" /></View>
      </Animated.View>
      <View style={[s.spark, { top: 20, right: "29%" }]} /><View style={[s.spark, { bottom: 23, left: "30%", width: 5, height: 5 }]} />
    </View>
    <View style={s.phase} accessibilityLiveRegion="polite">
      <Text style={s.phaseText}>{phase}</Text>
      <Text style={s.hint}>{hint}</Text>
    </View>
    <View style={s.progress}>
      <View style={s.dots} accessible={false}>{Array.from({ length: frame.cycles }, (_, i) => <View key={i} style={[s.dot, i < frame.current - 1 && s.dotDone, i === frame.current - 1 && status !== "ready" && s.dotCurrent, status === "complete" && s.dotDone]} />)}</View>
      <Text style={s.counter}>{formatCopy(copy.progress, { current: status === "complete" ? frame.cycles : frame.current, total: frame.cycles })}</Text>
    </View>
    <View style={s.actions}>
      <Pressable accessibilityRole="button" onPress={primary} style={({ pressed }) => [s.primary, pressed && { opacity: 0.8 }]}><Text style={s.primaryText}>{button}</Text>{status !== "running" && <Icon name={status === "complete" ? "check" : "arrow"} size={22} color="#FFFBEF" />}</Pressable>
      {status !== "complete" && <Pressable accessibilityRole="button" onPress={finish} style={s.finish}><Text style={s.finishText}>{copy.finish}</Text></Pressable>}
    </View>
  </ScrollView>;
}

const s = StyleSheet.create({
  sheet: { backgroundColor: "#FFFCF3", borderTopLeftRadius: 32, borderTopRightRadius: 32 },
  content: { paddingHorizontal: 24, paddingTop: 22, alignItems: "center" }, compact: { paddingTop: 14, paddingHorizontal: 18 },
  eyebrow: { fontFamily: T.font.bold, fontSize: 9, letterSpacing: 2, color: "#7D927D" },
  title: { fontFamily: T.font.black, fontSize: 23, lineHeight: 29, color: "#365D50", textAlign: "center", marginTop: 5 },
  intro: { fontFamily: T.font.regular, fontSize: 13, lineHeight: 19, color: "#728173", textAlign: "center", maxWidth: 350, marginTop: 7 },
  glowStage: { height: 158, width: "100%", alignItems: "center", justifyContent: "center", marginTop: 8 },
  orbit: { position: "absolute", width: 144, height: 144, borderRadius: 80, borderWidth: 1, borderColor: "#D7E4D3" },
  halo: { position: "absolute", width: 156, height: 156, borderRadius: 78, backgroundColor: "#E3EBD9" },
  glow: { width: 126, height: 126, borderRadius: 63, backgroundColor: "#C4D9B7", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#B6CDA9" },
  seed: { width: 65, height: 65, borderRadius: 33, backgroundColor: "#F4F4DC", alignItems: "center", justifyContent: "center" },
  spark: { position: "absolute", width: 7, height: 7, borderRadius: 4, backgroundColor: "#EAC876" },
  phase: { minHeight: 53, alignItems: "center", justifyContent: "center" }, phaseText: { fontFamily: T.font.black, fontSize: 21, lineHeight: 27, textAlign: "center", color: "#365D50" },
  hint: { fontFamily: T.font.regular, fontSize: 12, lineHeight: 18, color: "#7A8878", textAlign: "center", marginTop: 3 },
  progress: { alignItems: "center", gap: 5, paddingVertical: 10 }, dots: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#E1E6D8" }, dotCurrent: { backgroundColor: "#A0BC91", width: 18 }, dotDone: { backgroundColor: "#507561" },
  counter: { fontFamily: T.font.bold, fontSize: 10, color: "#879080" },
  actions: { width: "100%", flexDirection: "row", gap: 8, alignItems: "center", marginTop: 2 },
  primary: { flex: 1, minHeight: 48, borderRadius: 17, backgroundColor: "#456C58", paddingHorizontal: 15, paddingVertical: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  primaryText: { fontFamily: T.font.bold, fontSize: 15, color: "#FFFBEF", textAlign: "center", flexShrink: 1 },
  finish: { minHeight: 48, paddingHorizontal: 13, justifyContent: "center", alignItems: "center" }, finishText: { fontFamily: T.font.bold, fontSize: 13, color: "#6C806D" },
});
