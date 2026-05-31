# UI Redesign Prompt — Terminal Hacker Theme

## Wajib dibaca sebelum mulai
1. `.antigravity/rules.md`
2. `.agent/workflows/implement.md`

---

## Tujuan
Ganti seluruh visual design sistem Morphine ke aesthetic **terminal hacker** —
dark green background, lime neon accent, JetBrains Mono semua elemen,
no rounded corners, scanline effect, CLI-style language.

**Scope:** Hanya perubahan visual (CSS, className, token warna).
Jangan ubah logic, hooks, store, atau Rust backend sama sekali.

---

## TASK 1 — Replace `tailwind.config.ts`

Ganti seluruh isinya dengan:

```typescript
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        terminal: {
          bg:       "#050e05",
          card:     "#040c04",
          border:   "#0d2b0d",
          border2:  "#1a4d1a",
          dim:      "#1a4d1a",
          muted:    "#2a6a2a",
          text:     "#a0d0a0",
          bright:   "#c8f0c8",
          accent:   "#39ff14",
          "accent-dim": "#1a5a1a",
          "accent-glow": "rgba(57,255,20,0.15)",
          err:      "#3a1a0a",
          "err-text": "#5a2a0a",
          warn:     "#2a5a0a",
          "warn-text": "#4a8a20",
          done:     "#1a3d1a",
        },
      },
      fontFamily: {
        sans: ["JetBrains Mono", "monospace"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px",
        none:    "0px",
        sm:      "0px",
        md:      "0px",
        lg:      "0px",
        xl:      "0px",
        "2xl":   "0px",
        full:    "0px",
      },
      animation: {
        "blink":      "blink 1s step-end infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":    "fadeIn 0.15s ease-out",
        "slide-up":   "slideUp 0.15s ease-out",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)",   opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

## TASK 2 — Replace `src/index.css`

Ganti seluruh isinya dengan:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    border-color: #0d2b0d;
    box-sizing: border-box;
  }

  html, body, #root {
    height: 100%;
  }

  body {
    background: #050e05;
    color: #c8f0c8;
    font-family: 'JetBrains Mono', monospace;
    user-select: none;
    position: relative;
  }

  /* CRT scanline overlay */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 255, 0, 0.012) 2px,
      rgba(0, 255, 0, 0.012) 4px
    );
    pointer-events: none;
    z-index: 9999;
  }

  input, textarea {
    user-select: text;
  }

  /* Scrollbar */
  ::-webkit-scrollbar       { width: 4px; }
  ::-webkit-scrollbar-track { background: #040c04; }
  ::-webkit-scrollbar-thumb { background: #1a4d1a; }
  ::-webkit-scrollbar-thumb:hover { background: #39ff14; }
}

@layer utilities {
  .drag-region  { -webkit-app-region: drag; }
  .no-drag      { -webkit-app-region: no-drag; }

  /* Neon glow untuk accent elements */
  .glow-accent {
    box-shadow: 0 0 6px rgba(57, 255, 20, 0.4);
  }
  .glow-text {
    text-shadow: 0 0 8px rgba(57, 255, 20, 0.6);
  }
}
```

---

## TASK 3 — Replace `src/App.tsx`

Ganti seluruh isinya dengan:

```tsx
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
        <ToolStatusHeader />
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3">
          <ToolStatusBanner />
          <ConversionQueue />
          <div className="no-drag">
            <DropZone onFilesDropped={handleFilesDropped} />
          </div>
        </div>
      </main>
    </div>
  );
}

function ToolStatusHeader() {
  const { useToolStatus } = require("@/hooks/useToolStatus");
  // Use dynamic import pattern to avoid circular — inline component
  return <ToolStatusPills />;
}

import { useToolStatus } from "@/hooks/useToolStatus";

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
```

---

## TASK 4 — Replace semua komponen dengan versi terminal theme

### `src/components/layout/ToolStatusBanner.tsx`
```tsx
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
```

### `src/components/conversion/StatusBadge.tsx`
```tsx
import type { JobStatus } from "@/types/conversion";

const STATUS_CONFIG: Record<JobStatus, { label: string; cls: string }> = {
  idle:       { label: "idle",       cls: "border-terminal-border text-terminal-dim" },
  queued:     { label: "queued",     cls: "border-terminal-border text-terminal-muted" },
  converting: { label: "...",        cls: "border-terminal-accent-dim text-terminal-text animate-pulse-slow" },
  done:       { label: "done",       cls: "border-terminal-accent text-terminal-accent" },
  error:      { label: "error",      cls: "border-terminal-err text-terminal-err-text" },
  cancelled:  { label: "cancelled",  cls: "border-terminal-border text-terminal-dim" },
};

export function StatusBadge({ status }: { status: JobStatus }) {
  const { label, cls } = STATUS_CONFIG[status];
  return (
    <span className={`text-[9px] tracking-widest uppercase px-2 py-0.5 border font-bold flex-shrink-0 ${cls}`}>
      {label}
    </span>
  );
}
```

