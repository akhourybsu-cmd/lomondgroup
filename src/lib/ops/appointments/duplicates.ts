/**
 * Duplicate detection — flags possible duplicate appointments for
 * review; never deletes anything automatically.
 *
 * Signals: same claim number, same VIN, or same customer name +
 * appointment date.
 */

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface DuplicateSignal {
  appointmentId: string;
  reason: string;
}

export async function findPossibleDuplicates(
  client: SupabaseClient,
  candidate: {
    claim_number: string | null;
    vin: string | null;
    customer_name: string | null;
    appointment_date: string | null;
  },
  excludeAppointmentId?: string
): Promise<DuplicateSignal[]> {
  const signals: DuplicateSignal[] = [];
  const seen = new Set<string>();

  const add = (rows: { id: string }[] | null, reason: string) => {
    for (const row of rows ?? []) {
      if (row.id === excludeAppointmentId || seen.has(row.id)) continue;
      seen.add(row.id);
      signals.push({ appointmentId: row.id, reason });
    }
  };

  if (candidate.claim_number) {
    const { data } = await client
      .from("appointments")
      .select("id")
      .neq("status", "duplicate")
      .ilike("claim_number", candidate.claim_number.trim())
      .limit(5);
    add(data, `Same claim number (${candidate.claim_number})`);
  }

  if (candidate.vin) {
    const { data } = await client
      .from("appointments")
      .select("id")
      .neq("status", "duplicate")
      .ilike("vin", candidate.vin.trim())
      .limit(5);
    add(data, `Same VIN (${candidate.vin})`);
  }

  if (candidate.customer_name && candidate.appointment_date) {
    const { data } = await client
      .from("appointments")
      .select("id")
      .neq("status", "duplicate")
      .ilike("customer_name", candidate.customer_name.trim())
      .eq("appointment_date", candidate.appointment_date)
      .limit(5);
    add(data, `Same customer and date (${candidate.customer_name})`);
  }

  return signals;
}
