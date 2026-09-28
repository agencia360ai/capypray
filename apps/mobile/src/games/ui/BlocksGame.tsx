import { getCopy, formatCopy } from "@/i18n";
import { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions, type GestureResponderEvent } from "react-native";
import { interpolate } from "@capy/content";
import { getPack } from "@/content/pack";
import * as haptics from "@/ui/haptics";
import { useReducedMotion } from "@/ui/motion";
import { T } from "@/ui/theme";
import { SIZE, deal, emptyBoard, fits, fitsAnywhere, place, target, type Board, type Piece } from "../blocks";
import { GameShell, PALETTE, useCheer, useScrollLock } from "./GameShell";

const extent = (p: Piece) => ({ rows: Math.max(...p.cells.map(([r]) => r)) + 1, cols: Math.max(...p.cells.map(([, c]) => c)) + 1 });

export function BlocksGame({ level, onWin }: { level: number; onWin: () => void }) {
  const a11y = getCopy().gameAccessibility;
  const copy = getPack().companion.games!;
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [deals, setDeals] = useState(0);
  const [tray, setTray] = useState<(Piece | null)[]>(() => deal(level, 0, emptyBoard()));
  const [score, setScore] = useState(0);
  // Screen-reader flow only: VoiceOver's activate action picks a piece, then a cell places it. Touch is pure drag.
  const [picked, setPicked] = useState<number | null>(null);
  const [hover, setHover] = useState<{ row: number; col: number; piece: Piece } | null>(null);
  const cheer = useCheer();
  const lock = useScrollLock();
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
  const retry = () => { setBoard(emptyBoard()); setScore(0); setDeals(0); setTray(deal(level, 0, emptyBoard())); setPicked(null); setHover(null); };

  const valid = hover !== null && fits(board, hover.piece, hover.row, hover.col);

  return (
    <GameShell game="blocks" level={level} won={won} lost={lost} onNext={onWin} onRetry={retry} scroll={false}
      status={<View style={s.meter}><View style={[s.fill, { width: `${Math.min(100, (score / goal) * 100)}%` }]} /><Text style={s.meterText}>{interpolate(copy.score, { score: String(Math.min(score, goal)), target: String(goal) })}</Text></View>}>
      <View ref={boardRef} onLayout={measure} style={[s.board, { width: cell * SIZE + 6, height: cell * SIZE + 6 }]}>
        {board.map((row, r) => row.map((v, c) => {
          const ghost = hover !== null && hover.piece.cells.some(([pr, pc]) => hover.row + pr === r && hover.col + pc === c);
          return (
            <Pressable key={`${r}-${c}`} testID={`cell-${r}-${c}`} accessibilityRole="button" accessibilityLabel={formatCopy(a11y.cell, { row: r + 1, column: c + 1, contents: v === null ? a11y.empty : a11y.colors[v]! })} accessibilityHint={a11y.cellHint} disabled={won || lost} onPress={() => picked !== null && drop(picked, r, c)}
              style={[s.cell, { width: cell - 2, height: cell - 2, left: 3 + c * cell, top: 3 + r * cell, backgroundColor: v !== null ? PALETTE[v] : ghost ? (valid ? PALETTE[hover.piece.color] + "88" : "#C9B79A55") : "#EDE5D2" }]} />
          );
        }))}
      </View>
      <View style={s.tray}>
        {tray.map((piece, i) => (
          <TrayPiece key={piece?.id ?? `empty-${i}`} piece={piece} small={Math.max(14, Math.round(cell * 0.55))} cell={cell} selected={picked === i}
            onPick={() => { setPicked(picked === i ? null : i); setHover(null); void haptics.tap(); measure(); }}
            onGrab={(x, y) => { if (piece) { lock(true); void haptics.tap(); measure(); setHover({ ...anchor(piece, x, y), piece }); } }}
            onMove={(x, y) => { if (piece) setHover({ ...anchor(piece, x, y), piece }); }}
            onDrop={(x, y) => { lock(false); setHover(null); if (piece) { const a = anchor(piece, x, y); drop(i, a.row, a.col); } }}
            onCancel={() => { lock(false); setHover(null); }} />
        ))}
      </View>
    </GameShell>
  );
}

