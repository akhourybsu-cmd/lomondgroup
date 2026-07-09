/**
 * Best-insertion evaluation — where does a new appointment fit into an
 * existing route with the least added drive time? Pure functions.
 *
 * Insertion positions are only considered AFTER the last completed
 * stop (you can't insert into the past), and existing stop order is
 * never changed — this is the "suggest, don't reshuffle" mode.
 */

import {
  computeSchedule,
  type ScheduleStopInput,
} from "./schedule";

export interface InsertionCandidate {
  /** 0-based position in the stop sequence where the new stop would go */
  insertAtPosition: number;
  addedDriveMinutes: number;
  addedMiles: number;
  createsConflict: boolean;
  conflictReason: string | null;
}

const METERS_PER_MILE = 1609.344;

/**
 * Evaluate every feasible insertion position for the new stop and
 * return them sorted best-first (least added drive time, conflict-free
 * positions preferred over conflicting ones).
 *
 * orderedStops: existing route order. The new stop's matrixIndex must
 * point into the same matrix as the existing stops.
 */
export function evaluateInsertion(
  orderedStops: ScheduleStopInput[],
  newStop: ScheduleStopInput,
  seconds: number[][],
  meters: number[][],
  dayStartMinutes: number
): InsertionCandidate[] {
  // Earliest legal position: after the last completed stop
  let minPosition = 0;
  orderedStops.forEach((s, i) => {
    if (s.completed) minPosition = i + 1;
  });

  const active = (s: ScheduleStopInput) => !s.skipped;
  const baseline = computeSchedule(orderedStops, seconds, meters, dayStartMinutes);

  const candidates: InsertionCandidate[] = [];

  for (let pos = minPosition; pos <= orderedStops.length; pos++) {
    // Leg delta using the active (non-skipped) neighbors
    const prevStop = orderedStops.slice(0, pos).filter(active).pop();
    const nextStop = orderedStops.slice(pos).filter(active)[0];
    const prevIdx = prevStop ? prevStop.matrixIndex : 0;

    let addedSeconds: number;
    let addedMeters: number;
    if (nextStop) {
      addedSeconds =
        seconds[prevIdx][newStop.matrixIndex] +
        seconds[newStop.matrixIndex][nextStop.matrixIndex] -
        seconds[prevIdx][nextStop.matrixIndex];
      addedMeters =
        meters[prevIdx][newStop.matrixIndex] +
        meters[newStop.matrixIndex][nextStop.matrixIndex] -
        meters[prevIdx][nextStop.matrixIndex];
    } else {
      addedSeconds = seconds[prevIdx][newStop.matrixIndex];
      addedMeters = meters[prevIdx][newStop.matrixIndex];
    }

    // Full schedule with the insertion, to catch downstream window conflicts
    const withInsertion = [
      ...orderedStops.slice(0, pos),
      newStop,
      ...orderedStops.slice(pos),
    ];
    const schedule = computeSchedule(withInsertion, seconds, meters, dayStartMinutes);

    const newConflicts = schedule.stops
      .flatMap((s) => s.warnings.filter((w) => w.startsWith("Route Conflict")))
      .filter(
        (w) =>
          !baseline.stops.some((b) => b.warnings.includes(w))
      );
    const createsConflict =
      schedule.hasConflicts && (newConflicts.length > 0 || !baseline.hasConflicts);

    candidates.push({
      insertAtPosition: pos,
      addedDriveMinutes: addedSeconds / 60,
      addedMiles: addedMeters / METERS_PER_MILE,
      createsConflict,
      conflictReason: createsConflict
        ? newConflicts[0] ?? "Inserting here pushes a later stop past its time window."
        : null,
    });
  }

  return candidates.sort((a, b) => {
    if (a.createsConflict !== b.createsConflict) return a.createsConflict ? 1 : -1;
    return a.addedDriveMinutes - b.addedDriveMinutes;
  });
}
