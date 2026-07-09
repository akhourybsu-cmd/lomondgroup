import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  urgency?: "normal" | "warning" | "alert";
  href?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  urgency = "normal",
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border transition-shadow hover:shadow-sm",
        urgency === "warning" && "border-amber-200 bg-amber-50/30",
        urgency === "alert" && "border-red-200 bg-red-50/30"
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <p
              className={cn(
                "mt-1 text-2xl font-semibold tabular-nums",
                urgency === "warning" && "text-amber-700",
                urgency === "alert" && "text-red-700"
              )}
            >
              {value}
            </p>
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
              urgency === "normal" && "bg-brand-navy/8 text-brand-navy",
              urgency === "warning" && "bg-amber-100 text-amber-700",
              urgency === "alert" && "bg-red-100 text-red-700"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
