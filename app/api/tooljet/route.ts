import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = util.promisify(exec);

export async function GET(req: NextRequest) {
  const rootDir = process.cwd();
  const tooljetDir = path.join(rootDir, 'integrations', 'ToolJet');
  const hasRepo = fs.existsSync(tooljetDir);
  const hasDockerCompose = 
    fs.existsSync(path.join(tooljetDir, 'docker-compose.yml')) ||
    fs.existsSync(path.join(tooljetDir, 'docker-compose.yaml')) ||
    fs.existsSync(path.join(tooljetDir, 'deploy', 'docker', 'docker-compose.yml')) ||
    fs.existsSync(path.join(tooljetDir, 'deploy', 'docker', 'docker-compose.yaml'));

  // Test if ToolJet server port 8082 is reachable
  let isRunning = false;
  let statusText = 'Offline';
  try {
    const res = await fetch('http://localhost:8082', {
      signal: AbortSignal.timeout(1200),
      headers: { 'Accept': 'text/html' }
    });
    if (res.ok || res.status === 401 || res.status === 200 || res.status === 302) {
      isRunning = true;
      statusText = 'Online (Port 8082)';
    }
  } catch (_) {
    isRunning = false;
    statusText = 'Stopped / Offline';
  }

  // Check Docker CLI availability
  let hasDocker = false;
  try {
    await execAsync('docker --version', { timeout: 2000 });
    hasDocker = true;
  } catch (_) {
    hasDocker = false;
  }

  return NextResponse.json({
    hasRepo,
    hasDockerCompose,
    isRunning,
    statusText,
    hasDocker,
    tooljetUrl: 'http://localhost:8082',
    tooljetDir: hasRepo ? tooljetDir : null
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, appName, pageCode } = body;
    const rootDir = process.cwd();
    const tooljetDir = path.join(rootDir, 'integrations', 'ToolJet');

    if (action === 'start') {
      let composeFile = path.join(tooljetDir, 'docker-compose.yml');
      if (!fs.existsSync(composeFile)) {
        composeFile = path.join(tooljetDir, 'docker-compose.yaml');
      }
      if (!fs.existsSync(composeFile)) {
        composeFile = path.join(tooljetDir, 'deploy', 'docker', 'docker-compose.yml');
      }
      if (!fs.existsSync(composeFile)) {
        composeFile = path.join(tooljetDir, 'deploy', 'docker', 'docker-compose.yaml');
      }

      if (!fs.existsSync(composeFile)) {
        // Generate a standard air-gapped ToolJet compose file if needed
        const defaultCompose = `version: '3.8'
services:
  client:
    image: tooljet/tooljet-client:latest
    restart: unless-stopped
    ports:
      - 8082:80
    environment:
      - TOOLJET_SERVER_URL=http://localhost:3000
    depends_on:
      - server
  server:
    image: tooljet/tooljet-server:latest
    restart: unless-stopped
    ports:
      - 3005:3000
    environment:
      - TOOLJET_HOST=http://localhost:8082
      - LOCKBOX_MASTER_KEY=12345678901234567890123456789012
      - SECRET_KEY_BASE=12345678901234567890123456789012
      - DATABASE_URL=postgres://tooljet:tooljet@db:5432/tooljet_production
    depends_on:
      - db
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_USER=tooljet
      - POSTGRES_PASSWORD=tooljet
      - POSTGRES_DB=tooljet_production
    volumes:
      - tooljet_db_data:/var/lib/postgresql/data
volumes:
  tooljet_db_data:
`;
        fs.writeFileSync(path.join(tooljetDir, 'docker-compose.yml'), defaultCompose, 'utf-8');
        composeFile = path.join(tooljetDir, 'docker-compose.yml');
      }

      const { stdout } = await execAsync(`docker compose -f "${composeFile}" up -d`, {
        cwd: tooljetDir,
        timeout: 60000
      });

      return NextResponse.json({ success: true, message: 'ToolJet containers starting...', output: stdout });
    }

    if (action === 'stop') {
      let composeFile = path.join(tooljetDir, 'docker-compose.yml');
      if (!fs.existsSync(composeFile)) {
        composeFile = path.join(tooljetDir, 'docker-compose.yaml');
      }
      if (!fs.existsSync(composeFile)) {
        composeFile = path.join(tooljetDir, 'deploy', 'docker', 'docker-compose.yml');
      }
      if (!fs.existsSync(composeFile)) {
        composeFile = path.join(tooljetDir, 'deploy', 'docker', 'docker-compose.yaml');
      }

      if (fs.existsSync(composeFile)) {
        await execAsync(`docker compose -f "${composeFile}" down`, {
          cwd: tooljetDir,
          timeout: 30000
        });
      }

      return NextResponse.json({ success: true, message: 'ToolJet containers stopped' });
    }

    if (action === 'save-tool-page') {
      if (!appName || !pageCode) {
        return NextResponse.json({ error: 'Missing appName or pageCode' }, { status: 400 });
      }

      const safeName = appName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const targetDir = path.join(rootDir, 'app', 'tools', safeName);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const targetFile = path.join(targetDir, 'page.tsx');
      fs.writeFileSync(targetFile, pageCode, 'utf-8');

      return NextResponse.json({
        success: true,
        filePath: `app/tools/${safeName}/page.tsx`,
        routeUrl: `/tools/${safeName}`
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Operation failed' }, { status: 500 });
  }
}
