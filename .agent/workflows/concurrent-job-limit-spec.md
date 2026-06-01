# Spesifikasi — Concurrent Job Limit

## Ringkasan
Batasi jumlah konversi yang berjalan bersamaan menjadi maksimal 2 job (default).
Job yang melebihi batas otomatis masuk status `queued` dan diproses
begitu slot kosong — tanpa intervensi user.

---

## Kondisi Workspace Saat Ini

### Yang sudah ada dan TIDAK boleh diubah strukturnya:
- `src/types/index.ts` — sudah ada `AppSettings.concurrentJobs: number` dan `DEFAULT_SETTINGS.concurrentJobs: 2`
- `src/store/conversionStore.ts` — sudah ada `activeCount()` yang hitung job berstatus `queued` + `converting`
- `src/hooks/useConversion.ts` — `startConversion()` saat ini langsung invoke ke Rust tanpa cek slot
- `src/components/conversion/QueueItem.tsx` — render per job, sudah punya status `queued`

### Yang perlu dibuat/diubah:
- `src/store/settingsStore.ts` — BUAT BARU (belum ada)
- `src/hooks/useConversion.ts` — MODIFIKASI logika `startConversion`
- `src/hooks/useQueue.ts` — BUAT BARU, queue processor
- `src/components/conversion/QueueItem.tsx` — MODIFIKASI tampilan status `queued`
- `src/components/layout/QueueStatusBar.tsx` — BUAT BARU, info concurrent slots

---

## Alur Kerja yang Diinginkan

```
User klik "run →" pada job idle
  → useConversion.startConversion() dipanggil
    → cek activeCount() < concurrentJobs (dari settings)
      → YA: langsung jalankan (status: converting)
      → TIDAK: simpan ke store sebagai status "queued", tunggu

useQueue processor (berjalan di background via useEffect)
  → subscribe ke perubahan store
    → setiap kali ada job selesai/error/cancelled
      → cek apakah ada job berstatus "queued"
        → YA + ada slot kosong: ambil job queued tertua (createdAt terkecil), jalankan
        → TIDAK: idle
```

---

## TASK 1 — Buat `src/store/settingsStore.ts`

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "@/types/index";
import { DEFAULT_SETTINGS } from "@/types/index";

interface SettingsState {
  settings: AppSettings;
  setConcurrentJobs: (n: number) => void;
  setOutputDir:      (dir: "same_as_input" | "custom") => void;
  setCustomDir:      (path: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      setConcurrentJobs: (n) =>
        set((s) => ({
          settings: { ...s.settings, concurrentJobs: Math.min(4, Math.max(1, n)) }
        })),

      setOutputDir: (dir) =>
        set((s) => ({ settings: { ...s.settings, defaultOutputDir: dir } })),

      setCustomDir: (path) =>
        set((s) => ({
          settings: { ...s.settings, customOutputDir: path, defaultOutputDir: "custom" }
        })),
    }),
    { name: "morphine-settings" }
  )
);
```

---

## TASK 2 — Buat `src/hooks/useQueue.ts`

Hook ini adalah "dispatcher" — berjalan di background, memantau store,
dan menjalankan job queued begitu ada slot kosong.

```typescript
import { useEffect, useRef } from "react";
import { useConversionStore } from "@/store/conversionStore";
import { useSettingsStore } from "@/store/settingsStore";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { ConversionJobPayload, ConversionProgressEvent, ConversionResultPayload } from "@/types/index";

export function useQueue() {
  const { jobs, setStatus, updateProgress, setResult } = useConversionStore();
  const { settings } = useSettingsStore();
  const processingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const activeCount = jobs.filter(
      (j) => j.status === "converting"
    ).length;

    const availableSlots = settings.concurrentJobs - activeCount;
    if (availableSlots <= 0) return;

    // Ambil job queued tertua yang belum sedang diproses
    const pendingJobs = jobs
      .filter((j) => j.status === "queued" && !processingRef.current.has(j.id))
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(0, availableSlots);

    for (const job of pendingJobs) {
      processingRef.current.add(job.id);
      runJob(job.id);
    }

    async function runJob(jobId: string) {
      const job = useConversionStore.getState().jobs.find((j) => j.id === jobId);
      if (!job) return;

      const unlisten = await listen<ConversionProgressEvent>(
        "conversion:progress",
        (event) => {
          if (event.payload.job_id === jobId) {
            updateProgress(event.payload);
          }
        }
      );

      try {
        setStatus(jobId, "converting");

        const payload: ConversionJobPayload = {
          id:            job.id,
          input_path:    job.inputPath,
          output_path:   job.outputPath,
          input_format:  job.inputFormat,
          output_format: job.outputFormat,
        };

        const result = await invoke<ConversionResultPayload>("convert_file", {
          job: payload,
        });

        setResult(result);
      } catch (err) {
        setResult({
          job_id:  jobId,
          success: false,
          error:   err instanceof Error ? err.message : String(err),
        });
      } finally {
        unlisten();
        processingRef.current.delete(jobId);
      }
    }
  }, [jobs, settings.concurrentJobs, setStatus, updateProgress, setResult]);
}
```

---

## TASK 3 — Modifikasi `src/hooks/useConversion.ts`

`startConversion` tidak lagi langsung invoke ke Rust.
Tugasnya sekarang hanya: **tambah job ke store dengan status yang tepat**.
`useQueue` yang akan memutuskan kapan job dijalankan.

Ubah `startConversion` menjadi:

```typescript
const startConversion = useCallback(
  async (inputPath: string, outputFormat: FileFormat, outputDir?: string) => {
    const id          = uuidv4();
    const inputFormat = detectFormat(inputPath);

    // Resolve output dir dari settings
    const { settings } = useSettingsStore.getState();
    const resolvedOutputDir =
      settings.defaultOutputDir === "custom" && settings.customOutputDir
        ? settings.customOutputDir
        : outputDir;

    const outputPath = resolveOutputPath(inputPath, outputFormat, resolvedOutputDir);
    const engine     = getEngine(inputFormat, outputFormat);

    // Cek slot tersedia
    const { jobs } = useConversionStore.getState();
    const activeCount = jobs.filter(
      (j) => j.status === "converting" || j.status === "queued"
    ).length;
    const { concurrentJobs } = settings;

    // Kalau slot penuh, masuk antrian — useQueue yang akan proses
    const initialStatus = activeCount >= concurrentJobs ? "queued" : "queued";
    // Status selalu "queued" dulu, useQueue yang dispatch ke "converting"

    const job: ConversionJob = {
      id,
      inputPath,
      outputPath,
      inputFormat,
      outputFormat,
      engine,
      status:    "queued",
      progress:  0,
      message:   activeCount >= concurrentJobs ? "waiting for slot..." : "queued",
      createdAt: Date.now(),
    };

    addJob(job);
    // useQueue hook akan otomatis pick up job ini dan jalankan kalau ada slot
  },
  [addJob]
);
```

**Hapus** semua logic `invoke`, `listen`, dan `setStatus` dari `startConversion` —
sekarang semua itu ada di `useQueue`.

---

## TASK 4 — Mount `useQueue` di `App.tsx`

Import dan panggil hook di root App agar queue processor aktif selama app berjalan:

```typescript
import { useQueue } from "@/hooks/useQueue";

