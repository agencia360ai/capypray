import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { gate, HOLD_MS, isCorrect, makeChallenge } from "@/parent/gate";
import { P } from "@/parent/strings";

// Parental gate screen. next = "corner" | "paywall" | "onboarding".
export default function GateScreen() {
  const { next = "corner" } = useLocalSearchParams<{ next?: string }>();
  const [c, setC] = useState(() => makeChallenge());
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState(false);
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const solved = picked !== null && isCorrect(c, picked);

  const startHold = () => {
    if (!solved) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      gate.open();
      router.replace(`/parent/${next}` as never);
    }, HOLD_MS);
  };
  const stopHold = () => {
    setHolding(false);
    if (timer.current) clearTimeout(timer.current);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{P.gate.title}</Text>
      <Text style={styles.hint}>{P.gate.hint}</Text>
      <Text style={styles.question}>
        {c.a} {c.op} {c.b} = ?
      </Text>
      <View style={styles.row}>
        {c.options.map((o) => (
          <Pressable
            key={o}
            style={[styles.opt, picked === o && (solved ? styles.optOk : styles.optBad)]}
            onPress={() => {
              setPicked(o);
              if (!isCorrect(c, o)) {
                setWrong(true);
                setTimeout(() => {
                  setC(makeChallenge());
                  setPicked(null);
                  setWrong(false);
                }, 900);
              }
            }}
          >
            <Text style={styles.optText}>{o}</Text>
          </Pressable>
        ))}
      </View>
      {wrong && <Text style={styles.wrong}>{P.gate.wrong}</Text>}
      <Pressable style={[styles.hold, !solved && styles.disabled, holding && styles.holding]} onPressIn={startHold} onPressOut={stopHold} disabled={!solved}>
        <Text style={styles.holdText}>{holding ? P.gate.holding : P.gate.hold}</Text>
      </Pressable>
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>{P.corner.back}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFF3DC", padding: 24, paddingTop: 80, gap: 16 },
  title: { fontSize: 26, fontWeight: "800", color: "#3b2a1a" },
  hint: { fontSize: 16, color: "#6b4a2b" },
  question: { fontSize: 40, fontWeight: "800", color: "#3b2a1a", textAlign: "center", marginVertical: 12, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center" },
  opt: { minWidth: 72, padding: 16, borderRadius: 16, backgroundColor: "#fff", borderWidth: 3, borderColor: "#f1e2c8", alignItems: "center" },
  optOk: { borderColor: "#5fb37a" },
  optBad: { borderColor: "#d9534f" },
  optText: { fontSize: 22, fontWeight: "700", color: "#3b2a1a", fontVariant: ["tabular-nums"] },
  wrong: { textAlign: "center", color: "#d9534f" },
  hold: { marginTop: 12, backgroundColor: "#FFB84D", borderRadius: 24, padding: 20, alignItems: "center" },
  holding: { backgroundColor: "#f0a030" },
  disabled: { opacity: 0.4 },
  holdText: { fontSize: 20, fontWeight: "800", color: "#3b2a1a" },
  back: { alignItems: "center", padding: 12 },
  backText: { color: "#6b4a2b", fontSize: 16 },
});
