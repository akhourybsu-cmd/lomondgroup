-- ============================================================
-- Lomond Appraisal Group — Tax Receipts Storage
-- Migration: 011
-- ============================================================
-- Private bucket for expense receipts. Owner-only; served via
-- short-lived server-generated signed URLs. Path: {expense_id}/{filename}
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tax-receipts',
  'tax-receipts',
  FALSE,
  10485760, -- 10 MB per receipt
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "tax-receipts: owner full access"
  ON storage.objects FOR ALL
  TO authenticated
  USING (
    bucket_id = 'tax-receipts'
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner_admin'
  );
