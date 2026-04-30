import { CheckCircle2, Clock, Hourglass, XCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskStatus = "assigned" | "submitted" | "approved" | "rejected";

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

const config: Record<TaskStatus, StatusConfig> = {
  assigned: {
    label: "ממתינה",
    icon: Clock,
    className: "bg-secondary text-secondary-foreground",
  },
  submitted: {
    label: "הוגשה",
    icon: Hourglass,
    className: "bg-warning/15 text-warning-foreground",
  },
  approved: {
    label: "אושרה",
    icon: CheckCircle2,
    className: "bg-success/15 text-success",
  },
  rejected: {
    label: "נדחתה",
    icon: XCircle,
    className: "bg-destructive/15 text-destructive",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus | string;
  className?: string;
}) {
  const c = (config as Record<string, StatusConfig>)[status] ?? {
    label: status,
    icon: Clock,
    className: "bg-muted text-muted-foreground",
  };
  const Icon = c.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        c.className,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span>{c.label}</span>
    </span>
  );
}