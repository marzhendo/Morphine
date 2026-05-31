# Phase 2 Agent Prompt — Word ↔ PDF: Feature Completion

## Wajib dibaca sebelum menyentuh file apapun
1. `.antigravity/rules.md`
2. `.agent/workflows/implement.md`
3. `.agent/workflows/review.md`

---

## Kondisi workspace saat ini

Phase 1 sudah menghasilkan scaffolding dasar. Tapi ada **3 file yang harus di-REPLACE** karena tidak kompatibel dengan arsitektur Phase 2, dan ada file-file baru yang harus dibuat dari scratch.

---

## TASK 1 — Replace `src/types/conversion.ts`

File ini ada tapi tipenya terlalu simpel (format cuma `string`, tidak ada `status`, `progress`, dll). **Hapus isinya dan ganti** dengan konten berikut persis:

```typescript
// ─── File Formats ─────────────────────────────────────────────────────────────

export type DocumentFormat = "docx" | "xlsx" | "pptx" | "pdf";
export type ImageFormat    = "jpg" | "jpeg" | "png" | "webp" | "bmp";
export type FileFormat     = DocumentFormat | ImageFormat;

export type ConversionEngine = "libreoffice" | "imagemagick" | "ghostscript";

// ─── Conversion Job ───────────────────────────────────────────────────────────

export type JobStatus =
  | "idle"
  | "queued"
  | "converting"
  | "done"
  | "error"
  | "cancelled";

export interface ConversionJob {
  id: string;
  inputPath: string;
  outputPath: string;
  inputFormat: FileFormat;
  outputFormat: FileFormat;
  engine: ConversionEngine;
  status: JobStatus;
  progress: number;       // 0–100
  message: string;
  error?: string;
  createdAt: number;      // Date.now()
  completedAt?: number;
}

// ─── IPC Payloads (mirror Rust structs exactly) ───────────────────────────────

export interface ConversionJobPayload {
  id: string;
  input_path: string;
  output_path: string;
  input_format: FileFormat;
  output_format: FileFormat;
}

export interface ConversionProgressEvent {
  job_id: string;
  percent: number;
  message: string;
}

export interface ConversionResultPayload {
  job_id: string;
  success: boolean;
  output_path?: string;
  error?: string;
}

// ─── Tool Registry ────────────────────────────────────────────────────────────

export type ToolName = "libreoffice" | "imagemagick" | "ghostscript";
export type ToolStatus = "not_found" | "downloading" | "ready" | "error";

export interface Tool {
  name: ToolName;
  status: ToolStatus;
  version?: string;
  path?: string;
  downloadProgress?: number;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  defaultOutputDir: "same_as_input" | "custom";
  customOutputDir?: string;
  outputNaming: "overwrite" | "suffix_number" | "suffix_timestamp";
  imageQuality: number;
  concurrentJobs: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  defaultOutputDir: "same_as_input",
  outputNaming: "suffix_number",
  imageQuality: 90,
  concurrentJobs: 2,
};
```

**Penting:** Semua import di file lain yang menggunakan `@/types/conversion` atau `../types/conversion` harus diubah ke `@/types/conversion` (path tidak berubah, tapi konten berubah total).

---

## TASK 2 — Replace `src/store/conversionStore.ts`

File yang ada menggunakan struktur state lama (`queue`, `progress`, `results` terpisah). **Ganti seluruh isinya** dengan:

