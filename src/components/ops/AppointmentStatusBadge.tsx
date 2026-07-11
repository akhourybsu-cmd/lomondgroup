import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { APPOINTMENT_STATUS_CONFIG, type AppointmentStatus } from "@/lib/types";

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  size?: "sm" | "default";
}

export function AppointmentStatusBadge({
  status,
  size = "default",
}: AppointmentStatusBadgeProps) {
  const config = APPOINTMENT_STATUS_CONFIG[status] ?? {
    label: String(status).replace(/_/g, " "),
    color: "text-slate-700",
    bgColor: "bg-slate-50 border-slate-200",
    description: "",
  };

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
