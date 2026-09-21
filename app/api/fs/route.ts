import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const IGNORED_NAMES = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.turbo', '.cache']);

function readDirRecursive(dirPath: string, rootDir: string, result: Record<string, string>, depth = 0) {
  if (depth > 10) return;
  if (!fs.existsSync(dirPath)) return;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (IGNORED_NAMES.has(entry.name)) continue;

    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      readDirRecursive(fullPath, rootDir, result, depth + 1);
    } else if (entry.isFile()) {
      try {
        const stat = fs.statSync(fullPath);
        // Only read files under 2MB
        if (stat.size <= 2 * 1024 * 1024) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          result[relativePath] = content;
        }
      } catch {
        // Skip unreadable files
      }
    }
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'list';
    const targetPath = searchParams.get('path') || searchParams.get('dir') || process.cwd();

    if (action === 'list') {
      const resolvedDir = path.resolve(targetPath);
      if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
        return NextResponse.json({ error: `Directory not found: ${resolvedDir}` }, { status: 404 });
      }

      const files: Record<string, string> = {};
      readDirRecursive(resolvedDir, resolvedDir, files);

      return NextResponse.json({
        success: true,
        directory: resolvedDir,
        directoryName: path.basename(resolvedDir),
        filesCount: Object.keys(files).length,
        files
      });
    }

    if (action === 'read') {
      const resolvedFile = path.resolve(targetPath);
      if (!fs.existsSync(resolvedFile) || !fs.statSync(resolvedFile).isFile()) {
        return NextResponse.json({ error: `File not found: ${resolvedFile}` }, { status: 404 });
      }

      const content = fs.readFileSync(resolvedFile, 'utf-8');
      return NextResponse.json({
        success: true,
        filePath: resolvedFile,
        content
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action = 'write', filePath, content, isDirectory } = body;

    if (!filePath) {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    const resolved = path.resolve(filePath);

    if (action === 'write') {
      const dir = path.dirname(resolved);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(resolved, content ?? '', 'utf-8');
      return NextResponse.json({ success: true, filePath: resolved, size: Buffer.byteLength(content ?? '') });
    }

    if (action === 'create') {
      if (isDirectory) {
        fs.mkdirSync(resolved, { recursive: true });
      } else {
        const dir = path.dirname(resolved);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(resolved, content ?? '', 'utf-8');
      }
      return NextResponse.json({ success: true, path: resolved });
    }

    if (action === 'delete') {
      if (fs.existsSync(resolved)) {
        const stat = fs.statSync(resolved);
        if (stat.isDirectory()) {
          fs.rmSync(resolved, { recursive: true, force: true });
        } else {
          fs.unlinkSync(resolved);
        }
      }
      return NextResponse.json({ success: true, deleted: resolved });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
