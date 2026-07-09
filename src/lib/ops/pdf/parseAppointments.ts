/**
 * AI-assisted structured extraction — converts raw PDF text into
 * appointment fields via the Anthropic API with structured outputs
 * (schema-constrained JSON, so the response always parses).
 *
 * This is "AI-assisted intake", not final truth: results become
 * needs_review drafts, the raw output is stored verbatim, and nothing
 * is auto-confirmed.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const EXTRACTION_MODEL = "claude-opus-4-8";

export interface ExtractedAppointment {
  contractor_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  appointment_date: string | null; // YYYY-MM-DD
  appointment_time: string | null; // HH:MM 24h
  time_window_start: string | null;
  time_window_end: string | null;
  claim_number: string | null;
  reference_number: string | null;
  insurance_company: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vin: string | null;
  vehicle_location_notes: string | null;
  damage_notes: string | null;
  special_instructions: string | null;
  confidence: number; // 0–1
  missing_or_uncertain_fields: string[];
}

export interface ExtractionResult {
  is_appointment_document: boolean;
  document_summary: string;
  appointments: ExtractedAppointment[];
}

export type ParseOutcome =
  | { ok: true; result: ExtractionResult; rawOutput: string; model: string }
  | { ok: false; error: string };

// NOTE: the structured-outputs API limits schemas to 16 union-typed
// (nullable/anyOf) parameters. With ~23 optional fields we stay at ZERO
// unions instead: every field is a plain string and the model writes ""
// for anything not stated; normalizeExtracted() converts "" back to null.
const STR = { type: "string", description: "empty string if not stated" };

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    is_appointment_document: {
      type: "boolean",
      description:
        "false if this document is clearly not an appraisal appointment/assignment",
    },
    document_summary: {
      type: "string",
      description: "One sentence describing what this document is",
    },
    appointments: {
      type: "array",
      description: "One entry per distinct appointment/assignment in the document",
      items: {
        type: "object",
        properties: {
          contractor_name: STR,
          customer_name: STR,
          customer_phone: STR,
          customer_email: STR,
          address_line_1: STR,
          address_line_2: STR,
          city: STR,
          state: { type: "string", description: "2-letter state code, empty if not stated" },
          zip: STR,
          appointment_date: {
            type: "string",
            description: "YYYY-MM-DD, empty string if not stated",
          },
          appointment_time: {
            type: "string",
            description: "HH:MM 24-hour, empty string if not stated",
          },
          time_window_start: {
            type: "string",
            description: "HH:MM 24-hour window start, empty if no window given",
          },
          time_window_end: {
            type: "string",
            description: "HH:MM 24-hour window end, empty if no window given",
          },
          claim_number: STR,
          reference_number: STR,
          insurance_company: STR,
          vehicle_year: {
            type: "string",
            description: "4-digit year, empty string if not stated",
          },
          vehicle_make: STR,
          vehicle_model: STR,
          vin: STR,
          vehicle_location_notes: STR,
          damage_notes: STR,
          special_instructions: STR,
          confidence: {
            type: "number",
            description:
              "0 to 1 — overall confidence that the extracted fields are accurate",
          },
          missing_or_uncertain_fields: {
            type: "array",
            items: { type: "string" },
            description:
              "Field names that were missing from the document or extracted with low certainty",
          },
        },
        required: [
          "contractor_name",
          "customer_name",
          "customer_phone",
          "customer_email",
          "address_line_1",
          "address_line_2",
          "city",
          "state",
          "zip",
          "appointment_date",
          "appointment_time",
          "time_window_start",
          "time_window_end",
          "claim_number",
          "reference_number",
          "insurance_company",
          "vehicle_year",
          "vehicle_make",
          "vehicle_model",
          "vin",
          "vehicle_location_notes",
          "damage_notes",
          "special_instructions",
          "confidence",
          "missing_or_uncertain_fields",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["is_appointment_document", "document_summary", "appointments"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You extract vehicle appraisal appointment details from contractor assignment documents for a motor vehicle appraisal business.

Rules:
- Extract only information actually present in the document. Never guess or invent values — use an empty string ("") for anything not stated.
- Different contractors use different layouts; rely on meaning, not position.
- A document may contain more than one appointment — return one entry per distinct appointment.
- Normalize dates to YYYY-MM-DD and times to 24-hour HH:MM. If a date has no year, use the most plausible upcoming year and list the field in missing_or_uncertain_fields.
- The appointment address is where the vehicle will be inspected (may be a home, body shop, or tow yard) — not the contractor's office address.
- claim_number is the insurance claim number; reference_number is the contractor's own assignment/file number.
- Put damage descriptions in damage_notes and access/scheduling instructions in special_instructions.
- List every field you could not find, or extracted with low certainty, in missing_or_uncertain_fields.
- If the document is not an appraisal appointment or assignment at all, set is_appointment_document to false and return an empty appointments array.`;

/**
 * Wire format: every field is a string, "" meaning "not stated"
 * (keeps the schema free of union types — see EXTRACTION_SCHEMA note).
 * This converts the wire shape into the app's nullable shape.
 */
