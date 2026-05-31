import { useToolStatus } from "@/hooks/useToolStatus";

export function ToolStatusBanner() {
  const { data: tools, isLoading } = useToolStatus();
  if (isLoading || !tools) return null;
  const missing = tools.filter(([, ready]) => !ready).map(([name]) => name);
  if (missing.length === 0) return null;
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-state-warning/8 border border-state-warning/20 animate-fade-in">
      <span className="text-state-warning text-base mt-0.5 flex-shrink-0">⚠</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-state-warning/90">
          {missing.includes("libreoffice")
            ? "LibreOffice not found — Word and PDF conversions unavailable"
            : `Missing tools: ${missing.join(", ")}`}
        </p>
        <p className="text-xs text-white/40 mt-0.5">
          Place tools in <code className="font-mono text-white/50 bg-surface-700 px-1 rounded">%APPDATA%\Morphine\tools\</code> and restart the app.
        </p>
      </div>
    </div>
  );
}
