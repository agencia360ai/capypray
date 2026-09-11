import type { ImageSourcePropType } from "react-native";

// Bundled storybook art; content packs select scenes by stable, language-neutral ids.
/* eslint-disable @typescript-eslint/no-require-imports */
const BACKGROUNDS: Record<string, ImageSourcePropType> = {
  meadow: require("../../assets/backgrounds/meadow-storybook.png"),
  "meadow-night": require("../../assets/backgrounds/meadow-storybook-night.png"),
  river: require("../../assets/backgrounds/river-storybook.jpg"),
  mountain: require("../../assets/backgrounds/mountain-storybook.jpg"),
  bedroom: require("../../assets/backgrounds/bedroom-storybook.png"),
  kitchen: require("../../assets/backgrounds/kitchen-storybook.jpg"),
  garden: require("../../assets/backgrounds/garden-storybook.jpg"),
  park: require("../../assets/backgrounds/park-storybook.jpg"),
  city: require("../../assets/backgrounds/city-storybook.jpg"),
  school: require("../../assets/backgrounds/school-storybook.jpg"),
  car: require("../../assets/backgrounds/car-storybook.jpg"),
};
/* eslint-enable @typescript-eslint/no-require-imports */

export const BIOMES = Object.keys(BACKGROUNDS).filter(id => !id.endsWith("-night"));

// Water stays behind Capy's standing area, including the shorter quiet-time stage.
export const backgroundHeight = (biome: string) => ["meadow", "river", "mountain"].includes(biome) ? "72%" as const : "100%" as const;

export function backgroundFor(biome: string, night = false): ImageSourcePropType {
  return (night && BACKGROUNDS[`${biome}-night`]) || BACKGROUNDS[biome] || BACKGROUNDS.meadow!;
}