/**
 * A piece in the tray. Touch is grab-and-swipe: it lifts into the hand the moment the finger lands, grows to the
 * board's cell size and glides exactly where the ghost preview shows it will land — riding fully above the finger
 * (see `anchor`) so the child sees the spot they are aiming at, not their own thumb. Letting go without moving just
 * settles it back, no buzz. VoiceOver keeps a pick-then-place flow through the activate action.
 */
function TrayPiece({ piece, small, cell, selected, onPick, onGrab, onMove, onDrop, onCancel }: { piece: Piece | null; small: number; cell: number; selected: boolean; onPick: () => void; onGrab: (x: number, y: number) => void; onMove: (x: number, y: number) => void; onDrop: (x: number, y: number) => void; onCancel: () => void }) {
  const a11y = getCopy().gameAccessibility;
  const reduced = useReducedMotion();
  const pan = useRef(new Animated.ValueXY()).current;
  const zoom = useRef(new Animated.Value(1)).current;
  const [dragging, setDragging] = useState(false);
  const boxRef = useRef<View>(null);
  const center = useRef<{ x: number; y: number } | null>(null);
  const geom = useRef({ rows: 1, cols: 1 });
  const handlers = useRef({ onPick, onGrab, onMove, onDrop, onCancel });
  handlers.current = { onPick, onGrab, onMove, onDrop, onCancel };
  const dims = useRef({ small, cell });
  dims.current = { small, cell };

  const settle = () => {
    setDragging(false);
    pan.setValue({ x: 0, y: 0 });
    zoom.stopAnimation();
    if (reduced) zoom.setValue(1);
    else Animated.spring(zoom, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false, // the sheet's ScrollView may ask for the gesture: keep it
    onShouldBlockNativeResponder: () => true,
    onPanResponderGrant: (e: GestureResponderEvent) => {
      const { small: sm, cell: cl } = dims.current;
      center.current = null;
      boxRef.current?.measureInWindow((x, y, w, h) => { center.current = { x: x + w / 2, y: y + h / 2 }; });
      setDragging(true);
      if (reduced) zoom.setValue(cl / sm);
      else Animated.spring(zoom, { toValue: cl / sm, friction: 7, tension: 80, useNativeDriver: true }).start();
      handlers.current.onGrab(e.nativeEvent.pageX, e.nativeEvent.pageY);
    },
    onPanResponderMove: (e: GestureResponderEvent, g) => {
      const { cell: cl } = dims.current;
      const { pageX, pageY } = e.nativeEvent;
      if (center.current) {
        // Keep the piece's centre glued to the continuous version of `anchor`, so piece and ghost move as one.
        const { rows } = geom.current;
        pan.setValue({ x: pageX - center.current.x, y: pageY - (rows / 2 + 0.5) * cl - center.current.y });
      } else pan.setValue({ x: g.dx, y: g.dy });
      handlers.current.onMove(pageX, pageY);
    },
    onPanResponderRelease: (e, g) => {
      const moved = Math.abs(g.dx) + Math.abs(g.dy) >= 8;
      settle();
      if (moved) handlers.current.onDrop(e.nativeEvent.pageX, e.nativeEvent.pageY);
      else handlers.current.onCancel();
    },
    onPanResponderTerminate: () => { settle(); handlers.current.onCancel(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [pan, zoom, reduced]);
  if (!piece) return <View style={s.slot} />;
  const { rows, cols } = extent(piece);
  geom.current = { rows, cols };
  return (
    <View style={[s.slot, selected && s.slotOn, dragging && s.slotLift]}>
      <Animated.View ref={boxRef} {...responder.panHandlers} accessible accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={formatCopy(a11y.piece, { color: a11y.colors[piece.color]!, count: piece.cells.length, positions: piece.cells.map(([r, c]) => `${r + 1}, ${c + 1}`).join("; ") })} accessibilityHint={a11y.pieceHint} onAccessibilityTap={onPick} accessibilityActions={[{ name: "activate" }]} onAccessibilityAction={e => { if (e.nativeEvent.actionName === "activate") onPick(); }} testID={`piece-${piece.id}`} style={{ width: cols * small, height: rows * small, opacity: dragging ? 0.92 : 1, transform: [...pan.getTranslateTransform(), { scale: zoom }] }}>
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
  slotLift: { zIndex: 30, elevation: 30 },
  block: { position: "absolute", borderRadius: 5 },
});
