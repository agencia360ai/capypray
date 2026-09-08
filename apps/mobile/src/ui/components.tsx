import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { T } from "./theme";
import { glyph } from "./icons";
import { useAvatar } from "@/avatar/AvatarView";
import { speak } from "@/audio/voice";

/** Capy's line, drawn as a speech bubble whose tail points up at the avatar. */
export function SpeechBubble({ text, hint, mute }: { text: string; hint?: string; mute?: boolean }) {
  const pop = useRef(new Animated.Value(0.92)).current;
  const avatar = useAvatar();
  useEffect(() => {
    pop.setValue(0.92);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
  }, [text, pop]);
  // Every bubble line is spoken (kids 4–6 don't read). The lesson runner already started the talk clip;
  // when the voice ends, Capy goes back to idle so mouth and voice stay in sync.
  useEffect(() => {
    if (mute) return;
    const h = speak(text, { onDone: () => avatar.send({ type: "idle" }) });
    return () => h.cancel();
  }, [text, mute, avatar]);
  return (
    <Animated.View style={[styles.bubbleWrap, { transform: [{ scale: pop }] }]}>
      <View style={styles.tail} />
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{text}</Text>
        {hint ? <Text style={styles.bubbleHint}>{hint}</Text> : null}
      </View>
    </Animated.View>
  );
}

/** Chunky toy button with a pressed "push down" feel. */
export function BigButton({ label, onPress, disabled, tone = "primary" }: { label: string; onPress: () => void; disabled?: boolean; tone?: "primary" | "night" | "ghost" }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.big,
        tone === "night" && styles.bigNight,
        tone === "ghost" && styles.bigGhost,
        disabled && styles.disabled,
        pressed && styles.bigPressed,
      ]}
    >
      <Text style={[styles.bigText, tone === "night" && styles.bigTextLight, tone === "ghost" && styles.bigTextGhost]}>{label}</Text>
    </Pressable>
  );
}

/** Tappable picture card (minigames, get-to-know-you, people). */
export function IconCard({ icon, label, onPress, selected, size = "md" }: { icon?: string; label: string; onPress: () => void; selected?: boolean; size?: "md" | "lg" }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, size === "lg" && styles.cardLg, selected && styles.cardOn, pressed && styles.cardPressed]}>
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
        <Text key={i} style={[styles.lantern, i >= lit && styles.lanternOff]}>
          🏮
        </Text>
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

export function Grid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  bubbleWrap: { alignItems: "center", paddingHorizontal: 16 },
  tail: { width: 22, height: 22, backgroundColor: T.color.paper, transform: [{ rotate: "45deg" }], marginBottom: -14, borderRadius: 4 },
  bubble: { backgroundColor: T.color.paper, borderRadius: T.radius.lg, paddingVertical: 18, paddingHorizontal: 22, maxWidth: 420, ...T.shadow },
  bubbleText: { fontFamily: T.font.bold, fontSize: 26, lineHeight: 34, color: T.color.ink, textAlign: "center" },
  bubbleHint: { fontFamily: T.font.regular, fontSize: 14, color: T.color.brown, textAlign: "center", marginTop: 6 },
  big: { backgroundColor: T.color.primary, borderRadius: T.radius.pill, paddingVertical: 18, paddingHorizontal: 28, alignItems: "center", borderBottomWidth: 6, borderBottomColor: T.color.primaryDark },
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
  meter: { flexDirection: "row", gap: 2 },
  lantern: { fontSize: 22 },
  lanternOff: { opacity: 0.25 },
  chip: { backgroundColor: "rgba(255,255,255,0.85)", borderRadius: T.radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  chipText: { fontFamily: T.font.bold, fontSize: 16, color: T.color.ink },
  sheet: { padding: 20, paddingBottom: 34, gap: 14, backgroundColor: "rgba(255,247,230,0.94)", borderTopLeftRadius: 32, borderTopRightRadius: 32, ...T.shadow },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
});
