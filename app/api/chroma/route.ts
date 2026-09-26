import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { chromaClient, ChromaCollection } from '@/lib/vectorDbEngine';

const execAsync = util.promisify(exec);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';
    const rootDir = process.cwd();
    const chromaDir = path.join(rootDir, 'integrations', 'chroma');
    const hasRepo = fs.existsSync(chromaDir);

    if (action === 'heartbeat') {
      return NextResponse.json({
        'nanosecond heartbeat': Date.now() * 1000000,
        status: 'ok'
      });
    }

    if (action === 'version') {
      return NextResponse.json({
        version: chromaClient.version(),
        commit: 'main'
      });
    }

    if (action === 'list-collections') {
      const collections = chromaClient.listCollections();
      return NextResponse.json({
        success: true,
        collections
      });
    }

    if (action === 'get-collection') {
      const name = searchParams.get('name');
      if (!name) {
        return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
      }
      try {
        const col = chromaClient.getCollection({ name });
        const peek = col.peek(20);
        return NextResponse.json({
          success: true,
          collection: {
            id: col.id,
            name: col.name,
            metadata: col.metadata,
            count: col.count(),
            distanceMetric: col.distanceMetric
          },
          peek
        });
      } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
    }

    // Default: Status & Diagnostics
    let hasPython = false;
    let pythonVersion = '';
    let hasChromaPy = false;

    try {
      const { stdout } = await execAsync('python --version', { timeout: 2500 });
      hasPython = true;
      pythonVersion = stdout.trim();
    } catch (_) {
      try {
        const { stdout } = await execAsync('py -3 --version', { timeout: 2500 });
        hasPython = true;
        pythonVersion = stdout.trim();
      } catch (__) {
        hasPython = false;
      }
    }

    if (hasPython) {
      try {
        await execAsync('python -c "import chromadb"', { timeout: 3000 });
        hasChromaPy = true;
      } catch (_) {
        hasChromaPy = false;
      }
    }

    // Check if Chroma server is running on default port 8000
    let isServerRunning = false;
    try {
      const res = await fetch('http://localhost:8000/api/v1/heartbeat', {
        signal: AbortSignal.timeout(1200)
      });
      if (res.ok) isServerRunning = true;
    } catch (_) {
      isServerRunning = false;
    }

    const collections = chromaClient.listCollections();
    const totalRecords = collections.reduce((acc, c) => acc + c.count, 0);

    return NextResponse.json({
      success: true,
      hasRepo,
      chromaDir: hasRepo ? chromaDir : null,
      hasPython,
      pythonVersion,
      hasChromaPy,
      isServerRunning,
      clientVersion: chromaClient.version(),
      collections,
      collectionsCount: collections.length,
      totalRecords
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create-collection') {
      const { name, metadata } = body;
      if (!name) return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
      const col = chromaClient.getOrCreateCollection({ name, metadata });
      return NextResponse.json({
        success: true,
        collection: {
          id: col.id,
          name: col.name,
          metadata: col.metadata,
          count: col.count()
        }
      });
    }

    if (action === 'delete-collection') {
      const { name } = body;
      if (!name) return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
      chromaClient.deleteCollection({ name });
      return NextResponse.json({ success: true, message: `Collection ${name} deleted` });
    }

    if (action === 'add' || action === 'upsert') {
      const { collectionName = 'offline_ai_workspace', ids, documents, metadatas, embeddings } = body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
      }
      const col = chromaClient.getOrCreateCollection({ name: collectionName });
      if (action === 'add') {
        col.add({ ids, documents, metadatas, embeddings });
      } else {
        col.upsert({ ids, documents, metadatas, embeddings });
      }
      return NextResponse.json({
        success: true,
        collectionName,
        totalCount: col.count(),
        addedCount: ids.length
      });
    }

    if (action === 'query') {
      const {
        collectionName = 'offline_ai_workspace',
        queryTexts,
        queryEmbeddings,
        nResults = 5,
        where,
        whereDocument,
        include = ['documents', 'metadatas', 'distances']
      } = body;

      const col = chromaClient.getOrCreateCollection({ name: collectionName });
      const result = col.query({
        queryTexts,
        queryEmbeddings,
        nResults,
        where,
        whereDocument,
        include
      });

      return NextResponse.json({
        success: true,
        collectionName,
        result
      });
    }

    if (action === 'get') {
      const {
        collectionName = 'offline_ai_workspace',
        ids,
        where,
        whereDocument,
        limit = 20,
        offset = 0,
        include = ['documents', 'metadatas']
      } = body;

      const col = chromaClient.getOrCreateCollection({ name: collectionName });
      const result = col.get({ ids, where, whereDocument, limit, offset, include });

      return NextResponse.json({
        success: true,
        collectionName,
        result
      });
    }

    if (action === 'delete') {
      const { collectionName = 'offline_ai_workspace', ids, where, whereDocument } = body;
      const col = chromaClient.getOrCreateCollection({ name: collectionName });
      col.delete({ ids, where, whereDocument });
      return NextResponse.json({
        success: true,
        collectionName,
        remainingCount: col.count()
      });
    }

    if (action === 'reset') {
      chromaClient.reset();
      return NextResponse.json({ success: true, message: 'Chroma database reset' });
    }

    if (action === 'seed-demo') {
      const col = chromaClient.getOrCreateCollection({
        name: 'chroma_quickstart',
        metadata: { 'hnsw:space': 'cosine', 'description': 'Chroma AI vector database getting started collection' }
      });

      col.upsert({
        ids: ['doc1', 'doc2', 'doc3', 'doc4', 'doc5'],
        documents: [
          'Chroma is the open-source AI vector database designed to make it easy to build LLM apps with memory.',
          'Offline AI Studio runs 100% locally with air-gapped GGUF inference and AST PageRank vector search.',
          'Embeddings convert unstructured text, images, and audio into high-dimensional semantic vector spaces.',
          'Cosine similarity measures the angle between vectors, while Euclidean L2 distance calculates straight-line distance.',
          'Model Context Protocol (MCP) provides universal JSON-RPC tool integrations for AI agents and LLMs.'
        ],
        metadatas: [
          { category: 'vector-db', source: 'chroma-docs', year: 2024 },
          { category: 'workbench', source: 'offline-ai-studio', year: 2026 },
          { category: 'embeddings', source: 'ai-primer', year: 2024 },
          { category: 'math', source: 'linear-algebra', year: 2023 },
          { category: 'mcp', source: 'anthropic-spec', year: 2025 }
        ]
      });

      return NextResponse.json({
        success: true,
        collection: 'chroma_quickstart',
        count: col.count(),
        message: 'Sample demo documents seeded successfully'
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
