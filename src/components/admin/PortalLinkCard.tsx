"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegeneratePortalTokenButton } from "@/components/admin/RegeneratePortalTokenButton";

interface PortalLinkCardProps {
  jobId: string;
  /** Initial portal token — updated in state when regenerated */
  portalToken: string;
}

export function PortalLinkCard({ jobId, portalToken }: PortalLinkCardProps) {
  const [token, setToken] = useState(portalToken);
  const [copied, setCopied] = useState(false);

  // Derive base URL from the browser — safe: no secret data in the URL
  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : "";

  const portalUrl = `${baseUrl}/portal/${token}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard API
      const el = document.createElement("textarea");
      el.value = portalUrl;
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Client Portal Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Share this private link with the client so they can track their job
          status, view their report, and pay online.
        </p>

        {/* URL display row */}
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">
            {portalUrl || `/portal/${token}`}
          </span>

          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Copy portal link"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>

          {/* Open in new tab */}
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Open portal in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Copied confirmation */}
        {copied && (
          <p className="text-xs font-medium text-green-600">
            Link copied to clipboard!
          </p>
        )}

        {/* Regenerate */}
        <RegeneratePortalTokenButton
          jobId={jobId}
          onRegenerated={(newToken) => setToken(newToken)}
        />
      </CardContent>
    </Card>
  );
}
