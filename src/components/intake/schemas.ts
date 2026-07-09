import { z } from "zod";

// ─── Step 1: Contact ─────────────────────────────────────────────────────────

export const contactSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().min(7, "Phone number is required"),
  preferred_contact: z.enum(["email", "phone", "either"]),
});

export type ContactData = z.infer<typeof contactSchema>;

// ─── Step 2: Appraisal type ───────────────────────────────────────────────────

export const typeSchema = z.object({
  appraisal_type: z.enum([
    "diminished_value",
    "total_loss_dispute",
    "classic_collector",
    "pre_purchase",
    "fair_market_value",
    "not_sure",
  ]),
});

export type TypeData = z.infer<typeof typeSchema>;

/** Types that require the claim/insurance step */
export const CLAIM_TYPES = new Set(["diminished_value", "total_loss_dispute"]);

// ─── Step 3: Vehicle ─────────────────────────────────────────────────────────
// Uses pure numeric/boolean types — components use setValueAs / setValue to
// convert HTML input strings to the right primitive before storing in form state.

const CURRENT_YEAR = new Date().getFullYear();

export const vehicleSchema = z.object({
  year: z
    .number({ message: "Year is required" })
    .int()
    .min(1900, "Enter a valid year (1900–" + (CURRENT_YEAR + 2) + ")")
    .max(CURRENT_YEAR + 2, "Enter a valid year"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  trim: z.string().optional(),
  vin: z.string().optional(),
  mileage: z.number().int().min(0, "Mileage must be 0 or more").nullable().optional(),
  location_city: z.string().min(1, "City is required"),
  location_state: z
    .string()
    .min(1, "State is required")
    .max(2, "Use 2-letter state code (e.g. CA)"),
  is_drivable: z.boolean().nullable().optional(),
});

export type VehicleData = z.infer<typeof vehicleSchema>;

// ─── Step 4: Claim / insurance info (conditional) ────────────────────────────
// All optional — boolean fields are set directly via setValue in the component.

export const claimSchema = z.object({
  insurance_company: z.string().optional(),
  claim_number: z.string().optional(),
  date_of_loss: z.string().optional(),
  vehicle_repaired: z.boolean().nullable().optional(),
  has_repair_estimate: z.boolean().nullable().optional(),
  has_settlement_offer: z.boolean().nullable().optional(),
});

export type ClaimData = z.infer<typeof claimSchema>;

// ─── Step 5: Notes ───────────────────────────────────────────────────────────

export const notesSchema = z.object({
  customer_notes: z.string().optional(),
});

export type NotesData = z.infer<typeof notesSchema>;

// ─── Step 6: Consent ─────────────────────────────────────────────────────────

export const consentSchema = z.object({
  confirms_accuracy: z
    .boolean()
    .refine((v) => v === true, { message: "Please confirm the information is accurate" }),
  consents_to_contact: z
    .boolean()
    .refine((v) => v === true, { message: "Please consent to being contacted" }),
  understands_no_guarantee: z
    .boolean()
    .refine((v) => v === true, { message: "Please acknowledge the disclaimer" }),
});

export type ConsentData = z.infer<typeof consentSchema>;

// ─── Combined (used by server action) ────────────────────────────────────────

export const fullIntakeSchema = z.object({
  contact: contactSchema,
  type: typeSchema,
  vehicle: vehicleSchema,
  claim: claimSchema.optional(),
  notes: notesSchema,
  consent: consentSchema,
});

export type FullIntakeData = z.infer<typeof fullIntakeSchema>;
