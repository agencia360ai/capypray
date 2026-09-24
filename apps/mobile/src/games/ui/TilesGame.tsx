import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { getPack } from "@/content/pack";
import { glyph } from "@/ui/icons";
import * as haptics from "@/ui/haptics";
import { COLS, ROWS, TRAY, isFree, take, tilesLevel, tilesLost, tilesWon, type Tile } from "../tiles";
import { GameShell, useCheer } from "./GameShell";

export function TilesGame({ level, onWin }: { level: number; onWin: () => void }) {
  const pieces = getPack().companion.games!.pieces;
  const start = useMemo(() => tilesLevel(level), [level]);
  const [board, setBoard] = useState<Tile[]>(start);
  const [tray, setTray] = useState<number[]>([]);
  const cheer = useCheer();
  const won = tilesWon(board, tray);
  const lost = tilesLost(tray);
  const width = Math.min(useWindowDimensions().width, 600) - 40;
  const tile = Math.min(56, Math.floor(width / COLS));
  const slot = Math.min(46, Math.floor((width - 8) / TRAY) - 4);

  const tap = (t: Tile) => {
    if (won || lost) return;
    if (!isFree(t, board)) { void haptics.nope(); return; }
    void haptics.tap();
    const r = take(board, tray, t);
    setBoard(r.board);
    setTray(r.tray);
    if (r.matched) cheer();
  };

  return (
    <GameShell game="tiles" level={level} won={won} lost={lost} onNext={onWin} onRetry={() => { setBoard(start); setTray([]); }}>
      <View style={{ width: COLS * tile, height: ROWS * tile + 6, marginVertical: 6 }}>
        {[...board].sort((a, b) => a.z - b.z).map((t) => {
          const free = isFree(t, board);
          return (
            <Pressable key={t.id} onPress={() => tap(t)} accessibilityRole="button" testID={`tile-${t.id}`} style={[s.tile, { width: tile - 4, height: tile - 2, left: t.x * tile, top: t.y * tile - t.z * 2, zIndex: t.z }, !free && s.covered]}>
              <Text style={{ fontSize: tile * 0.5, opacity: free ? 1 : 0.45 }}>{glyph(pieces[t.kind])}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={s.tray}>
        {Array.from({ length: TRAY }, (_, i) => (
          <View key={i} style={[s.slot, { width: slot, height: slot }]}>
            {tray[i] !== undefined && <Text style={{ fontSize: slot * 0.55 }}>{glyph(pieces[tray[i]!])}</Text>}
          </View>
        ))}
      </View>
    </GameShell>
  );
}

const s = StyleSheet.create({
  tile: { position: "absolute", borderRadius: 12, backgroundColor: "#FFFDF7", borderWidth: 2, borderColor: "#E9DCC2", borderBottomWidth: 5, borderBottomColor: "#D6C29D", alignItems: "center", justifyContent: "center" },
  covered: { backgroundColor: "#E8E0CF" },
  tray: { flexDirection: "row", gap: 4, padding: 6, borderRadius: 18, backgroundColor: "#6E5A43" },
  slot: { borderRadius: 10, backgroundColor: "#FFF6E4", alignItems: "center", justifyContent: "center" },
});
