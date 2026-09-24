import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { CAP, isSorted, pour, pourable, sortLevel, type Jar } from "../sort";
import { GameShell, PALETTE, useCheer } from "./GameShell";
import * as haptics from "@/ui/haptics";

export function SortGame({ level, onWin }: { level: number; onWin: () => void }) {
  const start = useMemo(() => sortLevel(level).jars, [level]);
  const [jars, setJars] = useState<Jar[]>(start);
  const [held, setHeld] = useState<number | null>(null);
  const cheer = useCheer();
  const won = isSorted(jars);
  const width = Math.min(useWindowDimensions().width, 600) - 32;
  const perRow = jars.length <= 5 ? jars.length : Math.ceil(jars.length / 2);
  const jarW = Math.min(64, Math.floor(width / perRow) - 12);
  const unit = Math.round(jarW * 0.72);

  const tapJar = (i: number) => {
    if (won) return;
    if (held === null) {
      if (jars[i]!.length) { setHeld(i); void haptics.tap(); }
      return;
    }
    if (held === i) { setHeld(null); return; }
    if (pourable(jars, held, i)) {
      const next = pour(jars, held, i);
      setJars(next);
      setHeld(null);
      void haptics.tap();
      const target = next[i]!;
      if (target.length === CAP && target.every((c) => c === target[0])) cheer();
      return;
    }
    void haptics.nope();
    setHeld(jars[i]!.length ? i : null);
  };

  return (
    <GameShell game="sort" level={level} won={won} lost={false} onNext={onWin} onRetry={() => { setJars(start); setHeld(null); }}>
      <View style={[s.jars, { width }]}>
        {jars.map((jar, i) => (
          <Pressable key={i} onPress={() => tapJar(i)} accessibilityRole="button" testID={`jar-${i}`} style={[s.jar, { width: jarW, height: unit * CAP + 18, transform: [{ translateY: held === i ? -16 : 0 }] }, held === i && s.held]}>
            {jar.map((c, k) => (
              <View key={k} style={[s.unit, { height: unit - 4, backgroundColor: PALETTE[c], borderBottomLeftRadius: k === 0 ? 16 : 8, borderBottomRightRadius: k === 0 ? 16 : 8 }]} />
            ))}
          </Pressable>
        ))}
      </View>
    </GameShell>
  );
}

const s = StyleSheet.create({
  jars: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, paddingVertical: 20, rowGap: 22 },
  jar: { borderWidth: 3, borderTopWidth: 0, borderColor: "#C9B79A", backgroundColor: "#FFFFFFB0", borderBottomLeftRadius: 22, borderBottomRightRadius: 22, padding: 4, paddingTop: 10, flexDirection: "column-reverse", gap: 3 },
  held: { borderColor: "#476D58", backgroundColor: "#EEF4E8" },
  unit: { width: "100%", borderRadius: 8 },
});
