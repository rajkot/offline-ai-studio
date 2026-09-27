# Code Knowledge Graph & Symbol Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal**: Implement a 100% deterministic code knowledge graph and symbol extraction engine using TypeScript Compiler API + grammar extractors, replacing mock Graph-RAG data with live workspace cross-file dependency intelligence.

---

## Proposed File Changes

- **Create** `lib/ast/codeKnowledgeGraphEngine.ts`: Core deterministic AST parser, relationship graph, and Graph-RAG context generator.
- **Create** `scripts/test-knowledge-graph.js`: Unit & integration test verifying AST extraction of symbols, calls, imports, and component renders.
- **Modify** `app/api/rag/semantic-graph-search/route.ts`: Wire into dynamic workspace AST indexing with LRU caching.
- **Modify** `lib/composerEngine.ts`: Inject deterministic Graph-RAG symbol context into multi-file prompt synthesis.
- **Modify** `components/GraphRagVisualizer.tsx`: Support real workspace graph nodes, symbol type filter tabs, and click-to-open file navigation.

---

## Tasks

### Task 1: Core Knowledge Graph Engine (`lib/ast/codeKnowledgeGraphEngine.ts`)

- [ ] Write `scripts/test-knowledge-graph.js` test suite verifying AST symbol definitions, imports, calls, and renders.
- [ ] Implement `codeKnowledgeGraphEngine.ts` utilizing `typescript` AST walker and grammar extractors.
- [ ] Run test suite with `node scripts/test-knowledge-graph.js` and verify all assertions pass.
- [ ] Commit `feat(ast): implement deterministic code knowledge graph engine`.

### Task 2: Update Semantic Graph API Route (`app/api/rag/semantic-graph-search/route.ts`)

- [ ] Modify `POST /api/rag/semantic-graph-search` to index provided workspace files or disk files using `codeKnowledgeGraphEngine`.
- [ ] Implement symbol search with relevance scoring and LRU caching for sub-millisecond response times.
- [ ] Verify endpoint returns real workspace nodes and verified cross-file edges with `curl` / node script.
- [ ] Commit `feat(ast): wire semantic graph search API route to live workspace AST engine`.

### Task 3: Graph-RAG Composer & Autonomous Agent Ingestion

- [ ] Wire `codeKnowledgeGraphEngine.getGraphRAGContext()` into `lib/composerEngine.ts` and `lib/ai/autonomousAgentEngine.ts`.
- [ ] Verify that generating code or inspecting an active file automatically attaches deterministic symbol callers and interface contracts.
- [ ] Commit `feat(ast): inject deterministic graph-RAG context into composer and autonomous agent`.

### Task 4: UI Visualization Enhancements (`components/GraphRagVisualizer.tsx`)

- [ ] Update `components/GraphRagVisualizer.tsx` to handle dynamic node kinds (`component`, `interface`, `type`).
- [ ] Add category filter pills and click-to-jump to Monaco line.
- [ ] Commit `feat(ui): enhance GraphRagVisualizer with live workspace symbol navigation`.

### Task 5: Final End-to-End Verification & Documentation

- [ ] Run full system audit: test route `/api/rag/semantic-graph-search`, verify browser compilation, verify zero TypeScript errors.
- [ ] Update `RELEASE_NOTES_v1.0.0.md` with Step 2 features.
- [ ] Commit `feat(ast): complete Step 2 deterministic code knowledge graph`.
