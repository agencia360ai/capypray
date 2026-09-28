import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { getPack } from "@/content/pack";
import { glyph } from "@/ui/icons";
import * as haptics from "@/ui/haptics";
import { useReducedMotion } from "@/ui/motion";
import { memoryCols, memoryLevel } from "../memory";
import { GameShell, useCheer } from "./GameShell";

export function MemoryGame({ level, onWin }: { level: number; onWin: () => void }) {
  const pieces = getPack().companion.games!.pieces;
  const deck = useMemo(() => memoryLevel(level, pieces.length), [level, pieces.length]);
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [shake, setShake] = useState<{ tick: number; at: number[] }>({ tick: 0, at: [] });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const nudge = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reduced = useReducedMotion();
  const cheer = useCheer();
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(nudge.current); }, []);
  const won = found.size === deck.length;
  const cols = memoryCols(deck.length);
  const width = Math.min(useWindowDimensions().width, 600) - 32;
  const size = Math.min(92, Math.floor((width - (cols - 1) * 10) / cols));

  const flip = (i: number) => {
    if (open.length >= 2 || open.includes(i) || found.has(deck[i]!.id)) return;
    void haptics.tap();
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    const [a, b] = next.map((k) => deck[k]!);
    if (a!.kind === b!.kind) {
      timer.current = setTimeout(() => { setFound((f) => new Set([...f, a!.id, b!.id])); setOpen([]); cheer(); void haptics.success(); }, 350);
    } else {
      // let the child see both cards, then a soft "not quite" shiver before they turn back
      nudge.current = setTimeout(() => { setShake((s) => ({ tick: s.tick + 1, at: next })); void haptics.tap(); }, 340);
      timer.current = setTimeout(() => setOpen([]), 950);
    }
  };
  const retry = () => { clearTimeout(timer.current); clearTimeout(nudge.current); setOpen([]); setFound(new Set()); setShake({ tick: 0, at: [] }); };

  return (
    <GameShell game="memory" level={level} won={won} lost={false} onNext={onWin} onRetry={retry}>
      <View style={[s.grid, { width: cols * size + (cols - 1) * 10 }]}>
        {deck.map((card, i) => (
          <MemoryCard key={card.id} testID={`card-${i}`} size={size} front={glyph(pieces[card.kind])}
            up={open.includes(i) || found.has(card.id)} matched={found.has(card.id)}
            shakeTick={shake.at.includes(i) ? shake.tick : 0} reduced={reduced} onPress={() => flip(i)} />
        ))}
      </View>
    </GameShell>
  );
}

/** One pond card: flips over its edge, pulses with a sparkle when its pair is found, shivers gently on a miss. */
function MemoryCard({ up, matched, size, front, onPress, testID, shakeTick, reduced }: { up: boolean; matched: boolean; size: number; front: string; onPress: () => void; testID: string; shakeTick: number; reduced: boolean }) {
  const turn = useRef(new Animated.Value(up ? 1 : 0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const shift = useRef(new Animated.Value(0)).current;
  const spark = useRef(new Animated.Value(0)).current;
  const [face, setFace] = useState(up);
  const prevUp = useRef(up);
  const prevMatched = useRef(matched);

  useEffect(() => {
    if (up === prevUp.current) return;
    prevUp.current = up;
    if (reduced) { turn.setValue(up ? 1 : 0); setFace(up); return; }
    Animated.timing(turn, { toValue: 0.5, duration: 90, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setFace(up);
      Animated.timing(turn, { toValue: up ? 1 : 0, duration: 110, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
  }, [up, reduced, turn]);

  useEffect(() => {
    if (matched === prevMatched.current) return;
    prevMatched.current = matched;
    if (!matched || reduced) return;
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.14, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    spark.setValue(0);
    Animated.timing(spark, { toValue: 1, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [matched, reduced, pulse, spark]);

  useEffect(() => {
    if (!shakeTick || reduced) return;
    Animated.sequence([
      Animated.timing(shift, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shift, { toValue: 4, duration: 70, useNativeDriver: true }),
      Animated.timing(shift, { toValue: -3, duration: 60, useNativeDriver: true }),
      Animated.timing(shift, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  }, [shakeTick, reduced, shift]);

  const fold = turn.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0, 1] });
  return (
    <Animated.View style={{ transform: [{ translateX: shift }, { scale: pulse }] }}>
      <Pressable onPress={onPress} accessibilityRole="button" testID={testID}>
        <Animated.View style={[s.card, { width: size, height: size * 1.12, transform: [{ scaleX: fold }] }, face ? s.up : s.down, matched && s.found]}>
          <Text style={{ fontSize: size * 0.48 }}>{face ? front : "🌿"}</Text>
        </Animated.View>
      </Pressable>
      <Animated.Text pointerEvents="none" style={{ position: "absolute", top: -6, right: -4, fontSize: 18, opacity: spark.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateY: spark.interpolate({ inputRange: [0, 1], outputRange: [0, -12] }) }] }}>✨</Animated.Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingVertical: 12, justifyContent: "center" },
  card: { borderRadius: 18, alignItems: "center", justifyContent: "center", borderBottomWidth: 4 },
  down: { backgroundColor: "#7DB38A", borderBottomColor: "#5A8F68" },
  up: { backgroundColor: "#FFFFFF", borderBottomColor: "#E6D8BE" },
  found: { backgroundColor: "#F3F8EC", opacity: 0.75 },
});
