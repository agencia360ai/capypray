import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { createRunner, type AvatarEffect, type RunnerState } from "@/engine/lessonRunner";
import { BeatView } from "@/ui/BeatView";
import { isLessonLocked, useEntitlement } from "@/entitlements";

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pack = getPack();
  const lesson = pack.lessons.find((l) => l.id === id);
  const kid = useKid();
  const { premium } = useEntitlement();
  const avatar = useAvatar();
  const { setStage } = useStage();
  const runner = useMemo(
    () => (lesson ? createRunner(pack, lesson, { kidName: kid.kidName || "friend", ...kid.facts }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pack, lesson, kid.kidName],
  );
  const [state, setState] = useState<RunnerState | null>(null);

  const apply = (r: { state: RunnerState; effects: AvatarEffect[] }) => {
    for (const e of r.effects) avatar.send(e);
    setStage({ dark: r.state.step.kind === "lights_out" });
    setState(r.state);
  };

  useEffect(() => {
    if (runner) apply(runner.start());
    return () => setStage({ dark: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner]);

  if (lesson && isLessonLocked(lesson, premium)) return <Redirect href="/parent/gate?next=paywall" />;
  if (!lesson || !runner || !state) return null;

  const finish = () => {
    if (lesson.routine === "intro") kid.finishIntro();
    kid.completeLesson(lesson.routine === "any" ? lesson.id : `${lesson.id}:${new Date().toISOString().slice(0, 10)}`, runner.state.lanternsEarned);
    router.replace("/");
  };

  const next = () => {
    const r = runner.next();
    apply(r);
    if (r.state.step.kind === "done") finish();
  };

  const answer = (key: string, value: string) => {
    runner.answer(key as never, value);
    kid.setFact(key, value); // Capy remembers across sessions
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.close} onPress={() => router.replace("/")} hitSlop={8}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
      <View style={styles.spacer} />
      <BeatView step={state.step} pack={pack} onNext={next} onAnswer={answer} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  close: { position: "absolute", top: 52, right: 20, zIndex: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 26, color: "#6b4a2b", lineHeight: 30 },
});
