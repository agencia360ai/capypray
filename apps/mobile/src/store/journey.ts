import type { Lesson, Pack } from "@capy/content";

/**
 * The journey trail, derived from the pack and the child's completion map — never stored, so there is no state to
 * migrate and a historical save keeps working: progress is whatever `completed` already holds (see journey.test.ts).
 *
 * Two rules from the plan (docs/journey-plan.md) are load-bearing here:
 *  - Only curriculum lessons are stops. The intro, the bedtime routine and the situational moments stay reachable on
 *    their own and must never move the child along the trail.
 *  - Curriculum position is separate from the lantern/beacon economy, so replaying a moment cannot skip a lesson.
 */
export type NodeState = "done" | "next" | "ahead";

export type JourneyNode = {
  /** lesson id: stable and language independent, the ui looks the title up in the pack */
  id: string;
  index: number;
  worldId: string;
  week: string;
  day: number;
  skillId: string;
  state: NodeState;
};

export type JourneyView = {
  nodes: JourneyNode[];
  /** completed curriculum stops, counted wherever they sit: an out-of-order save still reads honestly */
  doneCount: number;
  total: number;
  /** first stop not yet completed, in trail order; undefined when the trail is finished */
  next?: JourneyNode;
  /** the few stones worth drawing around the next one — the plan asks for 3 to 5, never the whole backlog */
  window: JourneyNode[];
  /** end of the current week, the next thing worth previewing */
  milestone?: { node: JourneyNode; stepsAway: number };
};

type Opts = {
  /** phase 1 builds the first seven stops only; omit for the whole trail */
  limit?: number;
  /** how many stones the lobby draws around the next one */
  windowSize?: number;
};

const isCurriculum = (l: Lesson) => l.routine === "any" && !!l.week && typeof l.day === "number";

/** Curriculum order: worlds in pack order, weeks in the order each world lists them, then day. */
export function journeyNodes(pack: Pack, opts: Opts = {}): JourneyNode[] {
  const weekRank = new Map<string, number>();
  const worldOf = new Map<string, string>();
  pack.worlds.forEach((w, wi) =>
    w.weeks.forEach((week, i) => {
      weekRank.set(week, wi * 1000 + i);
      worldOf.set(week, w.id);
    }),
  );
  const ordered = pack.lessons
    .filter(isCurriculum)
    // a week the worlds never list sorts last instead of vanishing, so new content is visible rather than silently dropped
    .sort((a, b) => (weekRank.get(a.week!) ?? 9e6) - (weekRank.get(b.week!) ?? 9e6) || a.day! - b.day!);
  const capped = opts.limit ? ordered.slice(0, opts.limit) : ordered;
  return capped.map((l, index) => ({
    id: l.id,
    index,
    worldId: worldOf.get(l.week!) ?? pack.worlds[0]?.id ?? "",
    week: l.week!,
    day: l.day!,
    skillId: l.skillId,
    state: "ahead" as NodeState,
  }));
}

/**
 * The completion still owed an arrival on the trail: the most recently finished curriculum stop that has not been
 * celebrated. Purely presentational — the lantern, the beacon and the completion itself were already persisted by
 * completeLesson, so an app killed mid-walk loses nothing and a replay grants nothing.
 */
export function pendingArrival(
  pack: Pack,
  completed: Record<string, { at: number } | unknown>,
  celebrated: Record<string, true>,
  opts: Opts = {},
): JourneyNode | undefined {
  const nodes = journeyNodes(pack, opts);
  const owed = nodes.filter((n) => n.id in completed && !celebrated[n.id]);
  if (!owed.length) return undefined;
  const at = (n: JourneyNode) => (completed[n.id] as { at?: number } | undefined)?.at ?? 0;
  // most recent first; a save without timestamps falls back to trail order, which is still deterministic
  return owed.sort((a, b) => at(b) - at(a) || b.index - a.index)[0];
}

export function journeyView(pack: Pack, completed: Record<string, unknown>, opts: Opts = {}): JourneyView {
  const nodes = journeyNodes(pack, opts);
  const done = nodes.map((n) => n.id in completed);
  const nextIndex = done.indexOf(false);
  for (const n of nodes) n.state = done[n.index] ? "done" : n.index === nextIndex ? "next" : "ahead";
  const next = nextIndex === -1 ? undefined : nodes[nextIndex];
  const size = Math.max(1, opts.windowSize ?? 5);
  // centre the window on the next stop, then slide it inside the trail so the count stays stable at both ends
  const anchor = next?.index ?? nodes.length - 1;
  const start = Math.max(0, Math.min(anchor - Math.floor((size - 1) / 2), nodes.length - size));
  const window = nodes.slice(Math.max(0, start), Math.max(0, start) + size);
  const milestoneNode = next ? nodes.find((n) => n.index >= next.index && n.day === 7) : undefined;
  return {
    nodes,
    doneCount: done.filter(Boolean).length,
    total: nodes.length,
    next,
    window,
    milestone: milestoneNode && next ? { node: milestoneNode, stepsAway: milestoneNode.index - next.index + 1 } : undefined,
  };
}
