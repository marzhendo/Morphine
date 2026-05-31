import { useState } from "react";
import type { ConversionJob, FileFormat } from "@/types/conversion";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { FormatSelector } from "./FormatSelector";
import { useConversion } from "@/hooks/useConversion";
import { getAllowedOutputFormats } from "@/lib/formatUtils";

function getFilename(path: string) {
  return path.split(/[\\\/]/).pop() ?? path;
}

export function QueueItem({ job, onRemove }: { job: ConversionJob; onRemove: (id: string) => void }) {
  const { startConversion, cancelConversion, openOutputFile } = useConversion();
  const defaultFormat = getAllowedOutputFormats(job.inputFormat)[0] ?? null;
  const [selectedFormat, setSelectedFormat] = useState<FileFormat | null>(job.outputFormat ?? defaultFormat);

  const isActive = job.status === "queued" || job.status === "converting";
  const isDone   = job.status === "done";
  const isError  = job.status === "error";
  const isIdle   = job.status === "idle";

  const borderCls = isDone ? "border-l-2 border-l-terminal-accent pl-3" :
                    isError ? "border-l-2 border-l-terminal-err-text pl-3" :
                    isActive ? "border-l-2 border-l-terminal-muted pl-3" :
                    "border border-terminal-border pl-3";

  return (
    <div className={`bg-terminal-card p-3 flex flex-col gap-2 animate-slide-up ${borderCls}`}>
      <div className="flex items-center gap-2 min-w-0">
        {/* Ext badge */}
        <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center text-[9px] font-bold tracking-widest border ${
          job.inputFormat === "pdf" ? "border-terminal-accent text-terminal-accent" : "border-terminal-accent-dim text-terminal-text"
        }`}>
          {job.inputFormat.toUpperCase().slice(0, 3)}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-terminal-text truncate font-bold">
            {getFilename(job.inputPath)}
          </p>
          {job.message && !isDone && (
            <p className="text-[10px] text-terminal-dim truncate mt-0.5">{job.message}</p>
          )}
          {isDone && job.outputPath && (
            <p className="text-[10px] text-terminal-accent truncate mt-0.5">
              → {getFilename(job.outputPath)} [ok]
            </p>
          )}
          {isError && job.error && (
            <p className="text-[10px] text-terminal-err-text truncate mt-0.5">
              ERR: {job.error}
            </p>
          )}
        </div>

        {/* Status + actions */}
        <StatusBadge status={isActive ? "converting" : job.status} />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isDone && job.outputPath && (
            <button onClick={() => openOutputFile(job.outputPath)}
              className="text-[9px] tracking-widest px-2 py-0.5 border border-terminal-accent-dim text-terminal-text hover:border-terminal-accent hover:text-terminal-accent transition-colors font-bold">
              open
            </button>
          )}
          {isError && (
            <button onClick={() => selectedFormat && startConversion(job.inputPath, selectedFormat)}
              className="text-[9px] tracking-widest px-2 py-0.5 border border-terminal-border text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent transition-colors font-bold">
              retry
            </button>
          )}
          {isActive && (
            <button onClick={() => cancelConversion(job.id)}
              className="text-[9px] tracking-widest px-2 py-0.5 border border-terminal-border text-terminal-dim hover:text-terminal-muted transition-colors font-bold">
              cancel
            </button>
          )}
          {!isActive && (
            <button onClick={() => onRemove(job.id)}
              className="text-[10px] text-terminal-border hover:text-terminal-dim transition-colors w-6 h-6 flex items-center justify-center font-bold">
              ✕
            </button>
          )}
        </div>
      </div>

      {isActive && <ProgressBar percent={job.progress} status={job.status} />}

      {isIdle && (
        <div className="flex items-center justify-between gap-3 mt-0.5">
          <FormatSelector inputFormat={job.inputFormat} selectedFormat={selectedFormat} onChange={setSelectedFormat} />
          <button onClick={() => selectedFormat && startConversion(job.inputPath, selectedFormat)}
            disabled={!selectedFormat}
            className={`text-[9px] tracking-widest uppercase px-3 py-1.5 border font-bold transition-colors flex-shrink-0 ${
              selectedFormat
                ? "border-terminal-accent text-terminal-accent hover:bg-terminal-accent-glow"
                : "border-terminal-border text-terminal-border cursor-not-allowed"
            }`}>
            run →
          </button>
        </div>
      )}
    </div>
  );
}
