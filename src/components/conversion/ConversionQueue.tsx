import { useConversionStore } from "@/store/conversionStore";
import { QueueItem } from "./QueueItem";

export function ConversionQueue() {
  const { jobs, clearCompleted, clearAll, removeJob, completedCount, errorCount } = useConversionStore();
  if (jobs.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center justify-between border-b border-terminal-border pb-1.5">
        <span className="text-[9px] tracking-widest text-terminal-muted uppercase">
          queue [{jobs.length} files
          {completedCount() > 0 && ` · ${completedCount()} done`}
          {errorCount() > 0 && ` · ${errorCount()} failed`}]
        </span>
        <div className="flex gap-4">
          {completedCount() > 0 && (
            <button onClick={clearCompleted}
              className="text-[9px] tracking-widest text-terminal-dim hover:text-terminal-accent transition-colors font-bold cursor-pointer">
              --clear-done
            </button>
          )}
          <button onClick={clearAll}
            className="text-[9px] tracking-widest text-terminal-dim hover:text-terminal-accent transition-colors font-bold cursor-pointer">
            --clear-all
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {jobs.map((job) => <QueueItem key={job.id} job={job} onRemove={removeJob} />)}
      </div>
    </div>
  );
}
