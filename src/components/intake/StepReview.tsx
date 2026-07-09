"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { consentSchema, type ConsentData, CLAIM_TYPES } from "./schemas";
import type { ContactData, TypeData, VehicleData, ClaimData, NotesData } from "./schemas";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { APPRAISAL_TYPE_LABELS } from "@/lib/types";

interface Props {
  contact: ContactData;
  type: TypeData;
  vehicle: VehicleData;
  claim?: Partial<ClaimData>;
  notes: NotesData;
  onSubmit: (consent: ConsentData) => void;
  onBack: () => void;
  isSubmitting: boolean;
  serverError?: string;
}

function ReviewRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

const PREFERRED_LABELS = { email: "Email", phone: "Phone", either: "Either" };
const BOOL_LABEL = (v: boolean | null | undefined) =>
  v === true ? "Yes" : v === false ? "No" : undefined;

export function StepReview({
  contact,
  type,
  vehicle,
  claim,
  notes,
  onSubmit,
  onBack,
  isSubmitting,
  serverError,
}: Props) {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ConsentData>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      confirms_accuracy: false,
      consents_to_contact: false,
      understands_no_guarantee: false,
    },
  });

  const showClaim = CLAIM_TYPES.has(type.appraisal_type);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* Summary */}
      <div className="space-y-3">
        <ReviewSection title="Contact">
          <ReviewRow label="Name" value={`${contact.first_name} ${contact.last_name}`} />
          <ReviewRow label="Email" value={contact.email} />
          <ReviewRow label="Phone" value={contact.phone} />
          <ReviewRow label="Preferred contact" value={PREFERRED_LABELS[contact.preferred_contact]} />
        </ReviewSection>

        <ReviewSection title="Service">
          <ReviewRow label="Type" value={APPRAISAL_TYPE_LABELS[type.appraisal_type]} />
        </ReviewSection>

        <ReviewSection title="Vehicle">
          <ReviewRow
            label="Year / Make / Model"
            value={`${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`}
          />
          <ReviewRow label="VIN" value={vehicle.vin || undefined} />
          <ReviewRow
            label="Mileage"
            value={vehicle.mileage != null ? vehicle.mileage.toLocaleString() : undefined}
          />
          <ReviewRow
            label="Location"
            value={`${vehicle.location_city}, ${vehicle.location_state}`}
          />
          <ReviewRow label="Drivable" value={BOOL_LABEL(vehicle.is_drivable)} />
        </ReviewSection>

        {showClaim && claim && (
          <ReviewSection title="Claim / Insurance">
            <ReviewRow label="Insurance company" value={claim.insurance_company || undefined} />
            <ReviewRow label="Claim number" value={claim.claim_number || undefined} />
            <ReviewRow label="Date of loss" value={claim.date_of_loss || undefined} />
            <ReviewRow label="Vehicle repaired" value={BOOL_LABEL(claim.vehicle_repaired)} />
            <ReviewRow label="Repair estimate" value={BOOL_LABEL(claim.has_repair_estimate)} />
            <ReviewRow label="Settlement offer" value={BOOL_LABEL(claim.has_settlement_offer)} />
          </ReviewSection>
        )}

        {notes.customer_notes && (
          <ReviewSection title="Notes">
            <p className="text-sm text-foreground">{notes.customer_notes}</p>
          </ReviewSection>
        )}
      </div>

      {/* Consent checkboxes */}
      <div className="mt-6 space-y-4 rounded-lg border border-border bg-secondary/30 p-5">
        <h3 className="text-sm font-semibold">Before you submit</h3>

        {(
          [
            {
              name: "confirms_accuracy" as const,
              label:
                "The information I've provided is accurate to the best of my knowledge.",
            },
            {
              name: "consents_to_contact" as const,
              label:
                "I consent to being contacted by Lomond Appraisal Group to discuss my request.",
            },
            {
              name: "understands_no_guarantee" as const,
              label:
                "I understand that submitting this request does not guarantee acceptance of an assignment and does not constitute legal advice.",
            },
          ] as const
        ).map(({ name, label }) => (
          <div key={name} className="space-y-1">
            <div className="flex items-start gap-3">
              <Controller
                control={control}
                name={name}
                render={({ field }) => (
                  <Checkbox
                    id={name}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                    className="mt-0.5"
                  />
                )}
              />
              <label
                htmlFor={name}
                className="cursor-pointer text-sm leading-relaxed text-foreground/85"
              >
                {label}
              </label>
            </div>
            {errors[name] && (
              <p className="ml-7 text-xs text-destructive" role="alert">
                {errors[name]?.message}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-navy text-white hover:bg-brand-navy-dark"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit Request"
          )}
        </Button>
      </div>
    </form>
  );
}
