export function breathingFrame(elapsedMs: number, durationMs: number) {
  const cycles = Math.max(1, Math.round(durationMs / 8000));
  const elapsed = Math.max(0, Math.min(elapsedMs, durationMs));
  const cycleMs = durationMs / cycles;
  const complete = elapsed >= durationMs;
  return { cycles, current: Math.min(cycles, Math.floor(elapsed / cycleMs) + 1), inhale: !complete && elapsed % cycleMs < cycleMs / 2, complete };
}

/** One clock drives both the words and a gentle expansion/contraction ending on an exhale. */
export function breathingKeyframes(durationMs: number) {
  const { cycles } = breathingFrame(0, durationMs);
  const inputRange: number[] = [], outputRange: number[] = [];
  for (let i = 0; i <= cycles * 16; i++) {
    inputRange.push(i * durationMs / (cycles * 16));
    outputRange.push((1 - Math.cos(i / 16 * Math.PI * 2)) / 2);
  }
  return { inputRange, outputRange };
}
