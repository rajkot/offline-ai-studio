import { NextRequest, NextResponse } from 'next/server';
import { lanceDbEngine } from '@/lib/ai/lancedbEngine';

export async function GET() {
  try {
    const stats = lanceDbEngine.getStats();
    const tableNames = lanceDbEngine.listTables();
    const tablesSummary = tableNames.map(name => {
      const table = lanceDbEngine.getTable(name);
      return {
        name,
        vectorDim: table?.schema.vectorDim || 0,
        metric: table?.schema.metric || 'cosine',
        recordsCount: table?.records.length || 0,
        sizeBytes: table?.sizeBytes || 0,
        indexedFields: table?.schema.indexedFields || []
      };
    });

    return NextResponse.json({
      status: 'online',
      ...stats,
      repository: 'https://github.com/lancedb/lancedb.git',
      localPath: 'integrations/lancedb',
      tables: tablesSummary,
      supportedMetrics: ['cosine', 'l2', 'dot'],
      features: [
        'Zero-Cloud Embedded Serverless RAG',
        'Apache Arrow Columnar Lance Format',
        'Hybrid Search (Dense ANN + Sparse BM25)',
        'Zero-Copy Memory-Mapped Disk I/O',
        'Metadata Attribute Filtering'
      ]
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, tableName, schema, records, options } = body;

    if (action === 'query') {
      if (!tableName) {
        return NextResponse.json({ error: 'tableName is required for query' }, { status: 400 });
      }
      const response = lanceDbEngine.search(tableName, options);
      return NextResponse.json(response);
    }

    if (action === 'insert') {
      if (!tableName || !records) {
        return NextResponse.json({ error: 'tableName and records are required for insert' }, { status: 400 });
      }
      const insertedCount = lanceDbEngine.insert(tableName, records);
      return NextResponse.json({ success: true, insertedCount });
    }

    if (action === 'createTable') {
      if (!tableName || !schema) {
        return NextResponse.json({ error: 'tableName and schema are required' }, { status: 400 });
      }
      const table = lanceDbEngine.createTable(tableName, schema, records || []);
      return NextResponse.json({ success: true, table });
    }

    if (action === 'deleteTable') {
      if (!tableName) {
        return NextResponse.json({ error: 'tableName is required' }, { status: 400 });
      }
      const deleted = lanceDbEngine.deleteTable(tableName);
      return NextResponse.json({ success: deleted });
    }

    if (action === 'stats') {
      return NextResponse.json(lanceDbEngine.getStats());
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