function normalizeExtracted(raw: Record<string, unknown>): ExtractedAppointment {
  const str = (key: string): string | null => {
    const value = raw[key];
    return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  };
  const yearStr = str("vehicle_year");
  const year = yearStr ? parseInt(yearStr, 10) : NaN;
  const confidence = typeof raw.confidence === "number" ? raw.confidence : 0;
  return {
    contractor_name: str("contractor_name"),
    customer_name: str("customer_name"),
    customer_phone: str("customer_phone"),
    customer_email: str("customer_email"),
    address_line_1: str("address_line_1"),
    address_line_2: str("address_line_2"),
    city: str("city"),
    state: str("state"),
    zip: str("zip"),
    appointment_date: str("appointment_date"),
    appointment_time: str("appointment_time"),
    time_window_start: str("time_window_start"),
    time_window_end: str("time_window_end"),
    claim_number: str("claim_number"),
    reference_number: str("reference_number"),
    insurance_company: str("insurance_company"),
    vehicle_year: Number.isFinite(year) && year >= 1900 && year <= 2100 ? year : null,
    vehicle_make: str("vehicle_make"),
    vehicle_model: str("vehicle_model"),
    vin: str("vin"),
    vehicle_location_notes: str("vehicle_location_notes"),
    damage_notes: str("damage_notes"),
    special_instructions: str("special_instructions"),
    confidence: Math.max(0, Math.min(1, confidence)),
    missing_or_uncertain_fields: Array.isArray(raw.missing_or_uncertain_fields)
      ? (raw.missing_or_uncertain_fields as string[]).filter(
          (f) => typeof f === "string"
        )
      : [],
  };
}

export async function parseAppointmentsFromText(
  rawText: string
): Promise<ParseOutcome> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      ok: false,
      error: "AI extraction is not configured (ANTHROPIC_API_KEY missing).",
    };
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: EXTRACTION_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: "json_schema",
          schema: EXTRACTION_SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [
        {
          role: "user",
          content: `Extract the appointment details from this document text:\n\n${rawText.slice(0, 200_000)}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "The AI declined to process this document." };
    }
    if (response.stop_reason === "max_tokens") {
      return {
        ok: false,
        error: "The document is too large to extract in one pass.",
      };
    }

    const text = response.content.find((b) => b.type === "text")?.text;
    if (!text) {
      return { ok: false, error: "The AI returned no extraction output." };
    }

    const raw = JSON.parse(text) as {
      is_appointment_document: boolean;
      document_summary: string;
      appointments: Record<string, unknown>[];
    };
    const result: ExtractionResult = {
      is_appointment_document: raw.is_appointment_document,
      document_summary: raw.document_summary,
      appointments: (raw.appointments ?? []).map(normalizeExtracted),
    };
    return { ok: true, result, rawOutput: text, model: EXTRACTION_MODEL };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "AI service is rate-limited. Try again in a minute." };
    }
    if (error instanceof Anthropic.APIError) {
      console.error("[parseAppointments] API error:", error.status, error.message);
      return { ok: false, error: "AI extraction failed. Try again, or enter the appointment manually." };
    }
    console.error("[parseAppointments] error:", error);
    return { ok: false, error: "AI extraction failed unexpectedly." };
  }
}
