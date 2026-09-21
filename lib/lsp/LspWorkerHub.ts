/**
 * Language Server Protocol (LSP) Worker Hub & Monaco Language Adapter
 * Provides multi-language real-time language intelligence, diagnostics, hover tooltips,
 * autocompletions, and code actions for TypeScript, JavaScript, Python, JSON, and Markdown.
 */

import { LSPEngine, WorkspaceDiagnostic, LSPSymbol } from '../lspEngine';

export interface LspProblemItem {
  id: string;
  filePath: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  source: 'ts-lsp' | 'py-lsp' | 'json-lsp' | 'linter';
  code?: string;
}

export interface LspHoverResult {
  contents: Array<{ value: string; isTrusted?: boolean }>;
  range?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

export interface LspCompletionItem {
  label: string;
  kind: number; // Monaco CompletionItemKind
  detail?: string;
  documentation?: string;
  insertText: string;
  insertTextRules?: number;
  sortText?: string;
}

export interface LspCodeAction {
  title: string;
  kind?: string;
  isPreferred?: boolean;
  diagnostics?: WorkspaceDiagnostic[];
  edit?: {
    edits: Array<{
      resource: string;
      textEdit: {
        range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number };
        text: string;
      };
    }>;
  };
  command?: {
    id: string;
    title: string;
    arguments?: any[];
  };
}

export class LspWorkerHub {
  private lspEngine: LSPEngine;
  private monacoInstance: any = null;
  private activeDisposables: Array<{ dispose: () => void }> = [];
  private problemsListeners: Array<(problems: LspProblemItem[]) => void> = [];
  private currentProblems: LspProblemItem[] = [];
  private onJumpToLineCallback?: (filePath: string, line: number, column?: number) => void;

  constructor() {
    this.lspEngine = new LSPEngine();
  }

  /**
   * Initializes the Monaco language adapters once Monaco is available in the browser
   */
  public attachMonaco(monaco: any) {
    if (!monaco || this.monacoInstance === monaco) return;
    this.monacoInstance = monaco;
    this.disposeAdapters();
    this.registerMonacoLanguageAdapters();
  }

  /**
   * Sets callback when a user clicks a problem in the Bottom Tray "Problems" view
   */
  public setOnJumpToLine(callback: (filePath: string, line: number, column?: number) => void) {
    this.onJumpToLineCallback = callback;
  }

  public jumpToProblem(problem: LspProblemItem) {
    if (this.onJumpToLineCallback) {
      this.onJumpToLineCallback(problem.filePath, problem.line, problem.column);
    }
  }

  /**
   * Updates workspace files and runs language server diagnostics across all files
   */
  public updateWorkspace(files: Record<string, string>) {
    this.lspEngine.updateWorkspace(files);
    this.recomputeAllDiagnostics(files);
  }

  /**
   * Updates a single file on editor change
   */
  public updateFile(filePath: string, content: string) {
    this.lspEngine.updateFile(filePath, content);
    this.computeFileDiagnostics(filePath, content);
  }

  /**
   * Recomputes all diagnostics and syncs Monaco model markers & Problems tab
   */
  private recomputeAllDiagnostics(files: Record<string, string>) {
    const problems: LspProblemItem[] = [];

    for (const [path, content] of Object.entries(files)) {
      const fileDiagnostics = this.analyzeFileContent(path, content);
      problems.push(...fileDiagnostics);
      this.syncMonacoModelMarkers(path, fileDiagnostics);
    }

    this.currentProblems = problems;
    this.notifyProblemsListeners(problems);
  }

  /**
   * Computes diagnostics for a single file and syncs markers
   */
  private computeFileDiagnostics(filePath: string, content: string) {
    const fileDiagnostics = this.analyzeFileContent(filePath, content);
    
    // Replace existing problems for this file
    const otherProblems = this.currentProblems.filter(p => p.filePath !== filePath);
    this.currentProblems = [...otherProblems, ...fileDiagnostics];

    this.syncMonacoModelMarkers(filePath, fileDiagnostics);
    this.notifyProblemsListeners(this.currentProblems);
  }

