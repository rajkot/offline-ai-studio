import { NextRequest, NextResponse } from 'next/server';
import { awesomeLlmAppsEngine } from '@/lib/ai/awesomeLlmAppsEngine';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('q') || searchParams.get('query') || undefined;
    const appId = searchParams.get('appId') || searchParams.get('id');

    if (appId) {
      const app = awesomeLlmAppsEngine.getAppById(appId);
      if (!app) {
        return NextResponse.json({ error: `App '${appId}' not found` }, { status: 404 });
      }

      // Try reading primary file source code if available
      let sourceCode = '';
      const appFolder = path.join(process.cwd(), 'awesome-llm-apps', app.relPath);
      const directFile = path.join(appFolder, app.primaryFile || 'app.py');
      
      if (fs.existsSync(directFile) && fs.statSync(directFile).isFile()) {
        try {
          sourceCode = fs.readFileSync(directFile, 'utf8');
        } catch {}
      } else if (fs.existsSync(appFolder)) {
        // Find first python or js/ts file in folder
        try {
          if (fs.statSync(appFolder).isFile()) {
            sourceCode = fs.readFileSync(appFolder, 'utf8');
          } else {
            const files = fs.readdirSync(appFolder);
            const pyFile = files.find(f => f.endsWith('.py') || f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.md'));
            if (pyFile) {
              sourceCode = fs.readFileSync(path.join(appFolder, pyFile), 'utf8');
            }
          }
        } catch {}
      }

      if (!sourceCode) {
        sourceCode = `# ${app.name}\n# Framework: ${app.framework}\n# Category: ${app.categoryLabel}\n# Tags: ${app.tags.join(', ')}\n\n"""\n${app.description}\n"""\n\nimport os\n\ndef main():\n    print("Starting ${app.name}...")\n\nif __name__ == "__main__":\n    main()\n`;
      }

      return NextResponse.json({ app, content: sourceCode, sourceCode });
    }

    const apps = awesomeLlmAppsEngine.searchApps(query || '', category);
    const categories = awesomeLlmAppsEngine.getCategories();
    const total = awesomeLlmAppsEngine.getAllApps().length;

    return NextResponse.json({
      status: 'ready',
      total,
      filteredCount: apps.length,
      categories,
      apps
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Awesome LLM Apps' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, appId } = body;
    const targetFolder = body.targetDir || body.targetFolderName;

    if (action === 'scaffold') {
      if (!appId) {
        return NextResponse.json({ error: 'appId is required' }, { status: 400 });
      }

      const res = awesomeLlmAppsEngine.scaffoldAppToWorkspace(appId, targetFolder);
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process Awesome LLM Apps request' }, { status: 500 });
  }
}
