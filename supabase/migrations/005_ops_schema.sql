-- ============================================================
-- Lomond Appraisal Group — Operations Module Schema
-- Migration: 005
-- ============================================================
-- Contractor assignment intake (PDF uploads), appointment
-- management, and daily route planning.
--
-- Design notes:
-- - Extracted appointments are staged in `appointments` itself with
--   status 'needs_review' — no separate staging table. The raw AI
--   output is preserved per-row in extraction_snapshot (JSONB) and
--   the raw PDF text is preserved on pdf_uploads.
-- - Appointments are never auto-confirmed. Routing only operates on
--   confirmed, geocoded appointments (enforced in app code via
--   isRoutable(); the DB stores the inputs to that decision).
-- - One non-archived route per date (partial unique index).
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE upload_processing_status AS ENUM (
  'pending',
  'processing',
  'processed',
  'failed',
  'needs_review'
);

CREATE TYPE appointment_status AS ENUM (
  'needs_review',
  'confirmed',
  'routed',
  'in_progress',
  'completed',
  'cancelled',
  'duplicate'
);

CREATE TYPE appointment_confirmation_status AS ENUM (
  'unconfirmed',
  'confirmed_with_customer',
  'confirmed_by_contractor',
  'unable_to_confirm',
  'not_required'
);

CREATE TYPE geocoding_status AS ENUM (
  'not_started',
  'success',
  'failed',
  'ambiguous'
);

CREATE TYPE appointment_source AS ENUM (
  'pdf_extraction',
  'manual'
);

CREATE TYPE route_status AS ENUM (
  'draft',
  'active',
  'completed',
  'archived'
);

-- ── 1. contractors ───────────────────────────────────────────────────────────
-- Assignment sources: IA firms, insurance vendors, body shops, etc.

