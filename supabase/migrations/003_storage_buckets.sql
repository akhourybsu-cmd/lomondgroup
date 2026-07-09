-- ============================================================
-- Lomond Appraisal Group — Storage Buckets
-- Migration: 003
-- ============================================================
-- All buckets are PRIVATE. No public access.
-- Files are accessed only via server-side signed URLs with short TTLs.
-- The storage_path in uploaded_files is NEVER sent to the client directly.
-- ============================================================

-- ── Create private storage buckets ──────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'job-files',
    'job-files',
    FALSE,
    52428800,  -- 50 MB per file
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf'
    ]
  ),
  (
    'appraisal-reports',
    'appraisal-reports',
    FALSE,
    104857600, -- 100 MB (PDFs can be large)
    ARRAY['application/pdf']
  )
ON CONFLICT (id) DO NOTHING;

-- ── Storage RLS: job-files bucket ───────────────────────────────────────────
-- Allow owner_admin full access.
-- Allow staff_appraiser to upload/read files on assigned jobs.
-- No public access.

CREATE POLICY "job-files: admin full access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'job-files'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner_admin'
  );

CREATE POLICY "job-files: staff read on assigned"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'job-files'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff_appraiser'
    -- Path structure: job-files/{job_id}/{file_name}
    -- The job_id is extracted from the storage path
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM public.appraisal_jobs
      WHERE assigned_appraiser_id = auth.uid()
    )
  );

CREATE POLICY "job-files: staff upload on assigned"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'job-files'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff_appraiser'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM public.appraisal_jobs
      WHERE assigned_appraiser_id = auth.uid()
    )
  );

-- ── Storage RLS: appraisal-reports bucket ───────────────────────────────────

CREATE POLICY "appraisal-reports: admin full access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'appraisal-reports'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner_admin'
  );

CREATE POLICY "appraisal-reports: staff read/write on assigned"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'appraisal-reports'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'staff_appraiser'
    AND (storage.foldername(name))[1] IN (
      SELECT id::TEXT FROM public.appraisal_jobs
      WHERE assigned_appraiser_id = auth.uid()
    )
  );
