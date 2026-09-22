import { NextRequest, NextResponse } from 'next/server';
import { MCP_SERVERS_REGISTRY } from '@/lib/mcp/registryCatalog';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query')?.toLowerCase().trim() || '';
  const category = searchParams.get('category') || 'All';

  const filtered = MCP_SERVERS_REGISTRY.filter(server => {
    const matchesCategory = category === 'All' || server.category.toLowerCase() === category.toLowerCase();
    const matchesQuery = !query ||
      server.name.toLowerCase().includes(query) ||
      server.displayName.toLowerCase().includes(query) ||
      server.description.toLowerCase().includes(query) ||
      server.author.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  return NextResponse.json({
    success: true,
    total: filtered.length,
    servers: filtered
  });
}
