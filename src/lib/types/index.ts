/**
 * Core TypeScript types for Lomond Appraisal Group platform.
 * These types mirror the Supabase database schema.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type UserRole =
  | "owner_admin"
  | "staff_appraiser"
  | "client"
  | "read_only_reviewer";

export type AppraisalType =
  | "diminished_value"
  | "total_loss_dispute"
  | "classic_collector"
  | "pre_purchase"
  | "fair_market_value"
  | "not_sure";

export type JobStatus =
  | "new_request"
  | "contacted"
  | "documents_needed"
  | "inspection_scheduled"
  | "in_progress"
  | "report_drafted"
  | "sent_to_client"
  | "paid_closed"
  | "on_hold"
  | "awaiting_payment"
  | "canceled"
  | "declined"
  | "needs_owner_review";

export type PaymentStatus =
  | "unpaid"
  | "invoiced"
  | "partial"
  | "paid"
  | "refunded"
  | "waived";

export type NoteVisibility = "internal" | "client_visible";

export type FileCategory =
  | "vehicle_photo"
  | "damage_photo"
  | "repair_estimate"
  | "insurance_valuation"
  | "settlement_offer"
  | "appraisal_report"
  | "other";

export type AuditEventType =
  | "job_created"
  | "job_status_changed"
  | "job_assigned"
  | "file_uploaded"
  | "file_viewed"
  | "file_downloaded"
  | "note_added"
  | "report_generated"
  | "report_finalized"
  | "report_sent"
  | "payment_updated"
  | "user_role_changed"
  | "failed_access_attempt"
  | "client_portal_access"
  // Operations module (migration 005)
  | "pdf_uploaded"
  | "pdf_processed"
  | "pdf_processing_failed"
  | "appointment_created"
  | "appointment_updated"
  | "appointment_confirmed"
  | "appointment_cancelled"
  | "appointment_marked_duplicate"
  | "route_generated"
  | "route_reordered"
  | "route_stop_locked"
  | "route_stop_unlocked"
  | "route_stop_completed"
  | "route_stop_skipped"
  | "appointment_inserted_into_route";

export type PreferredContact = "email" | "phone" | "either";

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface Profile {
  id: string; // references auth.users.id
  role: UserRole;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  preferred_contact: PreferredContact;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
  mileage: number | null;
  color: string | null;
  location_city: string | null;
  location_state: string | null;
  is_drivable: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface AppraisalJob {
  id: string;
  client_id: string;
  vehicle_id: string;
  assigned_appraiser_id: string | null; // references profiles.id
  appraisal_type: AppraisalType;
  status: JobStatus;
  // Insurance / claim fields
  insurance_company: string | null;
  claim_number: string | null;
  date_of_loss: string | null; // ISO date string
  vehicle_repaired: boolean | null;
  has_repair_estimate: boolean | null;
  has_settlement_offer: boolean | null;
  // Customer notes at intake
  customer_notes: string | null;
  // Admin fields
  internal_ref: string | null; // short human-readable reference
  priority: "normal" | "high" | "urgent";
  // Payment
  quoted_fee_cents: number | null;
  created_at: string;
  updated_at: string;
}

export interface UploadedFile {
  id: string;
  job_id: string;
  uploaded_by: string | null; // references profiles.id or null for anonymous intake
  file_name: string; // original filename shown to user
  storage_path: string; // private storage path — never send to client directly
  file_size_bytes: number;
  mime_type: string;
  category: FileCategory;
  created_at: string;
}

export interface JobNote {
  id: string;
  job_id: string;
  author_id: string; // references profiles.id
  visibility: NoteVisibility;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface MarketComparable {
  id: string;
  report_id: string; // references appraisal_reports.id
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number | null;
  condition: string | null;
  sale_price_cents: number;
  source: string | null;
  listing_url: string | null;
  listing_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface AppraisalReport {
  id: string;
  job_id: string;
  authored_by: string; // references profiles.id
  title: string;
  // Vehicle condition
  condition_summary: string | null;
  condition_details: string | null;
  // Valuation
  valuation_conclusion_cents: number | null;
  valuation_method: string | null;
  valuation_notes: string | null;
  // State
  is_draft: boolean;
  finalized_at: string | null;
  pdf_storage_path: string | null; // private — signed URLs only
  sent_to_client_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  job_id: string;
  status: PaymentStatus;
  amount_cents: number | null;
  paid_at: string | null;
  method: string | null; // "stripe", "check", "cash", "waived", etc.
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  job_id: string | null;
  appointment_id: string | null; // operations module (migration 005)
  daily_route_id: string | null; // operations module (migration 005)
  actor_id: string | null; // references profiles.id; null = system
  event_type: AuditEventType;
  metadata: Record<string, unknown>; // event-specific payload
  ip_address: string | null;
  created_at: string;
}

// ─── Joined / View types ─────────────────────────────────────────────────────

/** AppraisalJob with client + vehicle joined — used in job list / board */
export interface AppraisalJobSummary extends AppraisalJob {
  client: Pick<Client, "id" | "first_name" | "last_name" | "email" | "phone">;
  vehicle: Pick<Vehicle, "id" | "year" | "make" | "model" | "trim" | "vin">;
  payment: Pick<Payment, "status" | "amount_cents"> | null;
  file_count: number;
}