### `src/components/conversion/ProgressBar.tsx`
```tsx
import type { JobStatus } from "@/types/conversion";

export function ProgressBar({ percent, status }: { percent: number; status: JobStatus }) {
  const fillCls = status === "error" ? "bg-terminal-err-text" : "bg-terminal-accent glow-accent";
  return (
    <div className="w-full h-0.5 bg-terminal-border">
      <div
        className={`h-0.5 transition-all duration-300 ${fillCls}`}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  );
}
```

### `src/components/conversion/FormatSelector.tsx`
```tsx
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
              : "border-terminal-border text-terminal-muted hover:border-terminal-border2 hover:text-terminal-text"
          } ${disabled ? "opacity-30 cursor-not-allowed" : ""}`}
        >
          {fmt}
        </button>
      ))}
    </div>
  );
}
```

### `src/components/conversion/QueueItem.tsx`
```tsx
import { useState } from "react";
import type { ConversionJob, FileFormat } from "@/types/conversion";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { FormatSelector } from "./FormatSelector";
import { useConversion } from "@/hooks/useConversion";
import { getAllowedOutputFormats } from "@/lib/formatUtils";

function getFilename(path: string) {
  return path.split(/[\\\/]/).pop() ?? path;
}

export function QueueItem({ job, onRemove }: { job: ConversionJob; onRemove: (id: string) => void }) {
  const { startConversion, cancelConversion, openOutputFile } = useConversion();
  const defaultFormat = getAllowedOutputFormats(job.inputFormat)[0] ?? null;
  const [selectedFormat, setSelectedFormat] = useState<FileFormat | null>(job.outputFormat ?? defaultFormat);

  const isActive = job.status === "queued" || job.status === "converting";
  const isDone   = job.status === "done";
  const isError  = job.status === "error";
  const isIdle   = job.status === "idle";

  const borderCls = isDone ? "border-l-2 border-terminal-accent" :
                    isError ? "border-l-2 border-terminal-err" :
                    isActive ? "border-l-2 border-terminal-accent-dim" :
                    "border border-terminal-border";

  return (
    <div className={`bg-terminal-card p-3 flex flex-col gap-2 animate-slide-up ${borderCls}`}>
      <div className="flex items-center gap-2 min-w-0">
        {/* Ext badge */}
        <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center text-[9px] font-bold tracking-widest border ${
          job.inputFormat === "pdf" ? "border-terminal-accent text-terminal-accent" : "border-terminal-accent-dim text-terminal-text"
        }`}>
          {job.inputFormat.toUpperCase().slice(0, 3)}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-terminal-text truncate font-bold">
            {getFilename(job.inputPath)}
          </p>
          {job.message && !isDone && (
            <p className="text-[10px] text-terminal-dim truncate mt-0.5">{job.message}</p>
          )}
          {isDone && job.outputPath && (
            <p className="text-[10px] text-terminal-accent truncate mt-0.5">
              → {getFilename(job.outputPath)} [ok]
            </p>
          )}
          {isError && job.error && (
            <p className="text-[10px] text-terminal-err-text truncate mt-0.5">
              ERR: {job.error}
            </p>
          )}
        </div>

        {/* Status + actions */}
        <StatusBadge status={isActive ? "converting" : job.status} />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isDone && job.outputPath && (
            <button onClick={() => openOutputFile(job.outputPath)}
              className="text-[9px] tracking-widest px-2 py-0.5 border border-terminal-accent-dim text-terminal-text hover:border-terminal-accent hover:text-terminal-accent transition-colors font-bold">
              open
            </button>
          )}
          {isError && (
            <button onClick={() => selectedFormat && startConversion(job.inputPath, selectedFormat)}
              className="text-[9px] tracking-widest px-2 py-0.5 border border-terminal-border text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent transition-colors font-bold">
              retry
            </button>
          )}
          {isActive && (
            <button onClick={() => cancelConversion(job.id)}
              className="text-[9px] tracking-widest px-2 py-0.5 border border-terminal-border text-terminal-dim hover:text-terminal-muted transition-colors font-bold">
              cancel
            </button>
          )}
          {!isActive && (
            <button onClick={() => onRemove(job.id)}
              className="text-[10px] text-terminal-border hover:text-terminal-dim transition-colors w-6 h-6 flex items-center justify-center font-bold">
              ✕
            </button>
          )}
        </div>
      </div>

      {isActive && <ProgressBar percent={job.progress} status={job.status} />}

      {isIdle && (
        <div className="flex items-center justify-between gap-3 mt-0.5">
          <FormatSelector inputFormat={job.inputFormat} selectedFormat={selectedFormat} onChange={setSelectedFormat} />
          <button onClick={() => selectedFormat && startConversion(job.inputPath, selectedFormat)}
            disabled={!selectedFormat}
            className={`text-[9px] tracking-widest uppercase px-3 py-1.5 border font-bold transition-colors flex-shrink-0 ${
              selectedFormat
                ? "border-terminal-accent text-terminal-accent hover:bg-terminal-accent-glow"
                : "border-terminal-border text-terminal-border cursor-not-allowed"
            }`}>
            run →
          </button>
        </div>
      )}
    </div>
  );
}
```

### `src/components/conversion/ConversionQueue.tsx`
```tsx
import { useConversionStore } from "@/store/conversionStore";
import { QueueItem } from "./QueueItem";

export function ConversionQueue() {
  const { jobs, clearCompleted, clearAll, removeJob, completedCount, errorCount } = useConversionStore();
  if (jobs.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center justify-between border-b border-terminal-border pb-1.5">
        <span className="text-[9px] tracking-widest text-terminal-dim uppercase">
          queue [{jobs.length} files
          {completedCount() > 0 && ` · ${completedCount()} done`}
          {errorCount() > 0 && ` · ${errorCount()} failed`}]
        </span>
        <div className="flex gap-4">
          {completedCount() > 0 && (
            <button onClick={clearCompleted}
              className="text-[9px] tracking-widest text-terminal-border hover:text-terminal-dim transition-colors font-bold">
              --clear-done
            </button>
          )}
          <button onClick={clearAll}
            className="text-[9px] tracking-widest text-terminal-border hover:text-terminal-dim transition-colors font-bold">
            --clear-all
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {jobs.map((job) => <QueueItem key={job.id} job={job} onRemove={removeJob} />)}
      </div>
    </div>
  );
}
```

### `src/components/conversion/DropZone.tsx`
```tsx
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { getAllowedOutputFormats, detectFormat } from "@/lib/formatUtils";

export function DropZone({ onFilesDropped }: { onFilesDropped: (paths: string[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError]           = useState<string | null>(null);

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
      isDragging ? "border-terminal-accent bg-terminal-accent-glow" : "border-dashed border-terminal-border hover:border-terminal-border2"
    }`}>
      {/* Corner brackets */}
      <span className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-terminal-accent" />
      <span className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-terminal-accent" />
      <span className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-terminal-accent" />
      <span className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-terminal-accent" />

      <span className={`text-2xl font-bold leading-none transition-colors ${isDragging ? "text-terminal-accent glow-text" : "text-terminal-border"}`}>
        {isDragging ? "[↓]" : "[+]"}
      </span>
      <span className={`text-[11px] transition-colors ${isDragging ? "text-terminal-accent" : "text-terminal-dim"}`}>
        {isDragging ? "release to add files" : "drop files here"}
      </span>
      <span className="text-[9px] text-terminal-border tracking-widest uppercase">
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
```

---

## TASK 5 — Update `index.html`

Tambahkan Google Fonts JetBrains Mono di `<head>` (ganti link font yang sudah ada jika ada):

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
```

Pastikan `<html>` punya class `dark` dan `<body>` tidak punya background color hardcoded.

---

## Verifikasi

```powershell
npm run typecheck   # 0 errors
npm run build       # 0 warnings
npm run tauri dev   # app berjalan dengan theme terminal
```

Visual checklist di app yang berjalan:
```
✓ Background hijau gelap #050e05, bukan hitam
✓ Scanline effect tipis terlihat
✓ Font semua JetBrains Mono
✓ Header: "~/morphine $" + blinking cursor
✓ Tool pills: "LO:ok" hijau neon, "IM:err" dim
✓ Queue label: "queue [N files]" lowercase
✓ Job border kiri: hijau neon = done, dim = active, merah gelap = error
✓ Progress bar: 2px tipis, neon green
✓ Button labels: "run →", "cancel", "retry", "open" — lowercase
✓ Drop zone: corner brackets, "[+]" glyph
✓ ToolStatusBanner: "// WARN:" style
```
