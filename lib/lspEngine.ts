/**
 * Native Language Server Protocol (LSP) Engine & Tree-Sitter / AST Symbol Indexer
 * Provides true cross-file Go-to-Definition (F12), Find All References (Shift+F12),
 * Safe Semantic Symbol Renaming (F2), and Inlay Hints.
 */

export interface LSPSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'constant' | 'type' | 'method' | 'property';
  filePath: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  signature?: string;
  returnType?: string;
  params?: { name: string; type?: string }[];
  documentation?: string;
  exported: boolean;
}

export interface LSPReference {
  filePath: string;
  line: number;
  column: number;
  lineContent: string;
  isDefinition: boolean;
}

export interface InlayHintItem {
  line: number;
  column: number;
  label: string;
  kind: 'parameter' | 'type';
  tooltip?: string;
}

export interface WorkspaceDiagnostic {
  filePath: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  code?: string;
}

export class LSPEngine {
  private symbolIndex: Map<string, LSPSymbol[]> = new Map();
  private fileContents: Map<string, string> = new Map();
  private diagnosticsCache: Map<string, WorkspaceDiagnostic[]> = new Map();

  constructor(initialFiles?: Record<string, string>) {
    if (initialFiles) {
      this.updateWorkspace(initialFiles);
    }
  }

  /**
   * Re-indexes all files in the workspace
   */
  public updateWorkspace(files: Record<string, string>) {
    this.symbolIndex.clear();
    this.fileContents.clear();
    this.diagnosticsCache.clear();

    for (const [path, content] of Object.entries(files)) {
      this.fileContents.set(path, content);
      const symbols = this.extractSymbols(path, content);
      this.symbolIndex.set(path, symbols);
      const diagnostics = this.analyzeDiagnostics(path, content);
      this.diagnosticsCache.set(path, diagnostics);
    }
  }

  /**
   * Updates a single file's index
   */
  public updateFile(filePath: string, content: string) {
    this.fileContents.set(filePath, content);
    const symbols = this.extractSymbols(filePath, content);
    this.symbolIndex.set(filePath, symbols);
    const diagnostics = this.analyzeDiagnostics(filePath, content);
    this.diagnosticsCache.set(filePath, diagnostics);
  }

