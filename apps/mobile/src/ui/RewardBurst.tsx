import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { Lantern, Sparkle } from "./art";
import * as haptics from "./haptics";
import { LANTERN_SLOTS, lanternSlot } from "./StageDecor";
import { useReducedMotion } from "./motion";

// The lantern moment (GDD §4.1 "se enciende 1 linterna en el Estanque"): a big unlit lantern rises in front of Capy,
// lights up with a glow ring, then floats to its slot on the pond so the kid sees today's prayer join the week's.
// Pure Animated, native driver; ~3.4 s. Lives in the stage area (LessonScreen), same coordinates as StageDecor.
export const REWARD_BURST_MS = 3400;

export function RewardBurst({ slot, onLit }: { slot: number; onLit?: () => void }) {
  const reduced = useReducedMotion();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const rise = useRef(new Animated.Value(0)).current; // 0 → 1: scale in
  const glow = useRef(new Animated.Value(0)).current; // ring pulse
  const fly = useRef(new Animated.Value(0)).current; // 0 = centre, 1 = slot
  const [lit, setLit] = useState(false);
  const sparks = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * Math.PI * 2, r: 58 + (i % 2) * 22 })), []);

  useEffect(() => {
    if (!size.width) return;
    if (reduced) { rise.setValue(1); fly.setValue(1); glow.setValue(1); setLit(true); return; }
    const animation = Animated.sequence([
      Animated.spring(rise, { toValue: 1, useNativeDriver: true, friction: 5, tension: 90 }),
      Animated.delay(250),
    ]);
    animation.start(({ finished }) => {
      if (!finished) return;
      setLit(true);
      onLit?.();
      void haptics.success();
      Animated.parallel([
        Animated.timing(glow, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([Animated.delay(650), Animated.timing(fly, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })]),
      ]).start();
    });
    return () => { animation.stop(); rise.stopAnimation(); glow.stopAnimation(); fly.stopAnimation(); };
  }, [size.width, rise, glow, fly, onLit, reduced]);

  const target = lanternSlot(slot);
  // centre of the stage → the slot: StageDecor draws slot lanterns at left 50%+x·100%, bottom y (lantern ~24px)
  const startBottom = size.height * 0.42;
  const dx = target.x * size.width;
  const dy = startBottom + 34 - target.y; // burst lantern centre (64px art) → slot lantern centre (~24px art)
  const tx = fly.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const ty = fly.interpolate({ inputRange: [0, 1], outputRange: [0, dy] });
  const shrink = fly.interpolate({ inputRange: [0, 1], outputRange: [1, 0.36] });
  const ringScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] });
  const ringOpacity = glow.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.9, 0] });

  return (
    <View pointerEvents="none" style={styles.layer} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      {size.width > 0 && (
        <Animated.View style={[styles.lantern, { bottom: startBottom, transform: [{ translateX: tx }, { translateY: ty }, { scale: Animated.multiply(rise, shrink) }] }]}>
          <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
          {lit &&
            sparks.map((sp, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.spark,
                  {
                    opacity: ringOpacity,
                    transform: [{ translateX: glow.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(sp.a) * sp.r] }) }, { translateY: glow.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(sp.a) * sp.r] }) }],
                  },
                ]}
              >
                <Sparkle size={18} color="#FFD27A" />
              </Animated.View>
            ))}
          <Lantern size={64} lit={lit} />
        </Animated.View>
      )}
    </View>
  );
}

/** Slot index the next lantern lands in (0-based within the week). */
export const nextLanternSlot = (lanternsSoFar: number) => lanternsSoFar % LANTERN_SLOTS.length;

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  lantern: { position: "absolute", left: "50%", marginLeft: -51, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 90, height: 90, borderRadius: 45, borderWidth: 6, borderColor: "#FFD27A" },
  spark: { position: "absolute" },
});
