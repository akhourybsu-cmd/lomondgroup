/**
 * Routability validation — the single place that decides whether an
 * appointment may enter route optimization.
 *
 * Required: appointment date, a usable address, a successful geocode,
 * an estimated duration, and status 'confirmed' (or already routed /
 * in progress). Everything else is optional for routing.
 */

import type { Appointment } from "@/lib/types";

export interface RoutabilityIssue {
  /** Stable key, e.g. "missing_date" */
  key: string;
  /** Plain operational language, shown directly in the UI */
  message: string;
}

const ROUTABLE_STATUSES = ["confirmed", "routed", "in_progress"] as const;

type RoutabilityInput = Pick<
  Appointment,
  | "status"
  | "appointment_date"
  | "address_line_1"
  | "city"
  | "state"
  | "zip"
  | "geocoding_status"
  | "estimated_duration_minutes"
>;

export function getRoutabilityIssues(appt: RoutabilityInput): RoutabilityIssue[] {
  const issues: RoutabilityIssue[] = [];

  if (!appt.appointment_date) {
    issues.push({
      key: "missing_date",
      message: "Missing appointment date.",
    });
  }

  const hasAddress = !!appt.address_line_1 && !!appt.city && !!appt.state;
  if (!hasAddress) {
    issues.push({
      key: "missing_address",
      message: "Missing address — street, city, and state are required.",
    });
  }

  if (hasAddress && appt.geocoding_status === "failed") {
    issues.push({
      key: "geocoding_failed",
      message: "Geocoding failed — correct the address, then re-verify it.",
    });
  }
  if (hasAddress && appt.geocoding_status === "ambiguous") {
    issues.push({
      key: "geocoding_ambiguous",
      message: "Address is ambiguous — confirm the correct match before routing.",
    });
  }
  if (hasAddress && appt.geocoding_status === "not_started") {
    issues.push({
      key: "not_geocoded",
      message: "Address has not been verified yet.",
    });
  }

  if (!appt.estimated_duration_minutes || appt.estimated_duration_minutes <= 0) {
    issues.push({
      key: "missing_duration",
      message: "Missing estimated appointment duration.",
    });
  }

  if (!(ROUTABLE_STATUSES as readonly string[]).includes(appt.status)) {
    issues.push({
      key: "not_confirmed",
      message:
        appt.status === "needs_review"
          ? "Appointment has not been reviewed and confirmed."
          : `Appointments with status "${appt.status}" cannot be routed.`,
    });
  }

  return issues;
}

export function isRoutable(appt: RoutabilityInput): boolean {
  return getRoutabilityIssues(appt).length === 0;
}