```typescript
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  ConversionJob,
  ConversionProgressEvent,
  ConversionResultPayload,
  JobStatus,
} from "@/types/conversion";

interface ConversionState {
  jobs: ConversionJob[];

  addJob:         (job: ConversionJob) => void;
  updateProgress: (event: ConversionProgressEvent) => void;
  setResult:      (result: ConversionResultPayload) => void;
  setStatus:      (jobId: string, status: JobStatus) => void;
  removeJob:      (jobId: string) => void;
  clearCompleted: () => void;
  clearAll:       () => void;

  activeCount:    () => number;
  completedCount: () => number;
  errorCount:     () => number;
}

export const useConversionStore = create<ConversionState>()(
  devtools(
    (set, get) => ({
      jobs: [],

      addJob: (job) =>
        set((state) => ({ jobs: [...state.jobs, job] })),

      updateProgress: (event) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === event.job_id
              ? { ...j, progress: event.percent, message: event.message, status: "converting" }
              : j
          ),
        })),

      setResult: (result) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === result.job_id
              ? {
                  ...j,
                  status:      result.success ? "done" : "error",
                  progress:    result.success ? 100 : j.progress,
                  outputPath:  result.output_path ?? j.outputPath,
                  error:       result.error,
                  completedAt: Date.now(),
                }
              : j
          ),
        })),

      setStatus: (jobId, status) =>
        set((state) => ({
          jobs: state.jobs.map((j) =>
            j.id === jobId ? { ...j, status } : j
          ),
        })),

      removeJob: (jobId) =>
        set((state) => ({ jobs: state.jobs.filter((j) => j.id !== jobId) })),

      clearCompleted: () =>
        set((state) => ({
          jobs: state.jobs.filter((j) => j.status !== "done"),
        })),

      clearAll: () => set({ jobs: [] }),

      activeCount: () =>
        get().jobs.filter((j) =>
          j.status === "queued" || j.status === "converting"
        ).length,

      completedCount: () =>
        get().jobs.filter((j) => j.status === "done").length,

      errorCount: () =>
        get().jobs.filter((j) => j.status === "error").length,
    }),
    { name: "morphine-conversions" }
  )
);
```

---

## TASK 3 — Replace `src/hooks/useConversion.ts`

File yang ada hanya punya `startConversion` dan invoke hardcode ke `convert_docx_to_pdf`. **Ganti seluruh isinya** dengan:

```typescript
import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";
import { v4 as uuidv4 } from "uuid";
import { useConversionStore } from "@/store/conversionStore";
import type {
  ConversionJob,
  ConversionJobPayload,
  ConversionProgressEvent,
  ConversionResultPayload,
  FileFormat,
} from "@/types/conversion";
import { detectFormat, resolveOutputPath, getEngine } from "@/lib/formatUtils";

export function useConversion() {
  const { addJob, updateProgress, setResult, setStatus } = useConversionStore();

  const startConversion = useCallback(
    async (inputPath: string, outputFormat: FileFormat, outputDir?: string) => {
      const id          = uuidv4();
      const inputFormat = detectFormat(inputPath);
      const outputPath  = resolveOutputPath(inputPath, outputFormat, outputDir);
      const engine      = getEngine(inputFormat, outputFormat);

      const job: ConversionJob = {
        id,
        inputPath,
        outputPath,
        inputFormat,
        outputFormat,
        engine,
        status:    "queued",
        progress:  0,
        message:   "Waiting...",
        createdAt: Date.now(),
      };
      addJob(job);

      const unlisten = await listen<ConversionProgressEvent>(
        "conversion:progress",
        (event) => {
          if (event.payload.job_id === id) {
            updateProgress(event.payload);
          }
        }
      );

      try {
        setStatus(id, "converting");

        const payload: ConversionJobPayload = {
          id,
          input_path:    inputPath,
          output_path:   outputPath,
          input_format:  inputFormat,
          output_format: outputFormat,
        };

        const result = await invoke<ConversionResultPayload>("convert_file", {
          job: payload,
        });

        setResult(result);
      } catch (err) {
        setResult({
          job_id:  id,
          success: false,
          error:   err instanceof Error ? err.message : String(err),
        });
      } finally {
        unlisten();
      }
    },
    [addJob, updateProgress, setResult, setStatus]
  );

  const cancelConversion = useCallback(
    async (jobId: string) => {
      try {
        await invoke("cancel_conversion", { jobId });
        setStatus(jobId, "cancelled");
      } catch {
        // Job may have already finished — safe to ignore
      }
    },
    [setStatus]
  );

  const openOutputFile = useCallback(async (outputPath: string) => {
    await open(outputPath);
  }, []);

  return { startConversion, cancelConversion, openOutputFile };
}
```

