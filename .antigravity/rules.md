# Morphine — Agent Rules
> Transform anything, instantly.

These rules are **mandatory** for any AI agent working on this codebase.
Read this file completely before touching any code.

---

## 🧬 Project Identity

| Key | Value |
|-----|-------|
| **Name** | Morphine |
| **Tagline** | Transform anything, instantly. |
| **Type** | Windows Desktop Application |
| **Stack** | Tauri v2 + React (TypeScript) + Rust |
| **Purpose** | Local, offline file format conversion — no uploads, no cloud, no tracking |

---

## 🏗️ Architecture Overview

```
morphine/
├── src/                  # React frontend (TypeScript)
│   ├── components/       # UI components
│   ├── hooks/            # Custom React hooks
│   ├── store/            # State management (Zustand)
│   ├── types/            # Shared TypeScript types
│   └── main.tsx
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/     # Tauri IPC command handlers
│   │   ├── converter/    # Conversion logic per format group
│   │   └── utils/
│   ├── Cargo.toml
│   └── tauri.conf.json
├── .antigravity/
│   └── rules.md          # ← You are here
└── .agent/
    └── workflows/
        ├── plan.md
        ├── review.md
        └── implement.md
```

---

## 📐 Strict Coding Rules

### General
- **Never** hardcode file paths — always use Tauri's path API or config
- **Never** process files in the frontend — all conversion logic lives in Rust (`src-tauri`)
- **Never** send file contents over the network — this app is 100% offline
- **Always** handle errors explicitly; no silent failures
- **Always** emit progress events via Tauri's event system during long operations

### Rust (Backend)
- Use `thiserror` for custom error types — no `.unwrap()` in production code
- Conversion commands must be async and cancellable
- Spawn external tools (LibreOffice, FFmpeg, ImageMagick) via `tokio::process::Command`
- Validate input file existence and format before starting conversion
- Clean up temp files in all code paths (success AND error)

### React/TypeScript (Frontend)
- Use **Zustand** for global state (conversion queue, settings)
- Use **React Query (TanStack Query)** for async Tauri command calls
- Components must be typed — no `any`
- UI must reflect every state: idle, loading, progress, success, error
- Drag & drop must use the native Tauri file drop API, not browser drag events

### Styling
- Use **Tailwind CSS** — no inline styles, no CSS modules
- Dark mode is the default theme
- Follow the design tokens defined in `tailwind.config.ts`

---

## 🔄 Supported Conversions (MVP)

| Input | Output | Engine |
|-------|--------|--------|
| `.docx` | `.pdf` | LibreOffice headless |
| `.pdf` | `.docx` | LibreOffice headless |
| `.xlsx` | `.pdf` | LibreOffice headless |
| `.pptx` | `.pdf` | LibreOffice headless |
| `.jpg/.jpeg` | `.png`, `.webp`, `.bmp`, `.pdf` | ImageMagick |
| `.png` | `.jpg`, `.webp`, `.bmp`, `.pdf` | ImageMagick |
| `.webp` | `.jpg`, `.png`, `.bmp`, `.pdf` | ImageMagick |
| `.bmp` | `.jpg`, `.png`, `.webp`, `.pdf` | ImageMagick |
| `.pdf` | `.jpg`, `.png` | Ghostscript + ImageMagick |

---

## 📦 External Dependencies

These tools are **not bundled** in the repo. They are downloaded on first run and stored in `%APPDATA%\Morphine\tools\`.

| Tool | Purpose | Source |
|------|---------|--------|
| LibreOffice Portable | Office ↔ PDF | portableapps.com |
| ImageMagick (portable) | Image conversion | imagemagick.org |
| Ghostscript | PDF → Image | ghostscript.com |

- The agent **must not** assume these tools exist at any fixed system path
- Always resolve tool paths via the `ToolRegistry` module in `src-tauri/src/utils/tool_registry.rs`

---

## 🧪 Testing Rules

- Every Rust conversion function must have at least one unit test with a sample file
- Test files live in `src-tauri/tests/fixtures/`
- Frontend components must have Vitest + Testing Library smoke tests
- **Never** skip tests to ship faster — write the test first if possible

---

## 🔐 Privacy & Security Rules

- **Zero telemetry** — no analytics, no crash reporting to external services
- Do not log file contents or file paths to any external service
- Temp files must be written to the OS temp directory and cleaned up immediately after conversion
- File paths in logs must be redacted to filename only (no full path)

---

## 🚫 Things the Agent Must Never Do

- Do NOT refactor working code unless the current task explicitly requires it
- Do NOT install new dependencies without documenting why in the PR/commit message
- Do NOT change `tauri.conf.json` permissions without a security justification
- Do NOT implement features outside the current workflow task scope
- Do NOT leave `TODO` comments — either implement it or open a tracked issue

---

## ✅ Definition of Done

A task is complete only when:
1. Feature works end-to-end (Rust command + React UI)
2. Error states are handled and shown to user
3. Progress events are emitted and displayed
4. Temp files are cleaned up
5. At least one test covers the happy path
6. No TypeScript or Rust compiler warnings
