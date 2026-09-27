import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { repomixEngine, RepomixPackOptions } from '@/lib/ai/repomixEngine';

export const dynamic = 'force-dynamic';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  'public',
  '.vscode',
  'integrations'
]);

const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css',
  '.html', '.yaml', '.yml', '.py', '.rs', '.go', '.sh', '.bat', '.ps1'
]);

function collectWorkspaceFiles(
  dir: string,
  baseDir: string,
  maxFiles = 400
): Record<string, string> {
  const result: Record<string, string> = {};

  function walk(current: string) {
    if (Object.keys(result).length >= maxFiles) return;
    try {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (Object.keys(result).length >= maxFiles) break;
        const fullPath = path.join(current, entry.name);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (ALLOWED_EXTENSIONS.has(ext)) {
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size < 400 * 1024) { // Skip files > 400KB
                result[relPath] = fs.readFileSync(fullPath, 'utf8');
              }
            } catch {}
          }
        }
      }
    } catch {}
  }

  walk(dir);
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      format = 'xml',
      tokenBudget,
      removeComments = false,
      redactSecrets = true,
      files: customFiles,
      headerInstruction
    } = body;

    let filesToPack: Record<string, string> = {};

    if (customFiles && typeof customFiles === 'object' && Object.keys(customFiles).length > 0) {
      filesToPack = customFiles;
    } else {
      const workspaceRoot = process.cwd();
      filesToPack = collectWorkspaceFiles(workspaceRoot, workspaceRoot);
    }

    const options: RepomixPackOptions = {
      format,
      tokenBudget: tokenBudget ? parseInt(tokenBudget, 10) : undefined,
      removeComments,
      redactSecrets,
      headerInstruction
    };

    const packResult = await repomixEngine.packWorkspace(filesToPack, options);

    return NextResponse.json({
      success: true,
      ...packResult
    });
  } catch (err: any) {
    console.error('[API /api/repomix/pack] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to pack repository context' },
      { status: 500 }
    );
  }
}
