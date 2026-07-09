"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Contractor } from "@/lib/types";
import {
  uploadAssignmentPdfs,
  type UploadAssignmentPdfsResult,
} from "@/app/actions/ops/uploadAssignmentPdfs";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-ring disabled:opacity-50";

interface PdfUploadFormProps {
  contractors: Pick<Contractor, "id" | "name">[];
}

export function PdfUploadForm({ contractors }: PdfUploadFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [result, dispatch, isPending] = useActionState<
    UploadAssignmentPdfsResult | null,
    FormData
  >(uploadAssignmentPdfs, null);

  useEffect(() => {
    if (result?.success) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [result, router]);

  return (
    <form ref={formRef} action={dispatch} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pdf-files">
          Assignment PDFs <span className="text-destructive">*</span>
        </Label>
        <input
          id="pdf-files"
          name="files"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          required
          className={`${inputClass} file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium`}
          disabled={isPending}
        />
        <p className="text-xs text-muted-foreground">
          Up to 25 MB per file. Originals are always preserved.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="pdf-contractor">Contractor / source (optional)</Label>
        <select
          id="pdf-contractor"
          name="contractor_id"
          defaultValue=""
          className={inputClass}
          disabled={isPending}
        >
          <option value="">— Detect from the document —</option>
          {contractors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {result?.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <p className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {result.uploadedCount} PDF{result.uploadedCount !== 1 ? "s" : ""} uploaded.
            Use “Process” to extract the appointments.
          </p>
          {result.warnings && result.warnings.length > 0 && (
            <ul className="mt-1.5 list-inside list-disc text-amber-700">
              {result.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
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
            Uploading…
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload PDFs
          </>
        )}
      </Button>
    </form>
  );
}
