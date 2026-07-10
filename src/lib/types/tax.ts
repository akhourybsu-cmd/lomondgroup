/**
 * Tax / bookkeeping module types — mirror migrations 009–011.
 * Money is integer cents everywhere.
 */

export type ExpenseCategory =
  | "advertising"
  | "car_truck"
  | "commissions_fees"
  | "contract_labor"
  | "depreciation"
  | "insurance"
  | "legal_professional"
  | "office_expense"
  | "rent_lease"
  | "repairs_maintenance"
  | "supplies"
  | "taxes_licenses"
  | "travel"
  | "meals"
  | "utilities"
  | "phone"
  | "software_subscriptions"
  | "education"
  | "bank_fees"
  | "home_office"
  | "other";

export interface ExpenseCategoryConfig {
  label: string;
  /** IRS Schedule C line reference, for the accountant hand-off */
  scheduleC: string;
  /** Default deductible percent (meals default to 50) */
  defaultDeductible: number;
}

export const EXPENSE_CATEGORY_CONFIG: Record<
  ExpenseCategory,
  ExpenseCategoryConfig
> = {
  advertising: { label: "Advertising & Marketing", scheduleC: "Line 8", defaultDeductible: 100 },
  car_truck: { label: "Car & Truck (actual costs)", scheduleC: "Line 9", defaultDeductible: 100 },
  commissions_fees: { label: "Commissions & Fees", scheduleC: "Line 10", defaultDeductible: 100 },
  contract_labor: { label: "Contract Labor", scheduleC: "Line 11", defaultDeductible: 100 },
  depreciation: { label: "Depreciation (equipment)", scheduleC: "Line 13", defaultDeductible: 100 },
  insurance: { label: "Insurance (E&O, liability)", scheduleC: "Line 15", defaultDeductible: 100 },
  legal_professional: { label: "Legal & Professional", scheduleC: "Line 17", defaultDeductible: 100 },
  office_expense: { label: "Office Expense", scheduleC: "Line 18", defaultDeductible: 100 },
  rent_lease: { label: "Rent or Lease", scheduleC: "Line 20", defaultDeductible: 100 },
  repairs_maintenance: { label: "Repairs & Maintenance", scheduleC: "Line 21", defaultDeductible: 100 },
  supplies: { label: "Supplies", scheduleC: "Line 22", defaultDeductible: 100 },
  taxes_licenses: { label: "Taxes & Licenses", scheduleC: "Line 23", defaultDeductible: 100 },
  travel: { label: "Travel (lodging, airfare)", scheduleC: "Line 24a", defaultDeductible: 100 },
  meals: { label: "Meals", scheduleC: "Line 24b", defaultDeductible: 50 },
  utilities: { label: "Utilities", scheduleC: "Line 25", defaultDeductible: 100 },
  phone: { label: "Phone & Internet", scheduleC: "Line 25 / 27a", defaultDeductible: 100 },
  software_subscriptions: { label: "Software & Subscriptions", scheduleC: "Line 27a", defaultDeductible: 100 },
  education: { label: "Education & Licensing CE", scheduleC: "Line 27a", defaultDeductible: 100 },
  bank_fees: { label: "Bank & Merchant Fees", scheduleC: "Line 27a", defaultDeductible: 100 },
  home_office: { label: "Home Office", scheduleC: "Form 8829", defaultDeductible: 100 },
  other: { label: "Other", scheduleC: "Line 27a", defaultDeductible: 100 },
};

export const EXPENSE_CATEGORIES = Object.keys(
  EXPENSE_CATEGORY_CONFIG
) as ExpenseCategory[];

export const PAYMENT_METHODS = ["check", "ach", "card", "cash", "other"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  check: "Check",
  ach: "ACH / Direct deposit",
  card: "Card",
  cash: "Cash",
  other: "Other",
};

export const ENTITY_TYPES = [
  "sole_prop",
  "single_member_llc",
  "multi_member_llc",
  "s_corp",
  "c_corp",
  "other",
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  sole_prop: "Sole Proprietor (Schedule C)",
  single_member_llc: "Single-Member LLC (Schedule C)",
  multi_member_llc: "Multi-Member LLC (Form 1065)",
  s_corp: "S-Corporation (Form 1120-S)",
  c_corp: "C-Corporation (Form 1120)",
  other: "Other",
};

// ── Entities ─────────────────────────────────────────────────────────────────

export interface TaxSettings {
  id: boolean;
  business_name: string | null;
  entity_type: EntityType | null;
  ein: string | null;
  state: string;
  mileage_round_trip: boolean;
  created_at: string;
  updated_at: string;
}

export interface MileageRate {
  year: number;
  cents_per_mile: number;
  updated_at: string;
}

export interface IncomeEntry {
  id: string;
  income_date: string;
  amount_cents: number;
  source: string | null;
  contractor_id: string | null;
  appointment_id: string | null;
  description: string | null;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessExpense {
  id: string;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount_cents: number;
  deductible_percent: number;
  vendor: string | null;
  payment_method: string | null;
  receipt_storage_path: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MileageEntry {
  id: string;
  trip_date: string;
  miles: number;
  purpose: string;
  from_location: string | null;
  to_location: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Year summary (computed) ──────────────────────────────────────────────────

export interface CategoryBreakdown {
  category: ExpenseCategory;
  totalCents: number;
  deductibleCents: number;
  count: number;
}

export interface RouteMileageLine {
  routeId: string;
  routeDate: string;
  stops: number;
  oneWayMiles: number;
  returnMiles: number;
  countedMiles: number; // one-way or round-trip per settings
}

export interface TaxYearSummary {
  year: number;
  incomeCents: number;
  incomeCount: number;
  expenseTotalCents: number;
  expenseDeductibleCents: number;
  expenseByCategory: CategoryBreakdown[];
  routeMiles: number;
  manualMiles: number;
  totalMiles: number;
  mileageRateCents: number;
  mileageRateIsFallback: boolean;
  mileageDeductionCents: number;
  /** income − deductible expenses − mileage deduction */
  netCents: number;
  roundTrip: boolean;
}

// ── Money helpers ────────────────────────────────────────────────────────────

export function centsToDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

/** Parse a user-entered dollar string ("1,234.56", "$1234.5") to cents. */
export function dollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (cleaned === "" || !/^-?\d*\.?\d{0,2}$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}
