import { useToolStatus } from "@/hooks/useToolStatus";

export function ToolStatusBanner() {
  const { data: tools, isLoading } = useToolStatus();
  if (isLoading || !tools) return null;
  const missing = tools.filter(([, ready]: [string, boolean]) => !ready).map(([n]: [string, boolean]) => n);
  if (missing.length === 0) return null;
  return (
    <div className="border border-terminal-warn bg-terminal-card px-3 py-2 text-[10px] text-terminal-warn-text leading-relaxed animate-fade-in">
      <span className="text-terminal-dim">// </span>
      WARN: <span className="text-terminal-warn-text font-bold">{missing.join(", ")}</span> not found
      {" "}— image conversion unavailable. place tools in{" "}
      <span className="text-terminal-text">%APPDATA%\Morphine\tools\</span> and restart
    </div>
  );
}
