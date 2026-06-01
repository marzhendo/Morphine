# Spesifikasi — Auto-Download Dependencies on First Run

## Ringkasan
Saat app pertama kali dibuka dan tool belum ada di `%APPDATA%\Morphine\tools\`,
app otomatis menawarkan download tools yang diperlukan langsung dari dalam UI —
tanpa user perlu keluar dari app atau install manual.

---

## URL Download Resmi

| Tool | URL | Ukuran |
|------|-----|--------|
| LibreOffice Portable | `https://download.documentfoundation.org/libreoffice/portable/24.8.4/LibreOfficePortable_24.8.4_MultilingualStandard.paf.exe` | ~213MB |
| ImageMagick portable | `https://imagemagick.org/archive/binaries/ImageMagick-7.1.1-43-portable-Q16-x64.zip` | ~30MB |
| Ghostscript portable | `https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10031/gs10031w64.exe` | ~50MB |

**Catatan penting:**
- LibreOffice → `.paf.exe` (PortableApps installer, harus dijalankan silent)
- ImageMagick → `.zip` (extract langsung ke `tools\ImageMagick\`)
- Ghostscript → `.exe` installer (jalankan silent dengan `/S /D=<path>`)

---

## Arsitektur

```
Frontend (React)
  ToolStatusBanner — deteksi missing tools → tampilkan tombol [download]
  DownloadProgressModal — modal progress per tool

Backend (Rust) — commands baru:
  download_tool(tool_name)  → stream progress events ke frontend
  install_tool(tool_name)   → extract/install setelah download selesai
```

---

## TASK 1 — Tambah error variant & download types di Rust

### `src-tauri/src/error.rs`
Tambahkan variant baru (jangan hapus yang sudah ada):
```rust
#[error("Download failed: {0}")]
DownloadFailed(String),

#[error("Install failed: {0}")]
InstallFailed(String),
```

### `src-tauri/src/types.rs`
Tambahkan struct baru:
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub tool:       String,
    pub percent:    u8,
    pub message:    String,
    pub bytes_done: u64,
    pub bytes_total: u64,
}
```

---

## TASK 2 — Tambah dependency ke `Cargo.toml`

```toml
reqwest  = { version = "0.12", features = ["stream", "rustls-tls"], default-features = false }
futures-util = "0.3"
zip      = "2.1"
```

---

## TASK 3 — Buat `src-tauri/src/downloader.rs`

Module baru yang handle download + install semua tools.

```rust
use std::path::{Path, PathBuf};
use std::process::Command;
use futures_util::StreamExt;
use tokio::fs;
use tokio::io::AsyncWriteExt;
use tauri::{AppHandle, Emitter};
use crate::error::MorphineError;
use crate::types::DownloadProgress;
use crate::utils::tool_registry::ToolRegistry;

const LO_URL: &str = "https://download.documentfoundation.org/libreoffice/portable/24.8.4/LibreOfficePortable_24.8.4_MultilingualStandard.paf.exe";
const IM_URL: &str = "https://imagemagick.org/archive/binaries/ImageMagick-7.1.1-43-portable-Q16-x64.zip";
const GS_URL: &str = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs10031/gs10031w64.exe";

pub async fn download_and_install(
    app: AppHandle,
    tool_name: String,
) -> Result<(), MorphineError> {
    let tools_dir = ToolRegistry::tools_dir_pub();
    fs::create_dir_all(&tools_dir).await?;

    let (url, filename) = match tool_name.as_str() {
        "libreoffice"  => (LO_URL, "lo-installer.paf.exe"),
        "imagemagick"  => (IM_URL, "imagemagick.zip"),
        "ghostscript"  => (GS_URL, "gs-installer.exe"),
        _ => return Err(MorphineError::DownloadFailed(format!("Unknown tool: {}", tool_name))),
    };

    let temp_path = tools_dir.join(filename);

    // Download dengan progress streaming
    emit_progress(&app, &tool_name, 0, "Starting download...", 0, 0);
    download_file(url, &temp_path, &app, &tool_name).await?;

    // Install
    emit_progress(&app, &tool_name, 95, "Installing...", 0, 0);
    install_tool(&tool_name, &temp_path, &tools_dir).await?;

    // Cleanup temp file
    fs::remove_file(&temp_path).await.ok();

    emit_progress(&app, &tool_name, 100, "Done", 0, 0);
    Ok(())
}

async fn download_file(
    url: &str,
    dest: &Path,
    app: &AppHandle,
    tool_name: &str,
) -> Result<(), MorphineError> {
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| MorphineError::DownloadFailed(e.to_string()))?;

    let total = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut file = tokio::fs::File::create(dest).await?;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| MorphineError::DownloadFailed(e.to_string()))?;
        file.write_all(&chunk).await?;
        downloaded += chunk.len() as u64;

        let percent = if total > 0 {
            ((downloaded as f64 / total as f64) * 90.0) as u8
        } else {
            0
        };

        let mb_done  = downloaded / 1_048_576;
        let mb_total = total / 1_048_576;
        emit_progress(
            app, tool_name, percent,
            &format!("Downloading... {}MB / {}MB", mb_done, mb_total),
            downloaded, total,
        );
    }

    Ok(())
}

async fn install_tool(
    tool_name: &str,
    installer: &Path,
    tools_dir: &PathBuf,
) -> Result<(), MorphineError> {
    match tool_name {
        "libreoffice" => {
            // LibreOffice PortableApps: jalankan dengan /DESTINATION flag
            let dest = tools_dir.to_string_lossy().to_string();
            let status = Command::new(installer)
                .args(["/DESTINATION", &dest, "/SILENT"])
                .status()
                .map_err(|e| MorphineError::InstallFailed(e.to_string()))?;
            if !status.success() {
                return Err(MorphineError::InstallFailed("LibreOffice installer failed".into()));
            }
        }
        "imagemagick" => {
            // ImageMagick: extract ZIP ke tools\ImageMagick\
            let dest = tools_dir.join("ImageMagick");
            std::fs::create_dir_all(&dest)?;
            let file = std::fs::File::open(installer)?;
            let mut archive = zip::ZipArchive::new(file)
                .map_err(|e| MorphineError::InstallFailed(e.to_string()))?;
            archive.extract(&dest)
                .map_err(|e| MorphineError::InstallFailed(e.to_string()))?;
        }
        "ghostscript" => {
            // Ghostscript: silent install ke tools\Ghostscript\
            let dest = tools_dir.join("Ghostscript").to_string_lossy().to_string();
            let status = Command::new(installer)
                .args(["/S", &format!("/D={}", dest)])
                .status()
                .map_err(|e| MorphineError::InstallFailed(e.to_string()))?;
            if !status.success() {
                return Err(MorphineError::InstallFailed("Ghostscript installer failed".into()));
            }
        }
        _ => {}
    }
    Ok(())
}

fn emit_progress(
    app: &AppHandle,
    tool: &str,
    percent: u8,
    message: &str,
    bytes_done: u64,
    bytes_total: u64,
) {
    app.emit("tool:download-progress", crate::types::DownloadProgress {
        tool:        tool.to_string(),
        percent,
        message:     message.to_string(),
        bytes_done,
        bytes_total,
    }).ok();
}
```

---

## TASK 4 — Tambah `tools_dir_pub()` ke `ToolRegistry`

Di `src-tauri/src/utils/tool_registry.rs`, tambahkan method public:
```rust
pub fn tools_dir_pub() -> PathBuf {
    Self::tools_dir()
}
```

---

## TASK 5 — Tambah Tauri command di `commands/mod.rs`

```rust
#[tauri::command]
pub async fn download_tool(
    app: tauri::AppHandle,
    tool_name: String,
) -> Result<(), String> {
    crate::downloader::download_and_install(app, tool_name)
        .await
        .map_err(|e| e.to_string())
}
```

Daftarkan di `lib.rs` / `main.rs`:
```rust
.invoke_handler(tauri::generate_handler![
    commands::convert_file,
    commands::cancel_conversion,
    commands::get_tool_status,
    commands::download_tool,   // ← tambahkan ini
])
```

Tambahkan di `src/lib.rs` atau `src/main.rs`:
```rust
mod downloader;
```

---

## TASK 6 — Tambah network permission di `capabilities/default.json`

```json
{
  "permissions": [
    "core:default",
    "shell:allow-open",
    "dialog:allow-open",
    "http:default"
  ]
}
```

Tambahkan plugin http di `Cargo.toml`:
```toml
tauri-plugin-http = "2.0.0"
```

Dan init di `lib.rs`:
```rust
.plugin(tauri_plugin_http::init())
```

---

## TASK 7 — Frontend: hook `useToolDownload.ts`

Buat `src/hooks/useToolDownload.ts`:

```typescript
import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";

export interface ToolDownloadProgress {
  tool:        string;
  percent:     number;
  message:     string;
  bytes_done:  number;
  bytes_total: number;
}

export type DownloadState = "idle" | "downloading" | "done" | "error";

export function useToolDownload() {
  const queryClient = useQueryClient();
  const [states, setStates] = useState<Record<string, DownloadState>>({});
  const [progress, setProgress] = useState<Record<string, ToolDownloadProgress>>({});

  const downloadTool = useCallback(async (toolName: string) => {
    setStates((s) => ({ ...s, [toolName]: "downloading" }));

    const unlisten = await listen<ToolDownloadProgress>(
      "tool:download-progress",
      (event) => {
        if (event.payload.tool === toolName) {
          setProgress((p) => ({ ...p, [toolName]: event.payload }));
        }
      }
    );

    try {
      await invoke("download_tool", { toolName });
      setStates((s) => ({ ...s, [toolName]: "done" }));
      // Refresh tool status setelah install selesai
      queryClient.invalidateQueries({ queryKey: ["tool-status"] });
    } catch (err) {
      setStates((s) => ({ ...s, [toolName]: "error" }));
    } finally {
      unlisten();
    }
  }, [queryClient]);

  return { downloadTool, states, progress };
}
```

---

## TASK 8 — Frontend: Replace `ToolStatusBanner.tsx`

Ganti seluruh isi `src/components/layout/ToolStatusBanner.tsx`:

```tsx
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
```

---

## Verifikasi

```powershell
cargo check              # 0 errors, 0 warnings
npm run typecheck        # 0 type errors
npm run build            # clean
npm run tauri dev        # app berjalan
```

Manual checklist:
```
✓ Buka app dengan tools missing → banner tampil dengan tombol [download] per tool
✓ Klik [download] ImageMagick → progress bar muncul, download berjalan
✓ Download selesai → "[installed ✓]" tampil, tool pill di header update ke "IM:ok"
✓ Banner hilang otomatis setelah semua tools terinstall
✓ Klik [download] LibreOffice → installer berjalan silent, tidak ada window popup
✓ Restart app → tools masih terdeteksi (persist di %APPDATA%)
✓ Simulasi download gagal (disconnect internet) → "[download failed]" + [retry] muncul
```

---

## Catatan untuk Gemini

- **Jangan ubah** `converter/office.rs`, `converter/image.rs`, `commands/mod.rs` (kecuali tambah command baru), store, hooks selain yang disebutkan
- `downloader.rs` adalah module Rust baru — letakkan di `src-tauri/src/downloader.rs` dan daftarkan di `lib.rs` sebagai `mod downloader`
- `reqwest` harus pakai fitur `stream` agar bisa streaming progress — jangan pakai `.bytes()` langsung
- LibreOffice `.paf.exe` flag silentnya adalah `/SILENT /DESTINATION="<path>"` — urutan argumen penting
- Ghostscript flag silentnya adalah `/S /D=<path>` — tidak ada spasi antara `/D=` dan path
- Semua download dan install harus async (tokio) — jangan blocking thread
