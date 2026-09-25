import { getCopy, formatCopy } from "@/i18n";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CAP, hasMove, isSorted, pour, pourable, sortLevel, type Jar } from "../sort";
import { GameShell, PALETTE, useCheer } from "./GameShell";
import * as haptics from "@/ui/haptics";

export function SortGame({ level, onWin }: { level: number; onWin: () => void }) {
  const reward = getCopy().playRewards;
  const [history, setHistory] = useState<Jar[][]>([]);
  const [invalid, setInvalid] = useState(false);
  const a11y = getCopy().gameAccessibility;
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
    setInvalid(false);
    if (held === null) {
      if (jars[i]!.length) { setHeld(i); void haptics.tap(); }
      return;
    }
    if (held === i) { setHeld(null); return; }
    if (pourable(jars, held, i)) {
      const next = pour(jars, held, i);
      setHistory(h => [...h, jars]);
      setJars(next);
      setHeld(null);
      void haptics.tap();
      const target = next[i]!;
      if (target.length === CAP && target.every((c) => c === target[0])) cheer();
      return;
    }
    void haptics.nope();
    setInvalid(true);
  };

  return (
    <GameShell game="sort" level={level} won={won} lost={false} onNext={onWin} onRetry={() => { setJars(start); setHeld(null); setHistory([]); setInvalid(false); }}>
      <View style={{ alignSelf: "stretch", gap: 8 }}>
        <Pressable accessibilityRole="button" disabled={!history.length || won} onPress={() => { setJars(history[history.length - 1]!); setHistory(h => h.slice(0, -1)); setHeld(null); setInvalid(false); }} style={{ minHeight: 44, alignSelf: "center", justifyContent: "center", paddingHorizontal: 20, borderRadius: 22, backgroundColor: history.length ? "#E3F1EE" : "#F0EEE8", opacity: history.length ? 1 : 0.5 }}><Text>{reward.undo}</Text></Pressable>
        <Text accessibilityLiveRegion="polite" style={{ textAlign: "center", color: "#476D58", minHeight: 18 }}>{!won && !hasMove(jars) ? reward.stuck : invalid ? reward.invalid : held !== null ? reward.selected : ""}</Text>
      </View>
      <View style={[s.jars, { width }]}>
        {jars.map((jar, i) => (
          <Pressable key={i} onPress={() => tapJar(i)} accessibilityRole="button" accessibilityLabel={formatCopy(a11y.jar, { number: i + 1, contents: jar.length ? [...jar].reverse().map(c => a11y.colors[c]).join(", ") : a11y.empty })} accessibilityHint={a11y.jarHint} accessibilityState={{ selected: held === i, disabled: won }} disabled={won} testID={`jar-${i}`} style={[s.jar, { width: jarW, height: unit * CAP + 18, transform: [{ translateY: held === i ? -16 : 0 }] }, held === i && s.held, held !== null && pourable(jars, held, i) > 0 && s.target]}>
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
  target: { borderColor: "#7CC46B", backgroundColor: "#EAF6DF" },
  held: { borderColor: "#476D58", backgroundColor: "#EEF4E8" },
  unit: { width: "100%", borderRadius: 8 },
});
