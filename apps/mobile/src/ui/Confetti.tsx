import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useReducedMotion } from "./motion";

// Celebration burst (no native deps). Two kinds of particles sell the magic: a fast ring that explodes outward and
// hangs, and late soft sparkles that drift down swaying. A warm flash opens the burst so it reads as one event.
const BURST = ["🏮", "⭐", "🌼", "💛", "🌟"];
const DRIFT = ["✨", "⭐", "✨", "💛", "✨"];

export function Confetti({ trigger, count = 18 }: { trigger: number; count?: number }) {
  const reduced = useReducedMotion();
  const anims = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  const flash = useRef(new Animated.Value(0)).current;
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const burst = i % 3 !== 2; // two thirds explode, one third floats in late
        const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
        const radius = burst ? 110 + Math.random() * 130 : 40 + Math.random() * 70;
        return {
          x: Math.cos(angle) * radius * 1.2,
          peak: -Math.sin(angle) * radius - 50 - Math.random() * 90,
          fall: 230 + Math.random() * 170,
          sway: (Math.random() - 0.5) * 48,
          rot: (Math.random() - 0.5) * 260,
          delay: burst ? Math.random() * 60 : 120 + Math.random() * 240,
          duration: burst ? 1500 + Math.random() * 500 : 1800 + Math.random() * 450,
          glyph: (burst ? BURST : DRIFT)[i % 5]!,
          size: burst ? 19 + Math.random() * 14 : 13 + Math.random() * 9,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trigger, count],
  );
  useEffect(() => {
    if (!trigger || reduced) return;
    flash.setValue(0);
    Animated.timing(flash, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    anims.forEach((a, i) => {
      a.setValue(0);
      Animated.timing(a, { toValue: 1, duration: seeds[i]!.duration, delay: seeds[i]!.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
    return () => { flash.stopAnimation(); anims.forEach(a => a.stopAnimation()); };
  }, [trigger, anims, seeds, flash, reduced]);
  if (!trigger || reduced) return null;
  return (
    <View pointerEvents="none" style={styles.layer}>
      <Animated.View style={[styles.flash, {
        opacity: flash.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.75, 0.3, 0] }),
        transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.3, 2.3] }) }],
      }]} />
      {anims.map((a, i) => {
        const s = seeds[i]!;
        // linear-in-progress keyframes + out-easing: a snappy rise, a hang, then a slow floating fall
        const ty = a.interpolate({ inputRange: [0, 0.26, 0.55, 1], outputRange: [0, s.peak, s.peak + 36, s.peak + s.fall] });
        const tx = a.interpolate({ inputRange: [0, 0.26, 0.55, 0.85, 1], outputRange: [0, s.x, s.x + s.sway, s.x - s.sway * 0.6, s.x - s.sway * 0.7] });
        const rot = a.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${s.rot}deg`] });
        const op = a.interpolate({ inputRange: [0, 0.05, 0.6, 0.92, 1], outputRange: [0, 1, 1, 0, 0] });
        const scale = a.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0.2, 1.15, 1, 0.7] });
        return (
          <Animated.Text key={`${trigger}-${i}`} style={[styles.piece, { fontSize: s.size, opacity: op, transform: [{ translateX: tx }, { translateY: ty }, { rotate: rot }, { scale }] }]}>
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
  flash: { position: "absolute", width: 150, height: 150, marginTop: -75, borderRadius: 75, backgroundColor: "#FFE9A8" },
  hidden: { opacity: 0 },
});
