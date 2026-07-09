"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle, PlusCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  suggestInsertion,
  applyInsertion,
  type SuggestInsertionResult,
} from "@/app/actions/ops/routeInsertion";

interface InsertionPanelProps {
  routeId: string;
  appointmentId: string;
  appointmentLabel: string;
}

/**
 * Mode 1 — best-insertion flow for an unrouted appointment on a day
 * that already has a route. Suggest first, apply only on request —
 * the existing route is never reshuffled silently.
 */
export function InsertionPanel({
  routeId,
  appointmentId,
  appointmentLabel,
}: InsertionPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<SuggestInsertionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSuggest() {
    setError(null);
    startTransition(async () => {
      const result = await suggestInsertion(routeId, appointmentId);
      if (result.success) setSuggestion(result);
      else setError(result.error ?? "Could not evaluate the insertion.");
    });
  }

  function handleApply() {
    if (!suggestion?.suggestionId) return;
    setError(null);
    startTransition(async () => {
      const result = await applyInsertion(suggestion.suggestionId!);
      if (!result.success) {
        setError(result.error ?? "Could not insert the stop.");
      } else {
        setSuggestion(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      {!suggestion && (
        <Button size="sm" variant="outline" onClick={handleSuggest} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Evaluating…
            </>
          ) : (
            <>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Suggest Insertion
            </>
          )}
        </Button>
      )}

      {suggestion && (
        <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
          <p>
            <span className="font-medium">Best fit:</span> insert{" "}
            <span className="font-medium">{appointmentLabel}</span> between{" "}
            {suggestion.insertAfterLabel} and {suggestion.insertBeforeLabel}. Adds
            approximately <span className="font-medium">{suggestion.addedDriveMinutes} minutes</span>{" "}
            and <span className="font-medium">{suggestion.addedMiles} miles</span> to the route.
          </p>
          {suggestion.createsConflict && (
            <p className="mt-1.5 flex items-start gap-1.5 text-amber-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {suggestion.conflictReason ??
                "Inserting here creates a time-window conflict."}
            </p>
          )}
          <div className="mt-2.5 flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleApply}
              disabled={isPending}
              className="bg-brand-navy text-white hover:bg-brand-navy-dark"
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
              )}
              Insert into Route
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSuggestion(null)}
              disabled={isPending}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
