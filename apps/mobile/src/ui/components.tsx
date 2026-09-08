import { Children, useEffect, useRef, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { T } from "./theme";
import { glyph } from "./icons";
import { useAvatar } from "@/avatar/AvatarView";
import { speak } from "@/audio/voice";
import * as haptics from "./haptics";
import { HandPointer, Lantern } from "./art";

/** Capy's line, drawn as a speech bubble whose tail points up at the avatar. */
export function SpeechBubble({ text, hint, mute, shake, audio, badge, onSpoken }: { text: string; hint?: string; mute?: boolean; shake?: number; audio?: string; badge?: string; onSpoken?: () => void }) {
  const pop = useRef(new Animated.Value(0.92)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const avatar = useAvatar();
  const spoken = useRef(onSpoken);
  spoken.current = onSpoken;
  useEffect(() => {
    pop.setValue(0.92);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  }, [text, pop]);
  // wrong answer: a gentle "no-no" head shake of the bubble, never a harsh buzz
  useEffect(() => {
    if (!shake) return;
    wobble.setValue(0);
    Animated.sequence([-1, 1, -0.6, 0.6, 0].map((v) => Animated.timing(wobble, { toValue: v, duration: 55, useNativeDriver: true }))).start();
  }, [shake, wobble]);
  // Every bubble line is spoken (kids 4–6 don't read). The lesson runner already started the talk clip;
  // when the voice ends, Capy goes back to idle so mouth and voice stay in sync.
  useEffect(() => {
    if (mute) {
      spoken.current?.();
      return;
    }
    const h = speak(text, {
      audio,
      onDone: () => {
        avatar.send({ type: "idle" });
        spoken.current?.();
      },
    });
    return () => h.cancel();
  }, [text, mute, audio, avatar]);
  return (
    <Animated.View style={[styles.bubbleWrap, { transform: [{ scale: pop }, { translateX: wobble.interpolate({ inputRange: [-1, 1], outputRange: [-10, 10] }) }] }]}>
      <View style={styles.tail} />
      <View style={styles.bubble}>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{glyph(badge)}</Text>
          </View>
        ) : null}
        <Text style={styles.bubbleText}>{text}</Text>
        {hint ? <Text style={styles.bubbleHint}>{hint}</Text> : null}
      </View>
    </Animated.View>
  );
}

/**
 * Chunky toy button with a pressed "push down" feel. `hint` breathes + shows the pointing hand (kid stalled);
 * `autoAdvanceMs` fills the button and presses it by itself (audio-led beats: no reading required).
 */
export function BigButton({ label, onPress, disabled, tone = "primary", icon, hint, autoAdvanceMs }: { label: string; onPress: () => void; disabled?: boolean; tone?: "primary" | "night" | "ghost"; icon?: ReactNode; hint?: boolean; autoAdvanceMs?: number }) {
  const breathe = useRef(new Animated.Value(1)).current;
  const fill = useRef(new Animated.Value(0)).current;
  const press = useRef(onPress);
  press.current = onPress;
  useEffect(() => {
    if (!hint) {
      breathe.setValue(1);
      return;
    }
    const loop = Animated.loop(Animated.sequence([Animated.timing(breathe, { toValue: 1.06, duration: 520, useNativeDriver: true }), Animated.timing(breathe, { toValue: 1, duration: 520, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [hint, breathe]);
  useEffect(() => {
    fill.setValue(0);
    if (!autoAdvanceMs) return;
    const anim = Animated.timing(fill, { toValue: 1, duration: autoAdvanceMs, useNativeDriver: true });
    anim.start(({ finished }) => finished && press.current());
    return () => anim.stop();
  }, [autoAdvanceMs, fill]);
  return (
    <Animated.View style={{ transform: [{ scale: breathe }] }}>
      <Pressable
        onPress={() => {
          void haptics.tap();
          onPress();
        }}
        disabled={disabled}
        style={({ pressed }) => [
          styles.big,
          tone === "night" && styles.bigNight,
          tone === "ghost" && styles.bigGhost,
          disabled && styles.disabled,
          pressed && styles.bigPressed,
        ]}
      >
        {autoAdvanceMs ? <Animated.View style={[styles.fill, { transform: [{ scaleX: fill }] }]} /> : null}
        <View style={styles.bigRow}>
          {icon}
          <Text style={[styles.bigText, tone === "night" && styles.bigTextLight, tone === "ghost" && styles.bigTextGhost]}>{label}</Text>
        </View>
      </Pressable>
      {hint ? <TapHint /> : null}
    </Animated.View>
  );
}

/** Bouncing "tap here" hand, shown when the kid has been quiet after Capy finished talking. */
export function TapHint({ style }: { style?: ViewStyle }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: 420, useNativeDriver: true }), Animated.timing(v, { toValue: 0, duration: 420, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Animated.View pointerEvents="none" style={[styles.hand, style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] }) }] }]}>
      <HandPointer size={52} />
    </Animated.View>
  );
}

