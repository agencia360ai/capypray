import { useMemo, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { getPack } from "@/content/pack";
import { glyph } from "@/ui/icons";
import * as haptics from "@/ui/haptics";
import { useReducedMotion } from "@/ui/motion";
import { COLS, ROWS, TRAY, isFree, take, tilesLevel, tilesLost, tilesWon, type Tile } from "../tiles";
import { GameShell, useCheer } from "./GameShell";

const FLY = 240; // tile board → tray
const POP = 420; // matched triple rises and pops

type Flier = { key: number; kind: number; from: { x: number; y: number }; to: { x: number; y: number }; anim: Animated.Value };
/** While a triple pops we keep showing the pre-match tray; the three matching tiles render as animated ghosts. */
type Popping = { tray: number[]; kind: number; arriving: number; started: boolean; ghosts: { key: number; slot: number; anim: Animated.Value; delay: number }[] };

export function TilesGame({ level, onWin }: { level: number; onWin: () => void }) {
  const pieces = getPack().companion.games!.pieces;
  const start = useMemo(() => tilesLevel(level), [level]);
  const [board, setBoard] = useState<Tile[]>(start);
  const [tray, setTray] = useState<number[]>([]);
  const [fliers, setFliers] = useState<Flier[]>([]);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [pop, setPop] = useState<Popping | null>(null);
  const reduced = useReducedMotion();
  const cheer = useCheer();
  const seq = useRef(0);
  const boardBox = useRef({ x: 0, y: 0 });
  const trayBox = useRef({ x: 0, y: 0 });
  const won = tilesWon(board, tray);
  const lost = tilesLost(tray);
  const width = Math.min(useWindowDimensions().width, 600) - 40;
  const tile = Math.min(56, Math.floor(width / COLS));
  const slot = Math.min(46, Math.floor((width - 8) / TRAY) - 4);
  const slotPos = (i: number) => ({ x: trayBox.current.x + 6 + i * (slot + 4), y: trayBox.current.y + 6 });

  const matchDone = () => { cheer(); void haptics.success(); };

  const tap = (t: Tile) => {
    if (won || lost) return;
    if (!isFree(t, board)) { void haptics.nope(); return; }
    void haptics.tap();
    if (pop) setPop(null); // snap a still-running pop so the display never lags the real tray
    const r = take(board, tray, t);
    const at = tray.lastIndexOf(t.kind);
    const insertAt = at < 0 ? tray.length : at + 1;
    setBoard(r.board);
    setTray(r.tray);
    if (reduced) { if (r.matched) matchDone(); return; }

    const from = { x: boardBox.current.x + t.x * tile, y: boardBox.current.y + t.y * tile - t.z * 2 };
    const anim = new Animated.Value(0);
    const key = ++seq.current;
    setFliers((f) => [...f, { key, kind: t.kind, from, to: slotPos(insertAt), anim }]);
    const flight = Animated.timing(anim, { toValue: 1, duration: FLY, easing: Easing.in(Easing.quad), useNativeDriver: true });

    if (!r.matched) {
      setHidden((h) => new Set(h).add(insertAt));
      flight.start(() => {
        setFliers((f) => f.filter((x) => x.key !== key));
        setHidden((h) => { const n = new Set(h); n.delete(insertAt); return n; });
      });
      return;
    }
    const withTile = [...tray.slice(0, insertAt), t.kind, ...tray.slice(insertAt)];
    const slots = withTile.map((k, i) => (k === t.kind ? i : -1)).filter((i) => i >= 0);
    setPop({ tray: withTile, kind: t.kind, arriving: insertAt, started: false, ghosts: slots.map((s, gi) => ({ key: ++seq.current, slot: s, anim: new Animated.Value(0), delay: gi * 70 })) });
    flight.start(() => {
      setFliers((f) => f.filter((x) => x.key !== key));
      matchDone();
      setPop((p) => {
        if (!p || p.tray !== withTile) return p;
        p.ghosts.forEach((g) => Animated.timing(g.anim, { toValue: 1, duration: POP, delay: g.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }).start());
        return { ...p, started: true };
      });
      setTimeout(() => setPop((p) => (p && p.tray === withTile ? null : p)), POP + slots.length * 70 + 60);
    });
  };

  const retry = () => { setBoard(start); setTray([]); setFliers([]); setHidden(new Set()); setPop(null); };
  const shown = pop ? pop.tray : tray;

  return (
    <GameShell game="tiles" level={level} won={won} lost={lost} onNext={onWin} onRetry={retry}>
      <View style={{ alignItems: "center" }}>
        <View onLayout={(e) => { boardBox.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y }; }} style={{ width: COLS * tile, height: ROWS * tile + 6, marginVertical: 6 }}>
          {[...board].sort((a, b) => a.z - b.z).map((t) => {
            const free = isFree(t, board);
            return (
              <Pressable key={t.id} onPress={() => tap(t)} accessibilityRole="button" testID={`tile-${t.id}`} style={[s.tile, { width: tile - 4, height: tile - 2, left: t.x * tile, top: t.y * tile - t.z * 2, zIndex: t.z }, !free && s.covered]}>
                <Text style={{ fontSize: tile * 0.5, opacity: free ? 1 : 0.45 }}>{glyph(pieces[t.kind])}</Text>
              </Pressable>
            );
          })}
        </View>
        <View onLayout={(e) => { trayBox.current = { x: e.nativeEvent.layout.x, y: e.nativeEvent.layout.y }; }} style={s.tray}>
          {Array.from({ length: TRAY }, (_, i) => {
            const kind = shown[i];
            const ghosted = pop !== null && kind === pop.kind; // rendered by the pop overlay instead
            return (
              <View key={i} style={[s.slot, { width: slot, height: slot }]}>
                {kind !== undefined && !ghosted && !(!pop && hidden.has(i)) && <Text style={{ fontSize: slot * 0.55 }}>{glyph(pieces[kind])}</Text>}
              </View>
            );
          })}
        </View>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {fliers.map((f) => {
            const dx = f.to.x + slot / 2 - (f.from.x + (tile - 4) / 2);
            const dy = f.to.y + slot / 2 - (f.from.y + (tile - 2) / 2);
            return (
              <Animated.View key={f.key} style={[s.tile, { width: tile - 4, height: tile - 2, left: f.from.x, top: f.from.y, transform: [
                { translateX: f.anim.interpolate({ inputRange: [0, 1], outputRange: [0, dx] }) },
                { translateY: f.anim.interpolate({ inputRange: [0, 1], outputRange: [0, dy] }) },
                { scale: f.anim.interpolate({ inputRange: [0, 1], outputRange: [1, slot / (tile - 4)] }) },
              ] }]}>
                <Text style={{ fontSize: tile * 0.5 }}>{glyph(pieces[f.kind])}</Text>
              </Animated.View>
            );
          })}
          {pop?.ghosts.map((g) => {
            const p = slotPos(g.slot);
            const waiting = !pop.started && g.slot === pop.arriving; // the flier is still on its way here
            return (
              <Animated.View key={g.key} style={{ position: "absolute", left: p.x, top: p.y, width: slot, height: slot, alignItems: "center", justifyContent: "center", opacity: waiting ? 0 : g.anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }), transform: [
                { translateY: g.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -18, -26] }) },
                { scale: g.anim.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [1, 1.25, 1.2, 0.1] }) },
              ] }}>
                <Text style={{ fontSize: slot * 0.55 }}>{glyph(pieces[pop.kind])}</Text>
                <Animated.Text style={{ position: "absolute", top: -10, right: -8, fontSize: 16, opacity: g.anim.interpolate({ inputRange: [0, 0.55, 0.75, 1], outputRange: [0, 0, 1, 0] }) }}>✨</Animated.Text>
              </Animated.View>
            );
          })}
        </View>
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
