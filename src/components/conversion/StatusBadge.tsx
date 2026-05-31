import { clsx } from "clsx";
import type { JobStatus } from "@/types/conversion";

interface StatusBadgeProps { status: JobStatus; }

const STATUS_CONFIG: Record<JobStatus, { label: string; classes: string }> = {
  idle:       { label: "Idle",       classes: "bg-surface-700 text-white/50" },
  queued:     { label: "Queued",     classes: "bg-surface-600 text-white/70" },
  converting: { label: "Converting", classes: "bg-brand-500/20 text-brand-300 animate-pulse-slow" },
  done:       { label: "Done",       classes: "bg-state-success/15 text-state-success" },
  error:      { label: "Error",      classes: "bg-state-error/15 text-state-error" },
  cancelled:  { label: "Cancelled",  classes: "bg-surface-700 text-white/40" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, classes } = STATUS_CONFIG[status];
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", classes)}>
      {label}
    </span>
  );
}
