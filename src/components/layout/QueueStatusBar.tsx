import { useConversionStore } from "@/store/conversionStore";
import { useSettingsStore } from "@/store/settingsStore";

export function QueueStatusBar() {
  const { jobs } = useConversionStore();
  const { settings, setConcurrentJobs } = useSettingsStore();

  const converting = jobs.filter((j) => j.status === "converting").length;
  const queued     = jobs.filter((j) => j.status === "queued").length;

  if (jobs.length === 0) return null;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border border-terminal-border bg-terminal-card text-[9px] tracking-widest animate-fade-in">
      <div className="flex items-center gap-3 text-terminal-dim">
        <span>
          slots:{" "}
          <span className="text-terminal-accent">{converting}</span>
          /{settings.concurrentJobs} active
        </span>
        {queued > 0 && (
          <span>
            <span className="text-terminal-muted">{queued}</span> waiting
          </span>
        )}
      </div>

      {/* Concurrent job control */}
      <div className="flex items-center gap-2 text-terminal-dim">
        <span>concurrent:</span>
        <button
          onClick={() => setConcurrentJobs(settings.concurrentJobs - 1)}
          disabled={settings.concurrentJobs <= 1}
          className="w-5 h-5 border border-terminal-border hover:border-terminal-accent hover:text-terminal-accent transition-colors disabled:opacity-20 disabled:cursor-not-allowed font-bold"
        >
          -
        </button>
        <span className="text-terminal-accent w-3 text-center font-bold">
          {settings.concurrentJobs}
        </span>
        <button
          onClick={() => setConcurrentJobs(settings.concurrentJobs + 1)}
          disabled={settings.concurrentJobs >= 4}
          className="w-5 h-5 border border-terminal-border hover:border-terminal-accent hover:text-terminal-accent transition-colors disabled:opacity-20 disabled:cursor-not-allowed font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}
