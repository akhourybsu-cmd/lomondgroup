"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { claimSchema, type ClaimData } from "./schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  defaultValues: Partial<ClaimData>;
  onComplete: (data: ClaimData) => void;
  onBack: () => void;
}

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div className="flex gap-2">
      {(
        [
          { label: "Yes", val: true },
          { label: "No", val: false },
        ] as const
      ).map(({ label, val }) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(val)}
          className={cn(
            "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            value === val
              ? "border-brand-navy bg-brand-navy text-white"
              : "border-border bg-transparent hover:bg-secondary/60"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function StepClaim({ defaultValues, onComplete, onBack }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClaimData>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      insurance_company: "",
      claim_number: "",
      date_of_loss: "",
      ...defaultValues,
    },
  });

  const vehicleRepaired = watch("vehicle_repaired");
  const hasEstimate = watch("has_repair_estimate");
  const hasSettlement = watch("has_settlement_offer");

  return (
    <form onSubmit={handleSubmit(onComplete)} noValidate>
      <p className="mb-6 text-sm text-muted-foreground">
        All fields in this section are optional. Include what you have — we may
        ask for additional information when we review your request.
      </p>

      <div className="space-y-5">
        {/* Insurance company + claim number */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="insurance_company">Insurance company</Label>
            <Input
              id="insurance_company"
              type="text"
              placeholder="State Farm, GEICO…"
              {...register("insurance_company")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claim_number">Claim number</Label>
            <Input
              id="claim_number"
              type="text"
              placeholder="Claim #"
              {...register("claim_number")}
            />
          </div>
        </div>

        {/* Date of loss */}
        <div className="space-y-1.5">
          <Label htmlFor="date_of_loss">Date of loss</Label>
          <Input
            id="date_of_loss"
            type="date"
            aria-invalid={!!errors.date_of_loss}
            {...register("date_of_loss")}
          />
          {errors.date_of_loss && (
            <p className="text-xs text-destructive" role="alert">
              {errors.date_of_loss.message}
            </p>
          )}
        </div>

        {/* Vehicle repaired? */}
        <div className="space-y-2">
          <Label>Has the vehicle been repaired?</Label>
          <YesNo
            value={vehicleRepaired}
            onChange={(v) => setValue("vehicle_repaired", v, { shouldValidate: true })}
          />
        </div>

        {/* Has repair estimate? */}
        <div className="space-y-2">
          <Label>Do you have a repair estimate?</Label>
          <YesNo
            value={hasEstimate}
            onChange={(v) => setValue("has_repair_estimate", v, { shouldValidate: true })}
          />
        </div>

        {/* Has settlement offer? */}
        <div className="space-y-2">
          <Label>Have you received a settlement offer?</Label>
          <YesNo
            value={hasSettlement}
            onChange={(v) => setValue("has_settlement_offer", v, { shouldValidate: true })}
          />
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <Button type="submit" className="bg-brand-navy text-white hover:bg-brand-navy-dark">
          Continue
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
