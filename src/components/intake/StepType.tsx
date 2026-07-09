"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { typeSchema, type TypeData } from "./schemas";
import { Button } from "@/components/ui/button";
import {
  TrendingDown,
  ShieldCheck,
  Car,
  FileSearch,
  ClipboardList,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  defaultValues: Partial<TypeData>;
  onComplete: (data: TypeData) => void;
  onBack: () => void;
}

const SERVICE_OPTIONS = [
  {
    value: "diminished_value" as const,
    icon: TrendingDown,
    title: "Diminished Value",
    description:
      "Your vehicle was in an accident and repaired, and you want to document the loss in resale value.",
  },
  {
    value: "total_loss_dispute" as const,
    icon: ShieldCheck,
    title: "Total Loss Dispute",
    description:
      "Your insurer declared your vehicle a total loss and you believe their valuation is too low.",
  },
  {
    value: "classic_collector" as const,
    icon: Car,
    title: "Classic / Collector Vehicle",
    description:
      "You need an agreed value appraisal for specialty, vintage, antique, or collector vehicle insurance.",
  },
  {
    value: "pre_purchase" as const,
    icon: FileSearch,
    title: "Pre-Purchase Appraisal",
    description:
      "You're buying a vehicle and want an independent assessment of its fair market value.",
  },
  {
    value: "fair_market_value" as const,
    icon: ClipboardList,
    title: "Fair Market Value",
    description:
      "You need a documented vehicle valuation for an estate, legal matter, donation, or other purpose.",
  },
  {
    value: "not_sure" as const,
    icon: HelpCircle,
    title: "Not Sure",
    description:
      "Describe your situation in the next steps and we'll help identify the right service.",
  },
] as const;

export function StepType({ defaultValues, onComplete, onBack }: Props) {
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TypeData>({
    resolver: zodResolver(typeSchema),
    defaultValues,
  });

  const selected = watch("appraisal_type");

  return (
    <form onSubmit={handleSubmit(onComplete)} noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        {SERVICE_OPTIONS.map(({ value, icon: Icon, title, description }) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setValue("appraisal_type", value, { shouldValidate: true })}
              className={cn(
                "relative flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all",
                isSelected
                  ? "border-brand-navy bg-brand-navy/5 ring-1 ring-brand-navy"
                  : "border-border hover:border-brand-navy/40 hover:bg-secondary/50"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                  isSelected
                    ? "bg-brand-navy text-white"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold leading-snug",
                    isSelected ? "text-brand-navy" : "text-foreground"
                  )}
                >
                  {title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
              {isSelected && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {errors.appraisal_type && (
        <p className="mt-3 text-xs text-destructive" role="alert">
          {errors.appraisal_type.message}
        </p>
      )}

      <div className="mt-8 flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
        >
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
