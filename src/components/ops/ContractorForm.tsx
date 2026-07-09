"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Contractor } from "@/lib/types";
import {
  saveContractor,
  type SaveContractorResult,
} from "@/app/actions/ops/saveContractor";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50";

interface ContractorFormProps {
  /** Present when editing; absent when creating */
  contractor?: Contractor;
}

export function ContractorForm({ contractor }: ContractorFormProps) {
  const router = useRouter();
  const isEdit = !!contractor;

  const [result, dispatch, isPending] = useActionState<
    SaveContractorResult | null,
    FormData
  >(saveContractor, null);

  // After creating, go back to the contractor list
  useEffect(() => {
    if (result?.success && !isEdit) {
      router.push("/admin/contractors");
    }
  }, [result, isEdit, router]);

  return (
    <form action={dispatch} className="space-y-4">
      {contractor && <input type="hidden" name="id" value={contractor.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="ct-name">
          Contractor name <span className="text-destructive">*</span>
        </Label>
        <input
          id="ct-name"
          name="name"
          type="text"
          required
          defaultValue={contractor?.name ?? ""}
          placeholder="e.g. ABC Independent Adjusters"
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ct-contact-name">Contact name</Label>
          <input
            id="ct-contact-name"
            name="contact_name"
            type="text"
            defaultValue={contractor?.contact_name ?? ""}
            className={inputClass}
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ct-phone">Contact phone</Label>
          <input
            id="ct-phone"
            name="contact_phone"
            type="tel"
            defaultValue={contractor?.contact_phone ?? ""}
            className={inputClass}
            disabled={isPending}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ct-email">Contact email</Label>
        <input
          id="ct-email"
          name="contact_email"
          type="email"
          defaultValue={contractor?.contact_email ?? ""}
          className={inputClass}
          disabled={isPending}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ct-duration">Default appointment duration (minutes)</Label>
        <input
          id="ct-duration"
          name="default_duration_minutes"
          type="number"
          min="5"
          step="5"
          defaultValue={contractor?.default_duration_minutes ?? ""}
          placeholder="45"
          className={inputClass}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Used as the starting duration for this contractor&apos;s appointments.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ct-notes">Default notes</Label>
        <textarea
          id="ct-notes"
          name="default_notes"
          rows={3}
          defaultValue={contractor?.default_notes ?? ""}
          placeholder="Anything to remember about assignments from this contractor…"
          className={`${inputClass} resize-none`}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="ct-active"
          name="active"
          type="checkbox"
          defaultChecked={contractor?.active ?? true}
          className="h-4 w-4 rounded border-input accent-brand-navy"
          disabled={isPending}
        />
        <Label htmlFor="ct-active" className="font-normal">
          Active (appears in appointment forms)
        </Label>
      </div>

      {result?.success && isEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Contractor saved.
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
          "Create Contractor"
        )}
      </Button>
    </form>
  );
}
