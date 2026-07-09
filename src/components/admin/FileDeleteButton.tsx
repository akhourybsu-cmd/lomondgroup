"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteFile } from "@/app/actions/deleteFile";

interface FileDeleteButtonProps {
  fileId: string;
  fileName: string;
}

export function FileDeleteButton({ fileId, fileName }: FileDeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (
      !window.confirm(
        `Delete "${fileName}"?\n\nThis cannot be undone.`
      )
    )
      return;

    startTransition(async () => {
      await deleteFile(fileId);
    });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      disabled={isPending}
      aria-label={`Delete ${fileName}`}
      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
