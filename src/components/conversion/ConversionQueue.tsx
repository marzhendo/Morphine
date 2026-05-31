import { clsx } from "clsx";
import { useConversionStore } from "@/store/conversionStore";
import { QueueItem } from "./QueueItem";

export function ConversionQueue() {
  const { jobs, clearCompleted, clearAll, removeJob, completedCount, errorCount } = useConversionStore();
  if (jobs.length === 0) return null;
  const hasCompleted = completedCount() > 0;
  const hasErrors    = errorCount() > 0;
  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/50">{jobs.length} file{jobs.length !== 1 ? "s" : ""}</span>
          {hasCompleted && <span className="text-xs text-state-success/70">· {completedCount()} done</span>}
          {hasErrors    && <span className="text-xs text-state-error/70">· {errorCount()} failed</span>}
        </div>
        <div className="flex items-center gap-2">
          {hasCompleted && (
            <button onClick={clearCompleted} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Clear done
            </button>
          )}
          <button onClick={clearAll}
            className={clsx("text-xs transition-colors", jobs.length > 0 ? "text-white/30 hover:text-white/60" : "text-white/10 cursor-not-allowed")}>
            Clear all
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {jobs.map((job) => <QueueItem key={job.id} job={job} onRemove={removeJob} />)}
      </div>
    </div>
  );
}
