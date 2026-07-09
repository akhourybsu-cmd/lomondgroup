"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Copy, CheckCheck, Loader2, AlertCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createCheckoutSession } from "@/app/actions/createCheckoutSession";

interface CheckoutLinkGeneratorProps {
  jobId: string;
  /** Pre-existing checkout URL if one was already generated */
  existingUrl?: string | null;
}

export function CheckoutLinkGenerator({
  jobId,
  existingUrl,
}: CheckoutLinkGeneratorProps) {
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState<string | null>(existingUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSession(jobId);
      if (result.success && result.url) {
        setUrl(result.url);
      } else {
        setError(result.error ?? "Failed to generate payment link.");
      }
    });
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input
    }
  }

  return (
    <div className="space-y-3">
      {url ? (
        <>
          <p className="text-xs text-muted-foreground">
            Share this link with the client. It expires after 24 hours.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              readOnly
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xs text-muted-foreground outline-none"
            />
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleCopy}
              aria-label="Copy link"
              className="shrink-0"
            >
              {copied ? (
                <CheckCheck className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open in new tab"
              className={cn(
                buttonVariants({ variant: "outline", size: "icon-sm" }),
                "shrink-0"
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isPending}
            className="w-full text-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                Regenerating…
              </>
            ) : (
              "Regenerate Link"
            )}
          </Button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Generate a secure Stripe Checkout link to send to the client.
            The fee amount must be set before generating.
          </p>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="w-full bg-brand-navy text-white hover:bg-brand-navy-dark disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <ExternalLink className="mr-2 h-4 w-4" />
                Generate Payment Link
              </>
            )}
          </Button>
        </>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
