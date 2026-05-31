import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { listen } from "@tauri-apps/api/event";
import { getAllowedOutputFormats, detectFormat } from "@/lib/formatUtils";

interface DropZoneProps { onFilesDropped: (paths: string[]) => void; }

export function DropZone({ onFilesDropped }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    const unlistenHover = listen<string[]>("tauri://drag-over", () => {
      setIsDragging(true);
      setError(null);
    });
    const unlistenDrop = listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
      setIsDragging(false);
      const validPaths = event.payload.paths.filter((path) => {
        try { return getAllowedOutputFormats(detectFormat(path)).length > 0; }
        catch { return false; }
      });
      if (validPaths.length === 0) {
        setError(event.payload.paths.length === 1
          ? "Unsupported file format. Try .docx, .pdf, .xlsx, .pptx, or common image files."
          : `None of the ${event.payload.paths.length} files are in a supported format.`);
        return;
      }
      if (validPaths.length < event.payload.paths.length)
        setError(`${event.payload.paths.length - validPaths.length} unsupported file(s) skipped.`);
      onFilesDropped(validPaths);
    });
    const unlistenLeave = listen("tauri://drag-leave", () => setIsDragging(false));
    return () => {
      unlistenHover.then((fn) => fn());
      unlistenDrop.then((fn) => fn());
      unlistenLeave.then((fn) => fn());
    };
  }, [onFilesDropped]);

  return (
    <div className={clsx(
      "relative flex flex-col items-center justify-center gap-3",
      "w-full rounded-2xl border-2 border-dashed transition-all duration-200 py-12 px-8",
      isDragging ? "border-brand-500 bg-brand-500/5 scale-[1.01]" : "border-surface-700 bg-surface-900/50 hover:border-surface-600"
    )}>
      <div className={clsx(
        "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-colors",
        isDragging ? "bg-brand-500/15 text-brand-400" : "bg-surface-800 text-white/30"
      )}>
        {isDragging ? "↓" : "⊕"}
      </div>
      <div className="text-center">
        <p className={clsx("text-sm font-medium transition-colors", isDragging ? "text-brand-300" : "text-white/60")}>
          {isDragging ? "Release to add files" : "Drop files here"}
        </p>
        <p className="text-xs text-white/30 mt-1">DOCX · PDF · XLSX · PPTX · JPG · PNG · WEBP · BMP</p>
      </div>
      {error && <p className="text-xs text-state-warning/80 text-center max-w-xs animate-fade-in">{error}</p>}
    </div>
  );
}
