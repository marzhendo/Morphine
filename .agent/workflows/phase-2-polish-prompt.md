# Polish Prompt — Fix Open Button + Visibility + Output Location

## Wajib dibaca sebelum mulai
1. `.antigravity/rules.md`
2. `.agent/workflows/implement.md`

---

## TASK 1 — Fix tombol "open" tidak berfungsi

Root cause: `tauri-plugin-shell` membutuhkan permission eksplisit di capabilities file.

### 1a. Cek `src-tauri/capabilities/default.json`
Tambahkan permission `shell:allow-open` jika belum ada:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for Morphine",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open"
  ]
}
```

### 1b. Pastikan `src-tauri/src/lib.rs` (atau `main.rs`) init plugin shell
Cari baris `.plugin(tauri_plugin_shell::init())` — kalau belum ada, tambahkan:

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    // ... plugin lain
```

### 1c. Verifikasi `useConversion.ts`
Pastikan `openOutputFile` menggunakan `open` dari `@tauri-apps/plugin-shell`:

```typescript
import { open } from "@tauri-apps/plugin-shell";

const openOutputFile = useCallback(async (outputPath: string) => {
  await open(outputPath);
}, []);
```

---

## TASK 2 — Fix visibility semua elemen

Edit `tailwind.config.ts` — update color tokens yang kurang kontras:

```typescript
terminal: {
  bg:           "#050e05",
  card:         "#040c04",
  border:       "#1a3d1a",       // lebih terang dari #0d2b0d
  border2:      "#2a6a2a",       // hover border
  dim:          "#2a6a2a",       // queue label, clear buttons
  muted:        "#4aaa4a",       // secondary text
  text:         "#a0d0a0",       // body text
  bright:       "#c8f0c8",       // filename, primary text
  accent:       "#39ff14",       // neon green
  "accent-dim": "#1a5a1a",
  "accent-glow":"rgba(57,255,20,0.15)",
  err:          "#4a1a0a",       // error border
  "err-text":   "#cc6633",       // error text — lebih visible
  warn:         "#3a6a0a",
  "warn-text":  "#7abd2a",
  done:         "#1a3d1a",
},
```

Lalu update `src/index.css` — naikkan opacity scanline sedikit dan perbaiki scrollbar:

```css
body::after {
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 0, 0.018) 2px,
    rgba(0, 255, 0, 0.018) 4px
  );
}
```

---

## TASK 3 — Naikkan kontras komponen spesifik

### `StatusBadge.tsx` — warnai lebih terang
```tsx
const STATUS_CONFIG: Record<JobStatus, { label: string; cls: string }> = {
  idle:       { label: "idle",     cls: "border-terminal-border2 text-terminal-muted" },
  queued:     { label: "queued",   cls: "border-terminal-border2 text-terminal-muted" },
  converting: { label: "running",  cls: "border-terminal-accent text-terminal-accent animate-pulse-slow" },
  done:       { label: "done",     cls: "border-terminal-accent text-terminal-accent" },
  error:      { label: "error",    cls: "border-terminal-err text-terminal-err-text" },
  cancelled:  { label: "cancelled",cls: "border-terminal-border2 text-terminal-muted" },
};
```

### `ConversionQueue.tsx` — queue label & clear buttons lebih visible
```tsx
<span className="text-[9px] tracking-widest text-terminal-muted uppercase">
  queue [{jobs.length} files ...]
</span>
<button className="text-[9px] tracking-widest text-terminal-dim hover:text-terminal-accent transition-colors font-bold">
  --clear-done
</button>
```

### `FormatSelector.tsx` — chip lebih terang
```tsx
selectedFormat === fmt
  ? "border-terminal-accent text-terminal-accent"
  : "border-terminal-border2 text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent"
```

### `DropZone.tsx` — border dan teks lebih visible
```tsx
// border utama
isDragging
  ? "border-terminal-accent bg-terminal-accent-glow"
  : "border-dashed border-terminal-border2 hover:border-terminal-accent"

// "[+]" glyph
isDragging ? "text-terminal-accent glow-text" : "text-terminal-muted"

// "drop files here"
isDragging ? "text-terminal-accent" : "text-terminal-text"

// format list
"text-[9px] text-terminal-dim tracking-widest uppercase"

// corner brackets — lebih terang
"border-terminal-muted"  // ganti dari border-terminal-accent agar tidak bersaing dengan glyph
```

