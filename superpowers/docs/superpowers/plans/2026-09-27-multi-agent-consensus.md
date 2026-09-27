# Multi-Agent Consensus & Adversarial Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**: Implement an autonomous Multi-Agent Consensus & Adversarial Verification engine (Architect, Implementer, Reviewer, Auditor Triad), replacing static mock agent states with live adversarial verification debate cycles and 1-click code application.

---

## Proposed File Changes

- **Create** `lib/ai/multiAgentConsensusEngine.ts`: Core orchestration engine managing Architect, Implementer, Reviewer, and Auditor debate loops and weighted consensus evaluation.
- **Create** `scripts/test-consensus-engine.js`: Test suite asserting spec creation, code generation, adversarial critique, and consensus resolution.
- **Modify** `app/api/swarm/status/route.ts`: Wire GET and POST handlers to live `multiAgentConsensusEngine`.
- **Modify** `components/SwarmTrackerPanel.tsx`: Add prompt input box, "Run Consensus Triad" trigger button, real-time agent debate logs, and "Apply Consensus Code" handler.
- **Modify** `RELEASE_NOTES_v1.0.0.md`: Document Step 3 capabilities.

---

## Tasks

### Task 1: Core Multi-Agent Consensus Engine (`lib/ai/multiAgentConsensusEngine.ts`)

- [x] Write `scripts/test-consensus-engine.js` asserting Triad session creation, spec extraction, implementation, adversarial critique, and consensus convergence.
- [x] Implement `multiAgentConsensusEngine.ts` with local Ollama / Online AI bridges and deterministic offline heuristic fallback.
- [x] Run test suite with `npx tsx scripts/test-consensus-engine.js` and verify all assertions pass.
- [x] Commit `feat(swarm): implement multi-agent consensus and adversarial verification engine`.

### Task 2: Live Swarm API Route Wiring (`app/api/swarm/status/route.ts`)

- [x] Modify `GET` and `POST` handlers in `app/api/swarm/status/route.ts` to dispatch live consensus sessions using `multiAgentConsensusEngine`.
- [x] Support `{ action: 'start' | 'step', prompt, activeFile, files }` payload.
- [x] Verify endpoint returns live consensus scores, agent votes, logs, and generated consensus code.
- [x] Commit `feat(swarm): wire swarm status route to live multi-agent consensus engine`.

### Task 3: UI Integration in Swarm Tracker (`components/SwarmTrackerPanel.tsx`)

- [x] Add prompt input field and "Launch Triad Debate" button in `SwarmTrackerPanel.tsx`.
- [x] Display real-time critique notes, agent confidence scores, and vote badges (`approved`, `needs_revision`, `rejected`).
- [x] Add "Apply Consensus Code to Editor" action triggering `onApplyConsensusCode`.
- [x] Commit `feat(ui): connect SwarmTrackerPanel to live multi-agent consensus deliberation`.

### Task 4: Final End-to-End Verification & Documentation

- [x] Run full system audit: test route `/api/swarm/status` with real prompts, verify zero compile errors on Next.js server.
- [x] Update `RELEASE_NOTES_v1.0.0.md` with Step 3 features.
- [x] Commit `feat(swarm): complete Step 3 multi-agent consensus engine`.
