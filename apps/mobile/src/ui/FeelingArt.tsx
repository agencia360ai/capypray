import { Image } from "react-native";
import { CompanionIcon } from "./CompanionIcon";
import { feelingArt } from "./illustrations";

const EMOTIONS: Record<string, string> = { scared: "worried", heart: "thankful" };

/** The surrounding button provides its localized name. */
export function FeelingArt({ id, icon, size = 48 }: { id?: string; icon: string; size?: number }) {
  const source = feelingArt(id ?? EMOTIONS[icon] ?? icon);
  return source
    ? <Image source={source} style={{ width: size, height: size }} resizeMode="contain" accessible={false} testID={`feeling-art-${id ?? icon}`} />
    : <CompanionIcon name={icon} size={size} />;
}
