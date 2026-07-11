/**
 * Operations module types — contractor PDF intake, appointment
 * management, and daily route planning.
 * These types mirror the Supabase schema (migrations 005–007).
 */

import type { StatusConfig } from "./index";

// ─── Enums ──────────────────────────────────────────────────────────────────

export type UploadProcessingStatus =
  | "pending"
  | "processing"
  | "processed"
  | "failed"
  | "needs_review";

// Route-first workflow:
//   needs_review → scheduled → routed → booked → in_progress → completed
// 'scheduled' = assigned to a day + address verified (route-ready, no time).
// 'booked'    = time set with the customer (after routing).
// 'confirmed' is a legacy value (pre-2026-07 rows); migrated to 'scheduled'.
export type AppointmentStatus =
  | "needs_review"
  | "scheduled"
  | "routed"
  | "booked"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "duplicate"
  | "confirmed";

export type AppointmentConfirmationStatus =
  | "unconfirmed"
  | "confirmed_with_customer"
  | "confirmed_by_contractor"
  | "unable_to_confirm"
  | "not_required";

export type GeocodingStatus = "not_started" | "success" | "failed" | "ambiguous";

export type AppointmentSource = "pdf_extraction" | "manual";

export type RouteStatus = "draft" | "active" | "completed" | "archived";

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface Contractor {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  default_duration_minutes: number | null;
  default_notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PdfUpload {
  id: string;
  contractor_id: string | null;
  uploaded_by: string | null; // references profiles.id
  original_filename: string;
  storage_path: string; // NEVER sent to the browser — signed URLs only
  file_size_bytes: number;
  content_hash: string; // SHA-256, used for duplicate-upload detection
  processing_status: UploadProcessingStatus;
  page_count: number | null;
  raw_extracted_text: string | null;
  extraction_model: string | null;
  extraction_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  contractor_id: string | null;
  pdf_upload_id: string | null;
  source_type: AppointmentSource;

  // Customer / contact
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;

  // Location
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  formatted_address: string | null;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
  geocoding_status: GeocodingStatus;
  geocoded_source_address: string | null;
  geocoded_at: string | null;

  // Scheduling
  appointment_date: string | null; // YYYY-MM-DD
  appointment_time: string | null; // HH:MM:SS
  time_window_start: string | null;
  time_window_end: string | null;
  estimated_duration_minutes: number;

  // Claim / assignment
  claim_number: string | null;
  reference_number: string | null;
  insurance_company: string | null;

  // Vehicle
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vin: string | null;
  vehicle_location_notes: string | null;

  // Notes
  damage_notes: string | null;
  special_instructions: string | null;
  internal_notes: string | null;

  // Workflow
  status: AppointmentStatus;
  confirmation_status: AppointmentConfirmationStatus;
  duplicate_of_appointment_id: string | null;

  // Extraction provenance (null for manual appointments)
  extraction_snapshot: Record<string, unknown> | null;
  extraction_confidence: number | null; // 0–1
  missing_fields: string[];

  created_at: string;
  updated_at: string;
}

export interface DailyRoute {
  id: string;
  route_date: string; // YYYY-MM-DD
  start_address: string;
  start_latitude: number | null;
  start_longitude: number | null;
  end_address: string | null;
  end_latitude: number | null;
  end_longitude: number | null;
  total_miles: number | null;
  total_drive_time_minutes: number | null;
  total_appointment_time_minutes: number | null;
  day_start_time: string; // HH:MM:SS
  estimated_day_end_time: string | null;
  route_status: RouteStatus;
  optimization_method: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteStop {
  id: string;
  daily_route_id: string;
  appointment_id: string;
  stop_order: number; // 1-based
  estimated_arrival_time: string | null;
  estimated_departure_time: string | null;
  drive_time_from_previous_minutes: number | null;
  miles_from_previous: number | null;
  locked_position: boolean;
  completed_at: string | null;
  skipped: boolean;
  route_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RouteAdjustmentSuggestion {
  id: string;
  daily_route_id: string;
  appointment_id: string;
  suggested_insert_after_stop_id: string | null;
  suggested_insert_before_stop_id: string | null;
  added_drive_time_minutes: number | null;
  added_miles: number | null;
  creates_conflict: boolean;
  conflict_reason: string | null;
  accepted: boolean | null; // null = pending, true = applied, false = dismissed
  created_at: string;
}

// ─── Joined / View types ─────────────────────────────────────────────────────

/** Appointment with contractor joined — used in the appointments list */
export interface AppointmentSummary extends Appointment {
  contractor: Pick<Contractor, "id" | "name"> | null;
}

/** RouteStop with its appointment joined — used on the route detail page */
export interface RouteStopWithAppointment extends RouteStop {
  appointment: Appointment;
}

/** Full route detail — used in /admin/routes/[date] */
export interface DailyRouteDetail extends DailyRoute {
  stops: RouteStopWithAppointment[];
}

// ─── Routability ─────────────────────────────────────────────────────────────
// An appointment may enter route optimization only when all of these
// hold. Checked in one place: src/lib/ops/appointments/validation.ts

export const ROUTABLE_REQUIREMENTS = [
  "appointment_date",
  "scheduled_status",
  "successful_geocode",
  "estimated_duration",
] as const;

// ─── Status workflow ─────────────────────────────────────────────────────────
// Plain status flips available as buttons on the appointment page.
// Three statuses are NOT plain flips (they need extra data / context) and
// are set by dedicated actions instead:
//   'scheduled' → Assign to Day (sets date + geocodes)
//   'routed'    → the route builder
//   'booked'    → Book (sets the customer's time)
// See STATUSES_SET_BY_ACTION below.

export const STATUSES_SET_BY_ACTION: AppointmentStatus[] = [
  "scheduled",
  "routed",
  "booked",
];

export const VALID_APPOINTMENT_TRANSITIONS: Record<
  AppointmentStatus,
  AppointmentStatus[]
> = {
  needs_review: ["cancelled", "duplicate"],
  scheduled: ["needs_review", "cancelled", "duplicate"],
  routed: ["in_progress", "completed", "cancelled"],
  booked: ["in_progress", "completed", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["in_progress"],
  cancelled: ["needs_review"],
  duplicate: ["needs_review"],
  // Legacy: move any old 'confirmed' rows into the new flow
  confirmed: ["needs_review", "cancelled", "duplicate"],
};

/** Statuses whose appointments belong in a day's route pool.
 *  ('confirmed' is included only so legacy rows stay routable.) */
export const ROUTABLE_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "routed",
  "booked",
  "in_progress",
  "confirmed",
];

export const CONFIRMATION_STATUS_LABELS: Record<
  AppointmentConfirmationStatus,
  string
> = {
  unconfirmed: "Unconfirmed",
  confirmed_with_customer: "Confirmed with customer",
  confirmed_by_contractor: "Confirmed by contractor",
  unable_to_confirm: "Unable to confirm",
  not_required: "Confirmation not required",
};

// ─── UI Status Config ────────────────────────────────────────────────────────

export const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  needs_review: {
    label: "Needs Review",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Details awaiting review — not yet assigned to a day",
  },
  scheduled: {
    label: "Scheduled",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    description: "Assigned to a day and address verified — ready to route",
  },
  routed: {
    label: "Routed",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Placed on the day's optimized route",
  },
  booked: {
    label: "Booked",
    color: "text-teal-700",
    bgColor: "bg-teal-50 border-teal-200",
    description: "Time confirmed with the customer",
  },
  in_progress: {
    label: "In Progress",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50 border-indigo-200",
    description: "Appraiser is on site or en route",
  },
  completed: {
    label: "Completed",
    color: "text-slate-700",
    bgColor: "bg-slate-50 border-slate-200",
    description: "Appointment finished",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    description: "Appointment cancelled",
  },
  duplicate: {
    label: "Duplicate",
    color: "text-slate-500",
    bgColor: "bg-slate-50 border-slate-200",
    description: "Duplicate of another appointment",
  },
  // Legacy value (pre-2026-07); shown only if old data still carries it
  confirmed: {
    label: "Scheduled",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    description: "Legacy status — treated as Scheduled",
  },
};

export const UPLOAD_STATUS_CONFIG: Record<UploadProcessingStatus, StatusConfig> = {
  pending: {
    label: "Pending",
    color: "text-slate-700",
    bgColor: "bg-slate-50 border-slate-200",
    description: "Uploaded, waiting to be processed",
  },
  processing: {
    label: "Processing",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Extracting appointment details",
  },
  processed: {
    label: "Processed",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    description: "Appointments extracted — review them",
  },
  failed: {
    label: "Failed",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    description: "Could not extract appointment details",
  },
  needs_review: {
    label: "Needs Review",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Processed with warnings — check the results",
  },
};

export const ROUTE_STATUS_CONFIG: Record<RouteStatus, StatusConfig> = {
  draft: {
    label: "Draft",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Route generated but not finalized",
  },
  active: {
    label: "Active",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    description: "Today's working route",
  },
  completed: {
    label: "Completed",
    color: "text-slate-700",
    bgColor: "bg-slate-50 border-slate-200",
    description: "All stops done",
  },
  archived: {
    label: "Archived",
    color: "text-slate-500",
    bgColor: "bg-slate-50 border-slate-200",
    description: "Replaced or no longer in use",
  },
};

export const GEOCODING_STATUS_CONFIG: Record<GeocodingStatus, StatusConfig> = {
  not_started: {
    label: "Not Geocoded",
    color: "text-slate-700",
    bgColor: "bg-slate-50 border-slate-200",
    description: "Address has not been geocoded yet",
  },
  success: {
    label: "Address Verified",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    description: "Address geocoded successfully",
  },
  failed: {
    label: "Geocoding Failed",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    description: "Address could not be located — fix it to route this stop",
  },
  ambiguous: {
    label: "Ambiguous Address",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Multiple possible matches — confirm the correct one",
  },
};
