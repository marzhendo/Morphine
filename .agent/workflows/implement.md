# Workflow: Implement
> Use this workflow when writing actual code for a planned task.

---

## Purpose
The Implement workflow provides a consistent, ordered sequence for writing code
in Morphine. Following this order prevents half-baked features, missed error
handling, and frontend/backend mismatches.

**Prerequisites:** `plan.md` workflow must be completed before starting here.

---

## Implementation Order (Always Follow This Sequence)

```
1. Types & Interfaces
2. Rust Backend (Command + Converter)
3. Tauri IPC Bridge
4. Frontend Hook / Store
5. UI Component
6. Tests
7. Manual Smoke Test
```

Never jump ahead. Never write the UI before the backend is working.

---

## Step-by-Step

### Step 1 — Define Types First
Before writing any logic, define the shared data shapes.

**In Rust** (`src-tauri/src/types.rs` or per-module):
```rust
#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionJob {
    pub id: String,
    pub input_path: String,
    pub output_path: String,
    pub input_format: FileFormat,
    pub output_format: FileFormat,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionProgress {
    pub job_id: String,
    pub percent: u8,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversionResult {
    pub job_id: String,
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
}
```

**In TypeScript** (`src/types/conversion.ts`) — mirror the Rust types exactly:
```typescript
export interface ConversionJob {
  id: string;
  inputPath: string;
  outputPath: string;
  inputFormat: FileFormat;
  outputFormat: FileFormat;
}

export interface ConversionProgress {
  jobId: string;
  percent: number;
  message: string;
}

export interface ConversionResult {
  jobId: string;
  success: boolean;
  outputPath?: string;
  error?: string;
}
```

---

### Step 2 — Rust Converter Module
Create `src-tauri/src/converter/<format_group>.rs`.

Template:
```rust
use std::path::Path;
use tokio::process::Command;
use crate::utils::tool_registry::ToolRegistry;
use crate::error::MorphineError;
use crate::types::{ConversionJob, ConversionProgress};

pub async fn convert(
    job: &ConversionJob,
    progress_tx: tokio::sync::mpsc::Sender<ConversionProgress>,
) -> Result<String, MorphineError> {
    // 1. Validate input file exists
    if !Path::new(&job.input_path).exists() {
        return Err(MorphineError::InputNotFound(job.input_path.clone()));
    }

    // 2. Resolve tool path
    let tool_path = ToolRegistry::get("libreoffice")?;

    // 3. Emit initial progress
    let _ = progress_tx.send(ConversionProgress {
        job_id: job.id.clone(),
        percent: 0,
        message: "Starting conversion...".into(),
    }).await;

    // 4. Spawn external tool
    let output = Command::new(&tool_path)
        .args(&["--headless", "--convert-to", "pdf", &job.input_path])
        .output()
        .await
        .map_err(|e| MorphineError::ToolFailed(e.to_string()))?;

    // 5. Check result
    if !output.status.success() {
        return Err(MorphineError::ConversionFailed(
            String::from_utf8_lossy(&output.stderr).to_string()
        ));
    }

    // 6. Emit completion
    let _ = progress_tx.send(ConversionProgress {
        job_id: job.id.clone(),
        percent: 100,
        message: "Done".into(),
    }).await;

    Ok(job.output_path.clone())
}
```

---

### Step 3 — Tauri IPC Command
Add command in `src-tauri/src/commands/<format_group>.rs`:

```rust
#[tauri::command]
pub async fn convert_docx_to_pdf(
    app: tauri::AppHandle,
    job: ConversionJob,
) -> Result<ConversionResult, String> {
    let (tx, mut rx) = tokio::sync::mpsc::channel(32);

    // Forward progress events to frontend
    let app_clone = app.clone();
    let job_id = job.id.clone();
    tokio::spawn(async move {
        while let Some(progress) = rx.recv().await {
            app_clone.emit("conversion:progress", &progress).ok();
        }
    });

    match crate::converter::office::convert(&job, tx).await {
        Ok(output_path) => Ok(ConversionResult {
            job_id,
            success: true,
            output_path: Some(output_path),
            error: None,
        }),
        Err(e) => Ok(ConversionResult {
            job_id,
            success: false,
            output_path: None,
            error: Some(e.to_string()),
        }),
    }
}
```

Register the command in `main.rs`:
```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        commands::office::convert_docx_to_pdf,
        // ... other commands
    ])
```

---

### Step 4 — Frontend Hook
Create `src/hooks/useConversion.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useConversionStore } from '@/store/conversionStore';
import type { ConversionJob, ConversionProgress, ConversionResult } from '@/types/conversion';

export function useConversion() {
  const { updateProgress, setResult } = useConversionStore();

  const startConversion = async (job: ConversionJob) => {
    // Listen for progress events
    const unlisten = await listen<ConversionProgress>('conversion:progress', (event) => {
      if (event.payload.jobId === job.id) {
        updateProgress(job.id, event.payload);
      }
    });

    try {
      const result = await invoke<ConversionResult>('convert_docx_to_pdf', { job });
      setResult(job.id, result);
    } finally {
      unlisten();
    }
  };

  return { startConversion };
}
```

---

### Step 5 — UI Component
- Keep components small and focused — one responsibility per component
- Component receives data via props, calls hooks for actions
- Always show all three states: loading, success, error
- Use existing design tokens from `tailwind.config.ts`

Example structure:
```
ConversionQueue/
  index.tsx           ← orchestrator
  QueueItem.tsx       ← single file row
  ProgressBar.tsx     ← reusable progress
  StatusBadge.tsx     ← idle/converting/done/error
```

---

### Step 6 — Write Tests

**Rust unit test** (in same file, at bottom):
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_docx_to_pdf_happy_path() {
        let job = ConversionJob {
            id: "test-1".into(),
            input_path: "tests/fixtures/sample.docx".into(),
            output_path: "/tmp/morphine-test-output.pdf".into(),
            input_format: FileFormat::Docx,
            output_format: FileFormat::Pdf,
        };
        let (tx, _rx) = tokio::sync::mpsc::channel(32);
        let result = convert(&job, tx).await;
        assert!(result.is_ok());
    }
}
```

**Frontend smoke test** (`src/components/ConversionQueue.test.tsx`):
```typescript
import { render, screen } from '@testing-library/react';
import { QueueItem } from './QueueItem';

test('shows filename and idle status by default', () => {
  render(<QueueItem filename="document.docx" status="idle" />);
  expect(screen.getByText('document.docx')).toBeInTheDocument();
  expect(screen.getByText(/idle/i)).toBeInTheDocument();
});
```

---

### Step 7 — Manual Smoke Test
Before marking done, test manually on Windows:

```
✓ Drop a real .docx file into the app
✓ Select PDF as output format
✓ Click convert
✓ Progress bar moves
✓ Output file appears in correct folder
✓ Output file opens correctly in a PDF reader
✓ Try with a corrupted file — app shows error, does not crash
✓ Try cancelling mid-conversion — no temp files left behind
```

---

## When You're Done
Switch to `review.md` workflow and run the full checklist before closing the task.
