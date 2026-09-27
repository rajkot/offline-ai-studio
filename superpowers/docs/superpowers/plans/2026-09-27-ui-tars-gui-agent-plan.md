# UI-TARS Computer-Use & Desktop GUI Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate ByteDance's UI-TARS Computer-Use agent into Offline AI Studio by cloning the official repository into `integrations/ui-tars`, building a native action parsing & coordinate scaling engine (`lib/ai/uiTarsEngine.ts`), providing an API route (`app/api/automation/ui-tars/`), and creating an interactive Studio Modal (`client/components/UiTarsStudioModal.tsx`).

**Architecture:** A native TypeScript engine parses UI-TARS vision-language model action syntax (`click`, `type`, `hotkey`, `scroll`, `finished`), normalizes coordinates from 0..1000 space to screen pixels, intercepts dangerous system operations with a safety policy, and executes actions with visual crosshair feedback.

**Tech Stack:** TypeScript, Next.js App Router, React 19, Lucide Icons, Tailwind CSS, Playwright.

**Spec:** `superpowers/docs/superpowers/specs/2026-09-27-ui-tars-gui-agent-design.md`

## Global Constraints
- Normalized coordinate space is 0..1000 for both X and Y.
- Dangerous OS commands (alt+f4, raw format, shutdown) must be intercepted by the safety policy.
- Zero mandatory external network calls for grammar parsing or coordinate mapping.

## Review Focus
1. Malformed model output: Handle messy VLM responses without crashing.
2. Coordinate bounds: Ensure coordinates never exceed screen dimensions or go negative.
3. Multi-monitor / resolution shifts: Properly scale based on target viewport.

---

### Task 1: Clone Official UI-TARS Repository into `integrations/ui-tars`

**Files:**
- Directory: `integrations/ui-tars`

- [ ] **Step 1: Clone `bytedance/UI-TARS` with depth 1**
Run: `git -c http.sslBackend=openssl clone --depth 1 https://github.com/bytedance/UI-TARS.git integrations/ui-tars`

- [ ] **Step 2: Verify cloned repository structure**
Verify `integrations/ui-tars/README.md` exists.

- [ ] **Step 3: Commit integration tracking**
Commit git progress.

---

### Task 2: Core UI-TARS Action Engine & Coordinate Normalizer

**Files:**
- Create: `lib/ai/uiTarsEngine.ts`
- Test: `scripts/test-ui-tars-engine.js`

- [ ] **Step 1: Write failing unit test `scripts/test-ui-tars-engine.js`**
Tests action parsing (`click(point=[500, 320])`, `type(content="admin")`), coordinate scaling (500/1000 on 1920x1080 -> 960x345), and safety guard.

- [ ] **Step 2: Run test to verify it fails**
Run: `node scripts/test-ui-tars-engine.js`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement `UiTarsEngine` in `lib/ai/uiTarsEngine.ts`**
Implement regex grammar parser, coordinate scaler, and safety policy.

- [ ] **Step 4: Run test to verify it passes**
Run: `npx tsx scripts/test-ui-tars-engine.js`
Expected: PASS with 100% assertions green.

- [ ] **Step 5: Commit**
```bash
git add lib/ai/uiTarsEngine.ts scripts/test-ui-tars-engine.js
git commit -m "feat(ui-tars): implement ui-tars action parser and coordinate scaling engine"
```

---

### Task 3: Backend UI-TARS API Route

**Files:**
- Create: `app/api/automation/ui-tars/route.ts`
- Test: `scripts/test-ui-tars-api.js`

- [ ] **Step 1: Write failing test `scripts/test-ui-tars-api.js`**
Tests POST `/api/automation/ui-tars` for actions parse, scale, and validate.

- [ ] **Step 2: Run test to verify it fails**
Run: `node scripts/test-ui-tars-api.js`
Expected: FAIL with 404.

- [ ] **Step 3: Implement route in `app/api/automation/ui-tars/route.ts`**
Handle parse, scale, validate, and execute requests.

- [ ] **Step 4: Run test to verify it passes**
Run: `node scripts/test-ui-tars-api.js`
Expected: PASS with 200 OK.

- [ ] **Step 5: Commit**
```bash
git add app/api/automation/ui-tars/route.ts scripts/test-ui-tars-api.js
git commit -m "feat(api): implement ui-tars automation api endpoint"
```

---

### Task 4: UI-TARS Studio Modal UI & Toolbar Trigger

**Files:**
- Create: `client/components/UiTarsStudioModal.tsx`
- Modify: `client/components/LiveWebviewSplitPane.tsx` (add UI-TARS trigger button)

- [ ] **Step 1: Implement `UiTarsStudioModal.tsx`**
Add live canvas with red target crosshair overlay, action timeline, and execution controls.

- [ ] **Step 2: Wire into workbench navigation**
Add "🎯 UI-TARS" button to toolbar.

- [ ] **Step 3: Verify TypeScript compilation and test suites**
Run: `npx tsx scripts/test-ui-tars-engine.js && node scripts/test-ui-tars-api.js`
Expected: All tests pass.

- [ ] **Step 4: Commit**
```bash
git add client/components/UiTarsStudioModal.tsx client/components/LiveWebviewSplitPane.tsx
git commit -m "feat(ui): add UiTarsStudioModal with live crosshair overlay and action runner"
```
