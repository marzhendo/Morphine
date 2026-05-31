import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useConversionStore } from "@/store/conversionStore";
import { DropZone } from "@/components/conversion/DropZone";
import { ConversionQueue } from "@/components/conversion/ConversionQueue";
import { ToolStatusBanner } from "@/components/layout/ToolStatusBanner";
import { detectFormat, getAllowedOutputFormats, getEngine } from "@/lib/formatUtils";
import type { ConversionJob } from "@/types/conversion";

export default function App() {
  const { addJob } = useConversionStore();

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
        // detectFormat threw — file already filtered by DropZone, skip silently
      }
    }
  }, [addJob]);

  return (
    <div className="flex flex-col h-screen bg-surface-950 text-white">
      {/* Header — draggable region for Tauri window */}
      <header className="drag-region flex items-center justify-between px-5 py-3.5 border-b border-surface-800 flex-shrink-0">
        <div className="flex items-center gap-2.5 no-drag">
          <div className="w-6 h-6 rounded-lg bg-brand-500 flex items-center justify-center text-xs font-bold text-white">M</div>
          <span className="text-sm font-semibold tracking-tight">Morphine</span>
          <span className="text-xs text-white/30">Transform anything, instantly.</span>
        </div>
      </header>

      {/* Main content — scrollable */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-5 py-5 flex flex-col gap-4">
          {/* Tool warnings */}
          <ToolStatusBanner />

          {/* Conversion queue */}
          <ConversionQueue />

          {/* Drop zone — always visible */}
          <div className="no-drag">
            <DropZone onFilesDropped={handleFilesDropped} />
          </div>
        </div>
      </main>
    </div>
  );
}
