# Workflow: Plan
> Use this workflow when starting a new feature, epic, or bug fix.

---

## Purpose
The Plan workflow forces structured thinking **before** writing any code.
An agent that skips planning ships the wrong thing fast.

---

## When to Use This Workflow
- A new feature or conversion format is being added
- A bug requires understanding root cause before fixing
- Refactoring a module that affects multiple components
- Any task that touches both the Rust backend and React frontend

---

## Step-by-Step

### Step 1 — Understand the Task
Answer these questions in writing before proceeding:

```
- What exactly needs to be built or fixed?
- Who triggers this? (User action? System event? Scheduled?)
- What is the expected input and output?
- What does "done" look like for the user?
```

### Step 2 — Read the Rules
Open `.antigravity/rules.md` and confirm:
- [ ] The task aligns with the MVP scope
- [ ] No rules will be violated by the implementation
- [ ] The correct external tool is used for this conversion type

### Step 3 — Map the Data Flow
Trace the full path of the operation:

```
User Action (UI)
  → Tauri IPC Command (frontend invoke)
    → Rust Command Handler (src-tauri/src/commands/)
      → Converter Module (src-tauri/src/converter/)
        → External Tool (LibreOffice / ImageMagick / Ghostscript)
          → Output File
            → Progress Event emitted
              → UI updates
```

Write out which files will be **created**, **modified**, or **deleted**.

### Step 4 — Identify Risks & Unknowns
List anything uncertain:
- Does the external tool handle edge cases (password-protected files, corrupted input)?
- Are there file size limits to consider?
- Does the output format have quality/compression options the user should control?

### Step 5 — Break Into Subtasks
Split the work into small, independently testable chunks:

```markdown
## Subtasks
- [ ] Add Rust converter module for [format]
- [ ] Add Tauri IPC command `convert_[format]`
- [ ] Add frontend invoke call with progress listener
- [ ] Add UI state for this conversion (idle → progress → done/error)
- [ ] Write fixture file + unit test
- [ ] Manual smoke test on Windows
```

### Step 6 — Confirm Before Coding
Do not start implementing until the plan has been reviewed.
Use `review.md` workflow if another agent or human needs to sign off.

---

## Output Format
Save your plan as a comment at the top of the relevant GitHub issue or as
`.agent/plans/YYYY-MM-DD-<feature-slug>.md` before switching to `implement.md`.
