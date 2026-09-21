/**
 * Prettier & ESLint In-Browser Formatter & Linter Extensions
 * Provides standalone code formatting via Prettier with plugins (TypeScript, Babel, HTML, CSS, Markdown),
 * Monaco DocumentFormattingEditProvider registration (Shift+Alt+F & Format on Save),
 * and an in-browser ESLint diagnostics & CodeActionProvider (squiggles + Quick Fixes).
 */

import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';
import * as parserTypeScript from 'prettier/plugins/typescript';
import * as parserHtml from 'prettier/plugins/html';
import * as parserPostcss from 'prettier/plugins/postcss';
import * as parserMarkdown from 'prettier/plugins/markdown';
import * as parserYaml from 'prettier/plugins/yaml';

export interface PrettierConfigOptions {
  tabWidth?: number;
  useTabs?: boolean;
  semi?: boolean;
  singleQuote?: boolean;
  trailingComma?: 'all' | 'es5' | 'none';
  bracketSpacing?: boolean;
  arrowParens?: 'always' | 'avoid';
  printWidth?: number;
}

export const DEFAULT_PRETTIER_CONFIG: PrettierConfigOptions = {
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'always',
  printWidth: 100,
};

export interface LintProblem {
  id: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  fix?: {
    range: [number, number]; // char offsets or line/col
    text: string;
    description: string;
  };
}

export interface LintRuleConfig {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'off';
  enabled: boolean;
}

export const DEFAULT_LINT_RULES: LintRuleConfig[] = [
  { id: 'no-var', name: 'Prefer const/let over var', description: 'Disallow the use of var in favor of const and let', severity: 'error', enabled: true },
  { id: 'prefer-const', name: 'Prefer const', description: 'Require const for variables that are never reassigned', severity: 'warning', enabled: true },
  { id: 'no-unused-vars', name: 'No Unused Variables', description: 'Warn on defined variables that are never used', severity: 'warning', enabled: true },
  { id: 'no-console', name: 'No console.log in prod', description: 'Flag console statements in application files', severity: 'warning', enabled: false },
  { id: 'no-debugger', name: 'Disallow debugger', description: 'Flag debugger statements in code', severity: 'error', enabled: true },
  { id: 'eqeqeq', name: 'Require === and !==', description: 'Require the use of strict equality comparisons', severity: 'error', enabled: true },
  { id: 'no-empty-block', name: 'No Empty Blocks', description: 'Flag empty curly brace blocks', severity: 'warning', enabled: true },
  { id: 'missing-semicolon', name: 'Enforce Semicolons', description: 'Check for missing terminal semicolons', severity: 'warning', enabled: false },
  { id: 'no-alert', name: 'Disallow window.alert', description: 'Warn on window.alert usage in favor of modern toasts', severity: 'warning', enabled: true },
  { id: 'react-hooks-deps', name: 'React Hooks exhaustive deps', description: 'Check for potential missing useEffect dependency arrays', severity: 'warning', enabled: true },
];

// ---------------------------------------------------------------------------
// Prettier In-Browser Formatter Engine
// ---------------------------------------------------------------------------

export class PrettierFormatterEngine {
  private config: PrettierConfigOptions = { ...DEFAULT_PRETTIER_CONFIG };
  private registeredProviders: Array<{ dispose: () => void }> = [];

  constructor() {
    this.loadPersistedConfig();
  }

