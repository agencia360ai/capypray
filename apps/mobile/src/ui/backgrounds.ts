import type { ImageSourcePropType } from "react-native";

// Pond biomes (GDD §9): meadow → river → mountain lake. Placeholder art rendered from tools/art/*.svg
// (`node tools/art/render.mjs`); swap for Higgsfield renders with the same file names (tools/art/README.md).
/* eslint-disable @typescript-eslint/no-require-imports */
const BACKGROUNDS: Record<string, ImageSourcePropType> = {
  meadow: require("../../assets/backgrounds/meadow.jpg"),
  river: require("../../assets/backgrounds/river.jpg"),
  mountain: require("../../assets/backgrounds/mountain.jpg"),
  bedroom: require("../../assets/backgrounds/bedroom.jpg"),
  kitchen: require("../../assets/backgrounds/kitchen.jpg"),
  garden: require("../../assets/backgrounds/garden.jpg"),
  park: require("../../assets/backgrounds/park.jpg"),
  city: require("../../assets/backgrounds/city.jpg"),
  school: require("../../assets/backgrounds/school.jpg"),
  car: require("../../assets/backgrounds/car.jpg"),
};
/* eslint-enable @typescript-eslint/no-require-imports */

export const BIOMES = Object.keys(BACKGROUNDS);

export function backgroundFor(biome: string): ImageSourcePropType {
  return BACKGROUNDS[biome] ?? BACKGROUNDS.meadow!;
}
