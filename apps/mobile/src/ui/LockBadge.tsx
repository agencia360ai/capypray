import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

/** A translucent badge leaves the collectible or cover readable underneath. */
export function LockBadge({ small = false }: { small?: boolean }) {
  const size = small ? 27 : 36;
  return <View pointerEvents="none" style={[s.badge, { width: size, height: size, borderRadius: size / 2 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Svg width={size * 0.63} height={size * 0.63} viewBox="0 0 32 32" aria-hidden>
      <Path d="M9 14V9a7 7 0 0 1 14 0v5" fill="none" stroke="#6B7F72" strokeWidth="3.5" strokeLinecap="round" />
      <Rect x="5" y="12" width="22" height="17" rx="6" fill="#F4CE80" fillOpacity="0.85" stroke="#B18A49" strokeWidth="1.5" />
      <Circle cx="16" cy="19" r="2.3" fill="#866A41" /><Path d="M16 21v3" stroke="#866A41" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M9 16h4" stroke="#FFF5D1" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  </View>;
}
const s = StyleSheet.create({ badge: { position: "absolute", bottom: 5, right: 5, backgroundColor: "rgba(255,251,239,0.76)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" } });
