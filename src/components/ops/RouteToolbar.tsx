"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reoptimizeRoute } from "@/app/actions/ops/reoptimizeRoute";

/**
 * Mode 2 — explicit full re-optimization. Never happens silently;
 * the user clicks this knowing completed and locked stops stay put.
 */
export function RecalculateRouteButton({ routeId }: { routeId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ warn: boolean; text: string } | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await reoptimizeRoute(routeId);
      if (!result.success) {
        setMessage({ warn: true, text: result.error ?? "Recalculation failed." });
      } else if (result.hasConflicts) {
        setMessage({
          warn: true,
          text: "Route recalculated, but at least one time window can't be met. Review the warnings below.",
        });
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" onClick={handleClick} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Recalculating…
          </>
        ) : (
          <>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Recalculate Route
          </>
        )}
      </Button>
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {message.warn ? (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}
    </div>
  );
}
