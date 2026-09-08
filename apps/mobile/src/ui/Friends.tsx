import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useKid } from "@/store/kid";
import { getPack } from "@/content/pack";
import { glyph } from "./icons";
import { T } from "./theme";

// Prayer People live at the pond as animal friends (GDD §9): one bobbing critter per person the kid prays for.
export function Friends({ max = 6 }: { max?: number }) {
  const people = useKid((s) => s.people);
  const friends = getPack().people.friends;
  const shown = people.slice(0, max);
  if (!shown.length) return null;
  return (
    <View pointerEvents="none" style={styles.row}>
      {shown.map((p, i) => (
        <Friend key={p.id} icon={friends[i % friends.length]!} label={p.label} delay={i * 260} />
      ))}
    </View>
  );
}

function Friend({ icon, label, delay }: { icon: string; label: string; delay: number }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(bob, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bob, delay]);
  const ty = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  return (
    <Animated.View style={[styles.friend, { transform: [{ translateY: ty }] }]}>
      <Text style={styles.icon}>{glyph(icon)}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-evenly", alignItems: "flex-end", paddingHorizontal: 8, paddingBottom: 4 },
  friend: { alignItems: "center", maxWidth: 64 },
  icon: { fontSize: 30 },
  label: { fontFamily: T.font.bold, fontSize: 11, color: T.color.paper, textShadowColor: "rgba(59,42,26,0.6)", textShadowRadius: 4 },
});