  private loadPersistedConfig(): void {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('prettier_user_config');
        if (saved) {
          this.config = { ...this.config, ...JSON.parse(saved) };
        }
      } catch (e) {
        console.warn('Failed to load prettier config from localStorage', e);
      }
    }
  }

  public getConfig(): PrettierConfigOptions {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<PrettierConfigOptions>): void {
    this.config = { ...this.config, ...newConfig };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('prettier_user_config', JSON.stringify(this.config));
      } catch (e) {
        console.error('Failed to save prettier config', e);
      }
    }
  }

  /**
   * Determine Prettier parser name based on file extension / Monaco language ID
   */
  public getParserForLanguage(lang: string, filePath?: string): { parser: string; plugins: any[] } {
    const ext = filePath ? filePath.split('.').pop()?.toLowerCase() : '';
    const l = lang.toLowerCase();

    if (ext === 'json' || l === 'json') {
      return { parser: 'json', plugins: [parserBabel, parserEstree] };
    }
    if (ext === 'ts' || ext === 'tsx' || l === 'typescript' || l === 'typescriptreact') {
      return { parser: 'typescript', plugins: [parserTypeScript, parserEstree] };
    }
    if (ext === 'js' || ext === 'jsx' || ext === 'mjs' || ext === 'cjs' || l === 'javascript' || l === 'javascriptreact') {
      return { parser: 'babel', plugins: [parserBabel, parserEstree] };
    }
    if (ext === 'html' || ext === 'htm' || l === 'html') {
      return { parser: 'html', plugins: [parserHtml] };
    }
    if (ext === 'css' || ext === 'scss' || ext === 'less' || l === 'css' || l === 'scss' || l === 'less') {
      return { parser: 'css', plugins: [parserPostcss] };
    }
    if (ext === 'md' || ext === 'markdown' || l === 'markdown') {
      return { parser: 'markdown', plugins: [parserMarkdown] };
    }
    if (ext === 'yaml' || ext === 'yml' || l === 'yaml') {
      return { parser: 'yaml', plugins: [parserYaml] };
    }

    // Default fallback to typescript/babel
    return { parser: 'typescript', plugins: [parserTypeScript, parserEstree] };
  }

  /**
   * Format code string directly
   */
  public async formatCode(
    code: string,
    language: string,
    filePath?: string,
    overrideOptions?: Partial<PrettierConfigOptions>
  ): Promise<{ formatted: string; error?: string }> {
    if (!code || code.trim() === '') {
      return { formatted: code };
    }

    try {
      const { parser, plugins } = this.getParserForLanguage(language, filePath);
      const options = {
        ...this.config,
        ...overrideOptions,
        parser,
        plugins,
      };

      const formatted = await prettier.format(code, options);
      return { formatted };
    } catch (err: any) {
      console.warn('[Prettier In-Browser Formatter Error]', err);
      return {
        formatted: code,
        error: err.message || String(err),
      };
    }
  }

  /**
   * Register Monaco DocumentFormattingEditProvider across supported languages
   */
  public registerMonacoFormattingProvider(monacoInstance: any): void {
    if (!monacoInstance || !monacoInstance.languages) return;

    // Clean up previously registered formatting providers if any
    this.registeredProviders.forEach(p => p.dispose());
    this.registeredProviders = [];

    const supportedLanguages = [
      'typescript',
      'javascript',
      'typescriptreact',
      'javascriptreact',
      'json',
      'html',
      'css',
      'scss',
      'less',
      'markdown',
      'yaml',
    ];

    const self = this;

    supportedLanguages.forEach(lang => {
      try {
        const disposable = monacoInstance.languages.registerDocumentFormattingEditProvider(lang, {
          async provideDocumentFormattingEdits(model: any, options: any) {
            const text = model.getValue();
            const uri = model.uri ? model.uri.toString() : '';
            const { formatted, error } = await self.formatCode(text, lang, uri, {
              tabWidth: options.tabSize || self.config.tabWidth,
              useTabs: !options.insertSpaces,
            });

            if (error || formatted === text) {
              return [];
            }

            const lineCount = model.getLineCount();
            const lastLineMaxCol = model.getLineMaxColumn(lineCount);

            return [
              {
                range: {
                  startLineNumber: 1,
                  startColumn: 1,
                  endLineNumber: lineCount,
                  endColumn: lastLineMaxCol,
                },
                text: formatted,
              },
            ];
          },
        });

        self.registeredProviders.push(disposable);
      } catch (err) {
        console.warn(`[Prettier] Failed to register formatter for ${lang}:`, err);
      }
    });

    console.log('[Prettier] In-Browser Formatter Providers registered for', supportedLanguages.length, 'languages');
  }
}

// ---------------------------------------------------------------------------
// In-Browser ESLint & Code Action Engine
// ---------------------------------------------------------------------------

export class BrowserLinterEngine {
  private rules: Map<string, LintRuleConfig> = new Map();
  private monacoInstance: any = null;
  private actionProviders: Array<{ dispose: () => void }> = [];
  private lastProblems: Map<string, LintProblem[]> = new Map(); // modelUri -> problems

  constructor() {
    DEFAULT_LINT_RULES.forEach(r => this.rules.set(r.id, { ...r }));
    this.loadPersistedRules();
  }

