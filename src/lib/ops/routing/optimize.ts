/**
 * Deterministic route optimizer — nearest-neighbor construction with
 * 2-opt improvement. Pure functions, no I/O, fully unit-testable.
 *
 * Invariants (CRITICAL PRODUCT RULES):
 * - Completed stops never move.
 * - Locked stops never move.
 * - Only "free" positions are optimized.
 *
 * The matrix is indexed by point index; index 0 is always the start
 * location, indices 1..N are the stops (in the caller's stop order).
 */

export interface OptimizableStop {
  /** Appointment id */
  id: string;
  /** Index of this stop's point in the matrix (1-based; 0 = start) */
  matrixIndex: number;
  /** Current 0-based sequence position (order in the existing route) */
  currentPosition: number;
  locked: boolean;
  completed: boolean;
}

/**
 * Returns stop ids in optimized visiting order. Locked and completed
 * stops keep their currentPosition; free stops fill the remaining
 * positions to minimize total drive seconds from the start point.
 */
export function optimizeStopOrder(
  stops: OptimizableStop[],
  /** seconds[i][j] = drive seconds from point i to point j */
  seconds: number[][]
): string[] {
  const n = stops.length;
  if (n <= 1) return stops.map((s) => s.id);

  const byId = new Map(stops.map((s) => [s.id, s]));

  // Fixed positions: completed and locked stops stay exactly where they are
  const fixed = new Map<number, string>(); // position -> stop id
  for (const s of stops) {
    if (s.locked || s.completed) fixed.set(s.currentPosition, s.id);
  }

  const free = stops.filter((s) => !s.locked && !s.completed);
  const freeRemaining = new Set(free.map((s) => s.id));

  // Greedy construction: walk positions 0..n-1; fixed positions are
  // taken as-is, free positions take the nearest unvisited free stop.
  const order: string[] = [];
  let prevMatrixIndex = 0; // start point
  for (let pos = 0; pos < n; pos++) {
    const fixedId = fixed.get(pos);
    if (fixedId) {
      order.push(fixedId);
      prevMatrixIndex = byId.get(fixedId)!.matrixIndex;
      continue;
    }
    let bestId: string | null = null;
    let bestCost = Infinity;
    for (const id of freeRemaining) {
      const cost = seconds[prevMatrixIndex][byId.get(id)!.matrixIndex];
      if (cost < bestCost) {
        bestCost = cost;
        bestId = id;
      }
    }
    if (bestId === null) break; // should not happen: counts always match
    order.push(bestId);
    freeRemaining.delete(bestId);
    prevMatrixIndex = byId.get(bestId)!.matrixIndex;
  }

  // 2-opt improvement over free positions only
  const freePositions = order
    .map((id, pos) => ({ id, pos }))
    .filter(({ pos }) => !fixed.has(pos))
    .map(({ pos }) => pos);

  const totalCost = (seq: string[]): number => {
    let cost = 0;
    let prev = 0;
    for (const id of seq) {
      const idx = byId.get(id)!.matrixIndex;
      cost += seconds[prev][idx];
      prev = idx;
    }
    return cost;
  };

  let improved = true;
  let guard = 0;
  while (improved && guard < 200) {
    improved = false;
    guard++;
    for (let a = 0; a < freePositions.length - 1; a++) {
      for (let b = a + 1; b < freePositions.length; b++) {
        const i = freePositions[a];
        const j = freePositions[b];
        const candidate = order.slice();
        // Reverse the free-position subsequence between i and j
        const segment: string[] = [];
        for (let k = a; k <= b; k++) segment.push(order[freePositions[k]]);
        segment.reverse();
        for (let k = a; k <= b; k++) candidate[freePositions[k]] = segment[k - a];
        void i;
        void j;
        if (totalCost(candidate) < totalCost(order) - 1) {
          for (let k = 0; k < n; k++) order[k] = candidate[k];
          improved = true;
        }
      }
    }
  }

  return order;
}
