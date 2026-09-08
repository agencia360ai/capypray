import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Rect, Stop } from "react-native-svg";

// Small vector art set for the kid chrome (no emoji dependence, crisp at any size, tinted per state).

export function Lantern({ size = 28, lit = true }: { size?: number; lit?: boolean }) {
  const h = size * 1.35;
  return (
    <Svg width={size * 1.6} height={h * 1.2} viewBox="-16 -8 64 74">
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#FFB84D" stopOpacity={lit ? 0.75 : 0} />
          <Stop offset="1" stopColor="#FFB84D" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      {lit && <Circle cx="16" cy="30" r="30" fill="url(#glow)" />}
      <Rect x="8" y="0" width="16" height="6" rx="2" fill={lit ? "#8B5A2B" : "#B8AA98"} />
      <Rect x="0" y="6" width="32" height="42" rx="12" fill={lit ? "#FF8A5B" : "#D9D2C5"} />
      <Rect x="6" y="12" width="20" height="30" rx="9" fill={lit ? "#FFD27A" : "#EFEAE0"} />
      {lit && <Ellipse cx="16" cy="30" rx="5" ry="8" fill="#FFF6D6" />}
      <Rect x="10" y="48" width="12" height="6" rx="2" fill={lit ? "#8B5A2B" : "#B8AA98"} />
      <Path d="M16 54 v8" stroke={lit ? "#8B5A2B" : "#B8AA98"} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}

export function Star({ size = 24, color = "#FFD84D" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 1.8l3 6.4 7 .9-5.1 4.8 1.3 6.9L12 17.4l-6.2 3.4 1.3-6.9L2 9.1l7-.9z" fill={color} stroke="#E39A2A" strokeWidth="1.2" strokeLinejoin="round" />
    </Svg>
  );
}

/** Pointing hand for "tap here" hints. */
export function HandPointer({ size = 44 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <G stroke="#3B2A1A" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
        <Path d="M19 6c0-2.2 1.8-4 4-4s4 1.8 4 4v16" fill="#FFD9A8" />
        <Path d="M27 20c0-2 1.6-3.5 3.5-3.5S34 18 34 20v5" fill="#FFD9A8" />
        <Path d="M34 23c0-2 1.6-3.5 3.5-3.5S41 21 41 23v6" fill="#FFD9A8" />
        <Path d="M19 22V10 M12 27l6-3v10c0 6 5 10 11 10h4c5 0 9-4 9-9v-9" fill="#FFD9A8" />
        <Path d="M12 27c-1.5 1-1.6 3 0 4.5L19 39" fill="#FFD9A8" />
      </G>
    </Svg>
  );
}

export function Arrow({ size = 26, color = "#3B2A1A" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4l10 8-10 8z" fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </Svg>
  );
}

export function Mic({ size = 26, color = "#3B2A1A" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x="8" y="2" width="8" height="13" rx="4" fill={color} />
      <Path d="M5 11a7 7 0 0 0 14 0 M12 18v4 M8 22h8" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export function Sparkle({ size = 18, color = "#FFF1B8" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2c.6 5.4 4.6 9.4 10 10-5.4.6-9.4 4.6-10 10-.6-5.4-4.6-9.4-10-10 5.4-.6 9.4-4.6 10-10z" fill={color} />
    </Svg>
  );
}

export function Check({ size = 26, color = "#3B2A1A" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 12.5l5 5L20 6.5" stroke={color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
