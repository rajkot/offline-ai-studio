# Local Headless Browser & Visual Self-Correction Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a zero-download local headless browser agent engine in Offline AI Studio that uses system Edge/Chrome for live DOM auditing, visual screenshot capture, and runtime console error detection to power visual self-correction in the autonomous agent loop.

**Architecture:** `lib/ai/browserAgentEngine.ts` discovers existing system Edge/Chrome binaries on Windows and runs headless page captures, exposed via `/api/pipeline/browser-inspect` and integrated into `client/components/BrowserInspectorModal.tsx` and the agent loop.

**Tech Stack:** Next.js 15, TypeScript, Node.js child_process, Microsoft Edge / Google Chrome headless, Tailwind CSS, Lucide Icons.

**Spec:** [`superpowers/docs/superpowers/specs/2026-09-27-local-browser-agent-design.md`](file:///e:/offilne%20ide/offline-ai-ide%20%281%29/superpowers/docs/superpowers/specs/2026-09-27-local-browser-agent-design.md)

---

### Task 1: Browser Agent Engine Core Subsystem

**Files:**
- Create: `lib/ai/browserAgentEngine.ts`
- Test: `scripts/test-browser-agent.js`

- [ ] **Step 1: Write test script `scripts/test-browser-agent.js`**
- [ ] **Step 2: Run test script to verify failure**
- [ ] **Step 3: Implement `lib/ai/browserAgentEngine.ts`**
- [ ] **Step 4: Run test script to verify pass**
- [ ] **Step 5: Commit**

---

### Task 2: API Route `/api/pipeline/browser-inspect`

**Files:**
- Create: `app/api/pipeline/browser-inspect/route.ts`

- [ ] **Step 1: Implement `app/api/pipeline/browser-inspect/route.ts`**
- [ ] **Step 2: Test API endpoint against http://localhost:3000**
- [ ] **Step 3: Commit**

---

### Task 3: Visual Inspector Modal UI Component

**Files:**
- Create: `client/components/BrowserInspectorModal.tsx`
- Modify: `components/Playground.tsx` (add keyboard shortcut `Ctrl+Shift+B` or header button)

- [ ] **Step 1: Create `client/components/BrowserInspectorModal.tsx`**
- [ ] **Step 2: Register modal in `components/Playground.tsx`**
- [ ] **Step 3: Verify build / typecheck**
- [ ] **Step 4: Commit**
