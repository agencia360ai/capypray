import { getCopy, formatCopy } from "@/i18n";
import { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from "react-native";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import * as haptics from "@/ui/haptics";
import { T } from "@/ui/theme";
import { SIZE, deal, emptyBoard, fits, fitsAnywhere, place, target, type Board, type Piece } from "../blocks";
import { GameShell, PALETTE, useCheer } from "./GameShell";

const extent = (p: Piece) => ({ rows: Math.max(...p.cells.map(([r]) => r)) + 1, cols: Math.max(...p.cells.map(([, c]) => c)) + 1 });

export function BlocksGame({ level, onWin }: { level: number; onWin: () => void }) {
  const a11y = getCopy().gameAccessibility;
  const copy = getPack().companion.games!;
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [deals, setDeals] = useState(0);
  const [tray, setTray] = useState<(Piece | null)[]>(() => deal(level, 0, emptyBoard()));
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [hover, setHover] = useState<{ row: number; col: number; piece: Piece } | null>(null);
  const cheer = useCheer();
  const goal = target(level);
  const won = score >= goal;
  const lost = !won && tray.every((p) => !p || !fitsAnywhere(board, p)) && tray.some(Boolean);
  const width = Math.min(useWindowDimensions().width, 600) - 32;
  const cell = Math.min(40, Math.floor(width / SIZE));
  const boardRef = useRef<View>(null);
  const origin = useRef({ x: 0, y: 0 });
  const measure = () => boardRef.current?.measureInWindow((x, y) => { origin.current = { x, y }; });

  const drop = (i: number, row: number, col: number) => {
    const piece = tray[i];
    if (!piece || won || !fits(board, piece, row, col)) { void haptics.nope(); return false; }
    const r = place(board, piece, row, col);
    const rest = tray.map((p, k) => (k === i ? null : p));
    const refill = rest.every((p) => !p);
    setBoard(r.board);
    setScore((s) => s + r.gained);
    setTray(refill ? deal(level, deals + 1, r.board) : rest);
    if (refill) setDeals((d) => d + 1);
    setPicked(null);
    void haptics.tap();
    if (r.cleared) cheer();
    return true;
  };
  /** Where a dragged piece lands: its top-left cell sits one cell above and left of centre under the finger. */
  const anchor = (piece: Piece, pageX: number, pageY: number) => {
    const { rows, cols } = extent(piece);
    return { row: Math.round((pageY - origin.current.y) / cell - rows - 0.5), col: Math.round((pageX - origin.current.x) / cell - cols / 2) };
  };
  const retry = () => { setBoard(emptyBoard()); setScore(0); setDeals(0); setTray(deal(level, 0, emptyBoard())); setPicked(null); };

  return (
    <GameShell game="blocks" level={level} won={won} lost={lost} onNext={onWin} onRetry={retry}
      status={<View style={s.meter}><View style={[s.fill, { width: `${Math.min(100, (score / goal) * 100)}%` }]} /><Text style={s.meterText}>{interpolate(copy.score, { score: String(Math.min(score, goal)), target: String(goal) })}</Text></View>}>
      <View ref={boardRef} onLayout={measure} style={[s.board, { width: cell * SIZE + 6, height: cell * SIZE + 6 }]}>
        {board.map((row, r) => row.map((v, c) => {
          const ghost = hover && hover.piece.cells.some(([pr, pc]) => hover.row + pr === r && hover.col + pc === c);
          const ok = ghost && fits(board, hover!.piece, hover!.row, hover!.col);
          return (
            <Pressable key={`${r}-${c}`} testID={`cell-${r}-${c}`} accessibilityRole="button" accessibilityLabel={formatCopy(a11y.cell, { row: r + 1, column: c + 1, contents: v === null ? a11y.empty : a11y.colors[v]! })} accessibilityHint={a11y.cellHint} disabled={won || lost} onPress={() => picked !== null && drop(picked, r, c)}
              style={[s.cell, { width: cell - 2, height: cell - 2, left: 3 + c * cell, top: 3 + r * cell, backgroundColor: v !== null ? PALETTE[v] : ok ? PALETTE[hover!.piece.color] + "88" : "#EDE5D2" }]} />
          );
        }))}
      </View>
      <View style={s.tray}>
        {tray.map((piece, i) => (
          <TrayPiece key={piece?.id ?? `empty-${i}`} piece={piece} small={Math.max(14, Math.round(cell * 0.55))} selected={picked === i}
            onTap={() => { setPicked(picked === i ? null : i); void haptics.tap(); measure(); }}
            onMove={(x, y) => { if (piece) { measure(); setHover({ ...anchor(piece, x, y), piece }); } }}
            onDrop={(x, y) => { setHover(null); if (piece) { const a = anchor(piece, x, y); drop(i, a.row, a.col); } }} />
        ))}
      </View>
    </GameShell>
  );
}

/** A piece in the tray: tap to pick it (then tap a cell), or drag it straight onto the garden. */
function TrayPiece({ piece, small, selected, onTap, onMove, onDrop }: { piece: Piece | null; small: number; selected: boolean; onTap: () => void; onMove: (x: number, y: number) => void; onDrop: (x: number, y: number) => void }) {
  const a11y = getCopy().gameAccessibility;
  const pan = useRef(new Animated.ValueXY()).current;
  const handlers = useRef({ onTap, onMove, onDrop });
  handlers.current = { onTap, onMove, onDrop };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (e: GestureResponderEvent, g) => { pan.setValue({ x: g.dx, y: g.dy }); handlers.current.onMove(e.nativeEvent.pageX, e.nativeEvent.pageY); },
    onPanResponderRelease: (e, g) => {
      pan.setValue({ x: 0, y: 0 });
      if (Math.abs(g.dx) + Math.abs(g.dy) < 8) handlers.current.onTap();
      else handlers.current.onDrop(e.nativeEvent.pageX, e.nativeEvent.pageY);
    },
    onPanResponderTerminate: () => pan.setValue({ x: 0, y: 0 }),
  }), [pan]);
  if (!piece) return <View style={s.slot} />;
  const { rows, cols } = extent(piece);
  return (
    <View style={[s.slot, selected && s.slotOn]}>
      <Animated.View {...responder.panHandlers} accessible accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={formatCopy(a11y.piece, { color: a11y.colors[piece.color]!, count: piece.cells.length, positions: piece.cells.map(([r, c]) => `${r + 1}, ${c + 1}`).join("; ") })} accessibilityHint={a11y.pieceHint} onAccessibilityTap={onTap} accessibilityActions={[{ name: "activate" }]} onAccessibilityAction={e => { if (e.nativeEvent.actionName === "activate") onTap(); }} testID={`piece-${piece.id}`} style={{ width: cols * small, height: rows * small, transform: pan.getTranslateTransform() }}>
        {piece.cells.map(([r, c]) => <View key={`${r}-${c}`} style={[s.block, { width: small - 2, height: small - 2, left: c * small, top: r * small, backgroundColor: PALETTE[piece.color] }]} />)}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  meter: { height: 26, borderRadius: 13, backgroundColor: "#EDE5D2", overflow: "hidden", justifyContent: "center", marginHorizontal: 20 },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#9BD08A" },
  meterText: { textAlign: "center", fontFamily: T.font.black, fontSize: 13, color: T.color.ink },
  board: { backgroundColor: "#D9CBAE", borderRadius: 14 },
  cell: { position: "absolute", borderRadius: 6 },
  tray: { flexDirection: "row", justifyContent: "space-around", alignSelf: "stretch", marginTop: 12, minHeight: 96 },
  slot: { width: 100, height: 96, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  slotOn: { backgroundColor: "#EEF4E8" },
  block: { position: "absolute", borderRadius: 5 },
});
