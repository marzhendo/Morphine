import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useConversionStore } from "@/store/conversionStore";
import { DropZone } from "@/components/conversion/DropZone";
import { ConversionQueue } from "@/components/conversion/ConversionQueue";
import { ToolStatusBanner } from "@/components/layout/ToolStatusBanner";
import { OutputDirSelector } from "@/components/layout/OutputDirSelector";
import { detectFormat, getAllowedOutputFormats, getEngine } from "@/lib/formatUtils";
import type { ConversionJob } from "@/types/conversion";
import { useToolStatus } from "@/hooks/useToolStatus";
import { AboutDialog } from "@/components/layout/AboutDialog";
import { useQueue } from "@/hooks/useQueue";
import { QueueStatusBar } from "@/components/layout/QueueStatusBar";

export default function App() {
  useQueue(); // aktifkan queue processor
  const { addJob } = useConversionStore();
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleFilesDropped = useCallback((paths: string[]) => {
    for (const path of paths) {
      try {
        const inputFormat  = detectFormat(path);
        const outputFormat = getAllowedOutputFormats(inputFormat)[0];
        if (!outputFormat) continue;
        const job: ConversionJob = {
          id:           uuidv4(),
          inputPath:    path,
          outputPath:   "",
          inputFormat,
          outputFormat,
          engine:       getEngine(inputFormat, outputFormat),
          status:       "idle",
          progress:     0,
          message:      "",
          createdAt:    Date.now(),
        };
        addJob(job);
      } catch {
        // unsupported format — already filtered by DropZone
      }
    }
  }, [addJob]);

  return (
    <div className="flex flex-col h-screen bg-terminal-bg text-terminal-bright">
      {/* Header */}
      <header className="drag-region flex items-center justify-between px-4 py-3 border-b border-terminal-border bg-terminal-card flex-shrink-0">
        <div className="no-drag flex items-center gap-3">
          <span className="text-terminal-accent font-bold text-sm tracking-tight glow-text">
            ~/morphine $
          </span>
          <span className="text-terminal-bright text-sm font-bold tracking-widest">morphine</span>
          <span className="inline-block w-2 h-3.5 bg-terminal-accent animate-blink glow-accent" />
        </div>
        <ToolStatusHeader onAboutClick={() => setAboutOpen(true)} />
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3">
          <ToolStatusBanner />
          <OutputDirSelector />
          <QueueStatusBar />
          <ConversionQueue />
          <div className="no-drag">
            <DropZone onFilesDropped={handleFilesDropped} />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-2 text-[9px] text-terminal-muted tracking-wide border-t border-terminal-border bg-terminal-card flex-shrink-0">
        © 2026 Marzhendo. All rights reserved.
      </footer>

      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

function ToolStatusHeader({ onAboutClick }: { onAboutClick: () => void }) {
  return (
    <div className="no-drag flex items-center gap-3">
      <ToolStatusPills />
      <button
        onClick={onAboutClick}
        className="no-drag text-[9px] tracking-widest text-terminal-border hover:text-terminal-dim transition-colors font-bold"
      >
        [about]
      </button>
    </div>
  );
}

function ToolStatusPills() {
  const { data: tools } = useToolStatus();
  const TOOLS = [
    { key: "libreoffice", label: "LO" },
    { key: "imagemagick", label: "IM" },
    { key: "ghostscript", label: "GS" },
  ];
  return (
    <div className="no-drag flex items-center gap-2">
      {TOOLS.map(({ key, label }) => {
        const ready = tools?.find(([n]: [string, boolean]) => n === key)?.[1] ?? false;
        return (
          <span
            key={key}
            className={`text-[9px] tracking-widest px-2 py-0.5 border font-bold ${
              ready
                ? "border-terminal-accent text-terminal-accent"
                : "border-terminal-border text-terminal-border"
            }`}
          >
            {label}:{ready ? "ok" : "err"}
          </span>
        );
      })}
    </div>
  );
}
