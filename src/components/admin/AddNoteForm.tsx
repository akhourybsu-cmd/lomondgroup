"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, CheckCircle2, Lock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { addNote, type AddNoteResult } from "@/app/actions/addNote";

interface AddNoteFormProps {
  jobId: string;
}

export function AddNoteForm({ jobId }: AddNoteFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [result, dispatch, isPending] = useActionState<
    AddNoteResult | null,
    FormData
  >(addNote, null);

  // Reset form on success
  useEffect(() => {
    if (result?.success) {
      formRef.current?.reset();
    }
  }, [result]);

  return (
    <form ref={formRef} action={dispatch} className="space-y-4">
      <input type="hidden" name="job_id" value={jobId} />

      {/* Body */}
      <div className="space-y-1.5">
        <Label htmlFor="note-body">Note</Label>
        <textarea
          id="note-body"
          name="body"
          rows={5}
          required
          placeholder="Add an internal note or client-visible comment…"
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50"
          disabled={isPending}
        />
      </div>

      {/* Visibility */}
      <div className="space-y-1.5">
        <Label>Visibility</Label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              {
                value: "internal",
                label: "Internal",
                description: "Staff only",
                icon: Lock,
                activeClass:
                  "border-amber-400 bg-amber-50 text-amber-800",
              },
              {
                value: "client_visible",
                label: "Client visible",
                description: "Shared with client",
                icon: Eye,
                activeClass: "border-teal-400 bg-teal-50 text-teal-800",
              },
            ] as const
          ).map(({ value, label, description, icon: Icon, activeClass }) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer flex-col gap-1 rounded-lg border-2 px-3 py-2.5 transition-colors has-[:checked]:font-medium",
                `has-[:checked]:${activeClass}`,
                "border-border hover:border-foreground/30"
              )}
            >
              <input
                type="radio"
                name="visibility"
                value={value}
                defaultChecked={value === "internal"}
                className="sr-only"
              />
              <span className="flex items-center gap-1.5 text-sm">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Feedback */}
      {result?.success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Note added.
        </div>
      )}
      {result && !result.success && result.error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {result.error}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Add Note"
        )}
      </Button>
    </form>
  );
}
