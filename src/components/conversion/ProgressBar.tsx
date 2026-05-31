import { clsx } from "clsx";
import type { JobStatus } from "@/types/conversion";

interface ProgressBarProps { percent: number; status: JobStatus; }

export function ProgressBar({ percent, status }: ProgressBarProps) {
  const trackColor = status === "error" ? "bg-state-error/20" : "bg-surface-700";
  const fillColor  = status === "error" ? "bg-state-error" : status === "done" ? "bg-state-success" : "bg-brand-500";
  return (
    <div className={clsx("w-full h-1 rounded-full overflow-hidden", trackColor)}>
      <div
        className={clsx("h-full rounded-full transition-all duration-300 ease-out", fillColor)}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
      />
    </div>
  );
}
