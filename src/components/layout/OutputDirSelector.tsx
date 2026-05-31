import { useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useSettingsStore } from "@/store/settingsStore";

export function OutputDirSelector() {
  const { settings, setOutputDir, setCustomDir } = useSettingsStore();
  const isCustom = settings.defaultOutputDir === "custom";

  const handleBrowse = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      setCustomDir(selected);
    }
  }, [setCustomDir]);

  const handleReset = useCallback(() => {
    setOutputDir("same_as_input");
  }, [setOutputDir]);

  return (
    <div className="flex items-center gap-2 text-[10px] border border-terminal-border px-3 py-2 bg-terminal-card">
      <span className="text-terminal-dim tracking-widest">output:</span>

      {isCustom && settings.customOutputDir ? (
        <>
          <span className="text-terminal-text flex-1 truncate font-mono">
            {settings.customOutputDir}
          </span>
          <button
            onClick={handleReset}
            className="text-terminal-dim hover:text-terminal-err-text transition-colors tracking-widest flex-shrink-0 cursor-pointer font-bold"
          >
            [reset]
          </button>
        </>
      ) : (
        <>
          <span className="text-terminal-muted flex-1 tracking-widest">
            same as input <span className="text-terminal-dim">(default)</span>
          </span>
        </>
      )}

      <button
        onClick={handleBrowse}
        className="text-[9px] tracking-widest px-2 py-0.5 border border-terminal-border2 text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent transition-colors font-bold flex-shrink-0 cursor-pointer"
      >
        [browse]
      </button>
    </div>
  );
}
