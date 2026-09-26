import { NextRequest, NextResponse } from 'next/server';
import { chonkieEngine } from '@/lib/ai/chonkieEngine';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'online',
      engine: 'Chonkie: High-Performance AST & Semantic Chunking Engine',
      repository: 'https://github.com/chonkie-inc/chonkie.git',
      localPath: 'integrations/chonkie',
      chunkers: [
        {
          name: 'CodeChunker',
          description: 'Tree-sitter AST-aware chunking preserving functions, classes, and import context',
          syntaxIntegrity: '100%'
        },
        {
          name: 'SemanticChunker',
          description: 'Sentence & statement clustering based on semantic boundary coherence',
          syntaxIntegrity: '94%'
        },
        {
          name: 'RecursiveChunker',
          description: 'Hierarchical multi-separator chunking (paragraphs -> sentences -> words)',
          syntaxIntegrity: '90%'
        },
        {
          name: 'TokenChunker',
          description: 'Fast sliding-window token-budget chunking',
          syntaxIntegrity: '42%'
        }
      ],
      features: [
        'Tree-sitter AST Code Boundary Detection',
        'Module Import Prelude Preservation',
        'Direct Pipeline to LanceDB Columnar Vectors',
        'Zero-Cloud In-Process Execution',
        'Sub-millisecond Performance'
      ]
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, text = '', filePath = 'code.ts', strategy = 'CodeChunker', options = {}, files = {} } = body;

    if (action === 'chunk') {
      if (!text) {
        return NextResponse.json({ error: 'text is required for chunking' }, { status: 400 });
      }

      let result;
      if (strategy === 'RecursiveChunker') {
        result = chonkieEngine.chunkRecursive(text, filePath, options);
      } else if (strategy === 'TokenChunker') {
        result = chonkieEngine.chunkTokens(text, filePath, options);
      } else {
        result = chonkieEngine.chunkCode(text, filePath, options);
      }

      return NextResponse.json(result);
    }

    if (action === 'chunkWorkspace') {
      const targetTable = body.targetTable || 'workspace_code_vectors';
      const result = chonkieEngine.chunkWorkspaceAndIndex(files, targetTable, options);
      return NextResponse.json(result);
    }

    if (action === 'benchmark') {
      const sample = text || `
import React, { useState, useEffect } from 'react';
import { Database, Search } from 'lucide-react';

export function calculateMetrics(records: any[]) {
  const total = records.length;
  let active = 0;
  for (const r of records) {
    if (r.active) active++;
  }
  return { total, active, ratio: total > 0 ? active / total : 0 };
}

export class VectorEngine {
  private dim: number;
  constructor(dim: number) {
    this.dim = dim;
  }
  public search(vec: number[]) {
    return vec.slice(0, this.dim);
  }
}
      `;
      const result = chonkieEngine.runBenchmark(sample);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
