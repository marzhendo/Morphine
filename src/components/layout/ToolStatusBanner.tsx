import { useToolStatus } from "@/hooks/useToolStatus";
import { useToolDownload } from "@/hooks/useToolDownload";

const TOOL_LABELS: Record<string, string> = {
  libreoffice: "LibreOffice (~213MB)",
  imagemagick: "ImageMagick (~30MB)",
  ghostscript: "Ghostscript (~50MB)",
};

export function ToolStatusBanner() {
  const { data: tools, isLoading }    = useToolStatus();
  const { downloadTool, states, progress } = useToolDownload();

  if (isLoading || !tools) return null;

  const missing = tools
    .filter(([, ready]: [string, boolean]) => !ready)
    .map(([name]: [string, boolean]) => name);

  if (missing.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border border-terminal-warn bg-terminal-card px-3 py-2.5 animate-fade-in">
      <div className="text-[9px] text-terminal-warn-text tracking-widest">
        <span className="text-terminal-dim">// </span>
        WARN: {missing.length} required tool{missing.length > 1 ? "s" : ""} not found
        — some conversions unavailable
      </div>

      <div className="flex flex-col gap-1.5">
        {missing.map((tool) => {
          const state    = states[tool] ?? "idle";
          const prog     = progress[tool];
          const isActive = state === "downloading";
          const isDone   = state === "done";
          const isError  = state === "error";

          return (
            <div key={tool} className="flex items-center gap-2">
              {/* Tool name */}
              <span className="text-[10px] text-terminal-muted w-44 flex-shrink-0">
                {TOOL_LABELS[tool] ?? tool}
              </span>

              {/* Progress bar (saat downloading) */}
              {isActive && prog && (
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-0.5 bg-terminal-border">
                    <div
                      className="h-0.5 bg-terminal-accent transition-all duration-300"
                      style={{ width: `${prog.percent}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-terminal-dim w-24 flex-shrink-0 truncate">
                    {prog.message}
                  </span>
                </div>
              )}

              {/* Done state */}
              {isDone && (
                <span className="text-[9px] text-terminal-accent tracking-widest">
                  [installed ✓]
                </span>
              )}

              {/* Error state */}
              {isError && (
                <span className="text-[9px] text-terminal-err-text tracking-widest">
                  [download failed]
                </span>
              )}

              {/* Download button */}
              {!isActive && !isDone && (
                <button
                  onClick={() => downloadTool(tool)}
                  className="text-[9px] tracking-widest px-2 py-0.5 border border-terminal-border2 text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent transition-colors font-bold flex-shrink-0"
                >
                  {isError ? "[retry]" : "[download]"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[9px] text-terminal-border tracking-wide">
        // or place tools manually in{" "}
        <span className="text-terminal-dim">%APPDATA%\Morphine\tools\</span>
      </p>
    </div>
  );
}
