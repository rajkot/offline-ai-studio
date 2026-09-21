import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getOllamaBaseUrl } from '@/lib/ai/ollamaClient';
import { findOllamaExecutable } from '@/lib/ai/ollamaDaemon';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  try {
    const { filePath, modelName: customName } = await req.json();

    if (!filePath || typeof filePath !== 'string') {
      return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `File not found at: ${filePath}` }, { status: 404 });
    }

    // Generate safe model name
    const rawBaseName = path.basename(filePath, path.extname(filePath));
    const safeName = (customName || rawBaseName)
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '-')
      .replace(/^-+|-+$/g, '');

    const baseUrl = getOllamaBaseUrl();

    // 1. Try Ollama REST API /api/create
    try {
      const normalizedPath = filePath.replace(/\\/g, '/');
      const modelfileContent = `FROM "${normalizedPath}"`;

      const createRes = await fetch(`${baseUrl}/api/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: safeName,
          modelfile: modelfileContent,
          stream: false,
        }),
      });

      if (createRes.ok) {
        return NextResponse.json({
          success: true,
          modelName: safeName,
          method: 'ollama_api',
          message: `Model "${safeName}" successfully registered into local Ollama from ${path.basename(filePath)}!`,
        });
      }
    } catch (apiErr) {
      console.warn('[ImportGGUF] REST /api/create attempt failed, falling back to CLI:', apiErr);
    }

    // 2. CLI fallback using `ollama create`
    const ollamaExe = findOllamaExecutable() || 'ollama';
    const tempModelfile = path.join(process.cwd(), `.temp_modelfile_${Date.now()}`);
    const normalizedPath = filePath.replace(/\\/g, '/');
    fs.writeFileSync(tempModelfile, `FROM "${normalizedPath}"\n`, 'utf-8');

    try {
      await execAsync(`"${ollamaExe}" create ${safeName} -f "${tempModelfile}"`, { timeout: 60000 });
      try { fs.unlinkSync(tempModelfile); } catch {}

      return NextResponse.json({
        success: true,
        modelName: safeName,
        method: 'ollama_cli',
        message: `Model "${safeName}" successfully registered into local Ollama via CLI!`,
      });
    } catch (cliErr: any) {
      try { fs.unlinkSync(tempModelfile); } catch {}
      return NextResponse.json({
        error: `Failed to create Ollama model: ${cliErr.message}`,
      }, { status: 500 });
    }

  } catch (err: any) {
    return NextResponse.json({
      error: err.message || 'Internal error importing GGUF file',
    }, { status: 500 });
  }
}