/** Full job detail — used in /admin/jobs/[id] */
export interface AppraisalJobDetail extends AppraisalJob {
  client: Client;
  vehicle: Vehicle;
  notes: JobNote[];
  files: UploadedFile[];
  report: AppraisalReport | null;
  payment: Payment | null;
  audit_logs: AuditLog[];
}

// ─── Intake form types ───────────────────────────────────────────────────────

export interface IntakeContactData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  preferred_contact: PreferredContact;
}

export interface IntakeTypeData {
  appraisal_type: AppraisalType;
}

export interface IntakeVehicleData {
  year: number;
  make: string;
  model: string;
  trim: string;
  vin: string;
  mileage: number | null;
  location_city: string;
  location_state: string;
  is_drivable: boolean | null;
}

export interface IntakeClaimData {
  insurance_company: string;
  claim_number: string;
  date_of_loss: string;
  vehicle_repaired: boolean | null;
  has_repair_estimate: boolean | null;
  has_settlement_offer: boolean | null;
}

export interface IntakeNotesData {
  customer_notes: string;
}

export interface IntakeConsentData {
  confirms_accuracy: boolean;
  consents_to_contact: boolean;
  understands_no_guarantee: boolean;
}

export interface IntakeFormData {
  contact: IntakeContactData;
  type: IntakeTypeData;
  vehicle: IntakeVehicleData;
  claim: Partial<IntakeClaimData>;
  notes: IntakeNotesData;
  consent: IntakeConsentData;
}

// ─── UI helpers ──────────────────────────────────────────────────────────────

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

export const JOB_STATUS_CONFIG: Record<JobStatus, StatusConfig> = {
  new_request: {
    label: "New Request",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    description: "Intake submitted, awaiting review",
  },
  contacted: {
    label: "Contacted",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50 border-indigo-200",
    description: "Client has been reached",
  },
  documents_needed: {
    label: "Documents Needed",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    description: "Waiting on client documents",
  },
  inspection_scheduled: {
    label: "Inspection Scheduled",
    color: "text-orange-700",
    bgColor: "bg-orange-50 border-orange-200",
    description: "Inspection date confirmed",
  },
  in_progress: {
    label: "In Progress",
    color: "text-sky-700",
    bgColor: "bg-sky-50 border-sky-200",
    description: "Appraisal work underway",
  },
  report_drafted: {
    label: "Report Drafted",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
    description: "Report ready for review",
  },
  sent_to_client: {
    label: "Sent to Client",
    color: "text-teal-700",
    bgColor: "bg-teal-50 border-teal-200",
    description: "Report delivered to client",
  },
  paid_closed: {
    label: "Paid / Closed",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    description: "Job complete and paid",
  },
  on_hold: {
    label: "On Hold",
    color: "text-yellow-700",
    bgColor: "bg-yellow-50 border-yellow-200",
    description: "Paused pending action",
  },
  awaiting_payment: {
    label: "Awaiting Payment",
    color: "text-rose-700",
    bgColor: "bg-rose-50 border-rose-200",
    description: "Report sent, payment pending",
  },
  canceled: {
    label: "Canceled",
    color: "text-gray-600",
    bgColor: "bg-gray-50 border-gray-200",
    description: "Job canceled",
  },
  declined: {
    label: "Declined",
    color: "text-gray-600",
    bgColor: "bg-gray-100 border-gray-300",
    description: "Assignment declined",
  },
  needs_owner_review: {
    label: "Needs Review",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    description: "Flagged for owner attention",
  },
};

export const APPRAISAL_TYPE_LABELS: Record<AppraisalType, string> = {
  diminished_value: "Diminished Value",
  total_loss_dispute: "Total Loss Dispute",
  classic_collector: "Classic / Collector Vehicle",
  pre_purchase: "Pre-Purchase Inspection",
  fair_market_value: "Fair Market Value",
  not_sure: "Not Sure",
};

export const VALID_STATUS_TRANSITIONS: Partial<Record<JobStatus, JobStatus[]>> =
  {
    new_request: ["contacted", "documents_needed", "declined", "canceled"],
    contacted: [
      "documents_needed",
      "inspection_scheduled",
      "in_progress",
      "on_hold",
      "canceled",
    ],
    documents_needed: [
      "contacted",
      "inspection_scheduled",
      "in_progress",
      "on_hold",
      "canceled",
    ],
    inspection_scheduled: ["in_progress", "on_hold", "canceled"],
    in_progress: [
      "report_drafted",
      "documents_needed",
      "on_hold",
      "needs_owner_review",
      "canceled",
    ],
    report_drafted: [
      "sent_to_client",
      "in_progress",
      "needs_owner_review",
      "canceled",
    ],
    sent_to_client: ["awaiting_payment", "paid_closed", "needs_owner_review"],
    awaiting_payment: ["paid_closed", "needs_owner_review"],
    on_hold: ["contacted", "in_progress", "canceled"],
    needs_owner_review: ["in_progress", "report_drafted", "canceled"],
    paid_closed: [],
    canceled: [],
    declined: [],
  };

// ─── Operations module ───────────────────────────────────────────────────────

export * from "./ops";

// ─── Tax / bookkeeping module ────────────────────────────────────────────────

export * from "./tax";
