/**
 * Formatting helpers for operations pages.
 * Appointment dates/times are stored as Postgres DATE / TIME (local
 * business time) — never run them through the Date UTC parser, which
 * shifts YYYY-MM-DD strings by a day in western time zones.
 */

/** "2026-07-08" → "Jul 8, 2026" */
export function formatDateOnly(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(y, m - 1, d));
}

/** "13:30:00" or "13:30" → "1:30 PM" */
export function formatTimeOnly(timeStr: string | null): string {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** "09:00" + "12:00" → "9:00 AM – 12:00 PM"; null-safe */
export function formatTimeWindow(
  start: string | null,
  end: string | null
): string | null {
  if (!start && !end) return null;
  if (start && end) return `${formatTimeOnly(start)} – ${formatTimeOnly(end)}`;
  return start ? `From ${formatTimeOnly(start)}` : `Until ${formatTimeOnly(end)}`;
}

/** One-line address for tables and summaries */
export function shortLocation(city: string | null, state: string | null): string {
  if (city && state) return `${city}, ${state}`;
  return city ?? state ?? "—";
}

/** Full display address from parts */
export function fullAddress(a: {
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}): string | null {
  const street = [a.address_line_1, a.address_line_2].filter(Boolean).join(", ");
  const cityLine = [a.city, [a.state, a.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const parts = [street, cityLine].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}
