import type { ImageSourcePropType } from "react-native";

// Local artwork has no embedded copy; packs keep the titles and accessible labels.
/* eslint-disable @typescript-eslint/no-require-imports */
const FEELINGS: Record<string, ImageSourcePropType> = {
  happy: require("../../assets/illustrations/feelings/happy.png"),
  sad: require("../../assets/illustrations/feelings/sad.png"),
  worried: require("../../assets/illustrations/feelings/worried.png"),
  thankful: require("../../assets/illustrations/feelings/thankful.png"),
  sleepy: require("../../assets/illustrations/feelings/sleepy.png"),
};
const STORY_COVERS: Record<string, ImageSourcePropType> = {
  "lost-sheep": require("../../assets/illustrations/stories/lost-sheep.jpg"),
  "good-samaritan": require("../../assets/illustrations/stories/good-samaritan.jpg"),
  "mustard-seed": require("../../assets/illustrations/stories/mustard-seed.jpg"),
  "calm-storm": require("../../assets/illustrations/stories/calm-storm.jpg"),
  "loaves-fish": require("../../assets/illustrations/stories/loaves-fish.jpg"),
  zacchaeus: require("../../assets/illustrations/stories/zacchaeus.jpg"),
  "jesus-children": require("../../assets/illustrations/stories/jesus-children.jpg"),
  "prodigal-son": require("../../assets/illustrations/stories/prodigal-son.jpg"),
  "two-houses": require("../../assets/illustrations/stories/two-houses.jpg"),
  sower: require("../../assets/illustrations/stories/sower.jpg"),
};
/* eslint-enable @typescript-eslint/no-require-imports */

export const feelingArt = (id: string): ImageSourcePropType | undefined => FEELINGS[id];
export const storyCover = (id: string): ImageSourcePropType | undefined => STORY_COVERS[id];
