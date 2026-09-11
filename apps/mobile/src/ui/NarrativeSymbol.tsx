import type { ReactNode } from "react";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";
import type { VisualCue } from "@capy/content";
import { CompanionIcon } from "./CompanionIcon";
import { FeelingArt } from "./FeelingArt";

/** Small page details and prayer symbols share the existing vector palette. */
export function NarrativeSymbol({ name, size = 48 }: { name: VisualCue["symbol"]; size?: number }) {
  if (["heart", "sun", "moon", "leaf", "book"].includes(name)) return <CompanionIcon name={name} size={size} />;
  if (name === "sad" || name === "happy") return <FeelingArt id={name} icon={name} size={size} />;
  let drawing: ReactNode;
  switch (name) {
    case "hands": drawing = <><Path d="M23 37 12 41 5 32l8-8 5-17q2-4 5 0v30Zm2 0 11 4 7-9-8-8-5-17q-2-4-5 0v30Z" fill="#EECBA6" /><Path d="m13 24 2 8m20-8-2 8M23 14v21m2-21v21" /></>; break;
    case "people": drawing = <><Circle cx="24" cy="13" r="6" fill="#EFC899" /><Circle cx="10" cy="20" r="5" fill="#CDA788" /><Circle cx="38" cy="20" r="5" fill="#E4B69A" /><Path d="M14 40V29q0-10 10-10t10 10v11" fill="#BFD6B4" /><Path d="M3 40v-7q0-9 9-9m24 0q9 0 9 9v7" /></>; break;
    case "home": drawing = <><Path d="m5 22 19-16 19 16M10 19v23h28V19" fill="#F5D9B1" /><Path d="M20 42V28h9v14" fill="#B5CFA9" /><Path d="M11 21h26" /></>; break;
    case "ear": drawing = <><Path d="M15 18C11 1 37 1 37 17c0 11-9 12-10 20-2 10-14 8-14 0" fill="#F6DDAC" /><Path d="M20 18c-3-8 10-11 11-2 1 8-10 6-9 14" /><Path d="M6 12q-5 10 0 18" /></>; break;
    case "flower": drawing = <><Path d="M24 45V24m0 13q-11 0-12-9 11 0 12 9m0 2q10 0 12-9" /><Path d="M24 8c-5-12-15-3-10 4-13-3-15 10-5 12-8 10 5 17 11 7 4 13 17 8 14-2 12 3 17-10 5-14 3-10-10-15-15-7Z" fill="#F4D18F" /><Circle cx="24" cy="20" r="6" fill="#EDB298" /></>; break;
    case "tree": drawing = <><Path d="M21 42V23h7v19" fill="#D5AE88" /><Path d="M9 28C-1 19 8 8 17 10c0-12 18-12 18 0 13-3 17 14 6 19Z" fill="#B3CF9E" /><Path d="m24 26-7-6m7 4 8-8" /></>; break;
    case "bird": drawing = <><Path d="M8 21q-7-4-5-10 8 0 14 9 12-12 20-2l8 3-8 4c-2 18-29 18-29-4Z" fill="#EADAB3" /><Path d="M13 23q8-10 13-3-2 9-11 10" fill="#B9D3AC" /><Circle cx="33" cy="19" r="1.2" fill="#4D7062" /><Path d="m20 36-3 6m10-6-1 6" /></>; break;
    case "food": drawing = <><Ellipse cx="24" cy="35" rx="20" ry="8" fill="#EBEAD6" /><Path d="M8 31V19c0-14 32-14 32 0v12q-16 6-32 0Z" fill="#F2C77F" /><Path d="m16 14-2 7m12-9-3 9m10-8-2 8" /></>; break;
    case "water": drawing = <><Path d="M24 4C20 13 10 21 10 29a14 14 0 0 0 28 0c0-8-10-16-14-25Z" fill="#B3D8E0" /><Path d="M17 27q-2 8 6 10" /></>; break;
    case "shield": drawing = <><Path d="M24 4 7 11v13c0 11 17 20 17 20s17-9 17-20V11Z" fill="#C5DAB5" /><Path d="m15 25 6 6 13-15" /></>; break;
    case "help": drawing = <><Path d="M5 36h10l7 6 20-16c4-4-1-7-5-4l-9 6" fill="#E9C8A5" /><Path d="M4 25h13l8 5q7 5 0 7l-9-4" fill="#E9C8A5" /><Path d="M27 20S16 13 18 7c2-5 8-5 10 0 3-5 10-4 10 2 0 5-11 11-11 11Z" fill="#F1BDA9" /></>; break;
    case "forgive": drawing = <><Path d="M24 34S12 27 12 20c0-8 10-9 12-2 3-7 12-6 12 2 0 7-12 14-12 14Z" fill="#F1BDA9" /><Path d="M5 21A19 19 0 0 1 37 9m6 18A19 19 0 0 1 11 40M37 3v8h-8M11 46v-8h8" /></>; break;
    case "world": drawing = <><Circle cx="24" cy="24" r="19" fill="#BAD9E0" /><Path d="m10 12 10-3 5 7-4 8-8 2-3-7m20-9 8 8-4 5 6 7-8 9-8-3 2-11 8-2" fill="#B5CE9E" /></>; break;
    case "road": drawing = <><Path d="M4 44q33-13 18-23T30 4h8c-22 10-4 13 0 21s-5 15-7 19Z" fill="#EBD6AF" /><Path d="m18 40 4-3m6-7-1-4m-4-9-2-3m9-6 3-1" /></>; break;
    case "boat": drawing = <><Path d="m5 30 7 11h25l7-11Z" fill="#D1AB88" /><Path d="M24 29V4L7 26h17m4-19 12 19H28" fill="#F4E6C5" /><Path d="M4 45q7-4 14 0t14 0t12 0" stroke="#84AEB7" /></>; break;
    case "cloud": drawing = <><Path d="M10 29C-1 26 2 14 13 16c1-16 24-16 24 0 12-1 15 12 4 14Z" fill="#CFDCE4" /><Path d="m14 35-3 6m15-6-3 6m15-6-3 6" stroke="#83AEBE" /></>; break;
    case "seed": drawing = <><Ellipse cx="24" cy="26" rx="10" ry="14" transform="rotate(25 24 26)" fill="#D7B087" /><Path d="M18 32q2-10 9-15M9 44q15-5 30 0" /></>; break;
    case "rock": drawing = <><Path d="m4 38 7-21 15-8 13 11 6 18Z" fill="#C7CCC5" /><Path d="m11 17 14 9 14-6M25 26l-5 12" /></>; break;
    case "sand": drawing = <><Path d="M4 32q13-13 24-4t17-1v15H4Z" fill="#EDD5A4" /><Circle cx="12" cy="37" r="1" /><Circle cx="29" cy="34" r="1" /><Circle cx="36" cy="38" r="1" /><Path d="M8 18h1m10 2h1m9-4h1m10 5h1" /></>; break;
    case "basket": drawing = <><Path d="M6 22h36l-5 21H11Z" fill="#D6B187" /><Path d="M13 22C11-1 37-1 35 22M10 30h28m-26 7h24m-19-13 2 16m10-16-2 16" /></>; break;
    case "coin": drawing = <><Ellipse cx="24" cy="36" rx="17" ry="6" fill="#E8BD74" /><Path d="M7 30v6m34-6v6" /><Ellipse cx="24" cy="30" rx="17" ry="6" fill="#F4D68B" /><Circle cx="25" cy="15" r="11" fill="#F4D68B" /><Path d="m25 8 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" /></>; break;
    case "sheep": drawing = <><Path d="M10 18c-9-8 3-17 10-10 4-12 19-6 17 3 13-1 14 16 4 17 1 13-17 15-21 5-13 7-22-6-10-15Z" fill="#F3EBD9" /><Ellipse cx="26" cy="25" rx="10" ry="11" fill="#DFBB96" /><Path d="m12 21-7-3m31 1 8-2m-25 20v7m15-7v7" /><Circle cx="23" cy="24" r="1" /><Circle cx="30" cy="24" r="1" /><Path d="m24 30 3 2 3-2" /></>; break;
    case "search": drawing = <><Circle cx="20" cy="20" r="13" fill="#D9E6CF" /><Path d="m30 30 13 13M12 18q2-7 8-6" /></>; break;
    case "footsteps": drawing = <><Ellipse cx="15" cy="16" rx="7" ry="12" transform="rotate(-15 15 16)" fill="#DFBF9C" /><Ellipse cx="13" cy="35" rx="5" ry="7" fill="#DFBF9C" /><Ellipse cx="34" cy="24" rx="7" ry="12" transform="rotate(15 34 24)" fill="#DFBF9C" /><Ellipse cx="36" cy="42" rx="5" ry="4" fill="#DFBF9C" /></>; break;
    case "wheat": drawing = <><Path d="M24 44V10m0 25C9 34 8 25 10 23c11 0 15 6 14 12Zm0-9C9 25 8 16 10 14c11 0 15 6 14 12Zm0 9c15-1 16-10 14-12-11 0-15 6-14 12Zm0-9c15-1 16-10 14-12-11 0-15 6-14 12ZM24 13c-8-3-7-10 0-12 7 3 8 9 0 12Z" fill="#ECD394" /></>; break;
    default: drawing = null;
  }
  return <Svg width={size} height={size} viewBox="0 0 48 48" accessible={false}><G stroke="#4D7062" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none">{drawing}</G></Svg>;
}
