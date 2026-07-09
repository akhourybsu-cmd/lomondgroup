"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ArrowDown,
  Lock,
  LockOpen,
  CheckCircle2,
  Undo2,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  routeStopAction,
  type StopAction,
} from "@/app/actions/ops/routeStopAction";

interface RouteStopControlsProps {
  stopId: string;
  locked: boolean;
  completed: boolean;
  skipped: boolean;
  isFirst: boolean;
  isLast: boolean;
}

export function RouteStopControls({
  stopId,
  locked,
  completed,
  skipped,
  isFirst,
  isLast,
}: RouteStopControlsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: StopAction) {
    setError(null);
    startTransition(async () => {
      const result = await routeStopAction(stopId, action);
      if (!result.success) setError(result.error ?? "Action failed.");
      router.refresh();
    });
  }

  const iconButton =
    "h-7 w-7 border border-border bg-background text-muted-foreground hover:bg-secondary hover:text-foreground";

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1">
        {!completed && (
          <>
            <Button
              size="icon-sm"
              className={iconButton}
              title="Move earlier"
              disabled={isPending || isFirst}
              onClick={() => run("move_up")}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon-sm"
              className={iconButton}
              title="Move later"
              disabled={isPending || isLast}
              onClick={() => run("move_down")}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon-sm"
              className={iconButton}
              title={locked ? "Unlock position" : "Lock position"}
              disabled={isPending}
              onClick={() => run(locked ? "unlock" : "lock")}
            >
              {locked ? (
                <Lock className="h-3.5 w-3.5 text-brand-navy" />
              ) : (
                <LockOpen className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              size="icon-sm"
              className={iconButton}
              title={skipped ? "Restore stop" : "Skip stop"}
              disabled={isPending}
              onClick={() => run(skipped ? "unskip" : "skip")}
            >
              <SkipForward
                className={`h-3.5 w-3.5 ${skipped ? "text-amber-600" : ""}`}
              />
            </Button>
          </>
        )}
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => run(completed ? "uncomplete" : "complete")}
          className={
            completed
              ? "border border-border bg-background text-muted-foreground hover:bg-secondary"
              : "bg-green-600 text-white hover:bg-green-700"
          }
        >
          {completed ? (
            <>
              <Undo2 className="mr-1 h-3.5 w-3.5" />
              Undo
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Complete
            </>
          )}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
