import { useState } from "react";
import { clsx } from "clsx";
import type { ConversionJob, FileFormat } from "@/types/conversion";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { FormatSelector } from "./FormatSelector";
import { useConversion } from "@/hooks/useConversion";
import { getAllowedOutputFormats, formatLabel } from "@/lib/formatUtils";

interface QueueItemProps { job: ConversionJob; onRemove: (id: string) => void; }

function getFilename(path: string): string {
  return path.split(/[\\\/]/).pop() ?? path;
}

export function QueueItem({ job, onRemove }: QueueItemProps) {
  const { startConversion, cancelConversion, openOutputFile } = useConversion();
  const defaultFormat = getAllowedOutputFormats(job.inputFormat)[0] ?? null;
  const [selectedFormat, setSelectedFormat] = useState<FileFormat | null>(job.outputFormat ?? defaultFormat);

  const isActive = job.status === "queued" || job.status === "converting";
  const isDone   = job.status === "done";
  const isError  = job.status === "error";
  const isIdle   = job.status === "idle";

  const handleConvert = () => {
    if (!selectedFormat) return;
    startConversion(job.inputPath, selectedFormat);
  };

  return (
    <div className={clsx(
      "group flex flex-col gap-2 p-3.5 rounded-xl border transition-colors animate-slide-up",
      "bg-surface-900 border-surface-700",
      isDone   && "border-state-success/20",
      isError  && "border-state-error/20",
      isActive && "border-brand-500/20"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold bg-surface-800 text-white/50">
          {formatLabel(job.inputFormat)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/90 truncate font-medium">{getFilename(job.inputPath)}</p>
          {job.message && !isDone && (
            <p className="text-xs text-white/40 truncate mt-0.5">{job.message}</p>
          )}
          {isDone && job.outputPath && (
            <p className="text-xs text-state-success/70 truncate mt-0.5">{getFilename(job.outputPath)}</p>
          )}
          {isError && job.error && (
            <p className="text-xs text-state-error/80 truncate mt-0.5">{job.error}</p>
          )}
        </div>
        <StatusBadge status={job.status} />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isDone && job.outputPath && (
            <button onClick={() => openOutputFile(job.outputPath)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-state-success/10 text-state-success hover:bg-state-success/20 transition-colors">
              Open
            </button>
          )}
          {isError && (
            <button onClick={handleConvert}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 transition-colors">
              Retry
            </button>
          )}
          {isActive && (
            <button onClick={() => cancelConversion(job.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-700 text-white/50 hover:text-white/80 transition-colors">
              Cancel
            </button>
          )}
          {!isActive && (
            <button onClick={() => onRemove(job.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-surface-700 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Remove">✕</button>
          )}
        </div>
      </div>
      {isActive && <ProgressBar percent={job.progress} status={job.status} />}
      {isIdle && (
        <div className="flex items-center justify-between gap-3 mt-0.5">
          <FormatSelector inputFormat={job.inputFormat} selectedFormat={selectedFormat} onChange={setSelectedFormat} />
          <button onClick={handleConvert} disabled={!selectedFormat}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0",
              selectedFormat ? "bg-brand-500 text-white hover:bg-brand-600" : "bg-surface-700 text-white/30 cursor-not-allowed"
            )}>
            Convert
          </button>
        </div>
      )}
    </div>
  );
}
