"use client";

import { useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { finalizeReport } from "@/app/actions/finalizeReport";

interface FinalizeReportButtonProps {
  reportId: string;
}

export function FinalizeReportButton({ reportId }: FinalizeReportButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !window.confirm(
        "Finalize this report and generate a PDF?\n\nThe report will be locked and cannot be edited after finalization."
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await finalizeReport(reportId);
      if (!result.success) {
        alert(`Failed to finalize: ${result.error}`);
      }
    });
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="w-full bg-green-700 text-white hover:bg-green-800 disabled:opacity-50"
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Generating PDF…
        </>
      ) : (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Finalize &amp; Generate PDF
        </>
      )}
    </Button>
  );
}
