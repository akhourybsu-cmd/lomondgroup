-- ============================================================
-- Lomond Appraisal Group — Row Level Security Policies
-- Migration: 002
-- ============================================================
-- SECURITY PRINCIPLE: Deny by default.
-- RLS is enabled on every private table. No implicit access.
-- Role is read from profiles.role on every request — not JWT claims.
-- ============================================================

-- ── Helper function: get current user role ───────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- ── Enable RLS on all private tables ────────────────────────────────────────

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_jobs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appraisal_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_comparables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================

-- Users can read their own profile
CREATE POLICY "profiles: read own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

-- owner_admin can read all profiles
CREATE POLICY "profiles: admin read all"
  ON public.profiles FOR SELECT
  USING (get_my_role() = 'owner_admin');

-- owner_admin can update any profile (for role management)
CREATE POLICY "profiles: admin update"
  ON public.profiles FOR UPDATE
  USING (get_my_role() = 'owner_admin');

-- Users can update their own display_name and avatar_url only
-- (role field is NOT updatable by the user themselves — enforced below)
CREATE POLICY "profiles: self update non-role fields"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- ============================================================
-- CLIENTS
-- ============================================================

-- owner_admin: full access
CREATE POLICY "clients: admin full access"
  ON public.clients FOR ALL
  USING (get_my_role() = 'owner_admin');

-- staff_appraiser: read only
CREATE POLICY "clients: staff read"
  ON public.clients FOR SELECT
  USING (get_my_role() IN ('staff_appraiser', 'read_only_reviewer'));

-- Clients cannot query this table directly (their data is in profiles + appraisal_jobs)

-- ============================================================
-- VEHICLES
-- ============================================================

CREATE POLICY "vehicles: admin full access"
  ON public.vehicles FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "vehicles: staff read"
  ON public.vehicles FOR SELECT
  USING (get_my_role() IN ('staff_appraiser', 'read_only_reviewer'));

-- ============================================================
-- APPRAISAL_JOBS
-- ============================================================

CREATE POLICY "appraisal_jobs: admin full access"
  ON public.appraisal_jobs FOR ALL
  USING (get_my_role() = 'owner_admin');

-- staff_appraiser: read + update on assigned jobs only
CREATE POLICY "appraisal_jobs: staff read assigned"
  ON public.appraisal_jobs FOR SELECT
  USING (
    get_my_role() = 'staff_appraiser'
    AND assigned_appraiser_id = auth.uid()
  );

CREATE POLICY "appraisal_jobs: staff update assigned"
  ON public.appraisal_jobs FOR UPDATE
  USING (
    get_my_role() = 'staff_appraiser'
    AND assigned_appraiser_id = auth.uid()
  );

CREATE POLICY "appraisal_jobs: reviewer read assigned"
  ON public.appraisal_jobs FOR SELECT
  USING (
    get_my_role() = 'read_only_reviewer'
    AND assigned_appraiser_id = auth.uid()
  );

-- Future client portal: client can read their own jobs
-- (enabled in a future migration when client portal is built)
-- CREATE POLICY "appraisal_jobs: client read own"
--   ON public.appraisal_jobs FOR SELECT
--   USING (
--     get_my_role() = 'client'
--     AND client_id = (SELECT id FROM public.clients WHERE ... )
--   );

-- Allow anonymous INSERT for the public intake form (via service role only)
-- The API route uses the service client to insert — anon cannot insert directly.

-- ============================================================
-- UPLOADED_FILES
-- ============================================================

CREATE POLICY "uploaded_files: admin full access"
  ON public.uploaded_files FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "uploaded_files: staff read on assigned jobs"
  ON public.uploaded_files FOR SELECT
  USING (
    get_my_role() = 'staff_appraiser'
    AND job_id IN (
      SELECT id FROM public.appraisal_jobs
      WHERE assigned_appraiser_id = auth.uid()
    )
  );

-- ============================================================
-- JOB_NOTES
-- ============================================================

-- owner_admin: all notes
CREATE POLICY "job_notes: admin full access"
  ON public.job_notes FOR ALL
  USING (get_my_role() = 'owner_admin');

-- staff_appraiser: all notes on assigned jobs (including internal)
CREATE POLICY "job_notes: staff read on assigned"
  ON public.job_notes FOR SELECT
  USING (
    get_my_role() = 'staff_appraiser'
    AND job_id IN (
      SELECT id FROM public.appraisal_jobs
      WHERE assigned_appraiser_id = auth.uid()
    )
  );

CREATE POLICY "job_notes: staff insert on assigned"
  ON public.job_notes FOR INSERT
  WITH CHECK (
    get_my_role() = 'staff_appraiser'
    AND job_id IN (
      SELECT id FROM public.appraisal_jobs
      WHERE assigned_appraiser_id = auth.uid()
    )
    AND author_id = auth.uid()
  );

-- Future: client can read ONLY client_visible notes on their own jobs
-- CREATE POLICY "job_notes: client read visible"
--   ON public.job_notes FOR SELECT
--   USING (
--     get_my_role() = 'client'
--     AND visibility = 'client_visible'
--     AND job_id IN (SELECT id FROM public.appraisal_jobs WHERE ...)
--   );

-- ============================================================
-- APPRAISAL_REPORTS
-- ============================================================

CREATE POLICY "appraisal_reports: admin full access"
  ON public.appraisal_reports FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "appraisal_reports: staff read/write on assigned"
  ON public.appraisal_reports FOR ALL
  USING (
    get_my_role() = 'staff_appraiser'
    AND job_id IN (
      SELECT id FROM public.appraisal_jobs
      WHERE assigned_appraiser_id = auth.uid()
    )
  );

-- Future: client can read finalized report only
-- CREATE POLICY "appraisal_reports: client read finalized"
--   ON public.appraisal_reports FOR SELECT
--   USING (
--     get_my_role() = 'client'
--     AND is_draft = FALSE
--     AND finalized_at IS NOT NULL
--   );

-- ============================================================
-- MARKET_COMPARABLES
-- ============================================================

CREATE POLICY "market_comparables: admin full access"
  ON public.market_comparables FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "market_comparables: staff on assigned reports"
  ON public.market_comparables FOR ALL
  USING (
    get_my_role() = 'staff_appraiser'
    AND report_id IN (
      SELECT r.id FROM public.appraisal_reports r
      JOIN public.appraisal_jobs j ON j.id = r.job_id
      WHERE j.assigned_appraiser_id = auth.uid()
    )
  );

-- ============================================================
-- PAYMENTS
-- ============================================================

-- Payments are admin-only. Staff and clients cannot see payment details.
CREATE POLICY "payments: admin full access"
  ON public.payments FOR ALL
  USING (get_my_role() = 'owner_admin');

-- ============================================================
-- AUDIT_LOGS
-- ============================================================

-- Immutable: no UPDATE or DELETE for any role.
-- owner_admin can read all logs.
CREATE POLICY "audit_logs: admin read"
  ON public.audit_logs FOR SELECT
  USING (get_my_role() = 'owner_admin');

-- Any authenticated role can INSERT audit events
CREATE POLICY "audit_logs: authenticated insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