---

## TASK 4 — Buat file-file baru berikut

Buat file-file ini dari scratch. Semuanya belum ada di workspace.

### `src/lib/formatUtils.ts`
```typescript
import type { ConversionEngine, FileFormat } from "@/types/conversion";

export function detectFormat(filePath: string): FileFormat {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const formatMap: Record<string, FileFormat> = {
    docx: "docx", xlsx: "xlsx", pptx: "pptx", pdf: "pdf",
    jpg: "jpg", jpeg: "jpg", png: "png", webp: "webp", bmp: "bmp",
  };
  const format = formatMap[ext];
  if (!format) throw new Error(`Unsupported format: .${ext}`);
  return format;
}

export function resolveOutputPath(
  inputPath: string,
  outputFormat: FileFormat,
  customDir?: string
): string {
  const lastDot   = inputPath.lastIndexOf(".");
  const lastSlash = Math.max(inputPath.lastIndexOf("\\"), inputPath.lastIndexOf("/"));
  const dir       = customDir ?? inputPath.substring(0, lastSlash);
  const baseName  = inputPath.substring(lastSlash + 1, lastDot);
  const ext       = outputFormat === "jpg" ? "jpg" : outputFormat;
  return `${dir}\\${baseName}.${ext}`;
}

export function getEngine(inputFormat: FileFormat, outputFormat: FileFormat): ConversionEngine {
  if (inputFormat === "pdf" && isImageFormat(outputFormat)) return "ghostscript";
  if (isImageFormat(inputFormat)) return "imagemagick";
  return "libreoffice";
}

export function isImageFormat(format: FileFormat): boolean {
  return ["jpg", "jpeg", "png", "webp", "bmp"].includes(format);
}

export function isDocumentFormat(format: FileFormat): boolean {
  return ["docx", "xlsx", "pptx", "pdf"].includes(format);
}

const CONVERSION_MAP: Record<FileFormat, FileFormat[]> = {
  docx: ["pdf"], xlsx: ["pdf"], pptx: ["pdf"],
  pdf:  ["docx", "jpg", "png"],
  jpg:  ["png", "webp", "bmp", "pdf"], jpeg: ["png", "webp", "bmp", "pdf"],
  png:  ["jpg", "webp", "bmp", "pdf"], webp: ["jpg", "png", "bmp", "pdf"],
  bmp:  ["jpg", "png", "webp", "pdf"],
};

export function getAllowedOutputFormats(inputFormat: FileFormat): FileFormat[] {
  return CONVERSION_MAP[inputFormat] ?? [];
}

export function formatLabel(format: FileFormat): string {
  return format.toUpperCase();
}

export function fileSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

### `src/hooks/useToolStatus.ts`
```typescript
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

type ToolStatusEntry = [string, boolean];

export function useToolStatus() {
  return useQuery({
    queryKey: ["tool-status"],
    queryFn:  () => invoke<ToolStatusEntry[]>("get_tool_status"),
    refetchInterval: 10_000,
  });
}

export function useIsLibreOfficeReady() {
  const { data } = useToolStatus();
  return data?.find(([name]) => name === "libreoffice")?.[1] ?? false;
}
```

### `src/components/conversion/StatusBadge.tsx`
```typescript
import { clsx } from "clsx";
import type { JobStatus } from "@/types/conversion";

interface StatusBadgeProps { status: JobStatus; }

const STATUS_CONFIG: Record<JobStatus, { label: string; classes: string }> = {
  idle:       { label: "Idle",       classes: "bg-surface-700 text-white/50" },
  queued:     { label: "Queued",     classes: "bg-surface-600 text-white/70" },
  converting: { label: "Converting", classes: "bg-brand-500/20 text-brand-300 animate-pulse-slow" },
  done:       { label: "Done",       classes: "bg-state-success/15 text-state-success" },
  error:      { label: "Error",      classes: "bg-state-error/15 text-state-error" },
  cancelled:  { label: "Cancelled",  classes: "bg-surface-700 text-white/40" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, classes } = STATUS_CONFIG[status];
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", classes)}>
      {label}
    </span>
  );
}
```

### `src/components/conversion/ProgressBar.tsx`
```typescript
import { clsx } from "clsx";
import type { JobStatus } from "@/types/conversion";

