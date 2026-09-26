import { NextRequest, NextResponse } from 'next/server';
import { nanoBananaEngine, SearchOptions, EnrichmentOptions } from '@/lib/ai/nanoBananaEngine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'stats') {
      const stats = nanoBananaEngine.getStats();
      return NextResponse.json({ success: true, stats });
    }

    if (action === 'random') {
      const count = parseInt(searchParams.get('count') || '1', 10);
      const category = searchParams.get('category') || undefined;
      const prompts = nanoBananaEngine.getRandom(count, category);
      return NextResponse.json({ success: true, prompts });
    }

    const idParam = searchParams.get('id');
    if (idParam) {
      const id = parseInt(idParam, 10);
      const prompt = nanoBananaEngine.getById(id);
      if (!prompt) {
        return NextResponse.json({ success: false, error: `Prompt ${id} not found` }, { status: 404 });
      }
      return NextResponse.json({ success: true, prompt });
    }

    const query = searchParams.get('query') || searchParams.get('search') || '';
    const category = searchParams.get('category') || undefined;
    const style = searchParams.get('style') || undefined;
    const featuredOnly = searchParams.get('featured') === 'true';
    const sortBy = (searchParams.get('sortBy') as SearchOptions['sortBy']) || 'id';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const searchResult = nanoBananaEngine.search({
      query,
      category,
      style,
      featuredOnly,
      sortBy,
      limit,
      offset
    });

    const stats = nanoBananaEngine.getStats();

    return NextResponse.json({
      success: true,
      ...searchResult,
      categories: Object.keys(stats.categories),
      stats: {
        totalDataset: stats.total,
        categories: stats.categories,
        datasetSizeMB: stats.datasetSizeMB
      }
    });
  } catch (error: any) {
    console.error('[API /api/nano-banana GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, content, options, basePrompt, remixTheme } = body;

    if (action === 'enrich') {
      if (!content || typeof content !== 'string') {
        return NextResponse.json({ success: false, error: 'Content is required for enrichment' }, { status: 400 });
      }
      const enrichment = nanoBananaEngine.enrichPrompt(content, (options as EnrichmentOptions) || {});
      return NextResponse.json({ success: true, enrichment });
    }

    if (action === 'remix') {
      if (!basePrompt || !remixTheme) {
        return NextResponse.json({ success: false, error: 'basePrompt and remixTheme are required' }, { status: 400 });
      }
      const remixed = nanoBananaEngine.remixPrompt(basePrompt, remixTheme);
      return NextResponse.json({ success: true, remixedPrompt: remixed });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    console.error('[API /api/nano-banana POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
  }
}
