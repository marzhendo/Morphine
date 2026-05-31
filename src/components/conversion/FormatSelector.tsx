import { clsx } from "clsx";
import type { FileFormat } from "@/types/conversion";
import { getAllowedOutputFormats, formatLabel } from "@/lib/formatUtils";

interface FormatSelectorProps {
  inputFormat: FileFormat;
  selectedFormat: FileFormat | null;
  onChange: (format: FileFormat) => void;
  disabled?: boolean;
}

export function FormatSelector({ inputFormat, selectedFormat, onChange, disabled = false }: FormatSelectorProps) {
  const options = getAllowedOutputFormats(inputFormat);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="text-xs text-white/40 mr-1">Convert to</span>
      {options.map((fmt) => (
        <button
          key={fmt}
          onClick={() => !disabled && onChange(fmt)}
          disabled={disabled}
          className={clsx(
            "px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors border",
            selectedFormat === fmt
              ? "bg-brand-500 border-brand-500 text-white"
              : "bg-surface-800 border-surface-600 text-white/60 hover:border-brand-500/50 hover:text-white/90",
            disabled && "opacity-40 cursor-not-allowed"
          )}
        >
          {formatLabel(fmt)}
        </button>
      ))}
    </div>
  );
}
