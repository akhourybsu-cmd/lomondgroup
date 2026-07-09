-- ============================================================
-- Lomond Appraisal Group — Initial Database Schema
-- Migration: 001
-- ============================================================
-- Run via: supabase db push
-- All tables use UUID primary keys, timestamptz for dates,
-- and an updated_at trigger for automatic timestamp management.
-- ============================================================

-- ── Helper: updated_at trigger ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'owner_admin',
  'staff_appraiser',
  'client',
  'read_only_reviewer'
);

CREATE TYPE appraisal_type AS ENUM (
  'diminished_value',
  'total_loss_dispute',
  'classic_collector',
  'pre_purchase',
  'fair_market_value',
  'not_sure'
);

CREATE TYPE job_status AS ENUM (
  'new_request',
  'contacted',
  'documents_needed',
  'inspection_scheduled',
  'in_progress',
  'report_drafted',
  'sent_to_client',
  'paid_closed',
  'on_hold',
  'awaiting_payment',
  'canceled',
  'declined',
  'needs_owner_review'
);

CREATE TYPE payment_status AS ENUM (
  'unpaid',
  'invoiced',
  'partial',
  'paid',
  'refunded',
  'waived'
);

CREATE TYPE note_visibility AS ENUM (
  'internal',
  'client_visible'
);

CREATE TYPE file_category AS ENUM (
  'vehicle_photo',
  'damage_photo',
  'repair_estimate',
  'insurance_valuation',
  'settlement_offer',
  'appraisal_report',
  'other'
);

CREATE TYPE audit_event_type AS ENUM (
  'job_created',
  'job_status_changed',
  'job_assigned',
  'file_uploaded',
  'file_viewed',
  'file_downloaded',
  'note_added',
  'report_generated',
  'report_finalized',
  'report_sent',
  'payment_updated',
  'user_role_changed',
  'failed_access_attempt',
  'client_portal_access'
);

CREATE TYPE preferred_contact AS ENUM (
  'email',
  'phone',
  'either'
);

-- ── 1. profiles ──────────────────────────────────────────────────────────────
-- Extends auth.users. Created automatically via trigger on user signup.

CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         user_role NOT NULL DEFAULT 'client',
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, display_name)
  VALUES (
    NEW.id,
    'client',
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 2. clients ───────────────────────────────────────────────────────────────
-- Customer contact records. Separate from auth.users to allow
-- intake submissions from anonymous visitors.

CREATE TABLE public.clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT,
  preferred_contact preferred_contact NOT NULL DEFAULT 'email',
  street_address    TEXT,
  city              TEXT,
  state             TEXT,
  zip               TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clients_email_check CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$')
);

CREATE INDEX clients_email_idx ON public.clients (LOWER(email));

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. vehicles ──────────────────────────────────────────────────────────────

CREATE TABLE public.vehicles (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year           SMALLINT NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 2),
  make           TEXT NOT NULL,
  model          TEXT NOT NULL,
  trim           TEXT,
  vin            TEXT,
  mileage        INTEGER CHECK (mileage >= 0),
  color          TEXT,
  location_city  TEXT,
  location_state TEXT,
  is_drivable    BOOLEAN,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 4. appraisal_jobs ────────────────────────────────────────────────────────
-- Central operational record. Hub for all related data.

CREATE TABLE public.appraisal_jobs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID NOT NULL REFERENCES public.clients(id),
  vehicle_id              UUID NOT NULL REFERENCES public.vehicles(id),
  assigned_appraiser_id   UUID REFERENCES public.profiles(id),
  appraisal_type          appraisal_type NOT NULL,
  status                  job_status NOT NULL DEFAULT 'new_request',
  -- Insurance / claim
  insurance_company       TEXT,
  claim_number            TEXT,
  date_of_loss            DATE,
  vehicle_repaired        BOOLEAN,
  has_repair_estimate     BOOLEAN,
  has_settlement_offer    BOOLEAN,
  -- Customer intake notes
  customer_notes          TEXT,
  -- Admin
  internal_ref            TEXT UNIQUE,
  priority                TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
  -- Financials
  quoted_fee_cents        INTEGER CHECK (quoted_fee_cents >= 0),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX appraisal_jobs_client_idx     ON public.appraisal_jobs (client_id);
CREATE INDEX appraisal_jobs_status_idx     ON public.appraisal_jobs (status);
CREATE INDEX appraisal_jobs_created_at_idx ON public.appraisal_jobs (created_at DESC);
CREATE INDEX appraisal_jobs_appraiser_idx  ON public.appraisal_jobs (assigned_appraiser_id);

CREATE TRIGGER appraisal_jobs_updated_at
  BEFORE UPDATE ON public.appraisal_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate internal_ref (e.g. LAG-20240001)
