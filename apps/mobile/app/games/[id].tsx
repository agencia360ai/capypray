import { Redirect, useLocalSearchParams } from "expo-router";
import { getPack } from "@/content/pack";
import { useKid } from "@/store/kid";
import { SortGame } from "@/games/ui/SortGame";
import { BlocksGame } from "@/games/ui/BlocksGame";
import { TilesGame } from "@/games/ui/TilesGame";
import { MemoryGame } from "@/games/ui/MemoryGame";

const GAMES = { sort: SortGame, blocks: BlocksGame, tiles: TilesGame, memory: MemoryGame } as const;

export default function Game() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const level = useKid((s) => s.gameLevels[id ?? ""] ?? 1);
  const setLevel = useKid((s) => s.setGameLevel);
  const Play = GAMES[id as keyof typeof GAMES];
  if (!Play || !getPack().companion.games) return <Redirect href="/games" />;
  // keyed by level: a new level is a fresh board, and the one just won is never shown again
  return <Play key={`${id}-${level}`} level={level} onWin={() => setLevel(id!, level + 1)} />;
}