CREATE TABLE public.contractors (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT NOT NULL UNIQUE CHECK (LENGTH(TRIM(name)) > 0),
  contact_name             TEXT,
  contact_email            TEXT,
  contact_phone            TEXT,
  -- Default estimated appointment duration for this contractor's assignments
  default_duration_minutes INTEGER CHECK (default_duration_minutes > 0),
  default_notes            TEXT,
  active                   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER contractors_updated_at
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 2. pdf_uploads ───────────────────────────────────────────────────────────
-- Metadata for uploaded assignment PDFs. Files live in the private
-- 'assignment-pdfs' bucket (migration 007). Original PDF and raw
-- extracted text are always preserved.

CREATE TABLE public.pdf_uploads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id      UUID REFERENCES public.contractors(id),
  uploaded_by        UUID REFERENCES public.profiles(id),
  original_filename  TEXT NOT NULL,
  storage_path       TEXT NOT NULL,
  file_size_bytes    BIGINT NOT NULL CHECK (file_size_bytes > 0),
  -- SHA-256 of the file contents; used to flag duplicate uploads
  content_hash       TEXT NOT NULL,
  processing_status  upload_processing_status NOT NULL DEFAULT 'pending',
  page_count         INTEGER CHECK (page_count > 0),
  raw_extracted_text TEXT,
  -- Model/method used for structured extraction (for future parsing improvements)
  extraction_model   TEXT,
  extraction_error   TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX pdf_uploads_content_hash_idx ON public.pdf_uploads (content_hash);
CREATE INDEX pdf_uploads_status_idx       ON public.pdf_uploads (processing_status);
CREATE INDEX pdf_uploads_created_at_idx   ON public.pdf_uploads (created_at DESC);

CREATE TRIGGER pdf_uploads_updated_at
  BEFORE UPDATE ON public.pdf_uploads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. appointments ──────────────────────────────────────────────────────────
-- Source of truth for field appointments. Rows created from PDF
-- extraction start as 'needs_review'; routing requires status
-- 'confirmed' + appointment_date + successful geocode + duration.

CREATE TABLE public.appointments (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id               UUID REFERENCES public.contractors(id),
  pdf_upload_id               UUID REFERENCES public.pdf_uploads(id),
  source_type                 appointment_source NOT NULL DEFAULT 'manual',

  -- Customer / contact
  customer_name               TEXT,
  customer_phone              TEXT,
  customer_email              TEXT,

  -- Location
  address_line_1              TEXT,
  address_line_2              TEXT,
  city                        TEXT,
  state                       TEXT,
  zip                         TEXT,
  formatted_address           TEXT,
  latitude                    DOUBLE PRECISION,
  longitude                   DOUBLE PRECISION,
  google_place_id             TEXT,
  geocoding_status            geocoding_status NOT NULL DEFAULT 'not_started',
  -- The address string that was geocoded; if current fields no longer
  -- match, the geocode is stale and must be re-run (avoids repeat calls)
  geocoded_source_address     TEXT,
  geocoded_at                 TIMESTAMPTZ,

  -- Scheduling (local business time; single-market assumption)
  appointment_date            DATE,
  appointment_time            TIME,
  time_window_start           TIME,
  time_window_end             TIME,
  estimated_duration_minutes  INTEGER NOT NULL DEFAULT 45 CHECK (estimated_duration_minutes > 0),

  -- Claim / assignment
  claim_number                TEXT,
  reference_number            TEXT,
  insurance_company           TEXT,

  -- Vehicle
  vehicle_year                SMALLINT CHECK (vehicle_year IS NULL OR (vehicle_year >= 1900 AND vehicle_year <= EXTRACT(YEAR FROM NOW()) + 2)),
  vehicle_make                TEXT,
  vehicle_model               TEXT,
  vin                         TEXT,
  vehicle_location_notes      TEXT,

  -- Notes
  damage_notes                TEXT,
  special_instructions        TEXT,
  internal_notes              TEXT,

  -- Workflow
  status                      appointment_status NOT NULL DEFAULT 'needs_review',
  confirmation_status         appointment_confirmation_status NOT NULL DEFAULT 'unconfirmed',
  duplicate_of_appointment_id UUID REFERENCES public.appointments(id),

  -- Extraction provenance (NULL for manual appointments)
  extraction_snapshot         JSONB,
  extraction_confidence       NUMERIC(3,2) CHECK (extraction_confidence IS NULL OR (extraction_confidence >= 0 AND extraction_confidence <= 1)),
  missing_fields              TEXT[] NOT NULL DEFAULT '{}',

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A time window, when present, must be ordered
  CONSTRAINT appointments_time_window_check
    CHECK (time_window_start IS NULL OR time_window_end IS NULL OR time_window_start <= time_window_end)
);

CREATE INDEX appointments_date_idx       ON public.appointments (appointment_date);
CREATE INDEX appointments_status_idx     ON public.appointments (status);
CREATE INDEX appointments_contractor_idx ON public.appointments (contractor_id);
CREATE INDEX appointments_upload_idx     ON public.appointments (pdf_upload_id);
CREATE INDEX appointments_claim_idx      ON public.appointments (claim_number) WHERE claim_number IS NOT NULL;
CREATE INDEX appointments_vin_idx        ON public.appointments (vin) WHERE vin IS NOT NULL;

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 4. daily_routes ──────────────────────────────────────────────────────────

CREATE TABLE public.daily_routes (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_date                     DATE NOT NULL,
  start_address                  TEXT NOT NULL,
  start_latitude                 DOUBLE PRECISION,
  start_longitude                DOUBLE PRECISION,
  end_address                    TEXT,
  end_latitude                   DOUBLE PRECISION,
  end_longitude                  DOUBLE PRECISION,
  total_miles                    NUMERIC(7,1),
  total_drive_time_minutes       INTEGER,
  total_appointment_time_minutes INTEGER,
  day_start_time                 TIME NOT NULL DEFAULT '08:00',
  estimated_day_end_time         TIME,
  route_status                   route_status NOT NULL DEFAULT 'draft',
  -- 'nearest_neighbor_2opt', 'manual', etc. — keeps optimization explainable
  optimization_method            TEXT,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one route per date may be in a working state
CREATE UNIQUE INDEX daily_routes_working_date_uniq
  ON public.daily_routes (route_date)
  WHERE route_status IN ('draft', 'active');

CREATE INDEX daily_routes_date_idx ON public.daily_routes (route_date DESC);

CREATE TRIGGER daily_routes_updated_at
  BEFORE UPDATE ON public.daily_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 5. route_stops ───────────────────────────────────────────────────────────
-- Optimizer invariants (enforced in app code, stored here):
-- completed stops never move, locked stops never move.

CREATE TABLE public.route_stops (
  id                               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_route_id                   UUID NOT NULL REFERENCES public.daily_routes(id) ON DELETE CASCADE,
  appointment_id                   UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  stop_order                       INTEGER NOT NULL CHECK (stop_order >= 1),
  estimated_arrival_time           TIME,
  estimated_departure_time         TIME,
  drive_time_from_previous_minutes INTEGER,
  miles_from_previous              NUMERIC(6,1),
  locked_position                  BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at                     TIMESTAMPTZ,
  skipped                          BOOLEAN NOT NULL DEFAULT FALSE,
  route_notes                      TEXT,
  created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT route_stops_one_stop_per_appointment UNIQUE (daily_route_id, appointment_id)
);

CREATE INDEX route_stops_route_idx       ON public.route_stops (daily_route_id, stop_order);
CREATE INDEX route_stops_appointment_idx ON public.route_stops (appointment_id);

CREATE TRIGGER route_stops_updated_at
  BEFORE UPDATE ON public.route_stops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 6. route_adjustment_suggestions ──────────────────────────────────────────
-- Best-insertion suggestions when a new appointment lands on a day
-- that already has a route. accepted: NULL = pending, TRUE = applied,
-- FALSE = dismissed.

CREATE TABLE public.route_adjustment_suggestions (
  id                             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_route_id                 UUID NOT NULL REFERENCES public.daily_routes(id) ON DELETE CASCADE,
  appointment_id                 UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  suggested_insert_after_stop_id  UUID REFERENCES public.route_stops(id) ON DELETE CASCADE,
  suggested_insert_before_stop_id UUID REFERENCES public.route_stops(id) ON DELETE CASCADE,
  added_drive_time_minutes       INTEGER,
  added_miles                    NUMERIC(6,1),
  creates_conflict               BOOLEAN NOT NULL DEFAULT FALSE,
  conflict_reason                TEXT,
  accepted                       BOOLEAN,
  created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX route_adjustment_suggestions_route_idx
  ON public.route_adjustment_suggestions (daily_route_id);

-- ── Audit trail extensions ───────────────────────────────────────────────────
-- New event types for the operations module, plus optional entity
-- links on audit_logs (metadata JSONB still carries event details).

ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'pdf_uploaded';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'pdf_processed';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'pdf_processing_failed';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'appointment_created';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'appointment_updated';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'appointment_confirmed';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'appointment_cancelled';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'appointment_marked_duplicate';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'route_generated';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'route_reordered';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'route_stop_locked';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'route_stop_unlocked';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'route_stop_completed';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'route_stop_skipped';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'appointment_inserted_into_route';

ALTER TABLE public.audit_logs
  ADD COLUMN appointment_id UUID REFERENCES public.appointments(id),
  ADD COLUMN daily_route_id UUID REFERENCES public.daily_routes(id);

CREATE INDEX audit_logs_appointment_idx ON public.audit_logs (appointment_id) WHERE appointment_id IS NOT NULL;
CREATE INDEX audit_logs_route_idx       ON public.audit_logs (daily_route_id) WHERE daily_route_id IS NOT NULL;
