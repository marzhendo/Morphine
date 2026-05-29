# Workflow: Review
> Use this workflow before merging any code or marking a task as complete.

---

## Purpose
The Review workflow is a structured checklist to catch bugs, rule violations,
and UX gaps **before** they reach the main branch or the user.

An agent must run this workflow on its own output before declaring a task done.

---

## When to Use This Workflow
- After completing implementation of a feature or fix
- Before opening a pull request
- When reviewing another agent's or developer's output
- After any change to `tauri.conf.json`, `Cargo.toml`, or `package.json`

---

## Review Checklist

### 🏗️ Architecture & Rules Compliance
- [ ] All conversion logic is in Rust (`src-tauri/src/converter/`) — none in the frontend
- [ ] No hardcoded file paths — uses `ToolRegistry` and Tauri path APIs
- [ ] No network calls for file processing
- [ ] No `.unwrap()` or `.expect()` in production Rust code
- [ ] External tool paths resolved via `ToolRegistry`, not assumed
- [ ] Temp files are cleaned up in both success and error paths
- [ ] No new `TODO` comments left in code

### 🔄 Conversion Logic
- [ ] Input file existence is validated before conversion starts
- [ ] Input format is validated (not just by extension — check MIME or magic bytes if possible)
- [ ] Output path does not silently overwrite existing files (prompt or suffix)
- [ ] Progress events are emitted at meaningful intervals
- [ ] Cancellation is handled gracefully (process killed, temp files cleaned)
- [ ] Error messages are human-readable (not raw Rust errors or tool stderr)

### ⚛️ Frontend
- [ ] All Tauri commands are called with proper TypeScript types
- [ ] Loading, success, and error states are all handled in UI
- [ ] No `any` types introduced
- [ ] Drag & drop uses Tauri file drop API
- [ ] New components follow existing naming conventions
- [ ] Tailwind only — no inline styles added

### 🧪 Testing
- [ ] At least one unit test covers the happy path for new Rust code
- [ ] Test fixture files exist in `src-tauri/tests/fixtures/`
- [ ] Tests pass locally: `cargo test` returns green
- [ ] Frontend smoke test exists for new components: `npm test` returns green
- [ ] No tests were deleted or disabled

### 🔐 Security & Privacy
- [ ] No file contents logged anywhere
- [ ] File paths in any logs are redacted to filename only
- [ ] No new external network calls introduced
- [ ] `tauri.conf.json` permissions unchanged (if changed — document why)

### 🎨 UX
- [ ] User gets clear feedback when conversion succeeds (file path shown, open button)
- [ ] User gets clear feedback when conversion fails (readable error, not a crash)
- [ ] Batch conversion shows per-file progress, not just total
- [ ] App does not freeze during conversion (async, non-blocking UI)

---

## How to Handle Review Failures

| Severity | Examples | Action |
|----------|----------|--------|
| 🔴 Blocker | Hardcoded path, `.unwrap()` in prod, network call, test deleted | Fix before proceeding |
| 🟡 Warning | Missing error state in UI, TODO left in code | Fix or create tracked issue |
| 🟢 Suggestion | Style inconsistency, minor UX improvement | Optional, note in PR |

---

## Sign-Off
After all blockers and warnings are resolved, mark the review as complete by
appending to the relevant plan file:

```
## Review Sign-Off
- Date: YYYY-MM-DD
- Reviewed by: [agent name / human]
- Result: APPROVED / APPROVED WITH NOTES
- Notes: ...
```
