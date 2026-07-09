"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processPdfUpload } from "@/app/actions/ops/processPdfUpload";
import { getPdfSignedUrl } from "@/app/actions/ops/getPdfSignedUrl";

interface ProcessUploadButtonProps {
  uploadId: string;
  /** 'process' for pending uploads, 'retry' after a failure */
  variant?: "process" | "retry";
}

export function ProcessUploadButton({
  uploadId,
  variant = "process",
}: ProcessUploadButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await processPdfUpload(uploadId);
      if (result.success) {
        setMessage({ ok: true, text: result.message ?? "Processed." });
        router.refresh();
      } else {
        setMessage({ ok: false, text: result.error ?? "Processing failed." });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Extracting… this can take a minute
          </>
        ) : (
          <>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {variant === "retry" ? "Retry Extraction" : "Process PDF"}
          </>
        )}
      </Button>
      {message && (
        <div
          className={
            message.ok
              ? "flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
              : "flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          }
        >
          {message.ok ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}

export function ViewPdfButton({ uploadId }: { uploadId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await getPdfSignedUrl(uploadId);
      if (result.success && result.url) {
        window.open(result.url, "_blank", "noopener");
      } else {
        setError(result.error ?? "Could not open the PDF.");
      }
    });
  }

  return (
    <div>
      <Button size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
        )}
        View Original PDF
      </Button>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
