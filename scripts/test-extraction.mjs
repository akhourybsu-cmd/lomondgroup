/**
 * Pipeline smoke test: builds a realistic assignment PDF, extracts its
 * text (unpdf), and runs AI extraction (Anthropic structured outputs)
 * — the same steps processPdfUpload performs, without needing the UI.
 *
 * Usage: node scripts/test-extraction.mjs
 */

import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Load .env.local ────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);
process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY missing from .env.local");
  process.exit(1);
}

// ── 1. Build a realistic assignment PDF ─────────────────────────────────────
const { Document, Page, Text, StyleSheet, pdf } = await import(
  "@react-pdf/renderer"
);
const h = React.createElement;
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11 },
  title: { fontSize: 14, marginBottom: 12 },
  line: { marginBottom: 4 },
});

const LINES = [
  "APPRAISAL ASSIGNMENT — Bay State Independent Adjusters",
  "Assignment #: BSIA-2026-4471",
  "Claim Number: CLM-88213-MA",
  "Insurance Carrier: Pilgrim Mutual Insurance",
  "",
  "Insured/Owner: Maria Gonzalez",
  "Phone: (508) 555-0142",
  "Email: m.gonzalez@example.com",
  "",
  "Inspection Location: 45 Winthrop Street, Taunton, MA 02780",
  "Vehicle located in rear parking lot of Silva's Auto Body.",
  "",
  "Appointment: Wednesday July 15, 2026 between 9:00 AM and 11:00 AM",
  "",
  "Vehicle: 2021 Toyota RAV4 XLE",
  "VIN: 2T3P1RFV5MW123456",
  "Damage: Front-end collision damage, passenger side. Airbags did not deploy.",
  "Special Instructions: Call the shop 30 minutes before arrival. Ask for Manny.",
];

const doc = h(
  Document,
  null,
  h(
    Page,
    { size: "LETTER", style: styles.page },
    ...LINES.map((text, i) =>
      h(Text, { key: i, style: i === 0 ? styles.title : styles.line }, text || " ")
    )
  )
);

const pdfBuffer = await pdf(doc).toBuffer();
const pdfBytes =
  pdfBuffer instanceof Uint8Array
    ? pdfBuffer
    : new Uint8Array(await new Response(pdfBuffer).arrayBuffer());
console.log(`1. Test PDF generated (${pdfBytes.length} bytes)`);

// ── 2. Extract text (same library the app uses) ────────────────────────────
const { extractText, getDocumentProxy } = await import("unpdf");
const proxy = await getDocumentProxy(new Uint8Array(pdfBytes));
const { totalPages, text } = await extractText(proxy, { mergePages: true });
console.log(`2. Text extracted (${totalPages} page, ${text.length} chars)`);

// ── 3. AI extraction (same model + structured output as the app) ───────────
const { default: Anthropic } = await import("@anthropic-ai/sdk");
const client = new Anthropic();

// Zero union types (the API caps union-typed params at 16): every field
// is a plain string, "" = not stated — same design as the app schema.
const STR = { type: "string", description: "empty string if not stated" };
const schema = {
  type: "object",
  properties: {
    is_appointment_document: { type: "boolean" },
    appointments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          contractor_name: STR,
          customer_name: STR,
          customer_phone: STR,
          address_line_1: STR,
          city: STR,
          state: STR,
          zip: STR,
          appointment_date: STR,
          time_window_start: STR,
          time_window_end: STR,
          claim_number: STR,
          reference_number: STR,
          insurance_company: STR,
          vehicle_year: STR,
          vehicle_make: STR,
          vehicle_model: STR,
          vin: STR,
          special_instructions: STR,
          confidence: { type: "number" },
        },
        required: [
          "contractor_name", "customer_name", "customer_phone", "address_line_1",
          "city", "state", "zip", "appointment_date", "time_window_start",
          "time_window_end", "claim_number", "reference_number",
          "insurance_company", "vehicle_year", "vehicle_make", "vehicle_model",
          "vin", "special_instructions", "confidence",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["is_appointment_document", "appointments"],
  additionalProperties: false,
};

const response = await client.messages.create({
  model: "claude-opus-4-8",
  max_tokens: 4096,
  system:
    'Extract vehicle appraisal appointment details. Use an empty string ("") for anything not stated. Dates as YYYY-MM-DD, times as 24-hour HH:MM.',
  output_config: { format: { type: "json_schema", schema } },
  messages: [{ role: "user", content: `Extract from:\n\n${text}` }],
});

const out = JSON.parse(response.content.find((b) => b.type === "text").text);
console.log(`3. AI extraction OK (model ${response.model}, ${response.usage.output_tokens} output tokens)`);
console.log(JSON.stringify(out, null, 2));
