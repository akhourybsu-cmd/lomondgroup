"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactData } from "./schemas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  defaultValues: Partial<ContactData>;
  onComplete: (data: ContactData) => void;
}

const CONTACT_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "either", label: "Either" },
] as const;

export function StepContact({ defaultValues, onComplete }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ContactData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { preferred_contact: "email", ...defaultValues },
  });

  const preferred = watch("preferred_contact");

  return (
    <form onSubmit={handleSubmit(onComplete)} noValidate>
      <div className="space-y-5">
        {/* Name row */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">
              First name <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="first_name"
              type="text"
              autoComplete="given-name"
              placeholder="Jane"
              aria-invalid={!!errors.first_name}
              {...register("first_name")}
            />
            {errors.first_name && (
              <p className="text-xs text-destructive" role="alert">{errors.first_name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">
              Last name <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="last_name"
              type="text"
              autoComplete="family-name"
              placeholder="Smith"
              aria-invalid={!!errors.last_name}
              {...register("last_name")}
            />
            {errors.last_name && (
              <p className="text-xs text-destructive" role="alert">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">
            Email address <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive" role="alert">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">
            Phone number <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(555) 000-0000"
            aria-invalid={!!errors.phone}
            {...register("phone")}
          />
          {errors.phone && (
            <p className="text-xs text-destructive" role="alert">{errors.phone.message}</p>
          )}
        </div>

        {/* Preferred contact */}
        <div className="space-y-2">
          <Label>
            Preferred contact method <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <div className="flex gap-2">
            {CONTACT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("preferred_contact", opt.value, { shouldValidate: true })}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  preferred === opt.value
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-border bg-transparent hover:bg-secondary/60"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {errors.preferred_contact && (
            <p className="text-xs text-destructive" role="alert">{errors.preferred_contact.message}</p>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <Button type="submit" className="bg-brand-navy text-white hover:bg-brand-navy-dark">
          Continue
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
