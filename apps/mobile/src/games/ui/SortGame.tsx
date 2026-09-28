import { getCopy, formatCopy } from "@/i18n";
import { useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { CAP, hasMove, isSorted, pour, pourable, sortLevel, type Jar } from "../sort";
import { GameShell, PALETTE, useCheer } from "./GameShell";
import { useReducedMotion } from "@/ui/motion";
import * as haptics from "@/ui/haptics";

const POUR = 360; // one unit's arc, jar to jar
const STAGGER = 80;

type Flier = { key: number; color: number; anim: Animated.Value; fromX: number; fromY: number; toX: number; toY: number; srcTop: number; dstTop: number };

export function SortGame({ level, onWin }: { level: number; onWin: () => void }) {
  const reward = getCopy().playRewards;
  const [history, setHistory] = useState<Jar[][]>([]);
  const [invalid, setInvalid] = useState(false);
  const a11y = getCopy().gameAccessibility;
  const start = useMemo(() => sortLevel(level).jars, [level]);
  const [jars, setJars] = useState<Jar[]>(start);
  const [held, setHeld] = useState<number | null>(null);
  const [fliers, setFliers] = useState<Flier[]>([]);
  const [incoming, setIncoming] = useState<{ jar: number; from: number } | null>(null);
  const reduced = useReducedMotion();
  const cheer = useCheer();
  const seq = useRef(0);
  const boxes = useRef<Record<number, { x: number; y: number; w: number; h: number }>>({});
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const won = isSorted(jars);
  const width = Math.min(useWindowDimensions().width, 600) - 32;
  const perRow = jars.length <= 5 ? jars.length : Math.ceil(jars.length / 2);
  const jarW = Math.min(64, Math.floor(width / perRow) - 12);
  const unit = Math.round(jarW * 0.72);
  const unitH = unit - 4, gap = 3, pad = 4, wall = 3;
  /** Top edge of the unit at stack index k inside a jar's box. */
  const restY = (box: { y: number; h: number }, k: number) => box.y + box.h - pad - wall - (k + 1) * unitH - k * gap;

  const tapJar = (i: number) => {
    if (won) return;
    setInvalid(false);
    if (held === null) {
      if (jars[i]!.length) { setHeld(i); void haptics.tap(); }
      return;
    }
    if (held === i) { setHeld(null); return; }
    const n = pourable(jars, held, i);
    if (n) {
      const next = pour(jars, held, i);
      setHistory(h => [...h, jars]);
      setJars(next);
      setHeld(null);
      void haptics.tap();
      const src = boxes.current[held], dst = boxes.current[i];
      if (!reduced && src && dst) {
        clearTimeout(settle.current);
        const color = jars[held]![jars[held]!.length - 1]!;
        const from = jars[held]!.length, to = jars[i]!.length;
        const fresh: Flier[] = Array.from({ length: n }, (_, m) => ({
          key: ++seq.current, color, anim: new Animated.Value(0),
          fromX: src.x + wall + pad, fromY: restY(src, from - 1 - m),
          toX: dst.x + wall + pad, toY: restY(dst, to + m),
          srcTop: src.y - 20, dstTop: dst.y - 20,
        }));
        setFliers(f => [...f, ...fresh]);
        setIncoming({ jar: i, from: to });
        fresh.forEach((f, m) => Animated.timing(f.anim, { toValue: 1, duration: POUR, delay: m * STAGGER, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start());
        settle.current = setTimeout(() => { setFliers([]); setIncoming(null); }, POUR + (n - 1) * STAGGER + 40);
      }
      const target = next[i]!;
      if (target.length === CAP && target.every((c) => c === target[0])) cheer();
      return;
    }
    void haptics.nope();
    setInvalid(true);
  };

  const retry = () => { clearTimeout(settle.current); setJars(start); setHeld(null); setHistory([]); setInvalid(false); setFliers([]); setIncoming(null); };

  return (
    <GameShell game="sort" level={level} won={won} lost={false} onNext={onWin} onRetry={retry}>
      <View style={{ alignSelf: "stretch", gap: 8 }}>
        <Pressable accessibilityRole="button" disabled={!history.length || won} onPress={() => { setJars(history[history.length - 1]!); setHistory(h => h.slice(0, -1)); setHeld(null); setInvalid(false); setFliers([]); setIncoming(null); }} style={{ minHeight: 44, alignSelf: "center", justifyContent: "center", paddingHorizontal: 20, borderRadius: 22, backgroundColor: history.length ? "#E3F1EE" : "#F0EEE8", opacity: history.length ? 1 : 0.5 }}><Text>{reward.undo}</Text></Pressable>
        <Text accessibilityLiveRegion="polite" style={{ textAlign: "center", color: "#476D58", minHeight: 18 }}>{!won && !hasMove(jars) ? reward.stuck : invalid ? reward.invalid : held !== null ? reward.selected : ""}</Text>
      </View>
      <View style={[s.jars, { width }]}>
        {jars.map((jar, i) => (
          <Pressable key={i} onLayout={(e) => { const l = e.nativeEvent.layout; boxes.current[i] = { x: l.x, y: l.y, w: l.width, h: l.height }; }} onPress={() => tapJar(i)} accessibilityRole="button" accessibilityLabel={formatCopy(a11y.jar, { number: i + 1, contents: jar.length ? [...jar].reverse().map(c => a11y.colors[c]).join(", ") : a11y.empty })} accessibilityHint={a11y.jarHint} accessibilityState={{ selected: held === i, disabled: won }} disabled={won} testID={`jar-${i}`} style={[s.jar, { width: jarW, height: unit * CAP + 18, transform: [{ translateY: held === i ? -16 : 0 }] }, held === i && s.held, held !== null && pourable(jars, held, i) > 0 && s.target]}>
            {jar.map((c, k) => (
              <View key={k} style={[s.unit, { height: unitH, backgroundColor: PALETTE[c], borderBottomLeftRadius: k === 0 ? 16 : 8, borderBottomRightRadius: k === 0 ? 16 : 8, opacity: incoming && incoming.jar === i && k >= incoming.from ? 0 : 1 }]} />
            ))}
          </Pressable>
        ))}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {fliers.map((f) => (
            <Animated.View key={f.key} style={{ position: "absolute", left: 0, top: 0, width: jarW - 2 * (wall + pad), height: unitH, borderRadius: 8, backgroundColor: PALETTE[f.color], transform: [
              { translateX: f.anim.interpolate({ inputRange: [0, 0.3, 0.65, 1], outputRange: [f.fromX, f.fromX, f.toX, f.toX] }) },
              { translateY: f.anim.interpolate({ inputRange: [0, 0.3, 0.65, 1], outputRange: [f.fromY, f.srcTop, f.dstTop, f.toY] }) },
            ] }} />
          ))}
        </View>
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
