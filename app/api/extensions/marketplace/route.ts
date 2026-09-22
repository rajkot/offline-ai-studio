import { NextRequest, NextResponse } from 'next/server';
import { OFFLINE_EXTENSIONS_CATALOG, VscodeMarketplaceItem } from '@/lib/extensions/marketplaceCatalog';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'search';
  const query = searchParams.get('query')?.toLowerCase().trim() || '';
  const category = searchParams.get('category') || 'All';
  const size = parseInt(searchParams.get('size') || '30', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Download VSIX Proxy
  if (action === 'download-vsix') {
    const downloadUrl = searchParams.get('url');
    if (!downloadUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
      const response = await fetch(downloadUrl, {
        headers: { 'User-Agent': 'OfflineAiStudio/1.0.0' }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch VSIX: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="extension.vsix"`
        }
      });
    } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Download failed' }, { status: 500 });
    }
  }

  // Live Open VSX Search with graceful offline fallback
  let liveItems: VscodeMarketplaceItem[] = [];
  let isLive = false;

  try {
    const openVsxUrl = new URL('https://open-vsx.org/api/-/search');
    if (query) openVsxUrl.searchParams.set('query', query);
    if (category && category !== 'All') {
      openVsxUrl.searchParams.set('category', category);
    }
    openVsxUrl.searchParams.set('size', String(size));
    openVsxUrl.searchParams.set('offset', String(offset));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // Fast 2.5s timeout for air-gapped environments

    const res = await fetch(openVsxUrl.toString(), {
      signal: controller.signal,
      headers: { 'Accept': 'application/json', 'User-Agent': 'OfflineAiStudio/1.0.0' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.extensions)) {
        isLive = true;
        liveItems = data.extensions.map((ext: any) => ({
          id: `${ext.namespace}.${ext.name}`,
          name: ext.name,
          displayName: ext.displayName || ext.name,
          publisher: ext.namespace,
          publisherDisplayName: ext.namespaceDisplayName || ext.namespace,
          version: ext.version,
          description: ext.description || '',
          icon: ext.files?.icon,
          category: (ext.categories?.[0] || 'Productivity') as any,
          downloads: ext.downloadCount ? `${(ext.downloadCount / 1000000).toFixed(1)}M` : '100K+',
          rating: ext.averageRating ? Math.round(ext.averageRating * 10) / 10 : 4.8,
          verified: ext.verified || false,
          downloadUrl: ext.files?.download,
          repository: ext.repository,
          tags: ext.tags || []
        }));
      }
    }
  } catch {
    // Air-gapped / offline environment — fallback to rich built-in catalog
    isLive = false;
  }

  // Combine live results or use offline catalog
  let results: VscodeMarketplaceItem[] = [];
  if (isLive && liveItems.length > 0) {
    results = liveItems;
  } else {
    // Filter offline catalog
    results = OFFLINE_EXTENSIONS_CATALOG.filter(item => {
      const matchesCategory = category === 'All' || item.category.toLowerCase() === category.toLowerCase();
      const matchesQuery = !query ||
        item.name.toLowerCase().includes(query) ||
        item.displayName.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.publisher.toLowerCase().includes(query) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(query)));
      return matchesCategory && matchesQuery;
    });
  }

  return NextResponse.json({
    success: true,
    isLive,
    source: isLive ? 'Open VSX Registry (Online)' : 'Air-Gapped Built-in Registry (Offline)',
    total: results.length,
    extensions: results
  });
}
