import type { FileFormat } from "@/types/conversion";
import { getAllowedOutputFormats } from "@/lib/formatUtils";

interface FormatSelectorProps {
  inputFormat:    FileFormat;
  selectedFormat: FileFormat | null;
  onChange:       (format: FileFormat) => void;
  disabled?:      boolean;
}

export function FormatSelector({ inputFormat, selectedFormat, onChange, disabled = false }: FormatSelectorProps) {
  const options = getAllowedOutputFormats(inputFormat);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[9px] text-terminal-dim tracking-widest">output:</span>
      {options.map((fmt) => (
        <button
          key={fmt}
          onClick={() => !disabled && onChange(fmt)}
          disabled={disabled}
          className={`text-[9px] tracking-widest uppercase px-2 py-0.5 border font-bold transition-colors ${
            selectedFormat === fmt
              ? "border-terminal-accent text-terminal-accent"
              : "border-terminal-border2 text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent"
          } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
        >
          {fmt}
        </button>
      ))}
    </div>
  );
}
