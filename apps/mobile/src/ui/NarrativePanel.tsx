import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import type { VisualCue } from "@capy/content";
import { NarrativeSymbol } from "./NarrativeSymbol";
import { narrativeArt } from "./narrativeArt";
import { useReducedMotion } from "./motion";

/** Decorative accompaniment; narration and the child's button still control progress. */
export function NarrativePanel({ cue, fallbackArt, variant }: {
  cue?: VisualCue; fallbackArt?: ImageSourcePropType; variant: "story" | "prayer";
}) {
  const compact = useWindowDimensions().height < 700;
  const reduced = useReducedMotion();
  const entrance = useRef(new Animated.Value(1)).current;
  const detail = useRef(new Animated.Value(0)).current;
  const motion = cue?.motion ?? "still";
  useEffect(() => {
    entrance.setValue(1);
    detail.setValue(0);
    if (reduced || motion === "still") return;
    entrance.setValue(0);
    const animation = Animated.parallel([
      Animated.timing(entrance, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(detail, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(detail, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ]);
    animation.start();
    return () => animation.stop();
  }, [entrance, detail, reduced, motion, cue?.art, cue?.symbol]);
  const story = variant === "story";
  const size = story ? (compact ? 120 : 180) : (compact ? 52 : 68);
  const source = narrativeArt(cue?.art) ?? fallbackArt;
  const symbol = cue?.symbol ?? (story ? "book" : "heart");
  const transform = motion === "float"
    ? [{ translateY: detail.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }]
    : [{ scale: detail.interpolate({ inputRange: [0, 1], outputRange: [1, motion === "grow" ? 1.06 : 1.035] }) }];
  return (
    <Animated.View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      testID={`narrative-${variant}-${symbol}`}
      style={[styles.wrap, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }]}>
      {story && source ? (
        <View style={[styles.picture, { width: size, height: size }]}>
          <Image source={source} style={styles.image} resizeMode="cover" accessible={false} testID={`story-art-${cue?.art ?? "cover"}`} />
        </View>
      ) : null}
      <Animated.View testID="narrative-detail" style={[
        story && source ? styles.badge : styles.prayer,
        { transform },
      ]}>
        <NarrativeSymbol name={symbol} size={story && source ? (compact ? 30 : 38) : size} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: "center", alignItems: "center", justifyContent: "center", marginVertical: 2 },
  picture: { borderRadius: 24, overflow: "hidden", borderWidth: 2, borderColor: "#E6DECA", backgroundColor: "#F5EEDC" },
  image: { width: "100%", height: "100%" },
  badge: { position: "absolute", right: -10, bottom: -5, padding: 5, borderRadius: 30, backgroundColor: "#FFFAEB", borderWidth: 2, borderColor: "#E3DCC4" },
  prayer: { paddingHorizontal: 34, paddingVertical: 7, borderRadius: 60, backgroundColor: "#F8EBCD", borderWidth: 1, borderColor: "#E9DDC2" },
});