/** Tappable picture card (minigames, get-to-know-you, people). */
export function IconCard({ icon, label, onPress, selected, size = "md" }: { icon?: string; label: string; onPress: () => void; selected?: boolean; size?: "md" | "lg" }) {
  return (
    <Pressable
      onPress={() => {
        void haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, size === "lg" && styles.cardLg, selected && styles.cardOn, pressed && styles.cardPressed]}
    >
      <Text style={[styles.cardIcon, size === "lg" && styles.cardIconLg]}>{glyph(icon)}</Text>
      <Text style={styles.cardLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 7 lanterns → 1 beacon (GDD §4.1). */
export function LanternMeter({ lanterns }: { lanterns: number }) {
  const lit = lanterns % 7;
  return (
    <View style={styles.meter}>
      {Array.from({ length: 7 }, (_, i) => (
        <Lantern key={i} size={16} lit={i < lit} />
      ))}
    </View>
  );
}

export function Chip({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.chip, style]}>
      <Text style={styles.chipText}>{children}</Text>
    </View>
  );
}

/** Bottom panel that sits over the stage. */
export function Sheet({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.sheet, style]}>{children}</View>;
}

/** Cards pop in one after another (toy-box feel). Re-runs when the set of children changes. */
export function Grid({ children, hint }: { children: ReactNode; hint?: boolean }) {
  const items = Children.toArray(children);
  return (
    <View style={styles.grid}>
      {items.map((c, i) => (
        <PopIn key={(c as { key?: string | null }).key ?? i} delay={i * 70}>
          {c}
        </PopIn>
      ))}
      {hint ? <TapHint style={styles.gridHand} /> : null}
    </View>
  );
}

function PopIn({ children, delay }: { children: ReactNode; delay: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, delay, useNativeDriver: true, friction: 5, tension: 90 }).start();
  }, [v, delay]);
  return <Animated.View style={{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  bubbleWrap: { alignItems: "center", paddingHorizontal: 16 },
  tail: { width: 22, height: 22, backgroundColor: T.color.paper, transform: [{ rotate: "45deg" }], marginBottom: -14, borderRadius: 4 },
  bubble: { backgroundColor: T.color.paper, borderRadius: T.radius.lg, paddingVertical: 18, paddingHorizontal: 22, maxWidth: 420, ...T.shadow },
  bubbleText: { fontFamily: T.font.bold, fontSize: 26, lineHeight: 34, color: T.color.ink, textAlign: "center" },
  badge: { position: "absolute", top: -14, left: -10, width: 40, height: 40, borderRadius: 20, backgroundColor: T.color.primary, borderWidth: 3, borderColor: T.color.paper, alignItems: "center", justifyContent: "center", ...T.shadow },
  badgeText: { fontSize: 18 },
  bigRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, right: 0, backgroundColor: "rgba(255,255,255,0.45)", transformOrigin: "left" },
  hand: { position: "absolute", right: 28, top: -30 },
  gridHand: { right: undefined, left: "50%", marginLeft: -10, top: 16 },
  bubbleHint: { fontFamily: T.font.regular, fontSize: 14, color: T.color.brown, textAlign: "center", marginTop: 6 },
  big: { backgroundColor: T.color.primary, borderRadius: T.radius.pill, paddingVertical: 18, paddingHorizontal: 28, alignItems: "center", borderBottomWidth: 6, borderBottomColor: T.color.primaryDark, overflow: "hidden" },
  bigPressed: { borderBottomWidth: 2, transform: [{ translateY: 4 }] },
  bigNight: { backgroundColor: T.color.night, borderBottomColor: "#1b1930" },
  bigGhost: { backgroundColor: "transparent", borderBottomWidth: 0 },
  disabled: { opacity: 0.4 },
  bigText: { fontFamily: T.font.black, fontSize: 22, color: T.color.ink, letterSpacing: 0.3 },
  bigTextLight: { color: "#fff" },
  bigTextGhost: { color: T.color.brown, fontSize: 17 },
  card: { width: 104, paddingVertical: 12, paddingHorizontal: 8, borderRadius: T.radius.md, backgroundColor: T.color.paper, borderWidth: 3, borderColor: T.color.tan, alignItems: "center", gap: 6, borderBottomWidth: 6 },
  cardLg: { width: 132, paddingVertical: 16 },
  cardOn: { borderColor: T.color.primary, backgroundColor: "#FFF5E0", transform: [{ scale: 1.04 }] },
  cardPressed: { borderBottomWidth: 3, transform: [{ translateY: 3 }] },
  cardIcon: { fontSize: 36 },
  cardIconLg: { fontSize: 48 },
  cardLabel: { fontFamily: T.font.bold, fontSize: 15, color: T.color.ink, textAlign: "center" },
  meter: { flexDirection: "row", gap: -6, alignItems: "center" },
  chip: { backgroundColor: "rgba(255,255,255,0.85)", borderRadius: T.radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontFamily: T.font.bold, fontSize: 16, color: T.color.ink },
  sheet: { padding: 20, paddingBottom: 34, gap: 14, backgroundColor: "rgba(255,247,230,0.94)", borderTopLeftRadius: 32, borderTopRightRadius: 32, ...T.shadow },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
});
