import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface ScannedGGUFFile {
  path: string;
  name: string;
  filename: string;
  sizeBytes: number;
  sizeFormatted: string;
  directory: string;
}

function scanDirForGGUF(dir: string, maxDepth = 2, currentDepth = 0): ScannedGGUFFile[] {
  let results: ScannedGGUFFile[] = [];
  if (!dir || !fs.existsSync(dir) || currentDepth > maxDepth) return results;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip heavy or unrelated directories
        if (['node_modules', '.next', '.git', 'dist', 'build'].includes(entry.name)) continue;
        results = results.concat(scanDirForGGUF(fullPath, maxDepth, currentDepth + 1));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gguf')) {
        try {
          const stat = fs.statSync(fullPath);
          const sizeGB = (stat.size / (1024 * 1024 * 1024)).toFixed(2);
          const baseName = entry.name.replace(/\.gguf$/i, '');
          results.push({
            path: fullPath,
            name: baseName,
            filename: entry.name,
            sizeBytes: stat.size,
            sizeFormatted: `${sizeGB} GB`,
            directory: dir,
          });
        } catch {}
      }
    }
  } catch {}

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const searchDirs: string[] = [];

    // Current workspace
    searchDirs.push(process.cwd());
    const modelsSubdir = path.join(process.cwd(), 'models');
    if (fs.existsSync(modelsSubdir)) searchDirs.push(modelsSubdir);

    // User's Downloads folder
    const userProfile = process.env.USERPROFILE || process.env.HOME || '';
    if (userProfile) {
      const downloadsDir = path.join(userProfile, 'Downloads');
      if (fs.existsSync(downloadsDir)) searchDirs.push(downloadsDir);

      const userModelsDir = path.join(userProfile, '.ollama', 'models');
      if (fs.existsSync(userModelsDir)) searchDirs.push(userModelsDir);
    }

    const uniquePaths = new Set<string>();
    const foundFiles: ScannedGGUFFile[] = [];

    for (const d of searchDirs) {
      const files = scanDirForGGUF(d, 1);
      for (const f of files) {
        if (!uniquePaths.has(f.path)) {
          uniquePaths.add(f.path);
          foundFiles.push(f);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: foundFiles.length,
      files: foundFiles,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      count: 0,
      files: [],
      error: err.message,
    }, { status: 500 });
  }
}
