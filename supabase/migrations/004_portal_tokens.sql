-- ============================================================
-- Lomond Appraisal Group — Client Portal Tokens
-- Migration: 004
-- ============================================================
-- Adds a portal_token column to appraisal_jobs.
-- Each job gets a unique unguessable UUID that acts as a
-- capability token — possessing the URL grants client-level
-- read access to that specific job's safe data.
-- ============================================================

ALTER TABLE public.appraisal_jobs
  ADD COLUMN IF NOT EXISTS portal_token UUID DEFAULT gen_random_uuid();

-- Backfill any rows that somehow ended up with NULL (safety net)
UPDATE public.appraisal_jobs
  SET portal_token = gen_random_uuid()
  WHERE portal_token IS NULL;

-- Enforce NOT NULL and uniqueness going forward
ALTER TABLE public.appraisal_jobs
  ALTER COLUMN portal_token SET NOT NULL;

-- Add unique constraint only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'appraisal_jobs_portal_token_key'
    AND conrelid = 'public.appraisal_jobs'::regclass
  ) THEN
    ALTER TABLE public.appraisal_jobs
      ADD CONSTRAINT appraisal_jobs_portal_token_key UNIQUE (portal_token);
  END IF;
END $$;

-- Index for fast portal token lookups
CREATE INDEX IF NOT EXISTS appraisal_jobs_portal_token_idx
  ON public.appraisal_jobs (portal_token);
