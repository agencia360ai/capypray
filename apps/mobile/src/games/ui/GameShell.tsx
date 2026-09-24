import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import { useAvatar, useStage } from "@/avatar/AvatarView";
import { speak, stopSpeaking } from "@/audio/voice";
import { estimateMs } from "@/engine/lessonRunner";
import { useStageInsets } from "@/ui/useStageInsets";
import { BigButton } from "@/ui/components";
import { CompanionIcon } from "@/ui/CompanionIcon";
import { Confetti } from "@/ui/Confetti";
import { Pop } from "@/ui/motion";
import * as haptics from "@/ui/haptics";
import { T } from "@/ui/theme";

export type GameId = "sort" | "blocks" | "tiles" | "memory";
/** Capy explains each game once per session, not at the start of every level. */
const explained = new Set<string>();

/** Capy says a line and moves his mouth for it; the next line cuts the last one off. */
export function useCapyLine() {
  const avatar = useAvatar();
  useEffect(() => () => stopSpeaking(), []);
  return (line: { text: string; audio?: string }, clip = "talk_a") => {
    const pack = getPack();
    avatar.send({ type: "speak", durationMs: estimateMs(line.text) * 2, clip });
    speak(line.text, { language: pack.locale, audio: line.audio, onDone: () => avatar.send({ type: "idle" }) });
  };
}

/** A little cheer from Capy on a good move, at most every couple of seconds so it never turns into noise. */
export function useCheer() {
  const avatar = useAvatar();
  const last = useRef(0);
  return () => {
    if (Date.now() - last.current < 2200) return;
    last.current = Date.now();
    avatar.send({ type: "play", clip: "clap", loop: false });
  };
}

/**
 * The frame every game shares: back to the corner, the title and level, Capy above the board (the sheet is tall, so
 * the stage keeps him on the grass — see useStageInsets), the how-to line he says on arrival, and the end-of-level
 * card with his reaction. A level that is won saves the next one; a lost one replays the same board.
 */
export function GameShell({ game, level, won, lost, onNext, onRetry, status, children }: { game: GameId; level: number; won: boolean; lost: boolean; onNext: () => void; onRetry: () => void; status?: ReactNode; children: ReactNode }) {
  const pack = getPack(), copy = pack.companion.games!, item = copy.items.find((i) => i.id === game)!;
  const insets = useSafeAreaInsets();
  const { setStage } = useStage();
  const avatar = useAvatar();
  const say = useCapyLine();
  const onLayout = useStageInsets(0.1);
  const [burst, setBurst] = useState(0);
  const [winLine] = useState(() => copy.win[Math.floor(Math.random() * copy.win.length)]!);

  useEffect(() => {
    setStage({ dark: false, night: false });
    avatar.send({ type: "mood", value: "happy" });
    if (explained.has(game)) return;
    const t = setTimeout(() => { explained.add(game); say(item.howTo, "talk_a"); }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatar, game]);
  useEffect(() => {
    if (!won) return;
    void haptics.success();
    setBurst((b) => b + 1);
    say(winLine, "celebrate");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);
  useEffect(() => {
    if (!lost) return;
    void haptics.nope();
    say(copy.again_, "think");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lost]);

  return (
    <View style={s.root}>
      <View style={[s.top, { paddingTop: insets.top + 10 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={pack.companion.ui.back} onPress={() => { stopSpeaking(); router.replace("/games"); }} style={s.round} hitSlop={6}>
          <CompanionIcon name="back" size={24} />
        </Pressable>
        <View style={s.titleBox}>
          <Text style={s.title} numberOfLines={1}>{item.title}</Text>
          <Text style={s.level}>{interpolate(copy.level, { n: String(level) })}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.again} onPress={() => { void haptics.tap(); onRetry(); }} style={s.round} hitSlop={6} testID="game-retry">
          <Text style={s.retry}>↻</Text>
        </Pressable>
      </View>
      <View style={s.stage} pointerEvents="none" />
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 14) }]} onLayout={onLayout}>
        <Text style={s.howTo}>{item.howTo.text}</Text>
        {status}
        <View style={s.board}>{children}</View>
      </View>
      <Confetti trigger={burst} />
      {(won || lost) && (
        <View style={s.overlay} pointerEvents="box-none">
          <Pop style={s.card}>
            <Text style={s.cardTitle}>{won ? winLine.text : copy.again_.text}</Text>
            <BigButton label={won ? copy.next : copy.again} onPress={won ? onNext : onRetry} />
          </Pop>
        </View>
      )}
    </View>
  );
}

/** The level a game is on, and a way to move to the next one. */
export const PALETTE = ["#FF8A5B", "#5FB8B0", "#FFC94D", "#9B8CE8", "#7CC46B", "#F07FB0", "#5B8FE8"];

const s = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18 },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFF9EAEF", alignItems: "center", justifyContent: "center" },
  retry: { fontSize: 24, color: T.color.ink, fontFamily: T.font.black, marginTop: -2 },
  titleBox: { flex: 1, alignItems: "center", backgroundColor: "#FFF9EAEF", borderRadius: 18, paddingVertical: 5 },
  title: { fontFamily: T.font.black, fontSize: 18, color: T.color.ink },
  level: { fontFamily: T.font.bold, fontSize: 12, color: T.color.brown },
  stage: { flex: 1, minHeight: 120 },
  sheet: { backgroundColor: "#FFFBF2", borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 14, paddingHorizontal: 16, gap: 10, ...T.shadow },
  howTo: { fontFamily: T.font.bold, fontSize: 13, lineHeight: 18, color: T.color.brown, textAlign: "center", paddingHorizontal: 12 },
  board: { alignItems: "center" },
  overlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end", padding: 18, paddingBottom: 40 },
  card: { backgroundColor: "#FFFBF2", borderRadius: 28, padding: 20, gap: 14, borderWidth: 3, borderColor: "#F1E2C8", ...T.shadow },
  cardTitle: { fontFamily: T.font.black, fontSize: 21, lineHeight: 27, textAlign: "center", color: T.color.ink },
});
