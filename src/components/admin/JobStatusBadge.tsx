import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { JOB_STATUS_CONFIG, type JobStatus } from "@/lib/types";

interface JobStatusBadgeProps {
  status: JobStatus;
  size?: "sm" | "default";
}

export function JobStatusBadge({ status, size = "default" }: JobStatusBadgeProps) {
  const config = JOB_STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        config.color,
        config.bgColor,
        size === "sm" && "text-xs px-1.5 py-0"
      )}
    >
      {config.label}
    </Badge>
  );
}
