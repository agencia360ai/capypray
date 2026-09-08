import type { ImageSourcePropType } from "react-native";

// Pond biomes (GDD §9): meadow → river → mountain lake. Art generated with Higgsfield (tools/art/README.md).
const BACKGROUNDS: Record<string, ImageSourcePropType> = {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  meadow: require("../../assets/backgrounds/meadow.jpg"),
};

export function backgroundFor(biome: string): ImageSourcePropType {
  return BACKGROUNDS[biome] ?? BACKGROUNDS.meadow!;
}
