/**
 * Repomix Codebase Context Packer Engine
 *
 * Based on yamadashy/repomix (https://github.com/yamadashy/repomix)
 * Provides high-speed, zero-dependency in-memory repository serialization into
 * AI-optimized XML, Markdown, and JSON formats with automated secret scrubbing,
 * Git-aware filtering, and token budgeting.
 */

export type RepomixFormat = 'xml' | 'markdown' | 'json';

export interface RepomixPackOptions {
  format?: RepomixFormat;
  tokenBudget?: number; // Maximum allowed tokens
  redactSecrets?: boolean; // Default: true
  removeComments?: boolean; // Default: false
  includePattern?: string[];
  excludePattern?: string[];
  headerInstruction?: string;
}

export interface RepomixPackResult {
  content: string;
  format: RepomixFormat;
  totalFiles: number;
  totalCharacters: number;
  totalTokens: number;
  redactedSecretsCount: number;
  isTruncated: boolean;
  fileList: string[];
}

export class RepomixEngine {
  private readonly SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
    { name: 'ANTHROPIC_API_KEY', regex: /sk-ant-[a-zA-Z0-9_\-]{20,}/g },
    { name: 'OPENAI_API_KEY', regex: /sk-(?:proj-)?[a-zA-Z0-9_\-]{20,}/g },
    { name: 'GITHUB_TOKEN', regex: /gh[pousr]_[a-zA-Z0-9]{36,}/g },
    { name: 'AWS_ACCESS_KEY', regex: /(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g },
    { name: 'SLACK_TOKEN', regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/g },
    { name: 'STRIPE_API_KEY', regex: /(?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,}/g },
    { name: 'GENERIC_PRIVATE_KEY', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[a-zA-Z0-9\s+/=]+-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
    { name: 'BEARER_TOKEN', regex: /Bearer\s+[a-zA-Z0-9_\-\.]{25,}/gi }
  ];

  private readonly DEFAULT_EXCLUDES = [
    'node_modules',
    '.git',
    '.next',
    'dist',
    'build',
    'out',
    '.vscode',
    'package-lock.json',
    'bun.lock',
    'yarn.lock',
    'pnpm-lock.yaml',
    '.DS_Store'
  ];

  private readonly BINARY_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.exe', '.dll', '.so', '.dylib', '.zip', '.tar', '.gz',
    '.pdf', '.wasm', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4'
  ];

  /**
   * Scans text content and masks credentials/API keys.
   */
  public redactSecrets(content: string): { sanitized: string; redactedCount: number } {
    let sanitized = content;
    let redactedCount = 0;

    for (const pattern of this.SECRET_PATTERNS) {
      sanitized = sanitized.replace(pattern.regex, () => {
        redactedCount++;
        return `[REDACTED_SECRET: ${pattern.name}]`;
      });
    }

    return { sanitized, redactedCount };
  }