interface ProgressBarProps { percent: number; status: JobStatus; }

export function ProgressBar({ percent, status }: ProgressBarProps) {
  const trackColor = status === "error" ? "bg-state-error/20" : "bg-surface-700";
  const fillColor  = status === "error" ? "bg-state-error" : status === "done" ? "bg-state-success" : "bg-brand-500";
  return (
    <div className={clsx("w-full h-1 rounded-full overflow-hidden", trackColor)}>
      <div
        className={clsx("h-full rounded-full transition-all duration-300 ease-out", fillColor)}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}
      />
    </div>
  );
}
```

### `src/components/conversion/FormatSelector.tsx`
```typescript
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
```

### `src/components/conversion/QueueItem.tsx`
```typescript
import { useState } from "react";
import { clsx } from "clsx";
import type { ConversionJob, FileFormat } from "@/types/conversion";
import { StatusBadge } from "./StatusBadge";
import { ProgressBar } from "./ProgressBar";
import { FormatSelector } from "./FormatSelector";
import { useConversion } from "@/hooks/useConversion";
import { getAllowedOutputFormats, formatLabel } from "@/lib/formatUtils";

interface QueueItemProps { job: ConversionJob; onRemove: (id: string) => void; }

function getFilename(path: string): string {
  return path.split(/[\\\/]/).pop() ?? path;
}