### `QueueItem.tsx` — border kiri lebih tebal dan visible
```tsx
const borderCls =
  isDone   ? "border-l-2 border-l-terminal-accent pl-3" :
  isError  ? "border-l-2 border-l-terminal-err-text pl-3" :
  isActive ? "border-l-2 border-l-terminal-muted pl-3" :
             "border border-terminal-border pl-3";
```

---

## TASK 4 — Tambah Output Location Selector (fitur baru)

### 4a. Update `src/types/conversion.ts`
Tambahkan ke `AppSettings` (sudah ada di types, tinggal pastikan ada):
```typescript
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

### 4b. Buat `src/store/settingsStore.ts`
```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "@/types/conversion";
import { DEFAULT_SETTINGS } from "@/types/conversion";

interface SettingsState {
  settings: AppSettings;
  setOutputDir: (dir: "same_as_input" | "custom") => void;
  setCustomDir: (path: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setOutputDir: (dir) =>
        set((s) => ({ settings: { ...s.settings, defaultOutputDir: dir } })),
      setCustomDir: (path) =>
        set((s) => ({ settings: { ...s.settings, customOutputDir: path, defaultOutputDir: "custom" } })),
    }),
    { name: "morphine-settings" }
  )
);
```

### 4c. Buat `src/components/layout/OutputDirSelector.tsx`
```tsx
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
            className="text-terminal-dim hover:text-terminal-err-text transition-colors tracking-widest flex-shrink-0"
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
        className="text-[9px] tracking-widest px-2 py-0.5 border border-terminal-border2 text-terminal-muted hover:border-terminal-accent hover:text-terminal-accent transition-colors font-bold flex-shrink-0"
      >
        [browse]
      </button>
    </div>
  );
}
```

### 4d. Update `src/hooks/useConversion.ts`
Baca `customOutputDir` dari settings store saat resolve output path:

```typescript
import { useSettingsStore } from "@/store/settingsStore";

export function useConversion() {
  const { addJob, updateProgress, setResult, setStatus } = useConversionStore();
  const { settings } = useSettingsStore();

  const startConversion = useCallback(
    async (inputPath: string, outputFormat: FileFormat) => {
      const id          = uuidv4();
      const inputFormat = detectFormat(inputPath);

      // Gunakan custom dir jika di-set, otherwise same as input
      const outputDir = settings.defaultOutputDir === "custom" && settings.customOutputDir
        ? settings.customOutputDir
        : undefined;

      const outputPath = resolveOutputPath(inputPath, outputFormat, outputDir);
      const engine     = getEngine(inputFormat, outputFormat);

      // ... sisa logic sama seperti sebelumnya
    },
    [addJob, updateProgress, setResult, setStatus, settings]
  );
  // ...
}
```

### 4e. Tambahkan `OutputDirSelector` ke `App.tsx`
Tambahkan di antara `ToolStatusBanner` dan `ConversionQueue`:

```tsx
import { OutputDirSelector } from "@/components/layout/OutputDirSelector";

// Di dalam return, setelah ToolStatusBanner:
<ToolStatusBanner />
<OutputDirSelector />
<ConversionQueue />
```

### 4f. Tambahkan permission dialog ke `capabilities/default.json`
```json
{
  "permissions": [
    "core:default",
    "shell:allow-open",
    "dialog:allow-open"
  ]
}
```

### 4g. Tambahkan plugin dialog ke `Cargo.toml` dan `lib.rs`

Di `Cargo.toml`:
```toml
tauri-plugin-dialog = "2.0.0"
```

Di `lib.rs` atau `main.rs`:
```rust
.plugin(tauri_plugin_dialog::init())
```

---

## Verifikasi

```powershell
cargo check              # 0 errors, 0 warnings
npm run typecheck        # 0 type errors
npm run build            # clean build
npm run tauri dev        # app berjalan
```

Checklist manual di app:
```
✓ Queue label "queue [N files]" terbaca jelas
✓ Format chips JPG/WEBP/dll terbaca dan bisa diklik
✓ Status badge IDLE/DONE/ERROR jelas terbaca
✓ Border kiri job item terlihat jelas (2px colored)
✓ Drop zone border dan "[+]" lebih kontras
✓ Tombol "open" membuka file di aplikasi default Windows
✓ OutputDirSelector tampil di bawah header
✓ Klik [browse] membuka folder picker dialog
✓ Setelah pilih folder, path tampil dan konversi output ke sana
✓ Klik [reset] kembali ke "same as input"
✓ Setting output dir persist setelah app di-restart
```
