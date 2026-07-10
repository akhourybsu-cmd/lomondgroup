-- ============================================================
-- Lomond Appraisal Group — Tax / Bookkeeping Module Schema
-- Migration: 009
-- ============================================================
-- Record-keeping for an independent MA appraisal business:
-- income, business expenses (Schedule C categories), and business
-- mileage. Mileage is derived from daily_routes (auto) plus manual
-- trip entries. This is bookkeeping, not tax advice.
--
-- Money is stored as integer cents. Access is owner_admin-only (see
-- migration 010) — financial data is not exposed to staff/reviewer.
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────────────────────
-- Expense categories map to IRS Schedule C lines so the export hands
-- off cleanly to an accountant.

CREATE TYPE expense_category AS ENUM (
  'advertising',            -- Line 8
  'car_truck',              -- Line 9 (actual-expense method; separate from std mileage)
  'commissions_fees',       -- Line 10
  'contract_labor',         -- Line 11
  'depreciation',           -- Line 13
  'insurance',              -- Line 15 (business insurance, E&O)
  'legal_professional',     -- Line 17
  'office_expense',         -- Line 18
  'rent_lease',             -- Line 20
  'repairs_maintenance',    -- Line 21
  'supplies',               -- Line 22
  'taxes_licenses',         -- Line 23
  'travel',                 -- Line 24a
  'meals',                  -- Line 24b (typically 50% deductible)
  'utilities',              -- Line 25
  'phone',                  -- part of utilities/other; broken out for clarity
  'software_subscriptions', -- Line 27a (other)
  'education',              -- Line 27a (other)
  'bank_fees',              -- Line 27a (other)
  'home_office',            -- Form 8829
  'other'                   -- Line 27a
);

-- ── 1. tax_settings (single row) ─────────────────────────────────────────────

CREATE TABLE public.tax_settings (
  id                 BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),  -- enforces one row
  business_name      TEXT,
  entity_type        TEXT,   -- sole_prop | single_member_llc | multi_member_llc | s_corp | c_corp | other
  ein                TEXT,
  state              TEXT NOT NULL DEFAULT 'MA',
  -- Round-trip: include the drive back to home base after the last stop
  mileage_round_trip BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tax_settings_updated_at
  BEFORE UPDATE ON public.tax_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.tax_settings (id) VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── 2. tax_mileage_rates ─────────────────────────────────────────────────────
-- IRS standard mileage rate per year, in cents per mile. Editable —
-- confirm the official rate each year. Seeded with known historical
-- rates; the current/future year is user-set (summary falls back to
-- the most recent known rate with a visible "confirm" warning).

CREATE TABLE public.tax_mileage_rates (
  year           INTEGER PRIMARY KEY CHECK (year >= 2000 AND year <= 2100),
  cents_per_mile INTEGER NOT NULL CHECK (cents_per_mile > 0),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER tax_mileage_rates_updated_at
  BEFORE UPDATE ON public.tax_mileage_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.tax_mileage_rates (year, cents_per_mile) VALUES
  (2023, 66),   -- IRS: 65.5¢ (stored as whole cents; adjust in Settings if needed)
  (2024, 67),
  (2025, 70)
ON CONFLICT (year) DO NOTHING;

-- ── 3. income_entries ────────────────────────────────────────────────────────

CREATE TABLE public.income_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  income_date    DATE NOT NULL,
  amount_cents   INTEGER NOT NULL CHECK (amount_cents >= 0),
  source         TEXT,   -- free-text payer name
  contractor_id  UUID REFERENCES public.contractors(id),
  appointment_id UUID REFERENCES public.appointments(id),
  description    TEXT,
  payment_method TEXT,   -- check | ach | card | cash | other
  reference_number TEXT,
  notes          TEXT,
  created_by     UUID REFERENCES public.profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX income_entries_date_idx ON public.income_entries (income_date);
CREATE INDEX income_entries_contractor_idx ON public.income_entries (contractor_id);

CREATE TRIGGER income_entries_updated_at
  BEFORE UPDATE ON public.income_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 4. business_expenses ─────────────────────────────────────────────────────

CREATE TABLE public.business_expenses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date        DATE NOT NULL,
  category            expense_category NOT NULL,
  description         TEXT NOT NULL,
  amount_cents        INTEGER NOT NULL CHECK (amount_cents >= 0),
  -- Deductible portion (meals ~50%); deductible = amount * pct / 100
  deductible_percent  INTEGER NOT NULL DEFAULT 100 CHECK (deductible_percent BETWEEN 0 AND 100),
  vendor              TEXT,
  payment_method      TEXT,
  receipt_storage_path TEXT,   -- private tax-receipts bucket; signed URLs only
  notes               TEXT,
  created_by          UUID REFERENCES public.profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX business_expenses_date_idx ON public.business_expenses (expense_date);
CREATE INDEX business_expenses_category_idx ON public.business_expenses (category);

CREATE TRIGGER business_expenses_updated_at
  BEFORE UPDATE ON public.business_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 5. mileage_entries (manual trips not captured by a route) ────────────────

CREATE TABLE public.mileage_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_date     DATE NOT NULL,
  miles         NUMERIC(7,1) NOT NULL CHECK (miles > 0),
  purpose       TEXT NOT NULL,
  from_location TEXT,
  to_location   TEXT,
  notes         TEXT,
  created_by    UUID REFERENCES public.profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX mileage_entries_date_idx ON public.mileage_entries (trip_date);

CREATE TRIGGER mileage_entries_updated_at
  BEFORE UPDATE ON public.mileage_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 6. Route return-leg mileage ──────────────────────────────────────────────
-- Distance from the last stop back to the start location, computed at
-- route recompute time. Enables accurate round-trip mileage totals
-- without re-hitting the Routes API in the tax layer.

ALTER TABLE public.daily_routes
  ADD COLUMN return_to_start_miles NUMERIC(6,1);

-- ── Audit event types ────────────────────────────────────────────────────────

ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'tax_income_recorded';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'tax_expense_recorded';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'tax_mileage_recorded';
ALTER TYPE audit_event_type ADD VALUE IF NOT EXISTS 'tax_settings_updated';
