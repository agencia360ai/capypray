import { useId } from "react";
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

// Small vector art set for the kid chrome (no emoji dependence, crisp at any size, tinted per state).

export function Lantern({ size = 28, lit = true }: { size?: number; lit?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  return <Svg width={size * 1.6} height={size * 1.62} viewBox="0 0 80 82" aria-hidden>
    <Defs>
      <RadialGradient id={uid + "glow"} cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#FFD077" stopOpacity="0.65" /><Stop offset="1" stopColor="#FFD077" stopOpacity="0" />
      </RadialGradient>
      <LinearGradient id={uid + "paper"} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={lit ? "#FFF1AE" : "#F2EDD9"} /><Stop offset="0.55" stopColor={lit ? "#FFD576" : "#E5DECA"} /><Stop offset="1" stopColor={lit ? "#EDAC55" : "#D2CCB9"} />
      </LinearGradient>
    </Defs>
    {lit && <Circle cx="40" cy="40" r="39" fill={"url(#" + uid + "glow)"} />}
    <Ellipse cx="40" cy="75" rx="16" ry="3" fill="#66785C18" />
    <Path d="M30 16v-4c0-12 20-12 20 0v4" fill="none" stroke={lit ? "#A97746" : "#A9AA97"} strokeWidth="3" />
    <Rect x="17" y="19" width="46" height="45" rx="17" fill={"url(#" + uid + "paper)"} stroke={lit ? "#D19A55" : "#B9B9A3"} strokeWidth="2" />
    <Path d="M33 20c-8 13-8 29 0 43M47 20c8 13 8 29 0 43M18 33h44M18 50h44" fill="none" stroke={lit ? "#D7A65D" : "#C6C3AD"} strokeWidth="1.5" opacity="0.65" />
    {lit && <><Ellipse cx="40" cy="42" rx="10" ry="14" fill="#FFF2B8" opacity="0.8" /><Path d="M40 31c-2 6-7 7-7 13a7 7 0 0 0 14 0c0-4-4-7-7-13Z" fill="#FFFBE9" /></>}
    <Path d="M25 26q-4 4-4 11" fill="none" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" />
    <Rect x="25" y="15" width="30" height="7" rx="3.5" fill={lit ? "#BD8750" : "#ADB09B"} />
    <Path d="M29 17h20" stroke={lit ? "#E8B976" : "#D1D0BA"} strokeWidth="2" strokeLinecap="round" />
    <Rect x="27" y="62" width="26" height="6" rx="3" fill={lit ? "#BD8750" : "#ADB09B"} />
    <Path d="M40 68v5m-4 1h8" stroke={lit ? "#BF965C" : "#B1B29C"} strokeWidth="2" strokeLinecap="round" />
  </Svg>;
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