  /**
   * Estimates token count using standard BPE code heuristics (~3.8 chars per token).
   */
  public estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 3.8);
  }

  /**
   * Packs an object mapping of file paths to contents into a unified context representation.
   */
  public async packWorkspace(
    files: Record<string, string>,
    options: RepomixPackOptions = {}
  ): Promise<RepomixPackResult> {
    const format = options.format || 'xml';
    const doRedact = options.redactSecrets !== false;
    const tokenBudget = options.tokenBudget;

    let totalSecretsRedacted = 0;
    const processedFiles: Array<{ path: string; content: string }> = [];

    // Filter and sanitize files
    const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));

    for (const [rawPath, rawContent] of entries) {
      const normalizedPath = rawPath.replace(/\\/g, '/');

      // Check ignore rules
      if (this.isIgnoredPath(normalizedPath)) {
        continue;
      }

      // Check binary extension
      if (this.isBinary(normalizedPath)) {
        continue;
      }

      let content = rawContent;
      if (doRedact) {
        const { sanitized, redactedCount } = this.redactSecrets(content);
        content = sanitized;
        totalSecretsRedacted += redactedCount;
      }

      if (options.removeComments) {
        content = this.stripComments(content);
      }

      processedFiles.push({ path: normalizedPath, content });
    }

    // Format serialization with token budgeting
    let packedContent = '';
    let isTruncated = false;

    if (tokenBudget && tokenBudget > 0) {
      // Pack iteratively until budget is met
      const includedFiles: Array<{ path: string; content: string }> = [];
      let currentTokens = 0;

      for (const f of processedFiles) {
        const fileTokens = this.estimateTokens(f.content);
        if (currentTokens + fileTokens > tokenBudget) {
          isTruncated = true;
          break;
        }
        includedFiles.push(f);
        currentTokens += fileTokens;
      }

      packedContent = this.serialize(includedFiles, format, options.headerInstruction);
      if (isTruncated) {
        packedContent += `\n\n[WARNING: Token budget reached (${tokenBudget} tokens). ${processedFiles.length - includedFiles.length} files were truncated.]`;
      }
    } else {
      packedContent = this.serialize(processedFiles, format, options.headerInstruction);
    }

    const totalTokens = this.estimateTokens(packedContent);

    return {
      content: packedContent,
      format,
      totalFiles: processedFiles.length,
      totalCharacters: packedContent.length,
      totalTokens,
      redactedSecretsCount: totalSecretsRedacted,
      isTruncated,
      fileList: processedFiles.map((f) => f.path)
    };
  }

  private serialize(
    files: Array<{ path: string; content: string }>,
    format: RepomixFormat,
    headerInstruction?: string
  ): string {
    switch (format) {
      case 'xml':
        return this.formatXml(files, headerInstruction);
      case 'markdown':
        return this.formatMarkdown(files, headerInstruction);
      case 'json':
        return this.formatJson(files, headerInstruction);
      default:
        return this.formatXml(files, headerInstruction);
    }
  }

  public formatXml(
    files: Array<{ path: string; content: string }>,
    headerInstruction?: string
  ): string {
    const lines: string[] = [];
    lines.push('This file is a merged representation of the codebase, generated by Repomix in Offline AI Studio.');
    if (headerInstruction) {
      lines.push(`<instructions>\n${headerInstruction}\n</instructions>`);
    }
    lines.push('<repository>');

    lines.push('  <files_summary>');
    for (const f of files) {
      lines.push(`    <file_path>${f.path}</file_path>`);
    }
    lines.push('  </files_summary>');

    lines.push('  <files>');
    for (const f of files) {
      lines.push(`    <file path="${f.path}">`);
      lines.push(f.content);
      lines.push('    </file>');
    }
    lines.push('  </files>');
    lines.push('</repository>');

    return lines.join('\n');
  }

  public formatMarkdown(
    files: Array<{ path: string; content: string }>,
    headerInstruction?: string
  ): string {
    const lines: string[] = [];
    lines.push('# Repository Codebase Context (Packed via Repomix)');
    if (headerInstruction) {
      lines.push(`> **Instructions:** ${headerInstruction}\n`);
    }
    lines.push('## File Summary');
    for (const f of files) {
      lines.push(`- \`${f.path}\``);
    }
    lines.push('\n## File Contents\n');

    for (const f of files) {
      const rawExt = f.path.split('.').pop() || '';
      const extMap: Record<string, string> = {
        ts: 'typescript',
        tsx: 'typescript',
        js: 'javascript',
        jsx: 'javascript',
        py: 'python',
        rs: 'rust',
        rb: 'ruby',
        sh: 'bash',
        yml: 'yaml'
      };
      const lang = extMap[rawExt.toLowerCase()] || rawExt;
      lines.push(`### \`${f.path}\``);
      lines.push('```' + lang);
      lines.push(f.content);
      lines.push('```\n');
    }

    return lines.join('\n');
  }

  public formatJson(
    files: Array<{ path: string; content: string }>,
    headerInstruction?: string
  ): string {
    const payload = {
      generatedBy: 'Repomix / Offline AI Studio',
      instructions: headerInstruction || undefined,
      timestamp: new Date().toISOString(),
      totalFiles: files.length,
      files: files.map((f) => ({
        path: f.path,
        sizeBytes: f.content.length,
        content: f.content
      }))
    };
    return JSON.stringify(payload, null, 2);
  }

  private isIgnoredPath(p: string): boolean {
    const parts = p.split('/');
    for (const excluded of this.DEFAULT_EXCLUDES) {
      if (parts.includes(excluded) || p === excluded) {
        return true;
      }
    }
    return false;
  }

  private isBinary(p: string): boolean {
    const lower = p.toLowerCase();
    return this.BINARY_EXTENSIONS.some((ext) => lower.endsWith(ext));
  }

  private stripComments(code: string): string {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*/g, '$1');
  }
}

export const repomixEngine = new RepomixEngine();

// CommonJS export fallback for direct Node script executions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RepomixEngine,
    repomixEngine
  };
}