  private loadPersistedRules(): void {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('eslint_user_rules');
        if (saved) {
          const parsed: LintRuleConfig[] = JSON.parse(saved);
          parsed.forEach(r => this.rules.set(r.id, r));
        }
      } catch (e) {
        console.warn('Failed to load linter rules from localStorage', e);
      }
    }
  }

  public getRules(): LintRuleConfig[] {
    return Array.from(this.rules.values());
  }

  public setRuleState(ruleId: string, enabled: boolean, severity?: 'error' | 'warning' | 'off'): void {
    const existing = this.rules.get(ruleId);
    if (existing) {
      existing.enabled = enabled;
      if (severity) existing.severity = severity;
      this.persistRules();
    }
  }

  private persistRules(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('eslint_user_rules', JSON.stringify(Array.from(this.rules.values())));
      } catch (e) {
        console.error('Failed to save linter rules', e);
      }
    }
  }

  /**
   * Scans JavaScript/TypeScript code using AST heuristics and token patterns
   */
  public lintCode(code: string, language: string, filePath?: string): LintProblem[] {
    if (!code || (language !== 'javascript' && language !== 'typescript' && language !== 'javascriptreact' && language !== 'typescriptreact')) {
      return [];
    }

    const problems: LintProblem[] = [];
    const lines = code.split('\n');

    const ruleNoVar = this.rules.get('no-var');
    const rulePreferConst = this.rules.get('prefer-const');
    const ruleNoConsole = this.rules.get('no-console');
    const ruleNoDebugger = this.rules.get('no-debugger');
    const ruleEqEqEq = this.rules.get('eqeqeq');
    const ruleNoEmpty = this.rules.get('no-empty-block');
    const ruleNoAlert = this.rules.get('no-alert');
    const ruleHooksDeps = this.rules.get('react-hooks-deps');
    const ruleUnusedVars = this.rules.get('no-unused-vars');

    lines.forEach((lineText, lineIdx) => {
      const lineNum = lineIdx + 1;
      const trimmed = lineText.trim();

      // Skip comments
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
        return;
      }

      // 1. no-var
      if (ruleNoVar?.enabled && ruleNoVar.severity !== 'off') {
        const varMatch = lineText.match(/\bvar\s+([a-zA-Z0-9_$]+)/);
        if (varMatch && varMatch.index !== undefined) {
          const col = varMatch.index + 1;
          problems.push({
            id: `no-var-${lineNum}-${col}`,
            line: lineNum,
            column: col,
            endLine: lineNum,
            endColumn: col + 3,
            message: `Unexpected 'var', use 'let' or 'const' instead. (eslint/no-var)`,
            ruleId: 'no-var',
            severity: ruleNoVar.severity,
            fix: {
              range: [0, 0],
              text: lineText.replace(/\bvar\b/, 'const'),
              description: 'Replace "var" with "const"',
            },
          });
        }
      }

      // 2. prefer-const (let x = 123 where not reassigned or let declaration)
      if (rulePreferConst?.enabled && rulePreferConst.severity !== 'off') {
        const letConstMatch = lineText.match(/\blet\s+([a-zA-Z0-9_$]+)\s*=\s*([^;]+)/);
        if (letConstMatch && letConstMatch.index !== undefined) {
          const varName = letConstMatch[1];
          // Check if variable is ever reassigned in remaining lines
          const isReassigned = new RegExp(`\\b${varName}\\s*=[^=]`).test(code.slice(lineText.length));
          if (!isReassigned && !varName.startsWith('_')) {
            const col = letConstMatch.index + 1;
            problems.push({
              id: `prefer-const-${lineNum}-${col}`,
              line: lineNum,
              column: col,
              endLine: lineNum,
              endColumn: col + 3,
              message: `'${varName}' is never reassigned. Use 'const' instead. (eslint/prefer-const)`,
              ruleId: 'prefer-const',
              severity: rulePreferConst.severity,
              fix: {
                range: [0, 0],
                text: lineText.replace(/\blet\b/, 'const'),
                description: `Convert '${varName}' declaration to 'const'`,
              },
            });
          }
        }
      }

      // 3. no-console
      if (ruleNoConsole?.enabled && ruleNoConsole.severity !== 'off') {
        const consoleMatch = lineText.match(/console\.(log|info|debug)\s*\(/);
        if (consoleMatch && consoleMatch.index !== undefined) {
          const col = consoleMatch.index + 1;
          problems.push({
            id: `no-console-${lineNum}-${col}`,
            line: lineNum,
            column: col,
            endLine: lineNum,
            endColumn: col + consoleMatch[0].length,
            message: `Unexpected console statement. (eslint/no-console)`,
            ruleId: 'no-console',
            severity: ruleNoConsole.severity,
            fix: {
              range: [0, 0],
              text: `// ${lineText.trim()}`,
              description: 'Comment out console call',
            },
          });
        }
      }

      // 4. no-debugger
      if (ruleNoDebugger?.enabled && ruleNoDebugger.severity !== 'off') {
        const dbgMatch = lineText.match(/\bdebugger\b/);
        if (dbgMatch && dbgMatch.index !== undefined) {
          const col = dbgMatch.index + 1;
          problems.push({
            id: `no-debugger-${lineNum}-${col}`,
            line: lineNum,
            column: col,
            endLine: lineNum,
            endColumn: col + 8,
            message: `Unexpected 'debugger' statement. (eslint/no-debugger)`,
            ruleId: 'no-debugger',
            severity: ruleNoDebugger.severity,
            fix: {
              range: [0, 0],
              text: '',
              description: 'Remove debugger statement',
            },
          });
        }
      }

      // 5. eqeqeq
      if (ruleEqEqEq?.enabled && ruleEqEqEq.severity !== 'off') {
        const eqMatch = lineText.match(/([^=!<>])([!=]==?)([^=])/);
        if (eqMatch && eqMatch.index !== undefined) {
          const operator = eqMatch[2];
          if (operator === '==' || operator === '!=') {
            const col = eqMatch.index + eqMatch[1].length + 1;
            const replacement = operator === '==' ? '===' : '!==';
            problems.push({
              id: `eqeqeq-${lineNum}-${col}`,
              line: lineNum,
              column: col,
              endLine: lineNum,
              endColumn: col + operator.length,
              message: `Expected '${replacement}' and instead saw '${operator}'. (eslint/eqeqeq)`,
              ruleId: 'eqeqeq',
              severity: ruleEqEqEq.severity,
              fix: {
                range: [0, 0],
                text: lineText.replace(operator, replacement),
                description: `Replace '${operator}' with '${replacement}'`,
              },
            });
          }
        }
      }

      // 6. no-empty-block
      if (ruleNoEmpty?.enabled && ruleNoEmpty.severity !== 'off') {
        const emptyMatch = lineText.match(/\{\s*\}/);
        if (emptyMatch && emptyMatch.index !== undefined && !lineText.includes('export {}') && !lineText.includes('import')) {
          const col = emptyMatch.index + 1;
          problems.push({
            id: `no-empty-${lineNum}-${col}`,
            line: lineNum,
            column: col,
            endLine: lineNum,
            endColumn: col + 2,
            message: `Empty block statement. (eslint/no-empty)`,
            ruleId: 'no-empty-block',
            severity: ruleNoEmpty.severity,
          });
        }
      }

      // 7. no-alert
      if (ruleNoAlert?.enabled && ruleNoAlert.severity !== 'off') {
        const alertMatch = lineText.match(/\b(window\.)?alert\s*\(/);
        if (alertMatch && alertMatch.index !== undefined) {
          const col = alertMatch.index + 1;
          problems.push({
            id: `no-alert-${lineNum}-${col}`,
            line: lineNum,
            column: col,
            endLine: lineNum,
            endColumn: col + alertMatch[0].length,
            message: `Unexpected alert. Use toast or non-blocking notification instead. (eslint/no-alert)`,
            ruleId: 'no-alert',
            severity: ruleNoAlert.severity,
          });
        }
      }

      // 8. react-hooks-deps (useEffect without deps array)
      if (ruleHooksDeps?.enabled && ruleHooksDeps.severity !== 'off') {
        if (lineText.includes('useEffect(') && !code.slice(code.indexOf(lineText)).match(/useEffect\([^,]+,\s*\[/)) {
          const col = lineText.indexOf('useEffect(') + 1;
          problems.push({
            id: `react-hooks-deps-${lineNum}-${col}`,
            line: lineNum,
            column: col,
            endLine: lineNum,
            endColumn: col + 10,
            message: `React Hook useEffect is called without a dependency array. (react-hooks/exhaustive-deps)`,
            ruleId: 'react-hooks-deps',
            severity: ruleHooksDeps.severity,
          });
        }
      }
    });

    return problems;
  }

  /**
   * Apply diagnostics markers to Monaco model
   */
  public updateMarkers(model: any): LintProblem[] {
    if (!this.monacoInstance || !model) return [];

    const uri = model.uri ? model.uri.toString() : 'current';
    const text = model.getValue();
    const lang = model.getLanguageId ? model.getLanguageId() : 'typescript';

    const problems = this.lintCode(text, lang, uri);
    this.lastProblems.set(uri, problems);

    const monacoSeverity = (sev: 'error' | 'warning' | 'info') => {
      switch (sev) {
        case 'error':
          return this.monacoInstance.MarkerSeverity.Error;
        case 'warning':
          return this.monacoInstance.MarkerSeverity.Warning;
        default:
          return this.monacoInstance.MarkerSeverity.Info;
      }
    };

    const markers = problems.map(p => ({
      startLineNumber: p.line,
      startColumn: p.column,
      endLineNumber: p.endLine,
      endColumn: p.endColumn,
      message: p.message,
      severity: monacoSeverity(p.severity),
      source: 'ESLint',
      code: p.ruleId,
    }));

    this.monacoInstance.editor.setModelMarkers(model, 'eslint', markers);
    return problems;
  }

  /**
   * Register Monaco CodeActionProvider to offer Quick Fix tooltips & actions
   */
  public registerMonacoLinter(monacoInstance: any): void {
    this.monacoInstance = monacoInstance;
    if (!monacoInstance || !monacoInstance.languages) return;

    this.actionProviders.forEach(p => p.dispose());
    this.actionProviders = [];

    const supportedLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
    const self = this;

    supportedLanguages.forEach(lang => {
      try {
        const disposable = monacoInstance.languages.registerCodeActionProvider(lang, {
          provideCodeActions(model: any, range: any, context: any) {
            const uri = model.uri ? model.uri.toString() : 'current';
            const problems = self.lastProblems.get(uri) || [];
            const actions: any[] = [];

            // Find matching markers/problems inside selection or near range
            const matchingProblems = problems.filter(p =>
              (p.line >= range.startLineNumber && p.line <= range.endLineNumber) ||
              (p.endLine >= range.startLineNumber && p.endLine <= range.endLineNumber)
            );

            matchingProblems.forEach(p => {
              if (p.fix) {
                actions.push({
                  title: `⚡ Quick Fix: ${p.fix.description}`,
                  diagnostics: context.markers.filter((m: any) => m.code === p.ruleId),
                  kind: 'quickfix',
                  isPreferred: true,
                  edit: {
                    edits: [
                      {
                        resource: model.uri,
                        textEdit: {
                          range: {
                            startLineNumber: p.line,
                            startColumn: 1,
                            endLineNumber: p.line,
                            endColumn: model.getLineMaxColumn(p.line),
                          },
                          text: p.fix.text,
                        },
                      },
                    ],
                  },
                });
              }

              // Add rule suppression action
              actions.push({
                title: `🛡️ Disable rule "${p.ruleId}" for this line`,
                kind: 'quickfix',
                edit: {
                  edits: [
                    {
                      resource: model.uri,
                      textEdit: {
                        range: {
                          startLineNumber: p.line,
                          startColumn: 1,
                          endLineNumber: p.line,
                          endColumn: 1,
                        },
                        text: `// eslint-disable-next-line ${p.ruleId}\n`,
                      },
                    },
                  ],
                },
              });
            });

            // If any problems exist, offer "Fix all auto-fixable ESLint issues"
            const fixable = problems.filter(pr => !!pr.fix);
            if (fixable.length > 1) {
              actions.push({
                title: `🔧 Fix all auto-fixable ESLint issues (${fixable.length}) in file`,
                kind: 'source.fixAll.eslint',
                edit: {
                  edits: fixable.map(f => ({
                    resource: model.uri,
                    textEdit: {
                      range: {
                        startLineNumber: f.line,
                        startColumn: 1,
                        endLineNumber: f.line,
                        endColumn: model.getLineMaxColumn(f.line),
                      },
                      text: f.fix!.text,
                    },
                  })),
                },
              });
            }

            return {
              actions,
              dispose: () => {},
            };
          },
        });

        self.actionProviders.push(disposable);
      } catch (e) {
        console.warn(`[ESLint] Failed to register code action provider for ${lang}:`, e);
      }
    });

    console.log('[ESLint] In-Browser Linter & Code Action Provider initialized.');
  }
}

// Global Singleton Instances
export const prettierFormatterEngine = new PrettierFormatterEngine();
export const browserLinterEngine = new BrowserLinterEngine();
