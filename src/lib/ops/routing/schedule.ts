/**
 * Schedule computation — ETAs, per-leg drive time/miles, time-window
 * conflict detection, and day totals for an ordered stop sequence.
 * Pure functions, no I/O.
 */

export interface ScheduleStopInput {
  id: string; // appointment id
  matrixIndex: number;
  durationMinutes: number;
  timeWindowStart: string | null; // "HH:MM[:SS]"
  timeWindowEnd: string | null;
  completed: boolean;
  skipped: boolean;
}

export interface ScheduledStop {
  id: string;
  arrivalMinutes: number; // minutes from midnight
  departureMinutes: number;
  driveMinutesFromPrevious: number;
  milesFromPrevious: number;
  /** Plain-language warnings, e.g. time-window conflicts */
  warnings: string[];
}

export interface ScheduleResult {
  stops: ScheduledStop[];
  totalDriveMinutes: number;
  totalMiles: number;
  totalAppointmentMinutes: number;
  dayEndMinutes: number;
  hasConflicts: boolean;
}

const METERS_PER_MILE = 1609.344;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const clamped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Walk the ordered stops from the start point at dayStartMinutes.
 * Skipped stops contribute no time and no leg (route passes them by).
 */
export function computeSchedule(
  orderedStops: ScheduleStopInput[],
  seconds: number[][],
  meters: number[][],
  dayStartMinutes: number
): ScheduleResult {
  const stops: ScheduledStop[] = [];
  let clock = dayStartMinutes;
  let prevIndex = 0; // start point
  let totalDriveMinutes = 0;
  let totalMiles = 0;
  let totalAppointmentMinutes = 0;
  let hasConflicts = false;

  for (const stop of orderedStops) {
    if (stop.skipped) {
      stops.push({
        id: stop.id,
        arrivalMinutes: clock,
        departureMinutes: clock,
        driveMinutesFromPrevious: 0,
        milesFromPrevious: 0,
        warnings: [],
      });
      continue;
    }

    const driveMinutes = seconds[prevIndex][stop.matrixIndex] / 60;
    const miles = meters[prevIndex][stop.matrixIndex] / METERS_PER_MILE;

    let arrival = clock + driveMinutes;
    const warnings: string[] = [];

    if (stop.timeWindowStart !== null) {
      const windowStart = timeToMinutes(stop.timeWindowStart);
      if (arrival < windowStart) {
        warnings.push(
          `Arrives ${Math.round(windowStart - arrival)} min before the ${minutesToTime(windowStart)} window — includes wait time.`
        );
        arrival = windowStart; // wait for the window to open
      }
    }
    if (stop.timeWindowEnd !== null) {
      const windowEnd = timeToMinutes(stop.timeWindowEnd);
      if (arrival > windowEnd) {
        warnings.push(
          `Route Conflict: estimated arrival ${minutesToTime(arrival)} is after the ${minutesToTime(windowEnd)} window end.`
        );
        hasConflicts = true;
      }
    }

    const departure = arrival + stop.durationMinutes;

    stops.push({
      id: stop.id,
      arrivalMinutes: arrival,
      departureMinutes: departure,
      driveMinutesFromPrevious: driveMinutes,
      milesFromPrevious: miles,
      warnings,
    });

    totalDriveMinutes += driveMinutes;
    totalMiles += miles;
    totalAppointmentMinutes += stop.durationMinutes;
    clock = departure;
    prevIndex = stop.matrixIndex;
  }

  return {
    stops,
    totalDriveMinutes,
    totalMiles,
    totalAppointmentMinutes,
    dayEndMinutes: clock,
    hasConflicts,
  };
}
