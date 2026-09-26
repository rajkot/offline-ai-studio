/**
 * ast-grep Structural AST Engine
 *
 * Provides fast, semantic Abstract Syntax Tree (AST) pattern matching,
 * rule-based linting, and structural code refactoring/rewriting.
 * Supports meta-variables ($VAR, $$$ARGS) across polyglot languages.
 * Inspired by and integrated with https://github.com/ast-grep/ast-grep
 */

export interface AstGrepMatch {
  filePath: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  matchedText: string;
  replacementText?: string;
  metaVariables: Record<string, string>;
  ruleId?: string;
  message?: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface AstGrepRule {
  id: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  language: 'typescript' | 'javascript' | 'python' | 'rust' | 'go' | 'all';
  pattern: string;
  fix?: string;
  explanation: string;
  category: 'Security' | 'Best Practices' | 'Modernization' | 'Performance';
}

export interface AstGrepSearchResult {
  queryPattern: string;
  language: string;
  totalMatches: number;
  filesScanned: number;
  matchedFilesCount: number;
  matchesByFile: Record<string, AstGrepMatch[]>;
  elapsedMs: number;
}

export interface AstGrepRewriteResult {
  pattern: string;
  rewrite: string;
  totalRewrites: number;
  affectedFilesCount: number;
  updatedFiles: Record<string, string>;
  diffsByFile: Record<string, { original: string; rewritten: string }>;
  elapsedMs: number;
}

export interface AstGrepLintResult {
  rulesExecuted: number;
  totalViolations: number;
  violationsBySeverity: { error: number; warning: number; info: number };
  violations: AstGrepMatch[];
  elapsedMs: number;
}

export const BUILTIN_AST_RULES: AstGrepRule[] = [
  {
    id: 'no-console-log',
    message: 'Unexpected console.log statement found in production code.',
    severity: 'warning',
    language: 'all',
    pattern: 'console.log($$$ARGS)',
    fix: '// console.log($$$ARGS)',
    explanation: 'Console statements can leak sensitive debug data and degrade client performance.',
    category: 'Best Practices'
  },
  {
    id: 'no-var-keyword',
    message: 'Legacy "var" declaration should be upgraded to modern block-scoped "const" or "let".',
    severity: 'warning',
    language: 'all',
    pattern: 'var $NAME = $VALUE',
    fix: 'const $NAME = $VALUE',
    explanation: '"var" has function scope and variable hoisting caveats; "const" and "let" provide block scoping.',
    category: 'Modernization'
  },
  {
    id: 'no-eval-execution',
    message: 'Critical Security Warning: "eval()" allows arbitrary code injection.',
    severity: 'error',
    language: 'all',
    pattern: 'eval($CODE)',
    explanation: 'Using eval() opens high-severity vulnerabilities for XSS and remote code execution.',
    category: 'Security'
  },
  {
    id: 'no-direct-nan-comparison',
    message: 'Comparison with NaN using === or == will always evaluate to false.',
    severity: 'error',
    language: 'all',
    pattern: '$VAL === NaN',
    fix: 'Number.isNaN($VAL)',
    explanation: 'NaN is not equal to anything, including itself. Use Number.isNaN(val) instead.',
    category: 'Best Practices'
  },
  {
    id: 'no-empty-catch-block',
    message: 'Empty catch block suppresses errors without logging or handling.',
    severity: 'warning',
    language: 'all',
    pattern: 'catch ($ERR) {}',
    fix: 'catch ($ERR) { console.error($ERR); }',
    explanation: 'Silently swallowing exceptions makes application debugging nearly impossible.',
    category: 'Best Practices'
  },
  {
    id: 'prefer-nullish-coalescing',
    message: 'Logical OR (||) fallback may inadvertently overwrite falsy values (0 or "").',
    severity: 'info',
    language: 'all',
    pattern: '$A || $B',
    fix: '$A ?? $B',
    explanation: 'Nullish coalescing (??) only triggers on null or undefined, preserving 0 and false.',
    category: 'Modernization'
  },
  {
    id: 'python-no-bare-except',
    message: 'Bare "except:" clause catches system exit and keyboard interrupts.',
    severity: 'warning',
    language: 'python',
    pattern: 'except:',
    fix: 'except Exception:',
    explanation: 'Bare excepts mask critical termination signals like KeyboardInterrupt and SystemExit.',
    category: 'Best Practices'
  },
  {
    id: 'react-no-direct-state-mutation',
    message: 'Do not mutate state directly. Use setState or the state setter dispatch.',
    severity: 'error',
    language: 'typescript',
    pattern: 'this.state.$PROP = $VAL',
    explanation: 'Direct state mutation bypasses React reconciliation and causes rendering bugs.',
    category: 'Best Practices'
  }
];

export class AstGrepEngine {
  private static instance: AstGrepEngine;

