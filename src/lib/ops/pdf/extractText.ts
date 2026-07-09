/**
 * PDF text extraction via unpdf (serverless-friendly pdf.js build).
 * Defensive: distinguishes "no text layer" (likely a scanned image —
 * OCR is a future enhancement) from parse failures.
 */

import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

export type PdfTextResult =
  | { ok: true; text: string; pageCount: number }
  | { ok: false; reason: "no_text" | "parse_error"; message: string; pageCount?: number };

export async function extractPdfText(buffer: ArrayBuffer): Promise<PdfTextResult> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const cleaned = (text ?? "").trim();

    if (!cleaned) {
      return {
        ok: false,
        reason: "no_text",
        pageCount: totalPages,
        message:
          "No text found in this PDF — it may be a scanned image. " +
          "You can enter the appointment manually, or mark this upload as not usable.",
      };
    }

    return { ok: true, text: cleaned, pageCount: totalPages };
  } catch (error) {
    console.error("[extractPdfText] parse error:", error);
    return {
      ok: false,
      reason: "parse_error",
      message:
        "This file could not be read as a PDF. Confirm it isn't corrupted, " +
        "or enter the appointment manually.",
    };
  }
}
