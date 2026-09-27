# Architectural Specification: Deterministic Code Knowledge Graph & AST Symbol Intelligence (Step 2)

**Date**: 2026-09-27  
**Status**: Approved (Option 1: Hybrid TypeScript Compiler AST + Multi-Language Grammar Engine)  
**Author**: Antigravity Assistant & Engineering Team  

---

## 1. Executive Summary

Autonomous coding agents (such as Devin, Cursor, and Claude Code) require an exact understanding of codebase structure to avoid hallucinating APIs, variable names, or file relationships. While vector databases provide fuzzy semantic similarity, they cannot guarantee deterministic symbol lookup or accurate dependency call chains.

This specification defines **Step 2: Deterministic Code Knowledge Graph & AST Symbol Intelligence**. It provides:
1. **Dynamic AST Analysis**: In-memory parsing using the official `typescript` compiler API (`ts.createSourceFile`) for TypeScript/JavaScript/JSX, alongside grammar extractors for Python/Rust/Go.
2. **Deterministic Cross-File Relationship DAG**: Extraction of exact relations (`imports`, `calls`, `defines`, `inherits`, `renders`) linking symbols across files.
3. **Graph-RAG Prompt Ingestion**: Real-time assembly of related symbol signatures, interfaces, and caller/callee context for LLM composer prompts.
4. **Live Visual Knowledge Explorer**: Dynamic rendering of actual workspace graph geometry in [`components/GraphRagVisualizer.tsx`](file:///e:/offilne%20ide/offline-ai-ide%20%281%29/components/GraphRagVisualizer.tsx).

---

## 2. Architecture & Subsystems

```mermaid
graph TD
    A[Workspace Source Files] --> B[codeKnowledgeGraphEngine]
    B --> C{File Type Dispatch}
    C -->|TS / JS / TSX / JSX| D[TypeScript Compiler AST Walker]
    C -->|PY / RS / GO / CSS| E[Multi-Language Grammar Extractor]
    D --> F[Deterministic Symbol & Edge Collector]
    E --> F
    F --> G[(In-Memory Code Knowledge Graph)]
    G --> H[Symbol Index / Defs / References]
    G --> I[Caller / Callee Traversal]
    G --> J[Graph-RAG Context Formatter]
    G --> K[/api/rag/semantic-graph-search]
    K --> L[GraphRagVisualizer UI]
    J --> M[Autonomous Agent & Composer Prompt]
```

---

## 3. Data Structures

### 3.1 Graph Node
```typescript
export type SymbolKind = 
  | 'file'
  | 'class'
  | 'interface'
  | 'type'
  | 'function'
  | 'method'
  | 'variable'
  | 'component'
  | 'enum';

export interface GraphNode {
  id: string;                    // Unique ID: `${filePath}:${kind}:${name}:${line}`
  label: string;                 // Display label, e.g. "auditPage()" or "BrowserAgentEngine"
  name: string;                  // Raw identifier name
  type: SymbolKind;              // Node category
  filePath: string;              // Relative file path
  line: number;                  // 1-indexed start line
  endLine: number;               // 1-indexed end line
  character: number;             // Column offset
  signature?: string;            // Type signature or function parameters
  docstring?: string;            // JSDoc or leading comment description
  isExported: boolean;           // True if exported from module
  x?: number;
  y?: number;
}
```

### 3.2 Graph Edge
```typescript
export type EdgeKind = 
  | 'imports'     // File A imports Symbol/File B
  | 'calls'       // Function A invokes Function B
  | 'defines'     // File/Class A declares Symbol B
  | 'inherits'    // Class A extends/implements Class/Interface B
  | 'renders';    // React component A renders Component B

export interface GraphEdge {
  id: string;                    // `${source}->${type}->${target}`
  source: string;                // Source node ID
  target: string;                // Target node ID
  type: EdgeKind;
  label?: string;                // Human-readable description
  line?: number;                 // Location where relationship occurs
}
```

---

## 4. Key Components

### 4.1 `lib/ast/codeKnowledgeGraphEngine.ts`
- **AST Visitor**: Traverses nodes with `ts.forEachChild`.
- **Declaration Recognition**:
  - `ts.isFunctionDeclaration`, `ts.isArrowFunction`, `ts.isMethodDeclaration`
  - `ts.isClassDeclaration`, `ts.isInterfaceDeclaration`, `ts.isTypeAliasDeclaration`
  - `ts.isVariableStatement`, `ts.isEnumDeclaration`
  - React Component heuristic: Functions returning JSX elements or capitalized PascalCase functions.
- **Reference & Call Resolution**:
  - `ts.isCallExpression`: Identifies target invocation identifiers.
  - `ts.isJsxOpeningElement`, `ts.isJsxSelfClosingElement`: Identifies component render edges.
  - `ts.isImportDeclaration`: Maps imported module specifiers and named bindings to workspace files.
- **Graph-RAG Context Generation**:
  - `getGraphRAGContext(targetFile, depth)`: Computes the 1-hop and 2-hop graph neighborhood, outputting a concise Markdown snippet containing:
    - Target file exports and dependencies
    - Upstream callers that would be affected by changes
    - Type contracts required for clean implementation

### 4.2 `app/api/rag/semantic-graph-search/route.ts`
- Accepts query or optional workspace file payloads.
- Falls back to reading active workspace files on disk via `localFileSystemEngine` or project root.
- Returns dynamically extracted `nodes`, `edges`, `matchedNodeIds`, `scores`, and graph statistics (`totalAstNodes`, `verifiedEdges`, `cacheHitRate`).

### 4.3 `components/GraphRagVisualizer.tsx`
- Updates data fetching to consume real workspace graph symbols.
- Adds symbol kind filter tabs (`all`, `file`, `class`, `interface`, `function`, `component`, `variable`).
- Enhances node click actions: allows opening the real file at the exact symbol line in Monaco editor.

---

## 5. Verification Plan

1. **Deterministic Extraction Unit Test**:
   - Create `scripts/test-knowledge-graph.js`.
   - Parse `lib/ai/browserAgentEngine.ts` and `app/api/pipeline/browser-inspect/route.ts`.
   - Assert detection of `BrowserAgentEngine`, `auditPage`, `captureScreenshot`, and cross-file import edges.
2. **API Route End-to-End Verification**:
   - `POST /api/rag/semantic-graph-search` returns live non-mock nodes and edges with `success: true`.
3. **Graph-RAG Context Verification**:
   - Test `getGraphRAGContext('lib/ai/browserAgentEngine.ts')` to ensure caller and import context is accurately formatted.