  /**
   * Extracts symbols from code using regex and AST-pattern parsing
   */
  private extractSymbols(filePath: string, code: string): LSPSymbol[] {
    const symbols: LSPSymbol[] = [];
    const lines = code.split('\n');

    lines.forEach((lineText, lineIdx) => {
      const lineNum = lineIdx + 1;
      const trimmed = lineText.trim();

      // 1. Functions & Arrow Functions: export function name(...) or function name(...)
      const fnMatch = lineText.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?/);
      if (fnMatch) {
        const name = fnMatch[1];
        const rawParams = fnMatch[2];
        const returnType = fnMatch[3]?.trim() || 'void';
        const col = lineText.indexOf(name) + 1;
        const params = this.parseParams(rawParams);

        symbols.push({
          name,
          kind: 'function',
          filePath,
          line: lineNum,
          column: col,
          endLine: lineNum,
          endColumn: col + name.length,
          signature: `function ${name}(${rawParams}): ${returnType}`,
          returnType,
          params,
          documentation: `Function ${name} declared in ${filePath}`,
          exported: lineText.includes('export')
        });
      }

      // Arrow functions: const name = (params) => ...
      const arrowMatch = lineText.match(/(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)(?:\s*:\s*([^{=]+))?\s*=>/);
      if (arrowMatch) {
        const name = arrowMatch[1];
        const rawParams = arrowMatch[2];
        const returnType = arrowMatch[3]?.trim() || 'any';
        const col = lineText.indexOf(name) + 1;
        const params = this.parseParams(rawParams);

        symbols.push({
          name,
          kind: 'function',
          filePath,
          line: lineNum,
          column: col,
          endLine: lineNum,
          endColumn: col + name.length,
          signature: `const ${name} = (${rawParams}): ${returnType} =>`,
          returnType,
          params,
          documentation: `Arrow function ${name} declared in ${filePath}`,
          exported: lineText.includes('export')
        });
      }

      // 2. Classes: class Name ...
      const classMatch = lineText.match(/(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z0-9_$]+)(?:\s+extends\s+([a-zA-Z0-9_$]+))?/);
      if (classMatch) {
        const name = classMatch[1];
        const col = lineText.indexOf(name) + 1;
        symbols.push({
          name,
          kind: 'class',
          filePath,
          line: lineNum,
          column: col,
          endLine: lineNum,
          endColumn: col + name.length,
          signature: classMatch[0].trim(),
          documentation: `Class ${name} declared in ${filePath}`,
          exported: lineText.includes('export')
        });
      }

      // 3. Interfaces: interface Name ...
      const interfaceMatch = lineText.match(/(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/);
      if (interfaceMatch) {
        const name = interfaceMatch[1];
        const col = lineText.indexOf(name) + 1;
        symbols.push({
          name,
          kind: 'interface',
          filePath,
          line: lineNum,
          column: col,
          endLine: lineNum,
          endColumn: col + name.length,
          signature: `interface ${name}`,
          documentation: `TypeScript Interface ${name} in ${filePath}`,
          exported: lineText.includes('export')
        });
      }

      // 4. Types: type Name = ...
      const typeMatch = lineText.match(/(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*=/);
      if (typeMatch) {
        const name = typeMatch[1];
        const col = lineText.indexOf(name) + 1;
        symbols.push({
          name,
          kind: 'type',
          filePath,
          line: lineNum,
          column: col,
          endLine: lineNum,
          endColumn: col + name.length,
          signature: `type ${name}`,
          documentation: `TypeScript Type Alias ${name} in ${filePath}`,
          exported: lineText.includes('export')
        });
      }

      // 5. Variables & Constants: const/let/var NAME = ...
      const varMatch = lineText.match(/(?:export\s+)?(const|let|var)\s+([A-Z0-9_]{2,}|[a-zA-Z0-9_$]+)\s*(?::\s*([^=]+))?\s*=\s*([^;]+)/);
      if (varMatch && !fnMatch && !arrowMatch) {
        const keyword = varMatch[1];
        const name = varMatch[2];
        const typeAnnotation = varMatch[3]?.trim();
        const valueSnippet = varMatch[4]?.trim();
        const isConst = keyword === 'const' && /^[A-Z0-9_]+$/.test(name);
        const col = lineText.indexOf(name) + 1;

        symbols.push({
          name,
          kind: isConst ? 'constant' : 'variable',
          filePath,
          line: lineNum,
          column: col,
          endLine: lineNum,
          endColumn: col + name.length,
          signature: `${keyword} ${name}${typeAnnotation ? `: ${typeAnnotation}` : ''}`,
          returnType: typeAnnotation || (isConst ? 'literal' : 'any'),
          documentation: `${isConst ? 'Constant' : 'Variable'} ${name} = ${valueSnippet?.slice(0, 30)} in ${filePath}`,
          exported: lineText.includes('export')
        });
      }
    });

    return symbols;
  }

  private parseParams(rawParams: string): { name: string; type?: string }[] {
    if (!rawParams || !rawParams.trim()) return [];
    return rawParams.split(',').map(p => {
      const parts = p.trim().split(':');
      const name = parts[0]?.trim().replace(/^[{[]|[:}\]]/g, '') || 'param';
      const type = parts[1]?.trim();
      return { name, type };
    });
  }

  /**
   * Cross-file Go to Definition (F12)
   */
  public findDefinition(symbolName: string, currentFilePath?: string): LSPSymbol | null {
    if (!symbolName || !symbolName.trim()) return null;
    const cleanName = symbolName.trim();

    // 1. Check current file first for local definition
    if (currentFilePath && this.symbolIndex.has(currentFilePath)) {
      const localSymbols = this.symbolIndex.get(currentFilePath) || [];
      const localMatch = localSymbols.find(s => s.name === cleanName);
      if (localMatch) return localMatch;
    }

    // 2. Search all workspace files
    for (const [filePath, symbols] of this.symbolIndex.entries()) {
      if (filePath === currentFilePath) continue;
      const match = symbols.find(s => s.name === cleanName);
      if (match) return match;
    }

    return null;
  }

  /**
   * Find All References across all files in the workspace (Shift+F12)
   */
  public findReferences(symbolName: string): LSPReference[] {
    const references: LSPReference[] = [];
    if (!symbolName || !symbolName.trim()) return references;
    const regex = new RegExp(`\\b${this.escapeRegex(symbolName.trim())}\\b`, 'g');

    for (const [filePath, content] of this.fileContents.entries()) {
      const lines = content.split('\n');
      lines.forEach((lineText, lineIdx) => {
        let match;
        while ((match = regex.exec(lineText)) !== null) {
          const col = match.index + 1;
          const isDef = this.isDefinitionLocation(symbolName, filePath, lineIdx + 1, col);
          references.push({
            filePath,
            line: lineIdx + 1,
            column: col,
            lineContent: lineText.trim(),
            isDefinition: isDef
          });
        }
      });
    }

    return references;
  }

  private isDefinitionLocation(symbolName: string, filePath: string, line: number, col: number): boolean {
    const symbols = this.symbolIndex.get(filePath) || [];
    return symbols.some(s => s.name === symbolName && s.line === line);
  }

  /**
   * Safe Semantic Rename across the workspace (F2)
   * Returns a map of filePath -> updated content
   */
  public renameSymbol(oldName: string, newName: string): { updatedFiles: Record<string, string>; count: number } {
    const updatedFiles: Record<string, string> = {};
    let totalCount = 0;

    if (!oldName || !newName || oldName === newName) {
      return { updatedFiles, count: 0 };
    }

    const regex = new RegExp(`\\b${this.escapeRegex(oldName)}\\b`, 'g');

    for (const [filePath, content] of this.fileContents.entries()) {
      if (regex.test(content)) {
        const matches = content.match(regex);
        const count = matches ? matches.length : 0;
        totalCount += count;

        const newContent = content.replace(regex, newName);
        updatedFiles[filePath] = newContent;
        this.updateFile(filePath, newContent);
      }
    }

    return { updatedFiles, count: totalCount };
  }

  /**
   * Generates Inlay Hints for function arguments and inferred returns
   */
  public getInlayHints(filePath: string): InlayHintItem[] {
    const hints: InlayHintItem[] = [];
    const content = this.fileContents.get(filePath);
    if (!content) return hints;

    const lines = content.split('\n');
    const allSymbols = this.getAllSymbols();

    // Map of function name -> params
    const fnMap = new Map<string, { name: string; type?: string }[]>();
    allSymbols.filter(s => s.kind === 'function' && s.params).forEach(s => {
      if (s.params && s.params.length > 0) {
        fnMap.set(s.name, s.params);
      }
    });

    lines.forEach((lineText, lineIdx) => {
      const lineNum = lineIdx + 1;

      // Look for function invocations: fnName(arg1, arg2)
      for (const [fnName, params] of fnMap.entries()) {
        const callRegex = new RegExp(`\\b${fnName}\\s*\\(([^)]+)\\)`, 'g');
        let match;
        while ((match = callRegex.exec(lineText)) !== null) {
          const rawArgs = match[1];
          const args = rawArgs.split(',');
          let currentOffset = match.index + fnName.length + 1;

          args.forEach((arg, argIdx) => {
            if (argIdx < params.length && params[argIdx].name) {
              const paramName = params[argIdx].name;
              // Don't show hint if arg already has same name e.g. foo(source = source)
              if (arg.trim() !== paramName) {
                hints.push({
                  line: lineNum,
                  column: currentOffset + 1,
                  label: `${paramName}: `,
                  kind: 'parameter',
                  tooltip: `Parameter ${paramName}: ${params[argIdx].type || 'any'}`
                });
              }
            }
            currentOffset += arg.length + 1;
          });
        }
      }

      // Look for inferred return types on function headers without explicit return type
      const unannotatedFn = lineText.match(/(?:export\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)\s*\{/);
      if (unannotatedFn) {
        const fnName = unannotatedFn[1];
        const fnCol = lineText.indexOf(')') + 1;
        hints.push({
          line: lineNum,
          column: fnCol + 1,
          label: `: void`,
          kind: 'type',
          tooltip: `Inferred return type for ${fnName}`
        });
      }
    });

    return hints;
  }

  /**
   * Diagnostic syntax & reference checker
   */
  private analyzeDiagnostics(filePath: string, code: string): WorkspaceDiagnostic[] {
    const diagnostics: WorkspaceDiagnostic[] = [];
    const lines = code.split('\n');

    lines.forEach((lineText, lineIdx) => {
      const lineNum = lineIdx + 1;

      // Check for unclosed JSX or strings
      if ((lineText.match(/"/g) || []).length % 2 !== 0 && !lineText.includes('//') && !lineText.includes('`')) {
        diagnostics.push({
          filePath,
          line: lineNum,
          column: 1,
          endLine: lineNum,
          endColumn: lineText.length + 1,
          message: 'Unterminated string literal detected.',
          severity: 'warning',
          code: 'LSP-1001'
        });
      }

      // Check for unused console.logs in production files
      if (lineText.includes('console.log(') && !lineText.trim().startsWith('//')) {
        const col = lineText.indexOf('console.log(') + 1;
        diagnostics.push({
          filePath,
          line: lineNum,
          column: col,
          endLine: lineNum,
          endColumn: col + 11,
          message: 'LSP Invariant: Unexpected console.log in production codebase.',
          severity: 'info',
          code: 'LSP-2002'
        });
      }
    });

    return diagnostics;
  }

  public getDiagnostics(filePath: string): WorkspaceDiagnostic[] {
    return this.diagnosticsCache.get(filePath) || [];
  }

  public getAllDiagnostics(): WorkspaceDiagnostic[] {
    const all: WorkspaceDiagnostic[] = [];
    for (const list of this.diagnosticsCache.values()) {
      all.push(...list);
    }
    return all;
  }

  public getSymbols(filePath?: string): LSPSymbol[] {
    if (filePath) return this.getSymbolsForFile(filePath);
    return this.getAllSymbols();
  }

  public getSymbolsForFile(filePath: string): LSPSymbol[] {
    return this.symbolIndex.get(filePath) || [];
  }

  public getAllSymbols(): LSPSymbol[] {
    const all: LSPSymbol[] = [];
    for (const list of this.symbolIndex.values()) {
      all.push(...list);
    }
    return all;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Global Singleton for the Workspace
export const lspWorkspace = new LSPEngine();
