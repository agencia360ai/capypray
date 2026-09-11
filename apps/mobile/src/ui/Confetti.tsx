import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "./motion";

// Lightweight celebration burst (no native deps): 18 emoji particles fly up and fall.
const PIECES = ["🏮", "⭐", "✨", "🌼", "💛"];

export function Confetti({ trigger, count = 18 }: { trigger: number; count?: number }) {
  const reduced = useReducedMotion();
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (Math.random() - 0.5) * 320,
        peak: -220 - Math.random() * 180,
        rot: (Math.random() - 0.5) * 720,
        delay: Math.random() * 180,
        glyph: PIECES[i % PIECES.length]!,
        size: 22 + Math.random() * 16,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger],
  );
  useEffect(() => {
    if (!trigger || reduced) return;
    anims.forEach((a, i) => {
      a.setValue(0);
      Animated.timing(a, { toValue: 1, duration: 1300 + Math.random() * 400, delay: seeds[i]!.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
    return () => anims.forEach(a => a.stopAnimation());
  }, [trigger, anims, seeds, reduced]);
  if (!trigger || reduced) return null;
  return (
    <View pointerEvents="none" style={styles.layer}>
      {anims.map((a, i) => {
        const s = seeds[i]!;
        const ty = a.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, s.peak, 120] });
        const tx = a.interpolate({ inputRange: [0, 1], outputRange: [0, s.x] });
        const rot = a.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${s.rot}deg`] });
        const op = a.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
        return (
          <Animated.Text key={`${trigger}-${i}`} style={[styles.piece, { fontSize: s.size, opacity: op, transform: [{ translateX: tx }, { translateY: ty }, { rotate: rot }] }]}>
            {s.glyph}
          </Animated.Text>
        );
      })}
      <Text style={styles.hidden}> </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, right: 0, top: "45%", alignItems: "center", zIndex: 30 },
  piece: { position: "absolute" },
  hidden: { opacity: 0 },
});
