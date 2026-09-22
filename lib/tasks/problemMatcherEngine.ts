// Compiler Output Problem Matcher Engine (.vscode/tasks.json problem matchers)
'use client';

import { lspWorkerHub, LspProblemItem } from '../lsp/LspWorkerHub';

export interface ProblemMatcherPattern {
  name: string;
  regex: RegExp;
  fileIndex: number;
  lineIndex: number;
  colIndex?: number;
  severityIndex?: number;
  codeIndex?: number;
  messageIndex: number;
  defaultSeverity: 'error' | 'warning';
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
}

export class ProblemMatcherEngine {
  private static instance: ProblemMatcherEngine;

  private builtInPatterns: ProblemMatcherPattern[] = [
    // 1. TypeScript Compiler ($tsc): e.g. components/Playground.tsx:142:5 - error TS2322: Type 'string' is not assignable to type 'number'.
    {
      name: '$tsc-standard',
      regex: /^([a-zA-Z0-9_./\\-]+):(\d+):(\d+)\s*-\s*(error|warning)\s*(TS\d+):\s*(.+)$/,
      fileIndex: 1,
      lineIndex: 2,
      colIndex: 3,
      severityIndex: 4,
      codeIndex: 5,
      messageIndex: 6,
      defaultSeverity: 'error'
    },
    // 2. TypeScript/C# Parenthesized ($tsc-paren): e.g. components/Playground.tsx(142,5): error TS2322: ...
    {
      name: '$tsc-paren',
      regex: /^([a-zA-Z0-9_./\\-]+)\((\d+),(\d+)\):\s*(error|warning)\s*(TS\d+):\s*(.+)$/,
      fileIndex: 1,
      lineIndex: 2,
      colIndex: 3,
      severityIndex: 4,
      codeIndex: 5,
      messageIndex: 6,
      defaultSeverity: 'error'
    },
    // 3. GCC / Clang / Rustc ($gcc): e.g. src/main.rs:12:5: error: mismatched types
    {
      name: '$gcc',
      regex: /^([a-zA-Z0-9_./\\-]+):(\d+):(\d+):\s*(error|warning|fatal error):\s*(.+)$/,
      fileIndex: 1,
      lineIndex: 2,
      colIndex: 3,
      severityIndex: 4,
      messageIndex: 5,
      defaultSeverity: 'error'
    },
    // 4. Rust Compiler rustc ($rustc): e.g. error[E0308]: mismatched types --> src/lib.rs:42:5
    {
      name: '$rustc',
      regex: /-->\s*([a-zA-Z0-9_./\\-]+):(\d+):(\d+)/,
      fileIndex: 1,
      lineIndex: 2,
      colIndex: 3,
      messageIndex: 0,
      defaultSeverity: 'error'
    },
    // 5. Python Tracebacks ($python): e.g. File "app.py", line 42, in <module>
    {
      name: '$python',
      regex: /File\s+"([^"]+)",\s*line\s*(\d+)(?:,\s*in\s+(.+))?/,
      fileIndex: 1,
      lineIndex: 2,
      messageIndex: 3,
      defaultSeverity: 'error'
    }
  ];

  public static getInstance(): ProblemMatcherEngine {
    if (!ProblemMatcherEngine.instance) {
      ProblemMatcherEngine.instance = new ProblemMatcherEngine();
    }
    return ProblemMatcherEngine.instance;
  }

  /**
   * Parse arbitrary terminal compiler output lines and extract structured problems
   */
  public parseOutput(rawOutput: string): LspProblemItem[] {
    const cleanOutput = stripAnsi(rawOutput);
    const lines = cleanOutput.split(/\r?\n/);
    const problems: LspProblemItem[] = [];

    let currentEslintFile = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Check ESLint file header: /path/to/file.tsx or components/Playground.tsx
      if (/^[a-zA-Z0-9_./\\-]+\.[a-zA-Z]{2,4}$/.test(line) && !line.includes(':')) {
        currentEslintFile = line;
        continue;
      }

      // Check ESLint line: 142:5  error  'foo' is defined but never used  @typescript-eslint/no-unused-vars
      const eslintMatch = line.match(/^(\d+):(\d+)\s+(error|warning)\s+(.*?)(?:\s+([a-zA-Z0-9_/@-]+))?$/);
      if (eslintMatch && currentEslintFile) {
        const lineNum = parseInt(eslintMatch[1], 10);
        const colNum = parseInt(eslintMatch[2], 10);
        const sev = eslintMatch[3].toLowerCase() === 'warning' ? 'warning' : 'error';
        const msg = eslintMatch[4].trim();
        const code = eslintMatch[5];

        problems.push({
          id: `comp_eslint_${currentEslintFile}_${lineNum}_${colNum}_${i}`,
          filePath: this.normalizeFilePath(currentEslintFile),
          line: lineNum,
          column: colNum,
          endLine: lineNum,
          endColumn: colNum + 4,
          message: msg,
          severity: sev,
          source: 'compiler',
          code: code || 'ESLINT'
        });
        continue;
      }

      // Check built-in patterns
      for (const pattern of this.builtInPatterns) {
        const match = line.match(pattern.regex);
        if (match) {
          const filePath = match[pattern.fileIndex];
          const lineNum = parseInt(match[pattern.lineIndex], 10);
          const colNum = pattern.colIndex ? parseInt(match[pattern.colIndex], 10) : 1;

          let sev: 'error' | 'warning' = pattern.defaultSeverity;
          if (pattern.severityIndex && match[pattern.severityIndex]) {
            const rawSev = match[pattern.severityIndex].toLowerCase();
            sev = rawSev.includes('warn') ? 'warning' : 'error';
          }

          let code: string | undefined;
          if (pattern.codeIndex && match[pattern.codeIndex]) {
            code = match[pattern.codeIndex];
          }

          let message = pattern.messageIndex !== 0 && match[pattern.messageIndex]
            ? match[pattern.messageIndex].trim()
            : line;

          // If next line has error detail (common in Python / Rust)
          if (pattern.name === '$python' && i + 1 < lines.length && lines[i + 1].trim()) {
            const nextLine = lines[i + 1].trim();
            if (nextLine.includes('Error:') || nextLine.includes('Exception:')) {
              message = nextLine;
            }
          }

          problems.push({
            id: `comp_${pattern.name}_${filePath}_${lineNum}_${colNum}_${i}`,
            filePath: this.normalizeFilePath(filePath),
            line: lineNum,
            column: colNum,
            endLine: lineNum,
            endColumn: colNum + 6,
            message,
            severity: sev,
            source: 'compiler',
            code
          });
          break;
        }
      }
    }

    return problems;
  }

  /**
   * Parse terminal output and push detected compiler errors into LspWorkerHub
   */
  public processAndSyncTerminalOutput(output: string, append: boolean = false): LspProblemItem[] {
    const problems = this.parseOutput(output);
    if (problems.length > 0 || !append) {
      lspWorkerHub.addCompilerProblems(problems, !append);
    }
    return problems;
  }

  private normalizeFilePath(p: string): string {
    let normalized = p.replace(/\\/g, '/');
    if (normalized.startsWith('./')) normalized = normalized.substring(2);
    return normalized;
  }
}

export const problemMatcherEngine = ProblemMatcherEngine.getInstance();