export function QueueItem({ job, onRemove }: QueueItemProps) {
  const { startConversion, cancelConversion, openOutputFile } = useConversion();
  const defaultFormat = getAllowedOutputFormats(job.inputFormat)[0] ?? null;
  const [selectedFormat, setSelectedFormat] = useState<FileFormat | null>(job.outputFormat ?? defaultFormat);

  const isActive = job.status === "queued" || job.status === "converting";
  const isDone   = job.status === "done";
  const isError  = job.status === "error";
  const isIdle   = job.status === "idle";

  const handleConvert = () => {
    if (!selectedFormat) return;
    startConversion(job.inputPath, selectedFormat);
  };

  return (
    <div className={clsx(
      "group flex flex-col gap-2 p-3.5 rounded-xl border transition-colors animate-slide-up",
      "bg-surface-900 border-surface-700",
      isDone   && "border-state-success/20",
      isError  && "border-state-error/20",
      isActive && "border-brand-500/20"
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold bg-surface-800 text-white/50">
          {formatLabel(job.inputFormat)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white/90 truncate font-medium">{getFilename(job.inputPath)}</p>
          {job.message && !isDone && (
            <p className="text-xs text-white/40 truncate mt-0.5">{job.message}</p>
          )}
          {isDone && job.outputPath && (
            <p className="text-xs text-state-success/70 truncate mt-0.5">{getFilename(job.outputPath)}</p>
          )}
          {isError && job.error && (
            <p className="text-xs text-state-error/80 truncate mt-0.5">{job.error}</p>
          )}
        </div>
        <StatusBadge status={job.status} />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isDone && job.outputPath && (
            <button onClick={() => openOutputFile(job.outputPath)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-state-success/10 text-state-success hover:bg-state-success/20 transition-colors">
              Open
            </button>
          )}
          {isError && (
            <button onClick={handleConvert}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-brand-500/10 text-brand-300 hover:bg-brand-500/20 transition-colors">
              Retry
            </button>
          )}
          {isActive && (
            <button onClick={() => cancelConversion(job.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-700 text-white/50 hover:text-white/80 transition-colors">
              Cancel
            </button>
          )}
          {!isActive && (
            <button onClick={() => onRemove(job.id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-surface-700 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Remove">✕</button>
          )}
        </div>
      </div>
      {isActive && <ProgressBar percent={job.progress} status={job.status} />}
      {isIdle && (
        <div className="flex items-center justify-between gap-3 mt-0.5">
          <FormatSelector inputFormat={job.inputFormat} selectedFormat={selectedFormat} onChange={setSelectedFormat} />
          <button onClick={handleConvert} disabled={!selectedFormat}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0",
              selectedFormat ? "bg-brand-500 text-white hover:bg-brand-600" : "bg-surface-700 text-white/30 cursor-not-allowed"
            )}>
            Convert
          </button>
        </div>
      )}
    </div>
  );
}
```

### `src/components/conversion/ConversionQueue.tsx`
```typescript
import { clsx } from "clsx";
import { useConversionStore } from "@/store/conversionStore";
import { QueueItem } from "./QueueItem";

export function ConversionQueue() {
  const { jobs, clearCompleted, clearAll, removeJob, completedCount, errorCount } = useConversionStore();
  if (jobs.length === 0) return null;
  const hasCompleted = completedCount() > 0;
  const hasErrors    = errorCount() > 0;
  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white/50">{jobs.length} file{jobs.length !== 1 ? "s" : ""}</span>
          {hasCompleted && <span className="text-xs text-state-success/70">· {completedCount()} done</span>}
          {hasErrors    && <span className="text-xs text-state-error/70">· {errorCount()} failed</span>}
        </div>
        <div className="flex items-center gap-2">
          {hasCompleted && (
            <button onClick={clearCompleted} className="text-xs text-white/30 hover:text-white/60 transition-colors">
              Clear done
            </button>
          )}
          <button onClick={clearAll}
            className={clsx("text-xs transition-colors", jobs.length > 0 ? "text-white/30 hover:text-white/60" : "text-white/10 cursor-not-allowed")}>
            Clear all
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {jobs.map((job) => <QueueItem key={job.id} job={job} onRemove={removeJob} />)}
      </div>
    </div>
  );
}
```

### `src/components/conversion/DropZone.tsx`
```typescript
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
```

### `src/components/layout/ToolStatusBanner.tsx`
```typescript
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
```

---

## TASK 5 — Replace `src/App.tsx`

Ganti isi `App.tsx` yang ada (Phase 1 mock) dengan implementasi real:

```typescript
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
          <div className="w-6 h-6 rounded-lg bg-brand-500 flex items-center justify-center text-xs font-bold">M</div>
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
```

---

## TASK 6 — Tambah missing dependencies

Cek `package.json`. Jika belum ada, install:
```powershell
npm install uuid clsx
npm install -D @types/uuid
```

---

## TASK 7 — Tambah mock Tauri ke `src/test-setup.ts`

Tambahkan baris berikut ke file `test-setup.ts` yang sudah ada (jangan hapus yang sudah ada):

```typescript
import { vi } from "vitest";

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@tauri-apps/plugin-shell", () => ({
  open: vi.fn(() => Promise.resolve()),
}));
```

---

## Verifikasi (jalankan berurutan)

```powershell
# 1. TypeScript — tidak ada error
npm run typecheck

# 2. Build production — bersih
npm run build

# 3. Tests — semua hijau
npm test

# 4. Dev mode — window terbuka, UI render
npm run tauri dev
```

Manual smoke test di app yang berjalan:
```
✓ Header tampil "Morphine" + tagline
✓ ToolStatusBanner muncul jika LibreOffice belum ada
✓ Drop file .docx → masuk queue sebagai idle, FormatSelector tampil PDF
✓ Klik Convert → status berubah ke Converting, progress bar muncul
✓ Selesai → status Done, tombol Open muncul
✓ Drop file .exe → tidak masuk queue, error hint tampil di DropZone
✓ Tombol ✕ menghapus job dari queue
✓ Clear done hanya hapus job yang selesai
```

---

## Definition of Done

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run build` → 0 warnings  
- [ ] `npm test` → semua test hijau
- [ ] `npm run tauri dev` → app berjalan normal
- [ ] Smoke test manual selesai di Windows
