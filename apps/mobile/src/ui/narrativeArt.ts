import type { ImageSourcePropType } from "react-native";
import { storyCover } from "./illustrations";

/* eslint-disable @typescript-eslint/no-require-imports */
const PAGES: Record<string, ImageSourcePropType> = {
  "lost-sheep-flock": require("../../assets/illustrations/pages/lost-sheep-flock.jpg"),
  "lost-sheep-found": require("../../assets/illustrations/pages/lost-sheep-found.jpg"),
  "good-samaritan-road": require("../../assets/illustrations/pages/good-samaritan-road.jpg"),
  "good-samaritan-passing": require("../../assets/illustrations/pages/good-samaritan-passing.jpg"),
  "mustard-seed-tiny": require("../../assets/illustrations/pages/mustard-seed-tiny.jpg"),
  "mustard-seed-birds": require("../../assets/illustrations/pages/mustard-seed-birds.jpg"),
  "calm-storm-waves": require("../../assets/illustrations/pages/calm-storm-waves.jpg"),
  "calm-storm-wake": require("../../assets/illustrations/pages/calm-storm-wake.jpg"),
  "loaves-fish-crowd": require("../../assets/illustrations/pages/loaves-fish-crowd.jpg"),
  "loaves-fish-baskets": require("../../assets/illustrations/pages/loaves-fish-baskets.jpg"),
  "zacchaeus-alone": require("../../assets/illustrations/pages/zacchaeus-alone.jpg"),
  "zacchaeus-sharing": require("../../assets/illustrations/pages/zacchaeus-sharing.jpg"),
  "jesus-children-arriving": require("../../assets/illustrations/pages/jesus-children-arriving.jpg"),
  "jesus-children-waiting": require("../../assets/illustrations/pages/jesus-children-waiting.jpg"),
  "prodigal-son-leaving": require("../../assets/illustrations/pages/prodigal-son-leaving.jpg"),
  "prodigal-son-hungry": require("../../assets/illustrations/pages/prodigal-son-hungry.jpg"),
  "two-houses-building": require("../../assets/illustrations/pages/two-houses-building.jpg"),
  "two-houses-rain": require("../../assets/illustrations/pages/two-houses-rain.jpg"),
  "sower-birds": require("../../assets/illustrations/pages/sower-birds.jpg"),
  "sower-weeds": require("../../assets/illustrations/pages/sower-weeds.jpg"),
};
/* eslint-enable @typescript-eslint/no-require-imports */
export const narrativeArt = (id?: string): ImageSourcePropType | undefined => id ? PAGES[id] ?? storyCover(id) : undefined;
