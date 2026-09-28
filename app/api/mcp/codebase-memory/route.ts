import { NextRequest, NextResponse } from 'next/server';
import { codebaseMemoryMcpEngine } from '@/lib/mcp/codebaseMemoryMcpEngine';
import fs from 'fs';
import path from 'path';

function readWorkspaceFiles(dir: string, baseDir: string = dir, maxFiles = 800): Record<string, string> {
  const result: Record<string, string> = {};
  let count = 0;

  const priorityDirs = ['lib', 'client', 'components', 'app', 'desktop-app', 'hooks', 'integrations', 'scripts'];

  function walk(currentDir: string) {
    if (count >= maxFiles || !fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (count >= maxFiles) break;
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      if (entry.isDirectory()) {
        if (!['node_modules', '.git', '.next', 'dist', 'build', '.gemini', 'agency-agents'].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (
        ['.ts', '.tsx', '.js', '.jsx', '.json', '.py', '.rs', '.go'].some(ext => entry.name.endsWith(ext)) &&
        !entry.name.endsWith('.d.ts')
      ) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          result[relPath] = content;
          count++;
        } catch {}
      }
    }
  }

  // Scan priority source directories first
  for (const p of priorityDirs) {
    const pPath = path.join(dir, p);
    if (fs.existsSync(pPath)) {
      walk(pPath);
    }
  }

  // Then scan root
  walk(dir);
  return result;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const kind = searchParams.get('kind') as any;
    const symbol = searchParams.get('symbol');
    const filePath = searchParams.get('filePath');
    const action = searchParams.get('action') || 'summary';

    // Auto-index on first call if graph is empty
    let summary = codebaseMemoryMcpEngine.getSummary();
    if (summary.totalNodes === 0) {
      const workspaceFiles = readWorkspaceFiles(process.cwd());
      summary = codebaseMemoryMcpEngine.indexWorkspace(workspaceFiles);
    }

    if (action === 'visual') {
      const visualData = codebaseMemoryMcpEngine.getVisualGraphData();
      return NextResponse.json({ success: true, summary, ...visualData });
    }

    if (symbol) {
      const queryResult = codebaseMemoryMcpEngine.queryGraph(symbol);
      const callChain = codebaseMemoryMcpEngine.getCallChain(symbol, 4);
      return NextResponse.json({
        success: true,
        symbol,
        ...queryResult,
        callChain
      });
    }

    if (filePath) {
      const context = codebaseMemoryMcpEngine.getFileContext(filePath);
      return NextResponse.json({
        success: true,
        filePath,
        context
      });
    }

    if (query) {
      const symbols = codebaseMemoryMcpEngine.searchSymbols(query, kind);
      return NextResponse.json({
        success: true,
        query,
        count: symbols.length,
        symbols
      });
    }

    return NextResponse.json({
      status: 'active',
      engine: 'codebase-memory-mcp',
      summary,
      capabilities: [
        'index_codebase',
        'query_graph',
        'search_symbols',
        'get_call_chain',
        'get_file_context',
        'get_token_savings_metrics'
      ]
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Codebase Memory MCP error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, symbol, filePath, query, kind, maxDepth = 3, files } = body;

    if (action === 'index') {
      const filesToIndex = files || readWorkspaceFiles(process.cwd());
      const summary = codebaseMemoryMcpEngine.indexWorkspace(filesToIndex);
      return NextResponse.json({
        success: true,
        message: `Indexed ${summary.totalFiles} files into ${summary.totalNodes} AST nodes and ${summary.totalEdges} relations.`,
        summary
      });
    }

    if (action === 'query') {
      if (!symbol) {
        return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
      }
      const result = codebaseMemoryMcpEngine.queryGraph(symbol);
      const callChain = codebaseMemoryMcpEngine.getCallChain(symbol, maxDepth);
      return NextResponse.json({ success: true, ...result, callChain });
    }

    if (action === 'search') {
      const results = codebaseMemoryMcpEngine.searchSymbols(query || '', kind);
      return NextResponse.json({ success: true, count: results.length, symbols: results });
    }

    if (action === 'fileContext') {
      if (!filePath) {
        return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
      }
      const context = codebaseMemoryMcpEngine.getFileContext(filePath);
      return NextResponse.json({ success: true, filePath, context });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Codebase Memory POST failed' }, { status: 500 });
  }
}
