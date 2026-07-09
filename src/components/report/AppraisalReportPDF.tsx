/**
 * Server-side React component for @react-pdf/renderer.
 * Rendered to a Buffer by finalizeReport.ts — never imported in client components.
 * Uses only @react-pdf/renderer primitives (Document, Page, View, Text).
 * No hooks, no browser APIs.
 */

import ReactPDF from "@react-pdf/renderer";
import type { AppraisalType } from "@/lib/types";
import { APPRAISAL_TYPE_LABELS } from "@/lib/types";

const { Document, Page, View, Text, StyleSheet } = ReactPDF;

// ── Brand colours ─────────────────────────────────────────────────────────────

const NAVY = "#1B3A5C";
const GOLD = "#C9A84C";
const GRAY_500 = "#6B7280";
const GRAY_100 = "#F3F4F6";
const DARK = "#111827";
const BORDER = "#E5E7EB";

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Page
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    backgroundColor: "#FFFFFF",
    paddingBottom: 52, // room for fixed footer
  },
  // Header band
  headerBand: {
    backgroundColor: NAVY,
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  headerCompany: {
    fontFamily: "Helvetica-Bold",
    fontSize: 17,
    color: "#FFFFFF",
    letterSpacing: 1.2,
  },
  headerTagline: {
    fontSize: 8.5,
    color: GOLD,
    marginTop: 2,
  },
  // Content wrapper
  content: {
    paddingHorizontal: 40,
    paddingTop: 18,
  },
  // Gold rule
  goldRule: {
    height: 2,
    backgroundColor: GOLD,
    marginVertical: 10,
  },
  // Report title block
  reportTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    color: NAVY,
  },
  reportMeta: {
    fontSize: 8,
    color: GRAY_500,
    marginTop: 3,
  },
  // Two-column info grid
  infoGrid: {
    flexDirection: "row",
    marginTop: 14,
    gap: 20,
  },
  infoColumn: {
    flex: 1,
  },
  infoColumnHeader: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingBottom: 4,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: GOLD,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 2.5,
  },
  infoLabel: {
    width: 72,
    fontSize: 8,
    color: GRAY_500,
  },
  infoValue: {
    flex: 1,
    fontSize: 8,
    color: DARK,
  },
  // Section title bar
  sectionBar: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9.5,
    color: NAVY,
    backgroundColor: GRAY_100,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 18,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  // Body / narrative text
  bodyText: {
    fontSize: 9,
    color: DARK,
    lineHeight: 1.55,
  },
  bodyBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    color: DARK,
    marginBottom: 3,
    marginTop: 7,
  },
  // Comparables table
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    fontFamily: "Helvetica-Bold",
    fontSize: 7.5,
    color: "#FFFFFF",
  },
  tableDataRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  tableDataRowAlt: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: GRAY_100,
  },
  tableDataCell: {
    fontSize: 8,
    color: DARK,
  },
  // Valuation conclusion box
  valuationBox: {
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 4,
    backgroundColor: GRAY_100,
    padding: 14,
    marginTop: 8,
  },
  valuationLabelText: {
    fontSize: 8,
    color: GRAY_500,
    marginBottom: 4,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valuationAmount: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: NAVY,
  },
  valuationMethodText: {
    fontSize: 8,
    color: GRAY_500,
    marginTop: 6,
  },
  valuationNotes: {
    fontSize: 9,
    color: DARK,
    lineHeight: 1.5,
    marginTop: 8,
  },
  // Fixed footer
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerLeft: {
    fontSize: 7,
    color: GRAY_500,
    width: 150,
  },
  footerCenter: {
    flex: 1,
    fontSize: 6.5,
    color: GRAY_500,
    textAlign: "center",
    marginHorizontal: 8,
  },
  footerRight: {
    fontSize: 7,
    color: GRAY_500,
    width: 80,
    textAlign: "right",
  },
});

// ── Comparable column widths (must fill available content width) ──────────────

