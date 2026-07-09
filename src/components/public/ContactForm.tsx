"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const REASONS = [
  { value: "service", label: "Question about a service" },
  { value: "process", label: "Appraisal process or timeline" },
  { value: "fees", label: "Fees and pricing" },
  { value: "claim", label: "Dispute or claim question" },
  { value: "other", label: "Other" },
] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  reason: z.string().min(1, "Please select a reason for your inquiry"),
  message: z.string().min(10, "Please describe your question (at least a sentence)"),
});

type ContactFormData = z.infer<typeof schema>;

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(schema),
    defaultValues: { reason: "" },
  });

  function onSubmit(_data: ContactFormData) {
    // Phase 2: wire this up to a server action / Resend
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-border bg-secondary/30 px-8 py-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy/10">
          <CheckCircle2 className="h-6 w-6 text-brand-navy" />
        </div>
        <h2 className="mb-2 text-lg font-semibold">Message received</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We review incoming messages within one to two business days and will
          follow up at the email address you provided.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="contact-name">
          Name <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="contact-name"
          type="text"
          autoComplete="name"
          placeholder="Your full name"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="contact-email">
          Email address <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="contact-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Phone — optional */}
      <div className="space-y-1.5">
        <Label htmlFor="contact-phone">
          Phone{" "}
          <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input
          id="contact-phone"
          type="tel"
          autoComplete="tel"
          placeholder="(555) 000-0000"
          {...register("phone")}
        />
      </div>

      {/* Reason */}
      <div className="space-y-1.5">
        <Label htmlFor="contact-reason">
          Reason for inquiry{" "}
          <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <select
          id="contact-reason"
          aria-invalid={!!errors.reason}
          className={cn(
            "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm transition-colors outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
            errors.reason && "border-destructive ring-3 ring-destructive/20"
          )}
          {...register("reason")}
        >
          <option value="" disabled>
            Select a reason…
          </option>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        {errors.reason && (
          <p className="text-xs text-destructive" role="alert">
            {errors.reason.message}
          </p>
        )}
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">
          Message <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Textarea
          id="contact-message"
          rows={5}
          placeholder="Describe your question or situation…"
          aria-invalid={!!errors.message}
          {...register("message")}
        />
        {errors.message && (
          <p className="text-xs text-destructive" role="alert">
            {errors.message.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand-navy text-white hover:bg-brand-navy-dark sm:w-auto"
      >
        {isSubmitting ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
