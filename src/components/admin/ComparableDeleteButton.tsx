"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removeComparable } from "@/app/actions/removeComparable";

interface ComparableDeleteButtonProps {
  comparableId: string;
}

export function ComparableDeleteButton({
  comparableId,
}: ComparableDeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm("Remove this comparable? This cannot be undone.")) return;
    startTransition(async () => {
      await removeComparable(comparableId);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      disabled={isPending}
      aria-label="Remove comparable"
      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
