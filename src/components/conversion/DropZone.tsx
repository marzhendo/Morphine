import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { getAllowedOutputFormats, detectFormat } from "@/lib/formatUtils";

export function DropZone({ onFilesDropped }: { onFilesDropped: (paths: string[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleBrowseFiles = async () => {
    setError(null);
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Supported Files',
          extensions: ['docx', 'pdf', 'xlsx', 'pptx', 'jpg', 'jpeg', 'png', 'webp', 'bmp']
        }]
      });
      if (selected && Array.isArray(selected)) {
        onFilesDropped(selected);
      } else if (typeof selected === "string") {
        onFilesDropped([selected]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    const unlistenHover = listen("tauri://drag-over", () => { setIsDragging(true); setError(null); });
    const unlistenDrop  = listen<{ paths: string[] }>("tauri://drag-drop", (event) => {
      setIsDragging(false);
      const valid = event.payload.paths.filter((p) => {
        try { return getAllowedOutputFormats(detectFormat(p)).length > 0; } catch { return false; }
      });
      if (valid.length === 0) {
        setError(event.payload.paths.length === 1
          ? "ERR: unsupported format — try .docx .pdf .xlsx .pptx .jpg .png .webp .bmp"
          : `ERR: none of ${event.payload.paths.length} files are supported`);
        return;
      }
      if (valid.length < event.payload.paths.length)
        setError(`WARN: ${event.payload.paths.length - valid.length} unsupported file(s) skipped`);
      onFilesDropped(valid);
    });
    const unlistenLeave = listen("tauri://drag-leave", () => setIsDragging(false));
    return () => {
      unlistenHover.then((fn) => fn());
      unlistenDrop.then((fn) => fn());
      unlistenLeave.then((fn) => fn());
    };
  }, [onFilesDropped]);

  return (
    <div className={`relative flex flex-col items-center justify-center gap-2 py-10 px-6 border transition-colors ${
      isDragging ? "border-terminal-accent bg-terminal-accent-glow" : "border-dashed border-terminal-border2 hover:border-terminal-accent"
    }`}>
      {/* Corner brackets */}
      <span className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-terminal-muted" />
      <span className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-terminal-muted" />
      <span className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-terminal-muted" />
      <span className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-terminal-muted" />

      <span className={`text-2xl font-bold leading-none transition-colors ${isDragging ? "text-terminal-accent glow-text" : "text-terminal-muted"}`}>
        {isDragging ? "[↓]" : "[+]"}
      </span>
      <span className={`text-[11px] transition-colors ${isDragging ? "text-terminal-accent" : "text-terminal-text"}`}>
        {isDragging ? "release to add files" : "drop files here"}
      </span>
      {!isDragging && (
        <button
          onClick={handleBrowseFiles}
          className="text-[9px] tracking-widest px-2.5 py-1 border border-terminal-border2 text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent transition-colors font-bold mt-1 cursor-pointer"
        >
          [browse files]
        </button>
      )}
      <span className="text-[9px] text-terminal-dim tracking-widest uppercase">
        docx · pdf · xlsx · pptx · jpg · png · webp · bmp
      </span>
      {error && (
        <span className="text-[10px] text-terminal-warn-text text-center max-w-xs animate-fade-in">
          {error}
        </span>
      )}
    </div>
  );
}