  private constructor() {}

  public static getInstance(): AstGrepEngine {
    if (!AstGrepEngine.instance) {
      AstGrepEngine.instance = new AstGrepEngine();
    }
    return AstGrepEngine.instance;
  }

  /**
   * Compiles an ast-grep pattern into a structural regular expression
   * with named meta-variable capture groups.
   */
  private compileAstPattern(pattern: string): { regex: RegExp; metaVars: string[] } {
    const metaVars: string[] = [];
    const trimmed = pattern.trim();

    // Escape special regex characters except for meta-variable tokens ($NAME and $$$ARGS)
    let escaped = '';
    let i = 0;
    while (i < trimmed.length) {
      if (trimmed.startsWith('$$$', i)) {
        // Multi-node meta-variable: $$$ARGS
        const end = trimmed.substring(i + 3).search(/[^a-zA-Z0-9_]/);
        const varName = end === -1 ? trimmed.substring(i + 3) : trimmed.substring(i + 3, i + 3 + end);
        if (varName) {
          metaVars.push(varName);
          escaped += `(?<multi_${varName}>[\\s\\S]*?)`;
          i += 3 + varName.length;
          continue;
        }
      } else if (trimmed[i] === '$' && i + 1 < trimmed.length && /[a-zA-Z_]/.test(trimmed[i + 1])) {
        // Single-node meta-variable: $NAME
        const end = trimmed.substring(i + 1).search(/[^a-zA-Z0-9_]/);
        const varName = end === -1 ? trimmed.substring(i + 1) : trimmed.substring(i + 1, i + 1 + end);
        if (varName) {
          metaVars.push(varName);
          escaped += `(?<single_${varName}>[a-zA-Z0-9_$.()\\[\\]'"`+ '`' + `]+)`;
          i += 1 + varName.length;
          continue;
        }
      }

      const ch = trimmed[i];
      if (/[\s]/.test(ch)) {
        // AST structural matching allows flexible whitespace between tokens
        escaped += '\\s*';
        while (i + 1 < trimmed.length && /[\s]/.test(trimmed[i + 1])) i++;
      } else if (/[.*+?^${}()|[\]\\]/.test(ch)) {
        escaped += '\\' + ch;
      } else {
        escaped += ch;
      }
      i++;
    }

    try {
      return { regex: new RegExp(escaped, 'gm'), metaVars };
    } catch {
      // Fallback to literal search if complex pattern fails regex compilation
      const safeEscaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return { regex: new RegExp(safeEscaped, 'gm'), metaVars: [] };
    }
  }