const C = {
  vehicle: "30%",
  mileage: "12%",
  condition: "14%",
  price: "14%",
  source: "16%",
  date: "14%",
};

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtCurrency(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function fmtMileage(m: number | null | undefined): string {
  if (m == null) return "—";
  return m.toLocaleString("en-US") + " mi";
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PDFReportData {
  report: {
    title: string;
    condition_summary: string | null;
    condition_details: string | null;
    valuation_conclusion_cents: number | null;
    valuation_method: string | null;
    valuation_notes: string | null;
  };
  job: {
    internal_ref: string;
    appraisal_type?: string | null;
  };
  client:
    | {
        first_name: string;
        last_name: string;
        email: string;
        phone?: string | null;
      }
    | null
    | undefined;
  vehicle:
    | {
        year: number;
        make: string;
        model: string;
        trim?: string | null;
        vin?: string | null;
        mileage?: number | null;
        color?: string | null;
        location_city?: string | null;
        location_state?: string | null;
      }
    | null
    | undefined;
  comparables: Array<{
    year: number;
    make: string;
    model: string;
    trim?: string | null;
    mileage?: number | null;
    condition?: string | null;
    sale_price_cents: number;
    source?: string | null;
    listing_date?: string | null;
  }>;
  generatedAt: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AppraisalReportPDF({
  report,
  job,
  client,
  vehicle,
  comparables,
  generatedAt,
}: PDFReportData) {
  const appraisalTypeLabel =
    job.appraisal_type &&
    APPRAISAL_TYPE_LABELS[job.appraisal_type as AppraisalType]
      ? APPRAISAL_TYPE_LABELS[job.appraisal_type as AppraisalType]
      : null;

  return (
    <Document
      title={report.title}
      author="Lomond Appraisal Group"
      creator="Lomond Appraisal Group Platform"
      subject={
        vehicle
          ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
          : "Vehicle Appraisal Report"
      }
    >
      <Page size="LETTER" style={styles.page}>
        {/* ── Header band ─────────────────────────────────────────────── */}
        <View style={styles.headerBand}>
          <Text style={styles.headerCompany}>LOMOND APPRAISAL GROUP</Text>
          <Text style={styles.headerTagline}>
            Professional Vehicle Appraisal Report
          </Text>
        </View>

        <View style={styles.content}>
          {/* ── Report title ─────────────────────────────────────────── */}
          <Text style={styles.reportTitle}>{report.title}</Text>
          <Text style={styles.reportMeta}>
            {"Reference: "}
            {job.internal_ref}
            {appraisalTypeLabel ? `  ·  ${appraisalTypeLabel}` : ""}
            {"  ·  Generated: "}
            {fmtDate(generatedAt)}
          </Text>

          <View style={styles.goldRule} />

          {/* ── Vehicle + Client info ────────────────────────────────── */}
          <View style={styles.infoGrid}>
            {/* Vehicle */}
            <View style={styles.infoColumn}>
              <Text style={styles.infoColumnHeader}>Vehicle Information</Text>
              {vehicle ? (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Year / Make</Text>
                    <Text style={styles.infoValue}>
                      {vehicle.year} {vehicle.make}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Model / Trim</Text>
                    <Text style={styles.infoValue}>
                      {vehicle.model}
                      {vehicle.trim ? ` ${vehicle.trim}` : ""}
                    </Text>
                  </View>
                  {vehicle.vin ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>VIN</Text>
                      <Text style={styles.infoValue}>{vehicle.vin}</Text>
                    </View>
                  ) : null}
                  {vehicle.mileage != null ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Mileage</Text>
                      <Text style={styles.infoValue}>
                        {fmtMileage(vehicle.mileage)}
                      </Text>
                    </View>
                  ) : null}
                  {vehicle.color ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Color</Text>
                      <Text style={styles.infoValue}>{vehicle.color}</Text>
                    </View>
                  ) : null}
                  {vehicle.location_city || vehicle.location_state ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Location</Text>
                      <Text style={styles.infoValue}>
                        {[vehicle.location_city, vehicle.location_state]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.bodyText}>No vehicle data available.</Text>
              )}
            </View>

            {/* Client */}
            <View style={styles.infoColumn}>
              <Text style={styles.infoColumnHeader}>Client Information</Text>
              {client ? (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name</Text>
                    <Text style={styles.infoValue}>
                      {client.first_name} {client.last_name}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email</Text>
                    <Text style={styles.infoValue}>{client.email}</Text>
                  </View>
                  {client.phone ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone</Text>
                      <Text style={styles.infoValue}>{client.phone}</Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.bodyText}>No client data available.</Text>
              )}
            </View>
          </View>

          {/* ── Condition Assessment ─────────────────────────────────── */}
          {(report.condition_summary || report.condition_details) ? (
            <>
              <Text style={styles.sectionBar}>Condition Assessment</Text>
              {report.condition_summary ? (
                <>
                  <Text style={styles.bodyBold}>Summary</Text>
                  <Text style={styles.bodyText}>{report.condition_summary}</Text>
                </>
              ) : null}
              {report.condition_details ? (
                <>
                  <Text style={styles.bodyBold}>Detailed Assessment</Text>
                  <Text style={styles.bodyText}>{report.condition_details}</Text>
                </>
              ) : null}
            </>
          ) : null}

          {/* ── Market Comparables ───────────────────────────────────── */}
          {comparables.length > 0 ? (
            <>
              <Text style={styles.sectionBar}>Market Comparables</Text>
              <View wrap={false}>
                {/* Header row */}
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { width: C.vehicle }]}>
                    Vehicle
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: C.mileage }]}>
                    Mileage
                  </Text>
                  <Text
                    style={[styles.tableHeaderCell, { width: C.condition }]}
                  >
                    Condition
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: C.price }]}>
                    Sale Price
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: C.source }]}>
                    Source
                  </Text>
                  <Text style={[styles.tableHeaderCell, { width: C.date }]}>
                    Date
                  </Text>
                </View>
                {/* Data rows */}
                {comparables.map((comp, i) => (
                  <View
                    key={i}
                    style={
                      i % 2 === 0
                        ? styles.tableDataRow
                        : styles.tableDataRowAlt
                    }
                  >
                    <Text
                      style={[styles.tableDataCell, { width: C.vehicle }]}
                    >
                      {comp.year} {comp.make} {comp.model}
                      {comp.trim ? ` ${comp.trim}` : ""}
                    </Text>
                    <Text
                      style={[styles.tableDataCell, { width: C.mileage }]}
                    >
                      {fmtMileage(comp.mileage)}
                    </Text>
                    <Text
                      style={[styles.tableDataCell, { width: C.condition }]}
                    >
                      {comp.condition ?? "—"}
                    </Text>
                    <Text style={[styles.tableDataCell, { width: C.price }]}>
                      {fmtCurrency(comp.sale_price_cents)}
                    </Text>
                    <Text style={[styles.tableDataCell, { width: C.source }]}>
                      {comp.source ?? "—"}
                    </Text>
                    <Text style={[styles.tableDataCell, { width: C.date }]}>
                      {fmtDate(comp.listing_date)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* ── Valuation Conclusion ─────────────────────────────────── */}
          <Text style={styles.sectionBar}>Valuation Conclusion</Text>
          <View style={styles.valuationBox} wrap={false}>
            <Text style={styles.valuationLabelText}>Appraised Market Value</Text>
            <Text style={styles.valuationAmount}>
              {fmtCurrency(report.valuation_conclusion_cents)}
            </Text>
            {report.valuation_method ? (
              <Text style={styles.valuationMethodText}>
                Valuation method: {report.valuation_method}
              </Text>
            ) : null}
            {report.valuation_notes ? (
              <Text style={styles.valuationNotes}>{report.valuation_notes}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Fixed footer ─────────────────────────────────────────────── */}
        <View style={styles.pageFooter} fixed>
          <Text style={styles.footerLeft}>Lomond Appraisal Group</Text>
          <Text style={styles.footerCenter}>
            This report is for the exclusive use of the named client. Opinions are
            based on information available at the time of preparation and are subject
            to the appraiser&apos;s professional judgment.
          </Text>
          <Text
            style={styles.footerRight}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
