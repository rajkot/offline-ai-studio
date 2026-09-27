import { NextRequest, NextResponse } from 'next/server';
import { codeKnowledgeGraphEngine, GraphNode, GraphEdge, GraphStats } from '@/lib/ast/codeKnowledgeGraphEngine';

const FALLBACK_NODES: GraphNode[] = [
  { id: 'f1', label: 'Playground.tsx', name: 'Playground.tsx', type: 'file', filePath: 'components/Playground.tsx', line: 1, endLine: 8700, character: 1, isExported: true },
  { id: 'f2', label: 'browserAgentEngine.ts', name: 'browserAgentEngine.ts', type: 'file', filePath: 'lib/ai/browserAgentEngine.ts', line: 1, endLine: 310, character: 1, isExported: true },
  { id: 'f3', label: 'autonomousAgentEngine.ts', name: 'autonomousAgentEngine.ts', type: 'file', filePath: 'lib/ai/autonomousAgentEngine.ts', line: 1, endLine: 610, character: 1, isExported: true },
  { id: 'c1', label: 'BrowserAgentEngine', name: 'BrowserAgentEngine', type: 'class', filePath: 'lib/ai/browserAgentEngine.ts', line: 50, endLine: 300, character: 1, isExported: true },
  { id: 'fn1', label: 'auditPage()', name: 'auditPage', type: 'function', filePath: 'lib/ai/browserAgentEngine.ts', line: 120, endLine: 275, character: 1, isExported: true },
  { id: 'fn2', label: 'auditBrowserUrl()', name: 'auditBrowserUrl', type: 'function', filePath: 'lib/ai/autonomousAgentEngine.ts', line: 320, endLine: 380, character: 1, isExported: true }
];

const FALLBACK_EDGES: GraphEdge[] = [
  { id: 'e1', source: 'f1', target: 'f2', type: 'imports', label: 'imports' },
  { id: 'e2', source: 'f3', target: 'f2', type: 'imports', label: 'imports' },
  { id: 'e3', source: 'f2', target: 'c1', type: 'defines', label: 'defines' },
  { id: 'e4', source: 'c1', target: 'fn1', type: 'defines', label: 'defines' },
  { id: 'e5', source: 'f3', target: 'fn2', type: 'defines', label: 'defines' },
  { id: 'e6', source: 'fn2', target: 'fn1', type: 'calls', label: 'calls' }
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { query, files, activeFile } = body;
    const cleanQuery = (query || '').toLowerCase().trim();

    // 1. If client provided active workspace files, index them dynamically
    if (files && typeof files === 'object' && Object.keys(files).length > 0) {
      codeKnowledgeGraphEngine.indexWorkspace(files);
    }

    let nodes = codeKnowledgeGraphEngine.getNodes();
    let edges = codeKnowledgeGraphEngine.getEdges();

    // If engine hasn't indexed anything yet, populate with fallback baseline
    if (nodes.length === 0) {
      nodes = FALLBACK_NODES;
      edges = FALLBACK_EDGES;
    }

    // 2. Perform symbol search if query is specified
    const matchedNodeIds: string[] = [];
    const scores: Record<string, number> = {};

    if (cleanQuery) {
      const searchResults = codeKnowledgeGraphEngine.search(cleanQuery);
      if (searchResults.length > 0) {
        searchResults.forEach(({ node, score }) => {
          matchedNodeIds.push(node.id);
          scores[node.id] = score;
        });
      } else {
        // Fallback matching over existing nodes
        nodes.forEach(node => {
          let score = 0;
          const text = `${node.name} ${node.label} ${node.type} ${node.filePath}`.toLowerCase();
          const terms = cleanQuery.split(/\s+/);
          terms.forEach(t => {
            if (node.name.toLowerCase() === t) score += 0.8;
            else if (text.includes(t)) score += 0.4;
          });
          if (score > 0) {
            matchedNodeIds.push(node.id);
            scores[node.id] = Math.min(1.0, parseFloat(score.toFixed(2)));
          }
        });
      }
    }

    // 3. Compute Graph-RAG context for active file if requested
    let graphRagContext = '';
    if (activeFile && typeof activeFile === 'string') {
      graphRagContext = codeKnowledgeGraphEngine.getGraphRAGContext(activeFile);
    }

    return NextResponse.json({
      success: true,
      query: cleanQuery,
      matchedNodeIds,
      scores,
      nodes,
      edges,
      stats: codeKnowledgeGraphEngine.getStats(),
      graphRagContext
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Semantic graph search failed'
    }, { status: 500 });
  }
}

export async function GET() {
  let nodes = codeKnowledgeGraphEngine.getNodes();
  let edges = codeKnowledgeGraphEngine.getEdges();

  if (nodes.length === 0) {
    nodes = FALLBACK_NODES;
    edges = FALLBACK_EDGES;
  }

  return NextResponse.json({
    success: true,
    nodes,
    edges,
    stats: codeKnowledgeGraphEngine.getStats()
  });
}
