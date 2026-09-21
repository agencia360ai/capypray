import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

/** Text-free collectible artwork. Asset keys come from the content pack. */
export function RewardArt({ asset, size = 88 }: { asset: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
    <Ellipse cx="50" cy="84" rx="28" ry="6" fill="#667C5820" />
    <G strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
      {asset === "flower" ? <>
        <Path d="M50 77V48M49 69C31 71 27 58 29 55c15-1 23 8 20 14M51 60c0-15 12-19 20-16 0 11-8 18-20 16" stroke="#5D875C" fill="#95C278" />
        {[0, 60, 120, 180, 240, 300].map(a => <G key={a} transform={"rotate(" + a + " 50 43)"}><Ellipse cx="50" cy="27" rx="11" ry="16" fill="#F7C3AD" stroke="#C7856F" /></G>)}
        <Circle cx="50" cy="43" r="14" fill="#FFD36C" stroke="#CA9743" /><Path d="M43 39q6-6 12-1" stroke="#FFF1C0" fill="none" />
      </> : asset === "scarf" ? <>
        <Path d="M36 45 29 78q10 8 21 1l7-31" fill="#EA9983" stroke="#B96B59" />
        <Path d="m52 45 9 34 17-7-13-33" fill="#F5B79A" stroke="#B96B59" />
        <Path d="M25 27q25-15 50 0l2 20q-27 20-54-1Z" fill="#EBA58B" stroke="#B96B59" />
        <Path d="M25 29q23 15 50 0M26 37q24 15 49 0M32 68l19 3m11-5 10-4" stroke="#FAD5B9" fill="none" strokeWidth="5" />
        <Path d="m30 79-1 6m9-3v6m9-8v6m17-6 2 5m5-8 3 5m3-8 3 5" stroke="#B96B59" fill="none" />
      </> : asset === "nightcap" ? <>
        <Path d="M23 68C24 23 48 8 66 21c10 8 9 24 17 27-13 6-23-3-23-11 0 12 8 19 8 31Z" fill="#A7AFDC" stroke="#6A739F" />
        <Path d="M29 56c1-17 9-30 19-33" fill="none" stroke="#CFD6F2" strokeWidth="6" />
        <Path d="m45 35 2 5 6 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1Z" fill="#FFE3A1" stroke="none" />
        <Rect x="19" y="64" width="53" height="14" rx="7" fill="#FFF0CC" stroke="#C5AF7E" /><Circle cx="82" cy="49" r="9" fill="#FFF0CC" stroke="#C5AF7E" />
      </> : asset === "lily" ? <>
        <Path d="M81 64c0 19-63 24-65 1-2-21 42-25 65-1L51 65l13 11" fill="#8DBB87" stroke="#5D875C" />
        <Path d="M25 67q6-8 15-9m13 10-12 11" stroke="#B9D7A6" fill="none" />
        <Path d="M50 62C26 60 27 39 31 37c14 0 20 13 19 25Z" fill="#F2AFB4" stroke="#C98391" />
        <Path d="M50 62c22-1 23-23 18-25-12 2-20 12-18 25Z" fill="#F7C9CB" stroke="#C98391" />
        <Path d="M50 61c-18-12-11-29 0-37 12 11 17 28 0 37Z" fill="#FFE0D8" stroke="#C98391" /><Ellipse cx="50" cy="60" rx="8" ry="4" fill="#F6C85E" stroke="none" />
      </> : asset === "verse" ? <>
        <Rect x="23" y="16" width="57" height="65" rx="8" fill="#BE966D" stroke="#98754F" transform="rotate(7 50 50)" />
        <Rect x="18" y="12" width="58" height="65" rx="8" fill="#FFF7DC" stroke="#CDB483" />
        <Path d="M23 63q14-22 28-6t20-2v16H23" fill="#BED09B" stroke="none" />
        <Circle cx="59" cy="28" r="8" fill="#F6D77E" stroke="none" />
        <Path d="M28 51q-6-6 0-11 0-9 8-8 5-7 11 0 9 0 8 9 5 7-2 11Z" fill="#FFFFFF" stroke="#A99C7E" /><Ellipse cx="51" cy="46" rx="7" ry="8" fill="#DCC7A3" stroke="#A99C7E" /><Circle cx="53" cy="43" r="1.4" fill="#665D4F" stroke="none" /><Path d="M33 53v7m12-7v7" stroke="#A99C7E" />
      </> : asset === "badge" ? <>
        <Path d="m32 59-6 27 14-6 10 8 5-28m2-1 7 27 9-8 12 2-14-28" fill="#A9C5AD" stroke="#6C927B" />
        <Circle cx="51" cy="43" r="29" fill="#F3CE78" stroke="#C49548" /><Circle cx="51" cy="43" r="23" fill="#FFF0BB" stroke="#D8B465" />
        <Path d="m51 26 5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2Z" fill="#E7B654" stroke="#BE8B37" /><Path d="m49 31 2-5 5 11" stroke="#FFE9AD" fill="none" />
      </> : <>
        <Path d="m50 14 11 22 25 4-18 18 4 26-22-12-23 12 5-26-18-18 25-4Z" fill="#F8D875" stroke="#CBA04C" />
        <Path d="m39 39 11-21 9 20" fill="none" stroke="#FFF1B7" strokeWidth="5" /><Circle cx="41" cy="50" r="2.4" fill="#856A3F" stroke="none" /><Circle cx="59" cy="50" r="2.4" fill="#856A3F" stroke="none" /><Path d="M44 58q6 6 12 0" stroke="#856A3F" fill="none" />
      </>}
    </G>
  </Svg>;
}