export default function App() {
  useQueue(); // aktifkan queue processor
  // ... sisa kode sama
}
```

---

## TASK 5 — Update tampilan `QueueItem.tsx` untuk status `queued`

Saat job sedang menunggu slot, tampilkan posisi antrian yang informatif.
Tidak perlu perubahan besar — cukup update pesan di status `queued`:

```tsx
// Di bagian render file info / message:
{job.status === "queued" && (
  <p className="text-[10px] text-terminal-dim truncate mt-0.5">
    waiting for slot...
  </p>
)}
```

Status badge `queued` sudah ada di `StatusBadge.tsx` — tidak perlu diubah.

---

## TASK 6 — Buat `src/components/layout/QueueStatusBar.tsx`

Bar kecil di bawah header yang tampilkan info slot secara real-time:

```tsx
import { useConversionStore } from "@/store/conversionStore";
import { useSettingsStore } from "@/store/settingsStore";

export function QueueStatusBar() {
  const { jobs, activeCount }   = useConversionStore();
  const { settings, setConcurrentJobs } = useSettingsStore();

  const converting = jobs.filter((j) => j.status === "converting").length;
  const queued     = jobs.filter((j) => j.status === "queued").length;

  if (jobs.length === 0) return null;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 border border-terminal-border bg-terminal-card text-[9px] tracking-widest animate-fade-in">
      <div className="flex items-center gap-3 text-terminal-dim">
        <span>
          slots:{" "}
          <span className="text-terminal-accent">{converting}</span>
          /{settings.concurrentJobs} active
        </span>
        {queued > 0 && (
          <span>
            <span className="text-terminal-muted">{queued}</span> waiting
          </span>
        )}
      </div>

      {/* Concurrent job control */}
      <div className="flex items-center gap-2 text-terminal-dim">
        <span>concurrent:</span>
        <button
          onClick={() => setConcurrentJobs(settings.concurrentJobs - 1)}
          disabled={settings.concurrentJobs <= 1}
          className="w-5 h-5 border border-terminal-border hover:border-terminal-accent hover:text-terminal-accent transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          -
        </button>
        <span className="text-terminal-accent w-3 text-center">
          {settings.concurrentJobs}
        </span>
        <button
          onClick={() => setConcurrentJobs(settings.concurrentJobs + 1)}
          disabled={settings.concurrentJobs >= 4}
          className="w-5 h-5 border border-terminal-border hover:border-terminal-accent hover:text-terminal-accent transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          +
        </button>
      </div>
    </div>
  );
}
```

Tambahkan `QueueStatusBar` di `App.tsx` — letakkan di antara `OutputDirSelector` dan `ConversionQueue`:

```tsx
import { QueueStatusBar } from "@/components/layout/QueueStatusBar";

// di dalam return:
<OutputDirSelector />
<QueueStatusBar />
<ConversionQueue />
```

---

## Verifikasi

```powershell
npm run typecheck   # 0 errors
npm run build       # clean
npm run tauri dev   # app berjalan
```

Manual checklist:
```
✓ Drop 5 file sekaligus → hanya 2 yang langsung "converting", sisanya "waiting for slot..."
✓ Begitu 1 job selesai → job queued berikutnya otomatis mulai tanpa klik apapun
✓ QueueStatusBar tampil "slots: 2/2 active · 3 waiting"
✓ Klik tombol "+" di QueueStatusBar → concurrent naik ke 3, job queued langsung diambil
✓ Klik tombol "-" → concurrent turun ke 1
✓ Tidak bisa turun di bawah 1 atau naik di atas 4
✓ Setting concurrent persist setelah app di-restart
```

---

## Catatan untuk Gemini

- **Jangan ubah** `src/types/index.ts`, `src/store/conversionStore.ts`, komponen UI lain
- `useQueue` adalah satu-satunya tempat yang boleh invoke `convert_file` ke Rust
- `startConversion` di `useConversion.ts` setelah diubah hanya boleh memanggil `addJob` — tidak boleh ada `invoke` di dalamnya
- Semua job masuk sebagai `"queued"` dulu, `useQueue` yang promosikan ke `"converting"`
