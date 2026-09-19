import type { ImageSourcePropType } from "react-native";
import manifest from "../../assets/illustrations/journey/manifest.json";

/** Prepared scenery for the journey prototype; importing this module opts into bundling it. */
export const JOURNEY_ART = {
  "meadow-backdrop": require("../../assets/illustrations/journey/meadow-backdrop.jpg") as ImageSourcePropType,
  "oak-tree": require("../../assets/illustrations/journey/oak-tree.png") as ImageSourcePropType,
  "meadow-bush": require("../../assets/illustrations/journey/meadow-bush.png") as ImageSourcePropType,
  "daisy-patch": require("../../assets/illustrations/journey/daisy-patch.png") as ImageSourcePropType,
  "robin-friend": require("../../assets/illustrations/journey/robin-friend.png") as ImageSourcePropType,
  "lantern-lit": require("../../assets/illustrations/journey/lantern-lit.png") as ImageSourcePropType,
  "meadow-gateway": require("../../assets/illustrations/journey/meadow-gateway.png") as ImageSourcePropType,
} as const;
export type JourneyArtId = keyof typeof JOURNEY_ART;
export const JOURNEY_ART_LAYOUT = manifest;
