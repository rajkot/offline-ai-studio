import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import { aiderEngine, EditBlock } from '@/lib/ai/aiderEngine';

const execAsync = util.promisify(exec);

export async function GET(req: NextRequest) {
  try {
    const cwd = process.cwd();
    const aiderDir = path.join(cwd, 'integrations', 'aider');
    const hasRepo = fs.existsSync(aiderDir);

    let gitBranch = 'main';
    let gitCommit = 'latest';

    if (hasRepo) {
      try {
        const { stdout: bOut } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: aiderDir });
        gitBranch = bOut.trim();
        const { stdout: cOut } = await execAsync('git rev-parse --short HEAD', { cwd: aiderDir });
        gitCommit = cOut.trim();
      } catch (e) {
        // fallback
      }
    }

    return NextResponse.json({
      success: true,
      hasRepo,
      aiderDir,
      gitBranch,
      gitCommit,
      modes: ['architect', 'editblock', 'wholefile'],
      repomapDefaultBudget: 1024
    });
  } catch (err: any) {
    console.error('Error in GET /api/aider:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to inspect aider environment' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'repomap' } = body;

    // 1. Generate Repo Map
    if (action === 'repomap') {
      const { files = {}, budgetTokens = 1024 } = body;
      const result = aiderEngine.generateRepoMap(files, budgetTokens);

      return NextResponse.json({
        success: true,
        repoMap: result
      });
    }

    // 2. Apply SEARCH/REPLACE Edit Blocks
    if (action === 'apply-diff') {
      const { rawDiffText, files = {}, defaultFile } = body;

      if (!rawDiffText) {
        return NextResponse.json({ success: false, error: 'rawDiffText is required' }, { status: 400 });
      }

      const blocks: EditBlock[] = aiderEngine.parseSearchReplaceBlocks(rawDiffText, defaultFile);
      if (blocks.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No valid <<<<<<< SEARCH ... ======= ... >>>>>>> blocks found in text.'
        }, { status: 400 });
      }

      const updatedFiles: Record<string, string> = {};
      const results: Array<{ filePath: string; success: boolean; error?: string }> = [];

      for (const block of blocks) {
        const currentContent = updatedFiles[block.filePath] !== undefined 
          ? updatedFiles[block.filePath] 
          : (files[block.filePath] || '');

        const outcome = aiderEngine.applyEditBlock(currentContent, block);
        if (outcome.success) {
          updatedFiles[block.filePath] = outcome.newContent;
          results.push({ filePath: block.filePath, success: true });
        } else {
          results.push({ filePath: block.filePath, success: false, error: outcome.error });
        }
      }

      const hasFailures = results.some(r => !r.success);

      return NextResponse.json({
        success: !hasFailures,
        results,
        updatedFiles,
        appliedCount: results.filter(r => r.success).length,
        totalBlocks: blocks.length
      });
    }

    // 3. Git Auto-Commit
    if (action === 'commit') {
      const { modifiedFiles = [], commitMessage } = body;
      const cwd = process.cwd();

      const message = commitMessage || aiderEngine.generateConventionalCommitMessage(modifiedFiles);

      try {
        await execAsync(`git add -A`, { cwd });
        const { stdout: cOut } = await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd });

        return NextResponse.json({
          success: true,
          commitMessage: message,
          output: cOut.trim()
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err?.message || 'Git commit execution failed'
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/aider:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to process aider operation' },
      { status: 500 }
    );
  }
}
