import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { interpolate } from "@capy/content";
import type { JourneyView } from "@/store/journey";
import { JOURNEY_ART } from "@/ui/journeyArt";
import { CompanionIcon as Icon } from "@/ui/CompanionIcon";
import { Pop, useReducedMotion } from "@/ui/motion";
import { T } from "@/ui/theme";

/**
 * The stones of the journey, drawn over the painted path (docs/journey-plan.md, phase 1).
 *
 * Plain images and views: no WebGL, so the trail stays readable when the avatar stage fails, the device is slow or
 * motion is reduced. Only the next stone is tappable — the done ones are history and the ones ahead are not yet
 * reachable — which keeps a single 56 px target instead of a row of small ones at 320 px width. The primary button
 * in the sheet does the same thing, so nobody has to hit the stone to continue.
 */
type Copy = { trailStep?: string; trailMilestone?: string; trailHere?: string };

/**
 * Along the painted path: the nearest stone sits low, the rest recede and shrink. They alternate sides so the
 * middle column stays clear — Capy stands there, in the WebView behind this layer, and a stone drawn over his
 * chest reads as a bug rather than as depth.
 */
const spot = (i: number, n: number) => {
  const t = n <= 1 ? 0 : i / (n - 1); // 0 = here, 1 = furthest drawn
  const side = i % 2 === 0 ? -1 : 1;
  return {
    bottom: `${11 + t * 27}%` as const,
    left: `${50 + side * (25 - t * 9)}%` as const,
    scale: 1 - t * 0.4,
    dim: 0.4 + (1 - t) * 0.6,
  };
};

export function JourneyTrail({ view, copy, worldTitle, onContinue }: { view: JourneyView; copy: Copy; worldTitle: string; onContinue: () => void }) {
  const reduced = useReducedMotion();
  const stones = view.window;
  return (
    <View style={s.root} pointerEvents="box-none">
      {view.milestone && (
        <View style={s.milestone} pointerEvents="none">
          <Image source={JOURNEY_ART["meadow-gateway"]} style={s.gateway} resizeMode="contain" />
          <Text style={s.milestoneLabel} numberOfLines={2}>
            {interpolate(copy.trailMilestone ?? "", { count: String(view.milestone.stepsAway), title: worldTitle })}
          </Text>
        </View>
      )}
      {stones.map((node, i) => {
        const p = spot(i, stones.length);
        const size = Math.round(56 * p.scale);
        const label = interpolate(copy.trailStep ?? "", { n: String(node.index + 1) });
        if (node.state === "next") {
          const stone = (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={onContinue}
              style={({ pressed }) => [s.next, pressed && s.pressed]}
            >
              <Icon name="pray" size={30} />
            </Pressable>
          );
          return (
            <View key={node.id} style={[s.slot, { bottom: p.bottom, left: p.left }]}>
              {reduced ? stone : <Pop>{stone}</Pop>}
              <Text style={s.here}>{copy.trailHere ?? ""}</Text>
            </View>
          );
        }
        return (
          <View key={node.id} style={[s.slot, { bottom: p.bottom, left: p.left, opacity: p.dim }]} pointerEvents="none">
            <View style={[s.stone, { width: size, height: size, borderRadius: size / 2 }, node.state === "done" && s.done]}>
              {node.state === "done" ? <Image source={JOURNEY_ART["lantern-lit"]} style={{ width: size * 0.8, height: size * 0.8 }} resizeMode="contain" /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  slot: { position: "absolute", alignItems: "center", gap: 4, marginLeft: -28 },
  stone: { backgroundColor: "#D9CBAE", borderWidth: 2, borderColor: "#00000022", alignItems: "center", justifyContent: "center" },
  done: { backgroundColor: "#F6E2B8", borderColor: "#C9A25C" },
  next: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#FFF6E2", borderWidth: 3, borderColor: "#476D58", alignItems: "center", justifyContent: "center", ...T.shadow },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  here: { fontFamily: T.font.bold, fontSize: 11, color: T.color.ink, backgroundColor: "#FFF9EAD9", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9, overflow: "hidden" },
  milestone: { position: "absolute", bottom: "74%", left: 0, right: 0, alignItems: "center", gap: 2 },
  gateway: { width: 74, height: 74, opacity: 0.8 },
  milestoneLabel: { fontFamily: T.font.bold, fontSize: 11, color: T.color.brown, backgroundColor: "#FFF9EAD9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: "hidden", textAlign: "center", maxWidth: "70%" },
});
