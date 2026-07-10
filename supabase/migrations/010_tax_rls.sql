-- ============================================================
-- Lomond Appraisal Group — Tax Module RLS Policies
-- Migration: 010
-- ============================================================
-- Financial records are OWNER-ONLY. staff_appraiser and
-- read_only_reviewer get no access; clients get nothing.
-- Deny by default, same as migrations 002 / 006.
-- ============================================================

ALTER TABLE public.tax_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_mileage_rates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_expenses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mileage_entries    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_settings: owner only"
  ON public.tax_settings FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "tax_mileage_rates: owner only"
  ON public.tax_mileage_rates FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "income_entries: owner only"
  ON public.income_entries FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "business_expenses: owner only"
  ON public.business_expenses FOR ALL
  USING (get_my_role() = 'owner_admin');

CREATE POLICY "mileage_entries: owner only"
  ON public.mileage_entries FOR ALL
  USING (get_my_role() = 'owner_admin');
