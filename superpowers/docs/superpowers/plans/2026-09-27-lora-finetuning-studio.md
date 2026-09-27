# Step 4: Fine-Tuning & LoRA / QLoRA Local Adapter Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**: Implement an autonomous LoRA / QLoRA Local Adapter Studio with AST dataset harvesting from workspace code, training telemetry and loss/perplexity curves, Ollama Modelfile export, and side-by-side inference evaluation.

---

## Proposed File Changes

- **Create** `lib/ai/loraFineTuningEngine.ts`: Core engine for dataset extraction, LoRA hyperparameter validation, simulated/real training telemetry, Modelfile generation, and PEFT config synthesis.
- **Create** `scripts/test-lora-engine.js`: Comprehensive test suite verifying dataset generation, loss convergence, perplexity, and Ollama Modelfile generation.
- **Create** `app/api/training/dataset/route.ts`: API endpoint to harvest, list, and add JSONL dataset pairs from workspace files.
- **Create** `app/api/training/evaluate/route.ts`: API endpoint to run side-by-side inference comparison before vs after LoRA adaptation.
- **Modify** `app/api/training/start/route.ts`: Enhance with full LoRA/QLoRA config, loss and perplexity curves, and PEFT adapter config.
- **Modify** `client/views/FineTuningDashboard.tsx`: Enhance UI with 4 dedicated tabs: (1) Dataset Studio, (2) LoRA/QLoRA Matrix, (3) Live Loss Curves & Telemetry, (4) Side-by-Side Evaluator & 1-Click Export.
- **Modify** `RELEASE_NOTES_v1.0.0.md`: Add Step 4 documentation (Item #33).

---

## Tasks

### Task 1: Core LoRA Engine & Automated Test Suite (`lib/ai/loraFineTuningEngine.ts`)
- [x] Write `scripts/test-lora-engine.js` asserting dataset harvesting, training convergence, and Modelfile synthesis.
- [x] Implement `lib/ai/loraFineTuningEngine.ts` with AST harvester, numerical training telemetry generator, Modelfile compiler, and PEFT adapter config generator.
- [x] Run test suite with `npx tsx scripts/test-lora-engine.js` and verify all tests pass.
- [x] Commit `feat(finetune): implement core LoRA/QLoRA fine-tuning and dataset synthesis engine`.

### Task 2: Training Backend API Routes (`app/api/training/*`)
- [x] Implement `app/api/training/dataset/route.ts` for automated dataset harvesting and JSONL retrieval.
- [x] Update `app/api/training/start/route.ts` to utilize `loraFineTuningEngine` for live telemetry, loss curves, and Modelfile generation.
- [x] Implement `app/api/training/evaluate/route.ts` for side-by-side prompt output testing.
- [x] Create `scripts/test-training-routes.js` and test all routes with HTTP assertions.
- [x] Commit `feat(finetune): wire fine-tuning API routes for dataset harvesting, training, and evaluation`.

### Task 3: Interactive UI Studio Enhancement (`client/views/FineTuningDashboard.tsx`)
- [x] Add 4-Tab workflow navigation: `Dataset Studio`, `LoRA / QLoRA Config`, `Training Telemetry & Curves`, and `Side-by-Side Evaluator`.
- [x] Connect AST dataset auto-harvest button to `/api/training/dataset`.
- [x] Render live interactive SVG loss and perplexity curve with moving average.
- [x] Connect Side-by-Side Evaluator to `/api/training/evaluate`.
- [x] Add 1-click "Export & Apply Modelfile to Workspace / Ollama" action.
- [x] Commit `feat(ui): upgrade FineTuningDashboard with dataset harvester, SVG loss curves, and side-by-side evaluator`.

### Task 4: End-to-End Verification & Release Notes Documentation
- [x] Verify Next.js dev server compiles all routes and components cleanly with 0 errors.
- [x] Update `RELEASE_NOTES_v1.0.0.md` with Step 4 feature details (Item #33).
- [x] Commit `feat(finetune): complete Step 4 LoRA fine-tuning and adapter studio`.