CREATE OR REPLACE FUNCTION generate_internal_ref()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  seq      INTEGER;
BEGIN
  IF NEW.internal_ref IS NULL THEN
    year_str := TO_CHAR(NOW(), 'YYYY');
    SELECT COUNT(*) + 1 INTO seq
    FROM public.appraisal_jobs
    WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());
    NEW.internal_ref := 'LAG-' || year_str || LPAD(seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appraisal_jobs_internal_ref
  BEFORE INSERT ON public.appraisal_jobs
  FOR EACH ROW EXECUTE FUNCTION generate_internal_ref();

-- ── 5. uploaded_files ────────────────────────────────────────────────────────
-- Metadata only. Actual files stored in private Supabase Storage buckets.
-- storage_path is NEVER sent to the client — only signed URLs are generated.

CREATE TABLE public.uploaded_files (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id           UUID NOT NULL REFERENCES public.appraisal_jobs(id) ON DELETE CASCADE,
  uploaded_by      UUID REFERENCES public.profiles(id),
  file_name        TEXT NOT NULL,
  storage_path     TEXT NOT NULL,
  file_size_bytes  BIGINT NOT NULL CHECK (file_size_bytes > 0),
  mime_type        TEXT NOT NULL,
  category         file_category NOT NULL DEFAULT 'other',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX uploaded_files_job_idx ON public.uploaded_files (job_id);

-- ── 6. job_notes ─────────────────────────────────────────────────────────────
-- Internal notes MUST never be visible to clients (enforced via RLS).

CREATE TABLE public.job_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID NOT NULL REFERENCES public.appraisal_jobs(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.profiles(id),
  visibility note_visibility NOT NULL DEFAULT 'internal',
  body       TEXT NOT NULL CHECK (LENGTH(TRIM(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX job_notes_job_idx ON public.job_notes (job_id);

CREATE TRIGGER job_notes_updated_at
  BEFORE UPDATE ON public.job_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 7. appraisal_reports ─────────────────────────────────────────────────────
-- Must be created before market_comparables (which has a FK here).

CREATE TABLE public.appraisal_reports (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                     UUID NOT NULL REFERENCES public.appraisal_jobs(id) ON DELETE CASCADE,
  authored_by                UUID NOT NULL REFERENCES public.profiles(id),
  title                      TEXT NOT NULL,
  condition_summary          TEXT,
  condition_details          TEXT,
  valuation_conclusion_cents INTEGER CHECK (valuation_conclusion_cents >= 0),
  valuation_method           TEXT,
  valuation_notes            TEXT,
  is_draft                   BOOLEAN NOT NULL DEFAULT TRUE,
  finalized_at               TIMESTAMPTZ,
  pdf_storage_path           TEXT,
  sent_to_client_at          TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_report_per_job UNIQUE (job_id)
);

CREATE INDEX appraisal_reports_job_idx ON public.appraisal_reports (job_id);

CREATE TRIGGER appraisal_reports_updated_at
  BEFORE UPDATE ON public.appraisal_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 8. market_comparables ────────────────────────────────────────────────────

CREATE TABLE public.market_comparables (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id         UUID NOT NULL REFERENCES public.appraisal_reports(id) ON DELETE CASCADE,
  year              SMALLINT NOT NULL,
  make              TEXT NOT NULL,
  model             TEXT NOT NULL,
  trim              TEXT,
  mileage           INTEGER,
  condition         TEXT,
  sale_price_cents  INTEGER NOT NULL CHECK (sale_price_cents >= 0),
  source            TEXT,
  listing_url       TEXT,
  listing_date      DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX market_comparables_report_idx ON public.market_comparables (report_id);

-- ── 9. payments ──────────────────────────────────────────────────────────────

CREATE TABLE public.payments (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id                       UUID NOT NULL REFERENCES public.appraisal_jobs(id) ON DELETE CASCADE,
  status                       payment_status NOT NULL DEFAULT 'unpaid',
  amount_cents                 INTEGER CHECK (amount_cents >= 0),
  paid_at                      TIMESTAMPTZ,
  method                       TEXT,
  stripe_payment_intent_id     TEXT,
  stripe_checkout_session_id   TEXT,
  notes                        TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_payment_per_job UNIQUE (job_id)
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 10. audit_logs ───────────────────────────────────────────────────────────
-- Immutable. No UPDATE or DELETE policies for any role.

CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID REFERENCES public.appraisal_jobs(id),
  actor_id    UUID REFERENCES public.profiles(id),
  event_type  audit_event_type NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_logs_job_idx        ON public.audit_logs (job_id);
CREATE INDEX audit_logs_actor_idx      ON public.audit_logs (actor_id);
CREATE INDEX audit_logs_event_type_idx ON public.audit_logs (event_type);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