  /**
   * Multi-language diagnostic scanner
   */
  private analyzeFileContent(filePath: string, content: string): LspProblemItem[] {
    const problems: LspProblemItem[] = [];
    const lines = content.split('\n');
    const ext = filePath.split('.').pop()?.toLowerCase() || '';

    // 1. JSON Diagnostics
    if (ext === 'json') {
      try {
        JSON.parse(content);
      } catch (err: any) {
        const msg = err.message || 'JSON Syntax Error';
        let line = 1;
        let col = 1;
        const posMatch = msg.match(/position\s+(\d+)/i) || msg.match(/line\s+(\d+)\s+column\s+(\d+)/i);
        if (posMatch) {
          if (posMatch[2]) {
            line = parseInt(posMatch[1], 10);
            col = parseInt(posMatch[2], 10);
          } else {
            const pos = parseInt(posMatch[1], 10);
            const sub = content.substring(0, pos);
            line = sub.split('\n').length;
            col = sub.length - sub.lastIndexOf('\n');
          }
        }
        problems.push({
          id: `json_${Date.now()}_${Math.random()}`,
          filePath,
          line,
          column: col,
          endLine: line,
          endColumn: col + 5,
          message: msg,
          severity: 'error',
          source: 'json-lsp',
          code: 'JSON_SYNTAX_ERROR',
        });
      }
      return problems;
    }

    // 2. Python Diagnostics (Indentation, missing colons, invalid syntax)
    if (ext === 'py') {
      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        const trimmed = lineText.trim();

        // Control statement missing colon
        if (/^(if|elif|else|for|while|def|class|try|except|finally|with)\b/i.test(trimmed) && !trimmed.endsWith(':') && !trimmed.includes('#')) {
          problems.push({
            id: `py_colon_${lineNum}`,
            filePath,
            line: lineNum,
            column: lineText.length - 2,
            endLine: lineNum,
            endColumn: lineText.length,
            message: `SyntaxError: expected ':' at end of '${trimmed.split(' ')[0]}' statement`,
            severity: 'error',
            source: 'py-lsp',
            code: 'PY_MISSING_COLON',
          });
        }

        // Mixed tabs and spaces
        if (/^\t+ +|^\t+ */.test(lineText)) {
          problems.push({
            id: `py_indent_${lineNum}`,
            filePath,
            line: lineNum,
            column: 1,
            endLine: lineNum,
            endColumn: 4,
            message: 'TabError: Inconsistent use of tabs and spaces in indentation',
            severity: 'warning',
            source: 'py-lsp',
            code: 'PY_INDENT_MISMATCH',
          });
        }
      });
      return problems;
    }

    // 3. TypeScript / JavaScript Diagnostics
    if (ext === 'ts' || ext === 'tsx' || ext === 'js' || ext === 'jsx') {
      const openBrackets: Array<{ char: string; line: number; col: number }> = [];

      lines.forEach((lineText, idx) => {
        const lineNum = idx + 1;
        const trimmed = lineText.trim();

        // Check unclosed brackets / quotes
        for (let i = 0; i < lineText.length; i++) {
          const ch = lineText[i];
          if (ch === '{' || ch === '(' || ch === '[') {
            openBrackets.push({ char: ch, line: lineNum, col: i + 1 });
          } else if (ch === '}' || ch === ')' || ch === ']') {
            const last = openBrackets[openBrackets.length - 1];
            if (
              (ch === '}' && last?.char === '{') ||
              (ch === ')' && last?.char === '(') ||
              (ch === ']' && last?.char === '[')
            ) {
              openBrackets.pop();
            }
          }
        }

        // Unused import warning detection
        const importMatch = trimmed.match(/^import\s+(?:\{([^}]+)\}|([a-zA-Z0-9_$]+))\s+from/);
        if (importMatch) {
          const importedName = (importMatch[2] || importMatch[1] || '').trim();
          if (importedName && !importedName.includes(',')) {
            const regex = new RegExp(`\\b${importedName}\\b`, 'g');
            const matches = content.match(regex);
            if (matches && matches.length === 1) {
              problems.push({
                id: `ts_unused_${lineNum}`,
                filePath,
                line: lineNum,
                column: lineText.indexOf(importedName) + 1,
                endLine: lineNum,
                endColumn: lineText.indexOf(importedName) + 1 + importedName.length,
                message: `'${importedName}' is declared but its value is never read.`,
                severity: 'warning',
                source: 'ts-lsp',
                code: 'TS6133',
              });
            }
          }
        }

        // Missing semicolon warning (standard TS clean style check)
        if (trimmed.length > 0 && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.endsWith('}') && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
          if (/^(const|let|var|return|import|export)\b/.test(trimmed) && !trimmed.endsWith(',')) {
            problems.push({
              id: `ts_semi_${lineNum}`,
              filePath,
              line: lineNum,
              column: lineText.length,
              endLine: lineNum,
              endColumn: lineText.length + 1,
              message: "Missing semicolon. [prettier/semi]",
              severity: 'info',
              source: 'linter',
              code: 'LINT_SEMI',
            });
          }
        }
      });

      // Unmatched brackets error
      if (openBrackets.length > 0) {
        const lastUnclosed = openBrackets[openBrackets.length - 1];
        problems.push({
          id: `ts_bracket_${lastUnclosed.line}`,
          filePath,
          line: lastUnclosed.line,
          column: lastUnclosed.col,
          endLine: lastUnclosed.line,
          endColumn: lastUnclosed.col + 1,
          message: `Unclosed delimiter '${lastUnclosed.char}'`,
          severity: 'error',
          source: 'ts-lsp',
          code: 'TS1005',
        });
      }
    }

    return problems;
  }

  /**
   * Syncs Monaco editor model markers to display red/yellow squiggly underlines in the editor
   */
  private syncMonacoModelMarkers(filePath: string, fileProblems: LspProblemItem[]) {
    if (!this.monacoInstance) return;

    const monaco = this.monacoInstance;
    const models = monaco.editor.getModels();
    const model = models.find((m: any) => m.uri.path === filePath || m.uri.path === `/${filePath}` || m.uri.fsPath?.endsWith(filePath));

    if (!model) return;

    const markers = fileProblems.map(p => ({
      startLineNumber: p.line,
      startColumn: p.column,
      endLineNumber: p.endLine || p.line,
      endColumn: p.endColumn || p.column + 4,
      message: p.message,
      severity:
        p.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : p.severity === 'warning'
          ? monaco.MarkerSeverity.Warning
          : monaco.MarkerSeverity.Info,
      source: p.source,
      code: p.code,
    }));

    monaco.editor.setModelMarkers(model, 'lsp-worker-hub', markers);
  }

  /**
   * Registers Monaco language providers (Hover, Autocompletion, Code Actions)
   */
  private registerMonacoLanguageAdapters() {
    const monaco = this.monacoInstance;
    if (!monaco) return;

    const languages = ['typescript', 'javascript', 'python', 'json', 'markdown'];

    languages.forEach(lang => {
      // 1. Hover Provider
      const hoverDisp = monaco.languages.registerHoverProvider(lang, {
        provideHover: (model: any, position: any) => {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const filePath = model.uri.path.replace(/^\//, '');
          const symbol = this.lspEngine.findDefinition(filePath, word.word);

          if (symbol) {
            return {
              range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
              contents: [
                { value: `**${symbol.kind.toUpperCase()}** \`${symbol.signature || symbol.name}\`` },
                { value: symbol.documentation || `Defined in \`${symbol.filePath}\` (Line ${symbol.line})` },
              ],
            };
          }

          // Fallback type definition lookup
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `\`(identifier) ${word.word}\`` },
              { value: `Language Server definition for \`${word.word}\`` },
            ],
          };
        },
      });
      this.activeDisposables.push(hoverDisp);

      // 2. Completion Provider
      const compDisp = monaco.languages.registerCompletionItemProvider(lang, {
        triggerCharacters: ['.', ':', '/', '<', '@'],
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const filePath = model.uri.path.replace(/^\//, '');
          const symbols = this.lspEngine.getSymbols(filePath) || [];

          const suggestions = symbols.map(s => ({
            label: s.name,
            kind: s.kind === 'function' ? monaco.languages.CompletionItemKind.Function : monaco.languages.CompletionItemKind.Variable,
            detail: s.signature || `${s.kind} (${s.filePath})`,
            documentation: s.documentation || `Symbol from ${s.filePath}`,
            insertText: s.kind === 'function' ? `${s.name}($0)` : s.name,
            insertTextRules: s.kind === 'function' ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : 0,
            range,
          }));

          // Add default JS/TS snippets
          if (lang === 'typescript' || lang === 'javascript') {
            suggestions.push(
              {
                label: 'clg',
                kind: monaco.languages.CompletionItemKind.Snippet,
                detail: 'console.log snippet',
                documentation: 'Log output to console',
                insertText: 'console.log($1);',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              },
              {
                label: 'afn',
                kind: monaco.languages.CompletionItemKind.Snippet,
                detail: 'async arrow function',
                documentation: 'Async arrow function declaration',
                insertText: 'const ${1:name} = async (${2:args}) => {\n\t$0\n};',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range,
              }
            );
          }

          return { suggestions };
        },
      });
      this.activeDisposables.push(compDisp);

      // 3. Code Action Provider (Quick Fixes)
      const actionDisp = monaco.languages.registerCodeActionProvider(lang, {
        provideCodeActions: (model: any, range: any, context: any) => {
          const actions: any[] = [];
          const filePath = model.uri.path.replace(/^\//, '');

          context.markers.forEach((marker: any) => {
            if (marker.code === 'LINT_SEMI') {
              actions.push({
                title: 'Fix: Add missing semicolon',
                kind: 'quickfix',
                isPreferred: true,
                edit: {
                  edits: [
                    {
                      resource: model.uri,
                      textEdit: {
                        range: new monaco.Range(marker.endLineNumber, marker.endColumn, marker.endLineNumber, marker.endColumn),
                        text: ';',
                      },
                    },
                  ],
                },
              });
            }

            if (marker.code === 'TS6133') {
              actions.push({
                title: 'Remove unused declaration',
                kind: 'quickfix',
                isPreferred: true,
                edit: {
                  edits: [
                    {
                      resource: model.uri,
                      textEdit: {
                        range: new monaco.Range(marker.startLineNumber, 1, marker.startLineNumber + 1, 1),
                        text: '',
                      },
                    },
                  ],
                },
              });
            }
          });

          return { actions, dispose: () => {} };
        },
      });
      this.activeDisposables.push(actionDisp);
    });
  }

  // Listener management for UI Problem Tray
  public onProblemsChange(listener: (problems: LspProblemItem[]) => void) {
    this.problemsListeners.push(listener);
    listener(this.currentProblems);
    return {
      dispose: () => {
        const idx = this.problemsListeners.indexOf(listener);
        if (idx !== -1) this.problemsListeners.splice(idx, 1);
      },
    };
  }

  private notifyProblemsListeners(problems: LspProblemItem[]) {
    this.problemsListeners.forEach(fn => {
      try { fn(problems); } catch (e) { console.error(e); }
    });
  }

  public subscribeProblems(listener: (problems: LspProblemItem[]) => void): () => void {
    const disposable = this.onProblemsChange(listener);
    return () => disposable.dispose();
  }

  public getAllProblems(): LspProblemItem[] {
    return this.getProblems();
  }

  public getProblems(): LspProblemItem[] {
    return [...this.currentProblems];
  }

  public disposeAdapters() {
    this.activeDisposables.forEach(d => {
      try { d.dispose(); } catch (e) { console.error(e); }
    });
    this.activeDisposables = [];
  }
}

// Global Singleton Instance
export const lspWorkerHub = new LspWorkerHub();
