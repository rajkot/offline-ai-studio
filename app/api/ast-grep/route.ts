import { NextRequest, NextResponse } from 'next/server';
import { astGrepEngine, BUILTIN_AST_RULES, AstGrepRule } from '@/lib/ai/astGrepEngine';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'online',
      engine: 'ast-grep (Rust-based AST Structural Search & Rewriter)',
      repository: 'https://github.com/ast-grep/ast-grep.git',
      localPath: 'integrations/ast-grep',
      supportedLanguages: [
        'typescript',
        'javascript',
        'python',
        'rust',
        'go',
        'html',
        'css'
      ],
      capabilities: [
        'AST Structural Wildcards ($VAR, $$$ARGS)',
        'Syntactic Pattern Rewriting',
        'Declarative YAML/JSON Lint Rules',
        'Language-Agnostic Tree-Sitter Parsers',
        'Atomic Workspace-wide Refactoring'
      ],
      builtinRulesCount: BUILTIN_AST_RULES.length,
      builtinRules: BUILTIN_AST_RULES
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, files = {}, pattern = '', rewrite = '', language = 'all', rules } = body;

    if (action === 'search') {
      if (!pattern) {
        return NextResponse.json({ error: 'pattern is required for search' }, { status: 400 });
      }
      const result = astGrepEngine.searchPattern(files, pattern, language);
      return NextResponse.json(result);
    }

    if (action === 'rewrite') {
      if (!pattern) {
        return NextResponse.json({ error: 'pattern is required for rewrite' }, { status: 400 });
      }
      const result = astGrepEngine.rewritePattern(files, pattern, rewrite, language);
      return NextResponse.json(result);
    }

    if (action === 'lint') {
      const result = astGrepEngine.lintWorkspace(files, rules);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
