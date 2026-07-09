"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Upload, CheckCircle2, AlertCircle, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { uploadFile, type UploadFileResult } from "@/app/actions/uploadFile";
import { type FileCategory } from "@/lib/types";

const CATEGORY_OPTIONS: { value: FileCategory; label: string }[] = [
  { value: "vehicle_photo", label: "Vehicle Photo" },
  { value: "damage_photo", label: "Damage Photo" },
  { value: "repair_estimate", label: "Repair Estimate" },
  { value: "insurance_valuation", label: "Insurance Valuation" },
  { value: "settlement_offer", label: "Settlement Offer" },
  { value: "appraisal_report", label: "Appraisal Report" },
  { value: "other", label: "Other" },
];

const ACCEPTED = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadFormProps {
  jobId: string;
}

export function FileUploadForm({ jobId }: FileUploadFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [result, dispatch, isPending] = useActionState<
    UploadFileResult | null,
    FormData
  >(uploadFile, null);

  // Reset form after a successful upload
  useEffect(() => {
    if (result?.success) {
      formRef.current?.reset();
      setSelectedFile(null);
    }
  }, [result]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null);
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    // Inject the dropped file into the hidden input
    const input = formRef.current?.querySelector<HTMLInputElement>(
      'input[name="file"]'
    );
    if (!input) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    setSelectedFile(file);
  }

  return (
    <form ref={formRef} action={dispatch} className="space-y-4">
      <input type="hidden" name="job_id" value={jobId} />

      {/* Drag-and-drop / file picker */}
      <div className="space-y-1.5">
        <Label>File</Label>
        <label
          htmlFor="file-input"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center cursor-pointer transition-colors",
            dragOver
              ? "border-brand-navy bg-brand-navy/5"
              : "border-border hover:border-brand-navy/40 hover:bg-secondary/40"
          )}
        >
          {selectedFile ? (
            <>
              <FileIcon className="h-7 w-7 text-brand-navy" />
              <div>
                <p className="text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(selectedFile.size)}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Click to change file
              </p>
            </>
          ) : (
            <>
              <Upload className="h-7 w-7 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium">
                  Drop a file or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WEBP, HEIC, PDF — up to 50 MB
                </p>
              </div>
            </>
          )}
        </label>
        <input
          id="file-input"
          name="file"
          type="file"
          accept={ACCEPTED}
          onChange={handleFileChange}
          className="sr-only"
          required
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category-select">Category</Label>
        <select
          id="category-select"
          name="category"
          required
          defaultValue=""
          className="h-9 w-full rounded-lg border border-input bg-background px-2.5 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-ring"
        >
          <option value="" disabled>
            Select category…
          </option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Feedback */}
      {result?.success && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          File uploaded successfully.
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
        disabled={isPending || !selectedFile}
        className="w-full bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading…
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload File
          </>
        )}
      </Button>
    </form>
  );
}
