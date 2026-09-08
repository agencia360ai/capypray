import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar } from "@/avatar/AvatarView";
import { createRunner, type AvatarEffect, type RunnerState } from "@/engine/lessonRunner";
import { BeatView } from "@/ui/BeatView";

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pack = getPack();
  const lesson = pack.lessons.find((l) => l.id === id);
  const kid = useKid();
  const avatar = useAvatar();
  const runner = useMemo(() => (lesson ? createRunner(pack, lesson, { kidName: kid.kidName || "friend" }) : null), [pack, lesson, kid.kidName]);
  const [state, setState] = useState<RunnerState | null>(null);

  const apply = (r: { state: RunnerState; effects: AvatarEffect[] }) => {
    for (const e of r.effects) avatar.send(e);
    setState(r.state);
  };

  useEffect(() => {
    if (runner) apply(runner.start());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner]);

  if (!lesson || !runner || !state) return null;

  const next = () => {
    const r = runner.next();
    apply(r);
    if (r.state.step.kind === "done") {
      kid.completeLesson(lesson.id, r.state.lanternsEarned);
      router.back();
    }
  };

  return (
    <View style={styles.root}>
      <Pressable style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
      <View style={styles.spacer} />
      <BeatView step={state.step} pack={pack} onNext={next} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  close: { position: "absolute", top: 48, right: 20, zIndex: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 26, color: "#6b4a2b", lineHeight: 30 },
});
