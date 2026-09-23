/**
 * Aider-Style AST Repository Map (RepoMap) Engine
 * 
 * Inspired by Aider's SWE-bench winning architecture:
 * Extracts symbol definitions, export signatures, and cross-file dependencies
 * to build a PageRank-weighted, high-density structural map of the entire codebase.
 * 
 * Allows the AI Agent to have complete structural awareness of large projects
 * in ~1,500 - 3,000 tokens without needing to load full file contents.
 */

export interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'constant';
  signature: string;
  line: number;
}

export interface FileMapEntry {
  filePath: string;
  symbols: CodeSymbol[];
  imports: string[]; // paths or module names this file imports
  rankScore: number;
}

export class RepoMapEngine {
  private static instance: RepoMapEngine;

  public static getInstance(): RepoMapEngine {
    if (!RepoMapEngine.instance) {
      RepoMapEngine.instance = new RepoMapEngine();
    }
    return RepoMapEngine.instance;
  }

  /**
   * Generates a dense, token-budgeted repo-map from workspace files
   */
  public generateRepoMap(
    files: Record<string, string>,
    maxTokens: number = 2048,
    focusedFiles: string[] = []
  ): string {
    const entries = this.parseWorkspace(files);
    this.calculatePageRank(entries);

    // Sort entries by rank score descending (focused files first)
    const focusedSet = new Set(focusedFiles);
    entries.sort((a, b) => {
      if (focusedSet.has(a.filePath) && !focusedSet.has(b.filePath)) return -1;
      if (!focusedSet.has(a.filePath) && focusedSet.has(b.filePath)) return 1;
      return b.rankScore - a.rankScore;
    });

    let mapOutput = '# Project Structure & Symbol Map (AST-Extracted)\n\n';
    let estimatedTokens = 15;

    for (const entry of entries) {
      if (entry.symbols.length === 0) continue;

      let fileBlock = `${entry.filePath}:\n`;
      for (const sym of entry.symbols) {
        fileBlock += `  │ ${sym.signature}\n`;
      }
      fileBlock += '\n';

      const blockTokens = Math.ceil(fileBlock.length / 4);
      if (estimatedTokens + blockTokens > maxTokens) {
        break;
      }

      mapOutput += fileBlock;
      estimatedTokens += blockTokens;
    }

    return mapOutput;
  }

  /**
   * Parses AST patterns and symbols across all workspace files
   */
  public parseWorkspace(files: Record<string, string>): FileMapEntry[] {
    const entries: FileMapEntry[] = [];

    for (const [filePath, content] of Object.entries(files)) {
      if (this.isIgnoredPath(filePath)) continue;

      const symbols = this.extractSymbols(content);
      const imports = this.extractImports(content);

      entries.push({
        filePath,
        symbols,
        imports,
        rankScore: 1.0
      });
    }

    return entries;
  }

  /**
   * Simple PageRank algorithm: files imported by many other files receive higher prominence
   */
  private calculatePageRank(entries: FileMapEntry[]) {
    const importCounts: Record<string, number> = {};

    entries.forEach(entry => {
      entry.imports.forEach(imp => {
        // Find matching entry
        const matched = entries.find(e => 
          e.filePath === imp || 
          e.filePath.startsWith(imp) || 
          e.filePath.replace(/\.[^/.]+$/, '') === imp.replace(/\.[^/.]+$/, '')
        );
        if (matched) {
          importCounts[matched.filePath] = (importCounts[matched.filePath] || 0) + 1;
        }
      });
    });

    entries.forEach(entry => {
      const incoming = importCounts[entry.filePath] || 0;
      entry.rankScore = 1.0 + (incoming * 1.5) + (entry.symbols.length * 0.2);
    });
  }

  /**
   * Extracts function, class, interface, and type signatures from code
   */
  private extractSymbols(content: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      const lineNum = idx + 1;

      // 1. Exported functions / async functions
      const funcMatch = trimmed.match(/^export\s+(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*(\([^)]*\))/);
      if (funcMatch) {
        symbols.push({
          name: funcMatch[1],
          kind: 'function',
          signature: `export function ${funcMatch[1]}${funcMatch[2]}`,
          line: lineNum
        });
        return;
      }

      // 2. Exported const arrow functions
      const arrowMatch = trimmed.match(/^export\s+const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*(?::\s*([^{=>]+))?\s*=>/);
      if (arrowMatch) {
        symbols.push({
          name: arrowMatch[1],
          kind: 'function',
          signature: `export const ${arrowMatch[1]} = (${arrowMatch[2]})${arrowMatch[3] ? ': ' + arrowMatch[3].trim() : ''}`,
          line: lineNum
        });
        return;
      }

      // 3. Exported classes
      const classMatch = trimmed.match(/^export\s+(?:abstract\s+)?class\s+([a-zA-Z0-9_$]+)(?:\s+extends\s+[a-zA-Z0-9_$]+)?(?:\s+implements\s+[^{]+)?/);
      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          kind: 'class',
          signature: classMatch[0].trim(),
          line: lineNum
        });
        return;
      }

      // 4. Exported interfaces
      const interfaceMatch = trimmed.match(/^export\s+interface\s+([a-zA-Z0-9_$]+)(?:\s+extends\s+[^{]+)?/);
      if (interfaceMatch) {
        symbols.push({
          name: interfaceMatch[1],
          kind: 'interface',
          signature: interfaceMatch[0].trim(),
          line: lineNum
        });
        return;
      }

      // 5. Exported types
      const typeMatch = trimmed.match(/^export\s+type\s+([a-zA-Z0-9_$]+)(?:<[^>]+>)?\s*=/);
      if (typeMatch) {
        symbols.push({
          name: typeMatch[1],
          kind: 'type',
          signature: typeMatch[0].trim() + ' ...',
          line: lineNum
        });
        return;
      }

      // 6. Python def / class definitions
      const pyFuncMatch = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)/);
      if (pyFuncMatch) {
        symbols.push({
          name: pyFuncMatch[1],
          kind: 'function',
          signature: `def ${pyFuncMatch[1]}(${pyFuncMatch[2]})`,
          line: lineNum
        });
        return;
      }

      const pyClassMatch = trimmed.match(/^class\s+([a-zA-Z0-9_$]+)(?:\([^)]*\))?:/);
      if (pyClassMatch) {
        symbols.push({
          name: pyClassMatch[1],
          kind: 'class',
          signature: pyClassMatch[0].replace(/:$/, ''),
          line: lineNum
        });
      }
    });

    return symbols;
  }

  /**
   * Extracts imported relative modules to compute dependency graph
   */
  private extractImports(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /(?:import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const imp = match[1] || match[2];
      if (imp && (imp.startsWith('./') || imp.startsWith('../') || imp.startsWith('@/'))) {
        imports.push(imp.replace(/^@\//, ''));
      }
    }

    return imports;
  }

  private isIgnoredPath(p: string): boolean {
    const lower = p.toLowerCase();
    return (
      lower.includes('node_modules') ||
      lower.includes('.git') ||
      lower.includes('.next') ||
      lower.includes('dist') ||
      lower.endsWith('.ico') ||
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.svg') ||
      lower.endsWith('.json') ||
      lower.endsWith('.css') ||
      lower.endsWith('.lock')
    );
  }
}

export const repoMapEngine = RepoMapEngine.getInstance();
