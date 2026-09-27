# Smart Macro Automation & Web/CRM Auto-Filler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Smart Macro Automation Subsystem in Offline AI Studio that automates online forms and CRM workflows using Playwright DOM harvesting, NanoJev 15ms semantic candidate selection, and an editable `.macro.json` side-by-side Monaco studio panel.

**Architecture:** A TypeScript-driven automation core (`lib/automation/smartMacroEngine.ts`) interacts with local Edge/Chrome via Playwright to extract accessible interactive elements. Element candidates are scored in sub-15ms using NanoJev logits classification (`lib/ai/nanoJevEngine.ts`). Macros are saved as `.macro.json` and executed over CSV/JSON datasets with real-time SSE streaming to the `SmartMacroStudio.tsx` visual workbench.

**Tech Stack:** TypeScript, Next.js App Router (SSE Streaming API), Playwright Core, NanoJev Parallel Decision Engine, React 19, Monaco Editor, Tailwind CSS.

**Spec:** `superpowers/docs/superpowers/specs/2026-09-27-smart-macro-automation-design.md`

## Global Constraints
- Target Node v20+ / Node v24 runtime with Windows pwsh shell compatibility.
- Zero external cloud AI latency or cost: All semantic decisions must use local `NanoJevEngine` (`lib/ai/nanoJevEngine.ts`).
- Browser automation must reuse local Microsoft Edge or Google Chrome binaries detected by `browserAgentEngine.ts` without requiring new downloads.
- Editable macro files must be saved with `.macro.json` extension.

## Review Focus
1. Empty or missing CSV fields bound to a required form field: Must gracefully skip or insert default fallback without throwing an unhandled exception.
2. Sudden modal popups, alerts, or cookie banners: NanoJev Boolean Head / Playwright dialog listeners must handle or dismiss them without aborting the batch.
3. Network delay or dynamic element rendering: Automatic exponential poll / wait with configurable timeout.
4. Bot-detection heuristics on CRM portals: Add 30-50ms randomized typing cadence jitter.
5. Large CSV uploads: Stream rows sequentially to avoid memory pressure.

---

### Task 1: Core Macro Definition Types & Smart Macro Engine

**Files:**
- Create: `lib/automation/smartMacroEngine.ts`
- Test: `scripts/test-smart-macro-engine.js`

**Interfaces:**
- Consumes: `nanoJevEngine` from `lib/ai/nanoJevEngine.ts`, `browserAgentEngine` from `lib/ai/browserAgentEngine.ts`
- Produces:
  - `SmartMacroDefinition`, `SmartMacroStep`, `DOMElementCandidate`, `MacroProgressEvent` interfaces
  - `smartMacroEngine.substituteVariables(template: string, data: Record<string, string>): string`
  - `smartMacroEngine.matchElementWithNanoJev(targetIntent: string, candidates: DOMElementCandidate[]): Promise<{ bestCandidate: DOMElementCandidate; confidence: number }>`
  - `smartMacroEngine.executeMacro(macro: SmartMacroDefinition, onProgress?: (event: MacroProgressEvent) => void): Promise<{ success: boolean; totalProcessed: number; errors: string[] }>`

- [x] **Step 1: Write the failing test**
Create `scripts/test-smart-macro-engine.js` checking:
  - Variable substitution: `{{csv.name}}` -> `"Rajesh Patel"`
  - Candidate encoding & NanoJev matching: Given 3 candidates (`Phone`, `Email`, `Submit`), intent `"Customer Phone"` returns `Phone` with confidence > 0.85
  - Validation: Empty macro or invalid target URL rejects cleanly.

- [x] **Step 2: Run test to verify it fails**
Run: `node scripts/test-smart-macro-engine.js`
Expected: FAIL with "Cannot find module '../lib/automation/smartMacroEngine'"

- [x] **Step 3: Implement `SmartMacroEngine` in `lib/automation/smartMacroEngine.ts`**
Implement element extraction, candidate formatting, NanoJev logit integration, and batch row processing.

- [x] **Step 4: Run test to verify it passes**
Run: `node scripts/test-smart-macro-engine.js`
Expected: PASS with 100% assertions green.

- [x] **Step 5: Commit**
```bash
git add lib/automation/smartMacroEngine.ts scripts/test-smart-macro-engine.js
git commit -m "feat(automation): implement SmartMacroEngine with NanoJev semantic element matching"
```

---

### Task 2: Backend Automation API Endpoints

