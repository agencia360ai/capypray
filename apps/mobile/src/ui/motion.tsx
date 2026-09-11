import { useEffect, useRef, useState, type PropsWithChildren } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

// Default to "motion allowed": assuming reduced=true first, then flipping to false after the async check, painted the
// element visible for a frame and only then started the fade (a blink). false first means the very first frame is
// already the start of the fade; the async check still snaps reduce-motion users to no-animation right after.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

export function Reveal({ children, style, delay = 0 }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; delay?: number }>) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current; // start hidden so the first frame is the fade's start, not a flash
  useEffect(() => {
    if (reduced) { value.setValue(1); return; }
    value.setValue(0);
    const animation = Animated.timing(value, { toValue: 1, duration: 420, delay: Math.min(delay, 240), easing: Easing.out(Easing.quad), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reduced, value, delay]);
  return <Animated.View style={[style, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}>{children}</Animated.View>;
}

/** A control fades in gently — pure opacity, slow, no scale — staggered by `delay` (ms). */
export function Pop({ children, style, delay = 0 }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; delay?: number }>) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current; // start hidden so the first frame is the fade's start, not a flash
  useEffect(() => {
    if (reduced) { value.setValue(1); return; }
    value.setValue(0);
    const animation = Animated.timing(value, { toValue: 1, delay: Math.min(delay, 480), duration: 460, easing: Easing.out(Easing.quad), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [reduced, value, delay]);
  return <Animated.View style={[style, { opacity: value }]}>{children}</Animated.View>;
}

/**
 * A Pressable that eases down softly while pressed and, once `selected`, breathes with a slow low pulse
 * (a radio/option that stays picked). `style` is the outer layout (width, flex); `inner` is the visual box.
 */
export function Bouncy({ children, selected, style, inner, onPress, ...rest }: PropsWithChildren<Omit<PressableProps, "style" | "onPress"> & { selected?: boolean; style?: StyleProp<ViewStyle>; inner?: StyleProp<ViewStyle>; onPress?: () => void }>) {
  const reduced = useReducedMotion();
  const press = useRef(new Animated.Value(1)).current; // gentle press / release
  const breath = useRef(new Animated.Value(1)).current; // slow pulse while selected
  const soft = (to: number) => Animated.spring(press, { toValue: to, useNativeDriver: true, friction: 8, tension: 70 }).start();
  useEffect(() => {
    breath.stopAnimation();
    breath.setValue(1);
    if (reduced || !selected) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1.018, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => { loop.stop(); breath.setValue(1); };
  }, [selected, reduced, breath]);
  const scale = Animated.multiply(press, breath);
  return (
    <Animated.View style={[style, { transform: [{ scale }] }]}>
      <Pressable {...rest} onPress={onPress} onPressIn={() => !reduced && soft(0.98)} onPressOut={() => !reduced && soft(1)} style={inner}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
