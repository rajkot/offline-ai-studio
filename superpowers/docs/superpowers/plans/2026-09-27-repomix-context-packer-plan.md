# Repomix Codebase Context Packer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Repomix into Offline AI Studio by cloning the official repository into `integrations/repomix`, creating a native in-memory packing engine (`lib/ai/repomixEngine.ts`), building an API endpoint (`app/api/repomix/pack`), and delivering an interactive Studio Modal (`client/components/RepomixStudioModal.tsx`).

**Architecture:** A native TypeScript engine parses workspace files, strips secrets and binaries, estimates tokens, and serializes code into XML, Markdown, or JSON. The studio UI provides real-time telemetry, token budgeting, and 1-click clipboard/file export.

**Tech Stack:** TypeScript, Next.js App Router, React 19, Lucide Icons, Tailwind CSS, Git.

**Spec:** `superpowers/docs/superpowers/specs/2026-09-27-repomix-context-packer-design.md`

## Global Constraints
- Zero mandatory external network calls at runtime: The engine must run 100% in-memory and air-gapped.
- Secret redaction must scrub high-entropy API keys before output is presented or saved.
- File outputs must support XML (Claude), Markdown (Ollama), and JSON (Tool context).

## Review Focus
1. Secret leaking: Ensure `.env` tokens, AWS keys, and Bearer tokens are scrubbed.
2. Token truncation: When token budget is exceeded, ensure files are truncated cleanly with notice.
3. Path normalization: Forward slashes across Windows and POSIX.

---

### Task 1: Clone Official Repomix Repository into `integrations/repomix`

**Files:**
- Directory: `integrations/repomix`

- [ ] **Step 1: Clone `yamadashy/repomix` with depth 1**
Run: `git clone --depth 1 https://github.com/yamadashy/repomix.git integrations/repomix`

- [ ] **Step 2: Verify cloned integration files**
Check `integrations/repomix/package.json` exists.

- [ ] **Step 3: Commit integration tracking**
```bash
git add integrations/repomix
git commit -m "feat(integrations): clone official yamadashy/repomix repository"
```

---

### Task 2: Core Repomix In-Memory Engine & Secret Shield

**Files:**
- Create: `lib/ai/repomixEngine.ts`
- Test: `scripts/test-repomix-engine.js`

- [ ] **Step 1: Write failing unit test `scripts/test-repomix-engine.js`**
Tests XML, Markdown, JSON packing, secret redaction (`sk-ant-1234567890abcdef`), and token budgeting.

- [ ] **Step 2: Run test to verify it fails**
Run: `node scripts/test-repomix-engine.js`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `RepomixEngine` in `lib/ai/repomixEngine.ts`**
Implement serializers, regex secret detection, and BPE token counter.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx tsx scripts/test-repomix-engine.js`
Expected: PASS with 100% assertions green.

- [ ] **Step 5: Commit**
```bash
git add lib/ai/repomixEngine.ts scripts/test-repomix-engine.js
git commit -m "feat(repomix): implement in-memory repomix engine with secret redaction"
```

---

### Task 3: Backend Repomix API Route

**Files:**
- Create: `app/api/repomix/pack/route.ts`
- Test: `scripts/test-repomix-api.js`

- [ ] **Step 1: Write failing test `scripts/test-repomix-api.js`**
Tests POST `/api/repomix/pack` returning valid packed output and metrics.

- [ ] **Step 2: Run test to verify it fails**
Run: `node scripts/test-repomix-api.js`
Expected: FAIL with 404.

- [ ] **Step 3: Implement route in `app/api/repomix/pack/route.ts`**
Loads project files via `localFileSystemEngine` and serializes through `repomixEngine`.

- [ ] **Step 4: Run test to verify it passes**
Run: `node scripts/test-repomix-api.js`
Expected: PASS with 200 OK and valid packed context.

- [ ] **Step 5: Commit**
```bash
git add app/api/repomix/pack/route.ts scripts/test-repomix-api.js
git commit -m "feat(api): implement repomix pack endpoint"
```

---

### Task 4: Repomix Studio Modal UI & Workbench Trigger

**Files:**
- Create: `client/components/RepomixStudioModal.tsx`
- Modify: `client/components/LiveWebviewSplitPane.tsx` (add Repomix launch button)

- [ ] **Step 1: Implement `RepomixStudioModal.tsx`**
Add format toggle, token budget selector, live telemetry cards, syntax viewer, and copy/download buttons.

- [ ] **Step 2: Wire into workbench navigation**
Add "📦 Repomix Packer" button to toolbar.

- [ ] **Step 3: Verify TypeScript compilation**
Run: `npx tsx scripts/test-repomix-engine.js && node scripts/test-repomix-api.js`
Expected: All tests pass.

- [ ] **Step 4: Commit**
```bash
git add client/components/RepomixStudioModal.tsx client/components/LiveWebviewSplitPane.tsx
git commit -m "feat(ui): add RepomixStudioModal with live telemetry and context export"
```