**Files:**
- Create: `app/api/automation/macro/route.ts`
- Create: `app/api/automation/macro/templates/route.ts`
- Test: `scripts/test-macro-api.js`

**Interfaces:**
- Consumes: `smartMacroEngine` from `lib/automation/smartMacroEngine.ts`
- Produces:
  - `POST /api/automation/macro`: Handles actions `inspect` (extract page candidates), `execute` (SSE stream batch execution), and `save`
  - `GET /api/automation/macro/templates`: Returns ready-to-use template macros (CRM Lead Entry, Google Forms, Product Inventory)

- [x] **Step 1: Write the failing test**
Create `scripts/test-macro-api.js` testing GET templates and POST inspect endpoints via HTTP requests to `http://localhost:3000`.

- [x] **Step 2: Run test to verify it fails**
Run: `node scripts/test-macro-api.js`
Expected: FAIL with 404 Not Found.

- [x] **Step 3: Implement API routes in `app/api/automation/macro/`**
Implement Next.js App Router route handlers with proper CORS, error boundaries, and SSE streaming responses.

- [x] **Step 4: Run test to verify it passes**
Run: `node scripts/test-macro-api.js`
Expected: PASS with 200 OK and valid JSON templates.

- [x] **Step 5: Commit**
```bash
git add app/api/automation/macro/route.ts app/api/automation/macro/templates/route.ts scripts/test-macro-api.js
git commit -m "feat(api): add smart macro automation endpoints and template catalog"
```

---

### Task 3: Visual Side-by-Side Studio Panel UI

**Files:**
- Create: `client/components/SmartMacroStudio.tsx`
- Test: Verify component exports and TypeScript compilation.

**Interfaces:**
- Consumes: `/api/automation/macro` endpoints, Monaco Editor, Lucide icons (`Play`, `Pause`, `Upload`, `Code`, `Sparkles`, `CheckCircle`, `AlertCircle`)
- Produces:
  - `<SmartMacroStudio initialMacro={...} onClose={...} />` component
  - Split view: Left pane with URL bar, CSV upload/mapping, Step timeline, and live execution progress; Right pane with embedded Monaco editor for `.macro.json`

- [x] **Step 1: Write component structure with TypeScript interfaces**
Define state management for active macro, parsed CSV rows, live execution status, and Monaco editor two-way synchronization.

- [x] **Step 2: Implement visual runner and controls**
Add target URL inspection, step drag/add/remove, variable bindings, and real-time execution console.

- [x] **Step 3: Implement Monaco code synchronization**
Ensure typing in Monaco updates the visual step list, and modifying steps visually updates the Monaco JSON buffer.

- [x] **Step 4: Verify TypeScript compilation**
Run: `npx tsc --noEmit`
Expected: No type errors in `client/components/SmartMacroStudio.tsx`.

- [x] **Step 5: Commit**
```bash
git add client/components/SmartMacroStudio.tsx
git commit -m "feat(ui): add SmartMacroStudio side-by-side visual runner and Monaco editor"
```

---

### Task 4: IDE Workbench Integration & End-to-End Verification

**Files:**
- Modify: `client/components/LiveWebviewSplitPane.tsx` (or workbench header/tabs) to add "Smart Macro Studio" launch button.
- Create: `scripts/test-smart-macro-e2e.js`

**Interfaces:**
- Consumes: `SmartMacroStudio` from `client/components/SmartMacroStudio.tsx`
- Produces: Seamless tab switching or split pane trigger in Offline AI Studio.

- [x] **Step 1: Write E2E test script `scripts/test-smart-macro-e2e.js`**
Launches a mock local HTML contact/lead form, executes a 2-record macro batch through `SmartMacroEngine`, and confirms values were submitted.

- [x] **Step 2: Run test to verify it fails before wiring**
Run: `node scripts/test-smart-macro-e2e.js`

- [x] **Step 3: Integrate Smart Macro Studio button into IDE header/workbench**
Add macro studio toggle button with Sparkles icon into workbench navigation.

- [x] **Step 4: Run E2E test to verify it passes**
Run: `node scripts/test-smart-macro-e2e.js`
Expected: PASS - Form autofill and submit successfully verified.

- [x] **Step 5: Commit**
```bash
git add client/components/LiveWebviewSplitPane.tsx scripts/test-smart-macro-e2e.js
git commit -m "feat(studio): integrate Smart Macro Studio into IDE workbench with E2E verification"
```