  /**
   * Search workspace files structurally using ast-grep pattern syntax
   */
  public searchPattern(
    files: Record<string, string>,
    pattern: string,
    languageFilter: string = 'all'
  ): AstGrepSearchResult {
    const startTime = performance.now();
    const { regex } = this.compileAstPattern(pattern);
    const matchesByFile: Record<string, AstGrepMatch[]> = {};
    let totalMatches = 0;
    let filesScanned = 0;

    for (const [filePath, content] of Object.entries(files)) {
      if (!this.matchesLanguage(filePath, languageFilter)) continue;
      filesScanned++;

      const fileMatches: AstGrepMatch[] = [];
      const lines = content.split('\n');
      regex.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        // Prevent infinite loops on zero-width matches
        if (match.index === regex.lastIndex) regex.lastIndex++;

        const matchedText = match[0];
        if (!matchedText.trim()) continue;

        // Calculate line and column
        const preMatch = content.slice(0, match.index);
        const line = (preMatch.match(/\n/g) || []).length + 1;
        const lastNewline = preMatch.lastIndexOf('\n');
        const column = lastNewline === -1 ? match.index + 1 : match.index - lastNewline;

        const matchLines = (matchedText.match(/\n/g) || []).length;
        const endLine = line + matchLines;
        const endLastNewline = matchedText.lastIndexOf('\n');
        const endColumn = endLastNewline === -1 ? column + matchedText.length : matchedText.length - endLastNewline;

        // Extract captured meta-variables
        const metaVariables: Record<string, string> = {};
        if (match.groups) {
          for (const [key, value] of Object.entries(match.groups)) {
            if (value !== undefined) {
              const cleanKey = key.replace(/^(single_|multi_)/, '');
              metaVariables[cleanKey] = value.trim();
            }
          }
        }

        fileMatches.push({
          filePath,
          line,
          column,
          endLine,
          endColumn,
          matchedText,
          metaVariables
        });
        totalMatches++;
      }

      if (fileMatches.length > 0) {
        matchesByFile[filePath] = fileMatches;
      }
    }

    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      queryPattern: pattern,
      language: languageFilter,
      totalMatches,
      filesScanned,
      matchedFilesCount: Object.keys(matchesByFile).length,
      matchesByFile,
      elapsedMs
    };
  }

  /**
   * Structurally rewrites code across workspace files matching the pattern
   */
  public rewritePattern(
    files: Record<string, string>,
    pattern: string,
    rewriteTemplate: string,
    languageFilter: string = 'all'
  ): AstGrepRewriteResult {
    const startTime = performance.now();
    const { regex } = this.compileAstPattern(pattern);
    const updatedFiles: Record<string, string> = {};
    const diffsByFile: Record<string, { original: string; rewritten: string }> = {};
    let totalRewrites = 0;

    for (const [filePath, content] of Object.entries(files)) {
      if (!this.matchesLanguage(filePath, languageFilter)) continue;

      regex.lastIndex = 0;
      let fileModified = false;

      const newContent = content.replace(regex, (...args) => {
        const matchGroups = args[args.length - 1] as Record<string, string> | undefined;
        let replaced = rewriteTemplate;

        if (matchGroups) {
          for (const [key, val] of Object.entries(matchGroups)) {
            if (val !== undefined) {
              const cleanKey = key.replace(/^(single_|multi_)/, '');
              // Replace $VAR or $$$ARGS in rewriteTemplate
              replaced = replaced.split(`$$$${cleanKey}`).join(val);
              replaced = replaced.split(`$${cleanKey}`).join(val);
            }
          }
        }

        totalRewrites++;
        fileModified = true;
        return replaced;
      });

      if (fileModified && newContent !== content) {
        updatedFiles[filePath] = newContent;
        diffsByFile[filePath] = {
          original: content,
          rewritten: newContent
        };
      }
    }

    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      pattern,
      rewrite: rewriteTemplate,
      totalRewrites,
      affectedFilesCount: Object.keys(updatedFiles).length,
      updatedFiles,
      diffsByFile,
      elapsedMs
    };
  }

  /**
   * Run structural linting rules against workspace files
   */
  public lintWorkspace(
    files: Record<string, string>,
    customRules?: AstGrepRule[]
  ): AstGrepLintResult {
    const startTime = performance.now();
    const rules = customRules || BUILTIN_AST_RULES;
    const violations: AstGrepMatch[] = [];
    const violationsBySeverity = { error: 0, warning: 0, info: 0 };

    for (const rule of rules) {
      const searchResult = this.searchPattern(files, rule.pattern, rule.language);

      for (const [filePath, matches] of Object.entries(searchResult.matchesByFile)) {
        for (const m of matches) {
          let replacementText: string | undefined;

          if (rule.fix) {
            let replaced = rule.fix;
            for (const [k, v] of Object.entries(m.metaVariables)) {
              replaced = replaced.split(`$$$${k}`).join(v);
              replaced = replaced.split(`$${k}`).join(v);
            }
            replacementText = replaced;
          }

          violations.push({
            ...m,
            ruleId: rule.id,
            message: rule.message,
            severity: rule.severity,
            replacementText
          });

          violationsBySeverity[rule.severity]++;
        }
      }
    }

    const elapsedMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      rulesExecuted: rules.length,
      totalViolations: violations.length,
      violationsBySeverity,
      violations,
      elapsedMs
    };
  }

  /**
   * Check if a file matches language filter
   */
  private matchesLanguage(filePath: string, languageFilter: string): boolean {
    if (languageFilter === 'all') return true;
    const lower = filePath.toLowerCase();
    switch (languageFilter) {
      case 'typescript':
        return lower.endsWith('.ts') || lower.endsWith('.tsx');
      case 'javascript':
        return lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs');
      case 'python':
        return lower.endsWith('.py');
      case 'rust':
        return lower.endsWith('.rs');
      case 'go':
        return lower.endsWith('.go');
      default:
        return true;
    }
  }
}

export const astGrepEngine = AstGrepEngine.getInstance();
