"use client";

import { useState, useTransition } from "react";
import { submitIntake } from "@/app/actions/submitIntake";
import { CLAIM_TYPES } from "./schemas";
import type { ContactData, TypeData, VehicleData, ClaimData, NotesData, ConsentData } from "./schemas";
import { StepContact } from "./StepContact";
import { StepType } from "./StepType";
import { StepVehicle } from "./StepVehicle";
import { StepClaim } from "./StepClaim";
import { StepNotes } from "./StepNotes";
import { StepReview } from "./StepReview";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  contact: Partial<ContactData>;
  type: Partial<TypeData>;
  vehicle: Partial<VehicleData>;
  claim: Partial<ClaimData>;
  notes: Partial<NotesData>;
}

// ─── Step indicator ───────────────────────────────────────────────────────────

type StepId = "contact" | "type" | "vehicle" | "claim" | "notes" | "review";

interface StepMeta {
  id: StepId;
  label: string;
}

const ALL_STEPS: StepMeta[] = [
  { id: "contact", label: "Contact" },
  { id: "type", label: "Service" },
  { id: "vehicle", label: "Vehicle" },
  { id: "claim", label: "Claim Info" },
  { id: "notes", label: "Details" },
  { id: "review", label: "Review" },
];

function getSteps(appraisalType?: string): StepMeta[] {
  if (!appraisalType || !CLAIM_TYPES.has(appraisalType)) {
    return ALL_STEPS.filter((s) => s.id !== "claim");
  }
  return ALL_STEPS;
}

function StepIndicator({
  steps,
  currentIndex,
}: {
  steps: StepMeta[];
  currentIndex: number;
}) {
  return (
    <nav aria-label="Form progress" className="mb-8">
      <ol className="flex items-center gap-0">
        {steps.map((step, idx) => {
          const done = idx < currentIndex;
          const active = idx === currentIndex;
          const isLast = idx === steps.length - 1;
          return (
            <li key={step.id} className={cn("flex items-center", !isLast && "flex-1")}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                    done
                      ? "border-brand-navy bg-brand-navy text-white"
                      : active
                      ? "border-brand-navy bg-white text-brand-navy"
                      : "border-border bg-white text-muted-foreground"
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={cn(
                    "hidden text-[10px] font-medium sm:block",
                    active ? "text-brand-navy" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-1 mb-4 h-0.5 flex-1 transition-colors sm:mx-2",
                    done ? "bg-brand-navy" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function IntakeForm() {
  const [formState, setFormState] = useState<FormState>({
    contact: {},
    type: {},
    vehicle: {},
    claim: {},
    notes: {},
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [serverError, setServerError] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  const steps = getSteps(formState.type.appraisal_type);
  const currentStep = steps[stepIndex];

  function advance(patch: Partial<FormState>) {
    setFormState((prev) => ({ ...prev, ...patch }));
    setStepIndex((i) => i + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStepIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFinalSubmit(consent: ConsentData) {
    setServerError(undefined);
    startTransition(async () => {
      const payload = {
        contact: formState.contact as ContactData,
        type: formState.type as TypeData,
        vehicle: formState.vehicle as VehicleData,
        claim: formState.claim,
        notes: formState.notes as NotesData,
        consent,
      };
      const result = await submitIntake(null, payload);
      if (result && !result.success) {
        setServerError(result.error);
      }
      // On success, submitIntake calls redirect() which navigates away
    });
  }

  // ── Render current step ──────────────────────────────────────────────────

  const stepIndex0 = steps.findIndex((s) => s.id === currentStep.id);

  let stepContent: React.ReactNode;

  switch (currentStep.id) {
    case "contact":
      stepContent = (
        <StepContact
          defaultValues={formState.contact}
          onComplete={(data) => advance({ contact: data })}
        />
      );
      break;

    case "type":
      stepContent = (
        <StepType
          defaultValues={formState.type}
          onComplete={(data) => {
            // If user switches to a non-claim type, clear claim data
            const newType = data.appraisal_type;
            const clearClaim = !CLAIM_TYPES.has(newType);
            advance({ type: data, ...(clearClaim ? { claim: {} } : {}) });
          }}
          onBack={back}
        />
      );
      break;

    case "vehicle":
      stepContent = (
        <StepVehicle
          defaultValues={formState.vehicle}
          onComplete={(data) => advance({ vehicle: data })}
          onBack={back}
        />
      );
      break;

    case "claim":
      stepContent = (
        <StepClaim
          defaultValues={formState.claim}
          onComplete={(data) => advance({ claim: data })}
          onBack={back}
        />
      );
      break;

    case "notes":
      stepContent = (
        <StepNotes
          defaultValues={formState.notes}
          onComplete={(data) => advance({ notes: data })}
          onBack={back}
        />
      );
      break;

    case "review":
      stepContent = (
        <StepReview
          contact={formState.contact as ContactData}
          type={formState.type as TypeData}
          vehicle={formState.vehicle as VehicleData}
          claim={formState.claim}
          notes={formState.notes as NotesData}
          onSubmit={handleFinalSubmit}
          onBack={back}
          isSubmitting={isPending}
          serverError={serverError}
        />
      );
      break;
  }

  return (
    <div>
      <StepIndicator steps={steps} currentIndex={stepIndex0} />
      <div className="rounded-xl border border-border bg-white p-6 sm:p-8">
        <h2 className="mb-6 text-base font-semibold text-foreground">
          {currentStep.label === "Service"
            ? "What type of appraisal do you need?"
            : currentStep.label === "Contact"
            ? "Your contact information"
            : currentStep.label === "Vehicle"
            ? "Vehicle details"
            : currentStep.label === "Claim Info"
            ? "Claim and insurance information"
            : currentStep.label === "Details"
            ? "Additional information"
            : "Review and submit"}
        </h2>
        {stepContent}
      </div>
    </div>
  );
}
