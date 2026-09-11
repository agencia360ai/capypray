import { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useKid } from "@/store/kid";
import { Lantern, Sparkle } from "./art";

// Living pond: this week's lit lanterns float beside Capy (GDD §4.1 "se enciende 1 linterna en el Estanque"),
// fireflies drift at night. Pure Animated, no native deps.
/** Where the week's 7 lanterns float: x as a fraction of the stage width from the centre, y from the bottom (px). */
export const LANTERN_SLOTS = [-0.44, 0.44, -0.3, 0.3, -0.18, 0.18, 0] as const;
export const lanternSlot = (i: number) => ({ x: LANTERN_SLOTS[i % LANTERN_SLOTS.length]!, y: 12 + (i % 3) * 14 });

/** `extraLit`: lanterns earned in the running lesson (not yet saved) so the one that just flew in stays lit. */
export function StageDecor({ night, extraLit = 0 }: { night?: boolean; extraLit?: number }) {
  const lanterns = useKid((s) => s.lanterns);
  const lit = (lanterns % 7) + extraLit;
  const slots = useMemo(() => [...LANTERN_SLOTS], []);
  return (
    <View pointerEvents="none" style={styles.layer}>
      {slots.map((x, i) => (
        <Float key={i} x={x} y={lanternSlot(i).y} delay={i * 380} amp={5 + (i % 2) * 3}>
          <Lantern size={22 + (i % 2) * 4} lit={i < lit} />
        </Float>
      ))}
      {night && [0.12, 0.35, 0.6, 0.8, 0.25, 0.7].map((x, i) => <Firefly key={`f${i}`} x={x} top={40 + i * 36} delay={i * 700} />)}
    </View>
  );
}

function Float({ children, x, y, delay, amp }: { children: React.ReactNode; x: number; y: number; delay: number; amp: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.View style={[styles.float, { left: `${50 + x * 100}%`, bottom: y, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ["-4deg", "4deg"] }) }] }]}>
      {children}
    </Animated.View>
  );
}

function Firefly({ x, top, delay }: { x: number; top: number; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return (
    <Animated.View style={[styles.firefly, { left: `${x * 100}%`, top, opacity: v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.1, 1, 0.2] }), transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -30] }) }] }]}>
      <Sparkle size={16} color="#FFF1B8" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0 },
  float: { position: "absolute", marginLeft: -20 },
  firefly: { position: "absolute" },
});
