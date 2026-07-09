"use client";

import { useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { createPortalCheckoutSession } from "@/app/actions/createPortalCheckoutSession";

interface PortalPayButtonProps {
  portalToken: string;
  amountDisplay: string;
}

export function PortalPayButton({
  portalToken,
  amountDisplay,
}: PortalPayButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handlePay() {
    startTransition(async () => {
      const result = await createPortalCheckoutSession(portalToken);
      if (result.success && result.url) {
        window.location.href = result.url;
      } else {
        alert(result.error ?? "Failed to start payment. Please contact us.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={isPending}
      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1B3A5C] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#152d4a] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Redirecting to payment…
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4" />
          Pay {amountDisplay}
        </>
      )}
    </button>
  );
}
