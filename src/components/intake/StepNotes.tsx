"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { notesSchema, type NotesData } from "./schemas";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface Props {
  defaultValues: Partial<NotesData>;
  onComplete: (data: NotesData) => void;
  onBack: () => void;
}

export function StepNotes({ defaultValues, onComplete, onBack }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NotesData>({
    resolver: zodResolver(notesSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onComplete)} noValidate>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use this space to share anything else relevant to your situation —
          context about the accident, the vehicle&rsquo;s condition or history,
          your timeline, or any questions you have. This is optional.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="customer_notes">
            Additional notes{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="customer_notes"
            rows={6}
            placeholder="Any context that would help us understand your situation…"
            aria-invalid={!!errors.customer_notes}
            {...register("customer_notes")}
          />
          {errors.customer_notes && (
            <p className="text-xs text-destructive" role="alert">
              {errors.customer_notes.message}
            </p>
          )}
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
