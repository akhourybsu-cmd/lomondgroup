-- ============================================================
-- Lomond Appraisal Group — Operations Module Storage
-- Migration: 007
-- ============================================================
-- Private bucket for contractor assignment PDFs.
-- Same rules as 003: no public access, files served only via
-- server-generated signed URLs, storage_path never sent to the
-- browser. Path structure: assignment-pdfs/{pdf_upload_id}/{filename}
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assignment-pdfs',
  'assignment-pdfs',
  FALSE,
  26214400, -- 25 MB per file
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "assignment-pdfs: admin full access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'assignment-pdfs'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner_admin'
  );

CREATE POLICY "assignment-pdfs: staff read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'assignment-pdfs'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('staff_appraiser', 'read_only_reviewer')
  );
