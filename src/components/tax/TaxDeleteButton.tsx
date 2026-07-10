"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteTaxRecord } from "@/app/actions/tax/deleteTaxRecord";

type TaxTable = "business_expenses" | "income_entries" | "mileage_entries";

/** Two-tap delete: first tap arms ("Sure?"), second confirms. */
export function TaxDeleteButton({ table, id }: { table: TaxTable; id: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [armed, setArmed] = useState(false);

  return (
    <button
      type="button"
      title="Delete"
      disabled={isPending}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          setTimeout(() => setArmed(false), 3000);
          return;
        }
        start(async () => {
          await deleteTaxRecord(table, id);
          router.refresh();
        });
      }}
      className={`flex h-7 items-center justify-center rounded-md border px-1.5 ${
        armed
          ? "border-destructive bg-destructive/10 text-destructive"
          : "w-7 border-border text-muted-foreground hover:bg-secondary hover:text-destructive"
      }`}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : armed ? (
        <span className="text-xs font-medium">Sure?</span>
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
