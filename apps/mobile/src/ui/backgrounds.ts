import type { ImageSourcePropType } from "react-native";

// Pond biomes (GDD §9): meadow → river → mountain lake. Placeholder art rendered from tools/art/*.svg
// (`node tools/art/render.mjs`); swap for Higgsfield renders with the same file names (tools/art/README.md).
/* eslint-disable @typescript-eslint/no-require-imports */
const BACKGROUNDS: Record<string, ImageSourcePropType> = {
  meadow: require("../../assets/backgrounds/meadow-storybook.png"),
  "meadow-night": require("../../assets/backgrounds/meadow-storybook-night.png"),
  river: require("../../assets/backgrounds/river.jpg"),
  mountain: require("../../assets/backgrounds/mountain.jpg"),
  bedroom: require("../../assets/backgrounds/bedroom-storybook.png"),
  kitchen: require("../../assets/backgrounds/kitchen.jpg"),
  garden: require("../../assets/backgrounds/garden.jpg"),
  park: require("../../assets/backgrounds/park.jpg"),
  city: require("../../assets/backgrounds/city.jpg"),
  school: require("../../assets/backgrounds/school.jpg"),
  car: require("../../assets/backgrounds/car.jpg"),
};
/* eslint-enable @typescript-eslint/no-require-imports */

export const BIOMES = Object.keys(BACKGROUNDS).filter(id => !id.endsWith("-night"));

export function backgroundFor(biome: string, night = false): ImageSourcePropType {
  return (night && BACKGROUNDS[`${biome}-night`]) || BACKGROUNDS[biome] || BACKGROUNDS.meadow!;
}
