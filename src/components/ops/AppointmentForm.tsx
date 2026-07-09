"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type Appointment,
  type Contractor,
  CONFIRMATION_STATUS_LABELS,
} from "@/lib/types";
import {
  saveAppointment,
  type SaveAppointmentResult,
} from "@/app/actions/ops/saveAppointment";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50";

/** Trim "HH:MM:SS" from Postgres to "HH:MM" for input type="time" */
function toTimeInput(value: string | null): string {
  return value ? value.slice(0, 5) : "";
}

interface AppointmentFormProps {
  contractors: Pick<Contractor, "id" | "name" | "default_duration_minutes">[];
  /** Present when editing; absent when creating */
  appointment?: Appointment;
}

export function AppointmentForm({ contractors, appointment }: AppointmentFormProps) {
  const router = useRouter();
  const isEdit = !!appointment;

  const durationRef = useRef<HTMLInputElement>(null);
  // Once the user touches duration, contractor changes stop overwriting it
  const durationTouched = useRef(isEdit);

  const [result, dispatch, isPending] = useActionState<
    SaveAppointmentResult | null,
    FormData
  >(saveAppointment, null);

  // After creating, go to the new appointment's detail page
  useEffect(() => {
    if (result?.success && result.appointmentId && !isEdit) {
      router.push(`/admin/appointments/${result.appointmentId}`);
    }
  }, [result, isEdit, router]);

  function handleContractorChange(contractorId: string) {
    if (durationTouched.current || !durationRef.current) return;
    const contractor = contractors.find((c) => c.id === contractorId);
    if (contractor?.default_duration_minutes) {
      durationRef.current.value = String(contractor.default_duration_minutes);
    }
  }

  return (
    <form action={dispatch} className="space-y-6">
      {appointment && <input type="hidden" name="id" value={appointment.id} />}

      {/* ── Source ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ap-contractor">Contractor / source</Label>
              <select
                id="ap-contractor"
                name="contractor_id"
                defaultValue={appointment?.contractor_id ?? ""}
                onChange={(e) => handleContractorChange(e.target.value)}
                className={inputClass}
                disabled={isPending}
              >
                <option value="">— None / direct —</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-insurance">Insurance company</Label>
              <input
                id="ap-insurance"
                name="insurance_company"
                type="text"
                defaultValue={appointment?.insurance_company ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ap-claim">Claim number</Label>
              <input
                id="ap-claim"
                name="claim_number"
                type="text"
                defaultValue={appointment?.claim_number ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-ref">Assignment / reference number</Label>
              <input
                id="ap-ref"
                name="reference_number"
                type="text"
                defaultValue={appointment?.reference_number ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Schedule ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-date">Appointment date</Label>
              <input
                id="ap-date"
                name="appointment_date"
                type="date"
                defaultValue={appointment?.appointment_date ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-time">Appointment time</Label>
              <input
                id="ap-time"
                name="appointment_time"
                type="time"
                defaultValue={toTimeInput(appointment?.appointment_time ?? null)}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-duration">
                Est. duration (min) <span className="text-destructive">*</span>
              </Label>
              <input
                ref={durationRef}
                id="ap-duration"
                name="estimated_duration_minutes"
                type="number"
                min="5"
                step="5"
                required
                defaultValue={appointment?.estimated_duration_minutes ?? 45}
                onChange={() => {
                  durationTouched.current = true;
                }}
                className={inputClass}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ap-window-start">Time window start</Label>
              <input
                id="ap-window-start"
                name="time_window_start"
                type="time"
                defaultValue={toTimeInput(appointment?.time_window_start ?? null)}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-window-end">Time window end</Label>
              <input
                id="ap-window-end"
                name="time_window_end"
                type="time"
                defaultValue={toTimeInput(appointment?.time_window_end ?? null)}
                className={inputClass}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-confirmation">Confirmation status</Label>
            <select
              id="ap-confirmation"
              name="confirmation_status"
              defaultValue={appointment?.confirmation_status ?? "unconfirmed"}
              className={inputClass}
              disabled={isPending}
            >
              {Object.entries(CONFIRMATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ── Customer ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-cust-name">Customer name</Label>
              <input
                id="ap-cust-name"
                name="customer_name"
                type="text"
                defaultValue={appointment?.customer_name ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-cust-phone">Phone</Label>
              <input
                id="ap-cust-phone"
                name="customer_phone"
                type="tel"
                defaultValue={appointment?.customer_phone ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-cust-email">Email</Label>
              <input
                id="ap-cust-email"
                name="customer_email"
                type="email"
                defaultValue={appointment?.customer_email ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Location ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appointment Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ap-addr1">Street address</Label>
              <input
                id="ap-addr1"
                name="address_line_1"
                type="text"
                defaultValue={appointment?.address_line_1 ?? ""}
                placeholder="123 Main St"
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-addr2">Address line 2</Label>
              <input
                id="ap-addr2"
                name="address_line_2"
                type="text"
                defaultValue={appointment?.address_line_2 ?? ""}
                placeholder="Apt, suite, shop bay…"
                className={inputClass}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-city">City</Label>
              <input
                id="ap-city"
                name="city"
                type="text"
                defaultValue={appointment?.city ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-state">State</Label>
              <input
                id="ap-state"
                name="state"
                type="text"
                defaultValue={appointment?.state ?? ""}
                placeholder="MA"
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-zip">ZIP</Label>
              <input
                id="ap-zip"
                name="zip"
                type="text"
                defaultValue={appointment?.zip ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
          </div>
          {isEdit && appointment?.geocoding_status === "success" && (
            <p className="text-xs text-muted-foreground">
              This address has been verified. Changing it will require
              re-verification before the appointment can be routed.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Vehicle ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicle</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ap-veh-year">Year</Label>
              <input
                id="ap-veh-year"
                name="vehicle_year"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 2}
                defaultValue={appointment?.vehicle_year ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-veh-make">Make</Label>
              <input
                id="ap-veh-make"
                name="vehicle_make"
                type="text"
                defaultValue={appointment?.vehicle_make ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-veh-model">Model</Label>
              <input
                id="ap-veh-model"
                name="vehicle_model"
                type="text"
                defaultValue={appointment?.vehicle_model ?? ""}
                className={inputClass}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ap-vin">VIN</Label>
              <input
                id="ap-vin"
                name="vin"
                type="text"
                maxLength={20}
                defaultValue={appointment?.vin ?? ""}
                className={`${inputClass} font-mono`}
                disabled={isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-veh-loc">Vehicle location notes</Label>
              <input
                id="ap-veh-loc"
                name="vehicle_location_notes"
                type="text"
                defaultValue={appointment?.vehicle_location_notes ?? ""}
                placeholder="e.g. at body shop, behind building…"
                className={inputClass}
                disabled={isPending}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Notes ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ap-damage">Damage / appraisal notes</Label>
            <textarea
              id="ap-damage"
              name="damage_notes"
              rows={3}
              defaultValue={appointment?.damage_notes ?? ""}
              className={`${inputClass} resize-none`}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-instructions">Special instructions</Label>
            <textarea
              id="ap-instructions"
              name="special_instructions"
              rows={3}
              defaultValue={appointment?.special_instructions ?? ""}
              className={`${inputClass} resize-none`}
              disabled={isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ap-internal">Internal notes</Label>
            <textarea
              id="ap-internal"
              name="internal_notes"
              rows={2}
              defaultValue={appointment?.internal_notes ?? ""}
              placeholder="Never shown outside the office."
              className={`${inputClass} resize-none`}
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Feedback + submit ── */}
      {result?.success && isEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Appointment saved.
        </div>
      )}
      {result && !result.success && result.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {result.error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Create Appointment"
          )}
        </Button>
        {!isEdit && (
          <p className="text-xs text-muted-foreground">
            New appointments start as “Needs Review” — confirm them from the
            appointment page once details are verified.
          </p>
        )}
      </div>
    </form>
  );
}
