import type { JobStatus } from "@/types/conversion";

export function ProgressBar({ percent, status }: { percent: number; status: JobStatus }) {
  const fillCls = status === "error" ? "bg-terminal-err-text" : "bg-terminal-accent glow-accent";
  return (
    <div className="w-full h-0.5 bg-terminal-border">
      <div
        className={`h-0.5 transition-all duration-300 ${fillCls}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
