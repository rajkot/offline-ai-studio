import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description = '', techStack } = body;

    const frontend = techStack?.frontend || 'React';
    const backend = techStack?.backend || 'Express';
    const database = techStack?.database || 'SQLite';
    const features: string[] = techStack?.features || [];

    const proposedFiles = [
      { path: 'package.json', category: 'config', required: true, desc: 'Project dependencies and build scripts' },
      { path: 'README.md', category: 'docs', required: false, desc: 'Project documentation and setup guide' }
    ];

    if (frontend === 'React' || frontend === 'Next.js') {
      proposedFiles.push(
        { path: 'src/App.tsx', category: 'frontend', required: true, desc: 'Main React application entry component' },
        { path: 'src/main.tsx', category: 'frontend', required: true, desc: 'ReactDOM mount script' },
        { path: 'src/index.css', category: 'frontend', required: false, desc: 'Global Tailwind CSS imports' }
      );
    } else if (frontend === 'Vue') {
      proposedFiles.push(
        { path: 'src/App.vue', category: 'frontend', required: true, desc: 'Main Vue 3 Single File Component' },
        { path: 'src/main.ts', category: 'frontend', required: true, desc: 'Vue application bootstrapper' }
      );
    } else {
      proposedFiles.push(
        { path: 'index.html', category: 'frontend', required: true, desc: 'Static HTML5 index page' }
      );
    }

    if (backend === 'Express') {
      proposedFiles.push(
        { path: 'server/index.js', category: 'backend', required: true, desc: 'Express API server with CORS & routes' }
      );
    } else if (backend === 'FastAPI') {
      proposedFiles.push(
        { path: 'server/main.py', category: 'backend', required: true, desc: 'FastAPI python REST server' }
      );
    }

    if (database === 'SQLite') {
      proposedFiles.push(
        { path: 'server/db.js', category: 'database', required: false, desc: 'Better-sqlite3 database initialization' }
      );
    } else if (database === 'MongoDB') {
      proposedFiles.push(
        { path: 'server/models/Item.js', category: 'database', required: false, desc: 'Mongoose collection model schema' }
      );
    }

    if (features.includes('Dockerfile')) {
      proposedFiles.push(
        { path: 'Dockerfile', category: 'devops', required: false, desc: 'Container build instructions' }
      );
    }

    if (features.includes('Unit Tests')) {
      proposedFiles.push(
        { path: 'tests/app.test.ts', category: 'testing', required: false, desc: 'Vitest unit test assertions' }
      );
    }

    return NextResponse.json({
      proposedFiles,
      estimatedFilesCount: proposedFiles.length,
      suggestedArchitecture: `${frontend} + ${backend} + ${database}`
    });
  } catch {
    return NextResponse.json({ error: 'Failed to plan scaffolding structure' }, { status: 500 });
  }
}
