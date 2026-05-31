import type { JobStatus } from "@/types/conversion";

const STATUS_CONFIG: Record<JobStatus, { label: string; cls: string }> = {
  idle:       { label: "idle",     cls: "border-terminal-border2 text-terminal-muted" },
  queued:     { label: "queued",   cls: "border-terminal-border2 text-terminal-muted" },
  converting: { label: "running",  cls: "border-terminal-accent text-terminal-accent animate-pulse-slow" },
  done:       { label: "done",     cls: "border-terminal-accent text-terminal-accent" },
  error:      { label: "error",    cls: "border-terminal-err text-terminal-err-text" },
  cancelled:  { label: "cancelled",cls: "border-terminal-border2 text-terminal-muted" },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const { label, cls } = STATUS_CONFIG[status];
  return (
    <span className={`text-[9px] tracking-widest uppercase px-2 py-0.5 border font-bold flex-shrink-0 ${cls}`}>
      {label}
    </span>
  );
}
