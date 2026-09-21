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
const side = (i: number) => (i % 2 === 0 ? -1 : 1);

/**
 * Where Capy stands while the trail waits at stone `i`, in the avatar stage's own -1…1 (see the walk message).
 * He leans towards the stone without standing on it: that stone is the one tappable thing on the screen, and a
 * capybara parked over it is a capybara in the way.
 */
export const stoneStageX = (i: number) => side(i) * 0.14;

const spot = (i: number, n: number) => {
  const t = n <= 1 ? 0 : i / (n - 1); // 0 = here, 1 = furthest drawn
  return {
    bottom: `${[8, 17, 45, 52][i] ?? 52}%` as const,
    left: `${[34, 68, 57, 51][i] ?? 51}%` as const,
    scale: 1 - t * 0.4,
    dim: 1,
  };
};

export function JourneyTrail({ view, copy, worldTitle, onContinue, compact = false, layer = "all" }: { view: JourneyView; copy: Copy; worldTitle: string; onContinue: () => void; compact?: boolean; layer?: "all" | "back" | "front" }) {
  const reduced = useReducedMotion();
  const stones = view.window;
  return (
    <View style={s.root} pointerEvents="box-none" testID={layer === "back" ? "trail-underlay" : "trail-scenery"}>
      {layer !== "front" && <>
      <Image source={JOURNEY_ART["oak-tree"]} style={s.tree} resizeMode="contain" />
      <Image source={JOURNEY_ART["robin-friend"]} style={s.bird} resizeMode="contain" />
      {view.milestone && (
        <View style={s.milestone} pointerEvents="none">
          <Image source={JOURNEY_ART["meadow-gateway"]} style={s.gateway} resizeMode="contain" />
          <Text style={[s.milestoneLabel, compact && s.compactMilestoneLabel]} numberOfLines={2}>
            {interpolate(copy.trailMilestone ?? "", { count: String(view.milestone.stepsAway), title: worldTitle })}
          </Text>
        </View>
      )}
      </>}
      {stones.map((node, i) => {
        if (layer === "back" && node.state === "next" || layer === "front" && node.state !== "next") return null;
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
              <View style={[s.stone, s.currentStone]}><Icon name="pray" size={22} /></View>
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
            <View style={[s.stone, { width: size, height: size * 0.42, borderRadius: size / 2 }, node.state === "done" && s.done]}>
              {node.state === "done" ? <Image source={JOURNEY_ART["lantern-lit"]} style={{ width: size * 0.8, height: size * 0.8, position: "absolute", bottom: 2 }} resizeMode="contain" /> : null}
            </View>
          </View>
        );
      })}
      {layer !== "back" && <>
        <Image source={JOURNEY_ART["meadow-bush"]} style={s.bush} resizeMode="contain" />
        <Image source={JOURNEY_ART["daisy-patch"]} style={s.flowers} resizeMode="contain" />
      </>}
    </View>
  );
}

const s = StyleSheet.create({
  tree: { position: "absolute", width: "31%", height: "28%", left: "-11%", top: "30%" },
  bird: { position: "absolute", width: "10%", height: "10%", left: "18%", top: "61%" },
  bush: { position: "absolute", width: "33%", height: "24%", right: "-12%", bottom: "-2%" },
  flowers: { position: "absolute", width: "19%", height: "18%", left: "-5%", bottom: "-2%" },
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  slot: { position: "absolute", alignItems: "center", gap: 4, marginLeft: -28 },
  stone: { backgroundColor: "#E9D0A1", borderTopWidth: 1, borderTopColor: "#FFF1D1", borderBottomWidth: 4, borderBottomColor: "#B99B67", transform: [{ rotate: "-7deg" }], alignItems: "center", justifyContent: "center" },
  done: { backgroundColor: "#F6E2B8", borderColor: "#C9A25C" },
  next: { width: 68, height: 56, alignItems: "center", justifyContent: "flex-end" },
  currentStone: { width: 68, height: 28, borderRadius: 25, backgroundColor: "#FFF0C9" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  here: { fontFamily: T.font.bold, fontSize: 11, color: T.color.ink, backgroundColor: "#FFF9EAD9", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9, overflow: "hidden" },
  // The base meets the far end of the painted path.
  milestone: { position: "absolute", top: "45%", marginTop: -84, left: "38%", width: "27%", alignItems: "center" },
  gateway: { width: 84, height: 84 },
  compactMilestoneLabel: { bottom: "auto", top: 12, left: "100%", width: 80, marginBottom: 0 },
  milestoneLabel: { position: "absolute", bottom: "100%", marginBottom: 4, width: 150, fontFamily: T.font.bold, fontSize: 10, lineHeight: 13, color: T.color.brown, backgroundColor: "#FFF9EAD9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: "hidden", textAlign: "center" },
});
