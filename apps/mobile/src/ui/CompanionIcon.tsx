import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

/** Hand-drawn, language-independent companion icons, consistent across platforms. */
export function CompanionIcon({ name, size = 32, color = "#4D7062" }: { name: string; size?: number; color?: string }) {
  const face = ["happy", "sad", "scared", "angry", "sleepy", "calm"].includes(name);
  return <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}>
    <G stroke={color} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
      {face ? <>
        <Circle cx="24" cy="24" r="18" fill={name === "sad" ? "#D8EAF5" : name === "angry" ? "#FFE0D3" : "#FFE6AA"} />
        {name === "sleepy" || name === "calm" ? <Path d="M13 22q4 4 8 0M28 22q4 4 8 0" /> : <><Circle cx="17" cy="22" r="1.5" fill={color} /><Circle cx="31" cy="22" r="1.5" fill={color} /></>}
        {name === "sad" || name === "scared" ? <Path d="M18 33q6-6 12 0" /> : name === "angry" ? <Path d="M13 16l7 3m9 0 7-3M19 32h10" /> : <Path d="M18 30q6 7 12 0" />}
        <Ellipse cx="12" cy="29" rx="3" ry="1.7" fill="#F4B5A1" stroke="none" /><Ellipse cx="36" cy="29" rx="3" ry="1.7" fill="#F4B5A1" stroke="none" />
      </> : name === "heart" || name === "pray" ? <Path d="M24 39S5 27 5 16C5 5 20 5 24 15 28 5 43 5 43 16c0 11-19 23-19 23Z" fill="#F4BAA5" />
      : name === "moon" ? <><Path d="M33 7C12 3 4 29 19 39c12 7 24-1 24-12C26 35 18 16 33 7Z" fill="#F6D486" /><Path d="m38 6 1.5 4.5L44 12l-4.5 1.5L38 18l-1.5-4.5L32 12l4.5-1.5Z" fill="#F6D486" stroke="none" /></>
      : name === "book" ? <><Path d="M24 13C16 7 7 9 4 12v26c8-4 14-2 20 2 6-4 12-6 20-2V12c-7-4-13-3-20 1Z" fill="#F9DAB7" /><Path d="M24 13v27M10 18l8 2m-8 6 8 2m13-8 7-2m-7 10 7-2" /></>
      : name === "leaf" || name === "garden" ? <><Path d="M23 41V22M23 30C4 32 4 14 7 12c15 0 18 10 16 18ZM24 22C23 4 39 5 42 7c0 14-8 20-18 15Z" fill="#B5D3A0" /></>
      : name === "lantern" ? <><Rect x="12" y="12" width="24" height="28" rx="9" fill="#FFD280" /><Path d="M18 12V7h12v5M17 40h14M24 18v16" /><Ellipse cx="24" cy="25" rx="5" ry="8" fill="#FFF5D2" stroke="none" /></>
      : name === "parent" ? <><Circle cx="24" cy="16" r="7" /><Path d="M10 40v-5c0-16 28-16 28 0v5" /></>
      : name === "arrow" ? <Path d="M9 24h30M28 13l11 11-11 11" />
      : name === "back" ? <Path d="M38 24H9m11-11L9 24l11 11" />
      : name === "close" ? <Path d="m14 14 20 20m0-20L14 34" />
      : name === "check" ? <Path d="m11 25 9 9 18-21" />
      : name === "lock" ? <><Rect x="12" y="21" width="24" height="21" rx="6" /><Path d="M17 21V13a7 7 0 0 1 14 0v8M24 29v5" /></>
      : name === "sun" ? <><Circle cx="24" cy="24" r="10" fill="#FFD280" /><Path d="M24 3v5m0 32v5M3 24h5m32 0h5M9 9l4 4m22 22 4 4M9 39l4-4m22-22 4-4" /></>
      : <><Path d="M5 40h38L29 13l-9 16-5-8Z" fill="#BCD7BB" /><Path d="m24 22 5 3 4-3" /></>}
    </G>
  </Svg>;
}
