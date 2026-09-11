import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { createRunner, type AvatarEffect, type RunnerState } from "@/engine/lessonRunner";
import { BeatView } from "@/ui/BeatView";
import { isLessonLocked, useEntitlement } from "@/entitlements";
import { useStageInsets } from "@/ui/useStageInsets";
import { stopSpeaking } from "@/audio/voice";
import { track } from "@/backend/events";
import { newlyUnlocked } from "@/store/rewards";
import { LessonTrail } from "@/ui/LessonTrail";
import { StageDecor } from "@/ui/StageDecor";
import { RewardBurst, nextLanternSlot } from "@/ui/RewardBurst";
import { biomeFor } from "@/store/rewards";
import { isNight, sceneById } from "@/store/scenes";

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pack = getPack();
  const lesson = pack.lessons.find((l) => l.id === id);
  const kid = useKid();
  const { premium } = useEntitlement();
  const avatar = useAvatar();
  const { setStage } = useStage();
  const runner = useMemo(
    () => (lesson ? createRunner(pack, lesson, { kidName: kid.kidName || pack.ui.friend, ...kid.facts }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pack, lesson, kid.kidName],
  );
  const [state, setState] = useState<RunnerState | null>(null);
  const onBottomLayout = useStageInsets();

  const apply = (r: { state: RunnerState; effects: AvatarEffect[] }) => {
    for (const e of r.effects) avatar.send(e);
    setStage({ dark: r.state.step.kind === "lights_out" });
    setState(r.state);
  };

  useEffect(() => {
    if (runner && lesson) {
      const scene = sceneById(pack, lesson.scene);
      const night = isNight(scene, kid.profile.bedtimeHour);
      setStage({ biome: scene && scene.id !== "pond" ? scene.background : biomeFor(pack, { beacons: kid.beacons, completed: kid.completed, biomeId: kid.biomeId }), night });
      apply(runner.start());
      void track("lesson_start", { lessonId: lesson?.id, routine: lesson?.routine });
    }
    return () => setStage({ dark: false, night: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner]);

  if (lesson && isLessonLocked(lesson, premium)) return <Redirect href="/parent/gate?next=paywall" />;
  if (!lesson || !runner || !state) return null;

  const finish = () => {
    stopSpeaking();
    const sum = runner.summary();
    void track("lesson_complete", { lessonId: lesson.id, routine: lesson.routine, lanterns: sum.lanterns, durationMs: sum.durationMs });
    if (lesson.routine === "intro") kid.finishIntro();
    const before = { beacons: kid.beacons, completed: kid.completed };
    kid.completeLesson(lesson.routine === "any" ? lesson.id : `${lesson.id}:${new Date().toISOString().slice(0, 10)}`, runner.state.lanternsEarned);
    const after = useKid.getState();
    const unlocks = newlyUnlocked(pack, before, after);
    if (after.beacons > before.beacons || unlocks.length) {
      void track("beacon", { beacons: after.beacons, unlocks });
      router.replace({ pathname: "/beacon", params: { n: String(after.beacons), unlocks: unlocks.join(",") } });
      return;
    }
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
    void track("ask_answer", { lessonId: lesson.id, key, value });
  };

  return (
    <View style={styles.root}>
      <Pressable
        style={styles.close}
        onPress={() => {
          stopSpeaking();
          router.replace("/");
        }}
        hitSlop={8}
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>
      <View style={styles.trail} pointerEvents="none">
        <LessonTrail lesson={lesson} index={Math.min(state.beatIndex, lesson.beats.length - 1)} />
      </View>
      <View style={styles.spacer}>
        <StageDecor night={state.step.kind === "lights_out" || isNight(sceneById(pack, lesson.scene), kid.profile.bedtimeHour)} extraLit={state.lanternsEarned} />
        {state.step.kind === "reward" && <RewardBurst key={state.beatIndex} slot={nextLanternSlot(kid.lanterns + state.lanternsEarned)} />}
      </View>
      <View onLayout={onBottomLayout}>
        <BeatView step={state.step} pack={pack} onNext={next} onAnswer={answer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  trail: { paddingTop: 60 },
  close: { position: "absolute", top: 52, right: 20, zIndex: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 26, color: "#6b4a2b", lineHeight: 30 },
});
