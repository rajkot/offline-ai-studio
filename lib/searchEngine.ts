export interface SearchResultMatch {
  line: number;
  text: string;
  preview: string;
  startColumn: number;
  endColumn: number;
}

export interface FileSearchResult {
  filePath: string;
  matches: SearchResultMatch[];
}

export class SearchEngine {
  public static search(
    query: string,
    files: Record<string, string>,
    options: {
      isRegex?: boolean;
      isCaseSensitive?: boolean;
      isWholeWord?: boolean;
      includePatterns?: string[];
      excludePatterns?: string[];
    } = {}
  ): FileSearchResult[] {
    if (!query) return [];

    const results: FileSearchResult[] = [];
    let regex: RegExp;

    try {
      if (options.isRegex) {
        regex = new RegExp(query, options.isCaseSensitive ? 'g' : 'gi');
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = options.isWholeWord ? `\\b${escaped}\\b` : escaped;
        regex = new RegExp(pattern, options.isCaseSensitive ? 'g' : 'gi');
      }
    } catch (e) {
      console.error('Invalid search regex:', e);
      return [];
    }

    for (const [filePath, content] of Object.entries(files)) {
      // Basic glob-like filtering
      if (options.includePatterns && options.includePatterns.length > 0) {
        if (!options.includePatterns.some(p => this.matchesPattern(filePath, p))) continue;
      }
      if (options.excludePatterns && options.excludePatterns.length > 0) {
        if (options.excludePatterns.some(p => this.matchesPattern(filePath, p))) continue;
      }

      const matches: SearchResultMatch[] = [];
      const lines = content.split('\n');

      lines.forEach((lineText, index) => {
        let match: RegExpExecArray | null;
        // Reset regex state for global search
        regex.lastIndex = 0;
        
        while ((match = regex.exec(lineText)) !== null) {
          matches.push({
            line: index + 1,
            text: lineText,
            preview: lineText.trim(),
            startColumn: match.index + 1,
            endColumn: match.index + match[0].length + 1
          });
          if (!regex.global) break;
        }
      });

      if (matches.length > 0) {
        results.push({ filePath, matches });
      }
    }

    return results;
  }

  public static replace(
    query: string,
    replacement: string,
    files: Record<string, string>,
    options: {
      isRegex?: boolean;
      isCaseSensitive?: boolean;
      isWholeWord?: boolean;
      targetFiles?: string[];
    } = {}
  ): Record<string, string> {
    if (!query) return {};

    const updatedFiles: Record<string, string> = {};
    let regex: RegExp;

    try {
      if (options.isRegex) {
        regex = new RegExp(query, options.isCaseSensitive ? 'g' : 'gi');
      } else {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = options.isWholeWord ? `\\b${escaped}\\b` : escaped;
        regex = new RegExp(pattern, options.isCaseSensitive ? 'g' : 'gi');
      }
    } catch (e) {
      return {};
    }

    const filesToProcess = options.targetFiles 
      ? Object.entries(files).filter(([path]) => options.targetFiles!.includes(path))
      : Object.entries(files);

    for (const [filePath, content] of filesToProcess) {
      if (regex.test(content)) {
        updatedFiles[filePath] = content.replace(regex, replacement);
      }
    }

    return updatedFiles;
  }

  private static matchesPattern(path: string, pattern: string): boolean {
    // Simple implementation of glob matching
    const p = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
    const re = new RegExp(`^${p}$`);
    return re.test(path);
  }
}
