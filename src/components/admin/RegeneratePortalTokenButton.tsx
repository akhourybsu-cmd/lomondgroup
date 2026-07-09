"use client";

import { useTransition, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { generatePortalToken } from "@/app/actions/generatePortalToken";

interface RegeneratePortalTokenButtonProps {
  jobId: string;
  /** Called with the new token after a successful regeneration */
  onRegenerated: (newToken: string) => void;
}

export function RegeneratePortalTokenButton({
  jobId,
  onRegenerated,
}: RegeneratePortalTokenButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRegenerate() {
    const confirmed = window.confirm(
      "Regenerating the portal link will invalidate the existing link for this client. " +
        "They will no longer be able to access the portal using the old URL.\n\n" +
        "Are you sure you want to continue?"
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      const result = await generatePortalToken(jobId);
      if (result.success && result.token) {
        onRegenerated(result.token);
      } else {
        setError(result.error ?? "Failed to regenerate portal link.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRegenerate}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/50 hover:bg-destructive/5 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Regenerate link
      </button>

      {error && (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
