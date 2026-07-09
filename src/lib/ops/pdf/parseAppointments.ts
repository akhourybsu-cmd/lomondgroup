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

const NULLABLE_STRING = { anyOf: [{ type: "string" }, { type: "null" }] };

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
          contractor_name: NULLABLE_STRING,
          customer_name: NULLABLE_STRING,
          customer_phone: NULLABLE_STRING,
          customer_email: NULLABLE_STRING,
          address_line_1: NULLABLE_STRING,
          address_line_2: NULLABLE_STRING,
          city: NULLABLE_STRING,
          state: { anyOf: [{ type: "string" }, { type: "null" }], description: "2-letter state code" },
          zip: NULLABLE_STRING,
          appointment_date: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "YYYY-MM-DD, null if not stated",
          },
          appointment_time: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "HH:MM 24-hour, null if not stated",
          },
          time_window_start: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "HH:MM 24-hour window start, if a window is given",
          },
          time_window_end: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "HH:MM 24-hour window end, if a window is given",
          },
          claim_number: NULLABLE_STRING,
          reference_number: NULLABLE_STRING,
          insurance_company: NULLABLE_STRING,
          vehicle_year: { anyOf: [{ type: "integer" }, { type: "null" }] },
          vehicle_make: NULLABLE_STRING,
          vehicle_model: NULLABLE_STRING,
          vin: NULLABLE_STRING,
          vehicle_location_notes: NULLABLE_STRING,
          damage_notes: NULLABLE_STRING,
          special_instructions: NULLABLE_STRING,
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
- Extract only information actually present in the document. Never guess or invent values — use null for anything not stated.
- Different contractors use different layouts; rely on meaning, not position.
- A document may contain more than one appointment — return one entry per distinct appointment.
- Normalize dates to YYYY-MM-DD and times to 24-hour HH:MM. If a date has no year, use the most plausible upcoming year and list the field in missing_or_uncertain_fields.
- The appointment address is where the vehicle will be inspected (may be a home, body shop, or tow yard) — not the contractor's office address.
- claim_number is the insurance claim number; reference_number is the contractor's own assignment/file number.
- Put damage descriptions in damage_notes and access/scheduling instructions in special_instructions.
- List every field you could not find, or extracted with low certainty, in missing_or_uncertain_fields.
- If the document is not an appraisal appointment or assignment at all, set is_appointment_document to false and return an empty appointments array.`;

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

    const result = JSON.parse(text) as ExtractionResult;
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
