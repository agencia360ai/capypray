import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { getPack } from "@/content/pack";
import { glyph } from "@/ui/icons";
import * as haptics from "@/ui/haptics";
import { memoryCols, memoryLevel } from "../memory";
import { GameShell, useCheer } from "./GameShell";

export function MemoryGame({ level, onWin }: { level: number; onWin: () => void }) {
  const pieces = getPack().companion.games!.pieces;
  const deck = useMemo(() => memoryLevel(level, pieces.length), [level, pieces.length]);
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<number>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cheer = useCheer();
  useEffect(() => () => clearTimeout(timer.current), []);
  const won = found.size === deck.length;
  const cols = memoryCols(deck.length);
  const width = Math.min(useWindowDimensions().width, 600) - 32;
  const size = Math.min(92, Math.floor((width - (cols - 1) * 10) / cols));

  const flip = (i: number) => {
    if (open.length >= 2 || open.includes(i) || found.has(deck[i]!.id)) return;
    void haptics.tap();
    const next = [...open, i];
    setOpen(next);
    if (next.length < 2) return;
    const [a, b] = next.map((k) => deck[k]!);
    if (a!.kind === b!.kind) {
      timer.current = setTimeout(() => { setFound((f) => new Set([...f, a!.id, b!.id])); setOpen([]); cheer(); }, 350);
    } else {
      timer.current = setTimeout(() => setOpen([]), 900);
    }
  };
  const retry = () => { clearTimeout(timer.current); setOpen([]); setFound(new Set()); };

  return (
    <GameShell game="memory" level={level} won={won} lost={false} onNext={onWin} onRetry={retry}>
      <View style={[s.grid, { width: cols * size + (cols - 1) * 10 }]}>
        {deck.map((card, i) => {
          const up = open.includes(i) || found.has(card.id);
          return (
            <Pressable key={card.id} onPress={() => flip(i)} accessibilityRole="button" testID={`card-${i}`} style={[s.card, { width: size, height: size * 1.12 }, up ? s.up : s.down, found.has(card.id) && s.found]}>
              <Text style={{ fontSize: size * 0.48 }}>{up ? glyph(pieces[card.kind]) : "🌿"}</Text>
            </Pressable>
          );
        })}
      </View>
    </GameShell>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingVertical: 12, justifyContent: "center" },
  card: { borderRadius: 18, alignItems: "center", justifyContent: "center", borderBottomWidth: 4 },
  down: { backgroundColor: "#7DB38A", borderBottomColor: "#5A8F68" },
  up: { backgroundColor: "#FFFFFF", borderBottomColor: "#E6D8BE" },
  found: { backgroundColor: "#F3F8EC", opacity: 0.75 },
});
