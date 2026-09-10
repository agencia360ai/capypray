import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { Lesson } from "@capy/content";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { createRunner, type AvatarEffect, type RunnerState } from "@/engine/lessonRunner";
import { BeatView } from "@/ui/BeatView";
import { useStageInsets } from "@/ui/useStageInsets";
import { stopSpeaking } from "@/audio/voice";
import { track } from "@/backend/events";
import { T } from "@/ui/theme";

// Replay one story from the shelf: a tiny synthetic lesson (say → story → say) with no lantern.
export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pack = getPack();
  const story = pack.stories.find((s) => s.id === id);
  const kid = useKid();
  const avatar = useAvatar();
  const { setStage } = useStage();
  const onBottomLayout = useStageInsets();
  const lesson = useMemo<Lesson | null>(
    () =>
      story
        ? {
            id: `story-${story.id}`,
            skillId: pack.skills[0]!.id,
            title: story.title,
            free: true,
            routine: "any",
            beats: [{ type: "avatar_say", clip: "wave_hello", text: story.title, mood: "happy" }, { type: "story", storyId: story.id }, { type: "reward", lantern: 1 }],
          }
        : null,
    [story, pack],
  );
  const runner = useMemo(() => (lesson ? createRunner(pack, lesson, { kidName: kid.kidName || pack.ui.friend, ...kid.facts }) : null), [pack, lesson, kid.kidName, kid.facts]);
  const [state, setState] = useState<RunnerState | null>(null);
  const apply = (r: { state: RunnerState; effects: AvatarEffect[] }) => {
    for (const e of r.effects) avatar.send(e);
    setState(r.state);
  };
  useEffect(() => {
    if (runner) {
      setStage({ dark: false });
      apply(runner.start());
      void track("story_replay", { storyId: id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner]);
  if (!story || !runner || !state) return null;
  const next = () => {
    const r = runner.next();
    // the reward beat is only there to satisfy the schema; leave before it shows
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
      <View style={styles.spacer} />
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

