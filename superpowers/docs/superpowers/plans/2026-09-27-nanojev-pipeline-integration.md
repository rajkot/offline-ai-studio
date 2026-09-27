# NanoJev Pipeline & Auto-Download Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate NanoJev (TianyuCodings / C-Tianyu) into Offline AI Studio's agent decision pipeline as an ultra-fast parallel decision engine, establish auto-downloading in the IDE installer/startup scripts, and list it across the Extension Marketplace and Model Catalog storefront.

**Architecture:** A lightweight engine (`lib/ai/nanoJevEngine.ts`) handles parallel candidate scoring and zero-token HITL safety prediction, exposed via `/api/pipeline/nanojev`. Windows PowerShell and Batch scripts (`scripts/install-nanojev.ps1` and `.bat`) automate `git-xet`, `hf` CLI, and `C-Tianyu/NanoJev` weight acquisition, wired directly into `package.json`, `OfflineAIStudio.bat`, and the Model Catalog UI.

**Tech Stack:** Next.js 15, TypeScript, Node.js child_process, PowerShell, Hugging Face CLI (`hf`), Git LFS / git-xet, Tailwind CSS.

**Spec:** [`superpowers/docs/superpowers/specs/2026-09-27-nanojev-pipeline-integration-design.md`](file:///e:/offilne%20ide/offline-ai-ide%20%281%29/superpowers/docs/superpowers/specs/2026-09-27-nanojev-pipeline-integration-design.md)

## Global Constraints
- Must function 100% offline with zero external network requirement once weights are downloaded or in fallback mode.
- Non-blocking execution: Background downloads must report progress without stalling the Next.js event loop or UI.
- Strict cross-platform path handling for Windows file paths (`\` and `/`).
- Preservation of existing types in `lib/ai/AgentToolPipeline.ts` and `lib/extensions/marketplaceCatalog.ts`.

## Review Focus
- Detection of local weights when `models/nanojev` or `integrations/NanoJev` is partially downloaded.
- Network timeouts during `hf download` or `winget install` in air-gapped environments.
- Candidate scoring with empty or single candidate input arrays.
- Malformed action payloads passed to `predictHitlApproval`.
- UI responsiveness during in-app model download triggering.

---

### Task 1: NanoJev Engine Core Subsystem

**Files:**
- Create: `lib/ai/nanoJevEngine.ts`
- Test: `scripts/test-nanojev-engine.js`

**Interfaces:**
- Produces:
  - `nanoJevEngine.getStatus(): NanoJevStatus`
  - `nanoJevEngine.evaluateDecisions(state: string, candidates: string[]): Promise<NanoJevDecisionResult>`
  - `nanoJevEngine.predictHitlApproval(toolName: string, actionPayload: any): Promise<HitlPredictionResult>`

- [ ] **Step 1: Write test script `scripts/test-nanojev-engine.js`**
  Asserts engine instantiation, status inspection, decision scoring on sample candidates, and HITL prediction.
- [ ] **Step 2: Run test script to verify failure**
  Run: `node scripts/test-nanojev-engine.js`
  Expected: FAIL (module `nanoJevEngine` not found).
- [ ] **Step 3: Implement `lib/ai/nanoJevEngine.ts`**
  Implements `NanoJevEngine` class with directory check (`models/nanojev`), parallel softmax/logit normalization, candidate scoring heuristics, and HITL destructive keyword evaluation.
- [ ] **Step 4: Run test script to verify success**
  Run: `node scripts/test-nanojev-engine.js`
  Expected: PASS with 100% assertions green.
- [ ] **Step 5: Commit**
  `git add lib/ai/nanoJevEngine.ts scripts/test-nanojev-engine.js`
  `git commit -m "feat(nanojev): implement NanoJev decision engine subsystem"`

---

### Task 2: API Pipeline Routes for NanoJev

**Files:**
- Create: `app/api/pipeline/nanojev/route.ts`
- Create: `app/api/pipeline/nanojev/download/route.ts`

**Interfaces:**
- Consumes: `nanoJevEngine` from `lib/ai/nanoJevEngine.ts`
- Produces:
  - `GET /api/pipeline/nanojev`: Returns status JSON `{ installed: boolean, modelPath: string, stats: any }`
  - `POST /api/pipeline/nanojev`: Accepts `{ state: string, candidates: string[] }` and returns `{ selected: string, confidence: number, probabilities: Record<string, number> }`
  - `POST /api/pipeline/nanojev/download`: Initiates background PowerShell/hf download or git clone.

- [ ] **Step 1: Implement `app/api/pipeline/nanojev/route.ts`**
  Handles GET and POST requests delegating to `nanoJevEngine`.
- [ ] **Step 2: Implement `app/api/pipeline/nanojev/download/route.ts`**
  Spawns `scripts/install-nanojev.ps1` asynchronously, tracking download state and preventing duplicate concurrent downloads.
- [ ] **Step 3: Verify API endpoints via curl**
  Run: `curl.exe http://localhost:3000/api/pipeline/nanojev`
  Expected: HTTP 200 with status JSON.
- [ ] **Step 4: Commit**
  `git add app/api/pipeline/nanojev/`
  `git commit -m "feat(nanojev): add pipeline decision and download api routes"`

---

### Task 3: Automated Installation & Download Pipeline Scripts

**Files:**
- Create: `scripts/install-nanojev.ps1`
- Create: `scripts/install-nanojev.bat`
- Modify: `package.json`
- Modify: `OfflineAIStudio.bat`

**Interfaces:**
- Produces: CLI commands `npm run setup:nanojev` and double-clickable `scripts/install-nanojev.bat`.

- [ ] **Step 1: Create `scripts/install-nanojev.ps1`**
  PowerShell script executing:
  - `winget install --id HuggingFace.git-xet -e --accept-source-agreements --accept-package-agreements`
  - `hf` CLI installer `irm https://hf.co/cli/install.ps1 | iex`
  - Model download `hf download C-Tianyu/NanoJev --local-dir models/nanojev`
  - Resilient fallback to `GIT_LFS_SKIP_SMUDGE=1 git clone https://huggingface.co/C-Tianyu/NanoJev models/nanojev`.
- [ ] **Step 2: Create `scripts/install-nanojev.bat`**
  Batch wrapper with `-ExecutionPolicy Bypass`.
- [ ] **Step 3: Update `package.json` with `"setup:nanojev"`**
  Add script `"setup:nanojev": "powershell -ExecutionPolicy Bypass -File scripts/install-nanojev.ps1"`.
- [ ] **Step 4: Update `OfflineAIStudio.bat`**
  Add startup verification for `models\nanojev` with non-blocking notice.
- [ ] **Step 5: Verify PowerShell script syntax**
  Run: `powershell -ExecutionPolicy Bypass -Command "Get-Command -Syntax scripts/install-nanojev.ps1"`
  Expected: PASS without syntax error.
- [ ] **Step 6: Commit**
  `git add scripts/install-nanojev.* package.json OfflineAIStudio.bat`
  `git commit -m "feat(installer): add automated nanojev installation and download scripts"`

---

### Task 4: Marketplace Catalog & Model Storefront Registration

**Files:**
- Modify: `lib/extensions/marketplaceCatalog.ts`
- Modify: `app/api/models/huggingface/route.ts`
- Modify: `client/components/ModelCatalogStorefront.tsx`

**Interfaces:**
- Produces:
  - Marketplace item: `tianyucodings.nanojev-decision-engine`
  - Model item: `C-Tianyu/NanoJev`

- [ ] **Step 1: Add NanoJev to `lib/extensions/marketplaceCatalog.ts`**
  Insert `tianyucodings.nanojev-decision-engine` under `AI & Cloud` with full manifest, repository link, and commands.
- [ ] **Step 2: Add NanoJev to `app/api/models/huggingface/route.ts`**
  Add `C-Tianyu/NanoJev` to `OFFLINE_FALLBACK_CATALOG` with category `reasoning`, params `0.6B`, size `1.2 GB`, and direct links.
- [ ] **Step 3: Wire 1-Click Install Button in `client/components/ModelCatalogStorefront.tsx`**
  Recognize `C-Tianyu/NanoJev` and connect its pull action to `/api/pipeline/nanojev/download`.
- [ ] **Step 4: Verify marketplace and model catalog compilation**
  Run: `curl.exe http://localhost:3000/api/models/huggingface?search=NanoJev`
  Expected: Returns NanoJev model item in JSON.
- [ ] **Step 5: Commit**
  `git add lib/extensions/marketplaceCatalog.ts app/api/models/huggingface/route.ts client/components/ModelCatalogStorefront.tsx`
  `git commit -m "feat(storefront): register NanoJev in marketplace and model catalog"`

---

### Task 5: End-to-End Verification & Pipeline Integration

**Files:**
- Modify: `lib/ai/AgentToolPipeline.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `nanoJevEngine` in `AgentToolPipeline.ts`

- [ ] **Step 1: Connect `nanoJevEngine` to `AgentToolPipeline.ts`**
  Use `nanoJevEngine.predictHitlApproval` in `AgentToolPipeline.requestHitlApproval` as high-speed pre-evaluator.
- [ ] **Step 2: Run end-to-end verification script**
  Run: `node scripts/test-nanojev-engine.js` and verify all endpoints respond properly.
- [ ] **Step 3: Update documentation in `README.md`**
  Add NanoJev architecture diagram, marketplace instructions, and installation commands.
- [ ] **Step 4: Final commit**
  `git add lib/ai/AgentToolPipeline.ts README.md`
  `git commit -m "feat(pipeline): complete end-to-end NanoJev integration into IDE agent pipeline"`
