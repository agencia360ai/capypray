import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { Lesson } from "@capy/content";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { biomeFor } from "@/store/rewards";
import { isNight, sceneById } from "@/store/scenes";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { createRunner, type AvatarEffect, type RunnerState } from "@/engine/lessonRunner";
import { BeatView } from "@/ui/BeatView";
import { StageDecor } from "@/ui/StageDecor";
import { T } from "@/ui/theme";
import { useStageInsets } from "@/ui/useStageInsets";
import { stopSpeaking } from "@/audio/voice";
import { track } from "@/backend/events";

// Visit a place: Capy goes there (background + day/night) and prays that place's prayer with the kid.
export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pack = getPack();
  const scene = sceneById(pack, id);
  const kid = useKid();
  const avatar = useAvatar();
  const { setStage } = useStage();
  const onBottomLayout = useStageInsets();
  const night = isNight(scene, kid.profile.bedtimeHour);
  const lesson = useMemo<Lesson | null>(() => {
    if (!scene) return null;
    const prayer = pack.prayers.find((p) => p.id === scene.prayerId);
    return {
      id: `place-${scene.id}`,
      skillId: prayer?.skillId ?? pack.skills[0]!.id,
      title: scene.title,
      free: true,
      routine: "any",
      scene: scene.id,
      beats: [
        { type: "avatar_say", clip: "wave_hello", text: scene.title, mood: "happy" },
        ...(prayer ? [{ type: "repeat_after_me" as const, prayerId: prayer.id, clip: "pray_hands" as const }] : []),
        { type: "listen_timer", seconds: 15, text: pack.ui.nudgeRepeat, clip: "kneel_pray" },
        { type: "reward", lantern: 1 },
      ],
    };
  }, [scene, pack]);
  const runner = useMemo(() => (lesson ? createRunner(pack, lesson, { kidName: kid.kidName || pack.ui.friend, ...kid.facts }) : null), [pack, lesson, kid.kidName, kid.facts]);
  const [state, setState] = useState<RunnerState | null>(null);
  const apply = (r: { state: RunnerState; effects: AvatarEffect[] }) => {
    for (const e of r.effects) avatar.send(e);
    setState(r.state);
  };
  useEffect(() => {
    if (runner && scene) {
      setStage({ biome: scene.id === "pond" ? biomeFor(pack, { beacons: kid.beacons, completed: kid.completed, biomeId: kid.biomeId }) : scene.background, night, dark: false });
      apply(runner.start());
      void track("place_visit", { sceneId: scene.id, night });
    }
    return () => setStage({ night: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner]);
  if (!scene || !runner || !state) return null;
  const next = () => {
    const r = runner.next();
    if (r.state.step.kind === "reward" || r.state.step.kind === "done") {
      stopSpeaking();
      router.back();
      return;
    }
    apply(r);
  };
  return (
    <View style={styles.root}>
      <Pressable
        style={styles.close}
        onPress={() => {
          stopSpeaking();
          router.back();
        }}
        hitSlop={8}
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>
      <View style={styles.spacer}>
        <StageDecor night={night} />
      </View>
      <View onLayout={onBottomLayout}>
        <BeatView step={state.step} pack={pack} onNext={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spacer: { flex: 1 },
  close: { position: "absolute", top: 52, right: 20, zIndex: 2, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.85)", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 26, color: T.color.brown, lineHeight: 30 },
});
