export interface SearchResultMatch {
  id: string;
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
      if (filePath.startsWith('__')) continue;

      // Filter by Include patterns
      if (options.includePatterns && options.includePatterns.length > 0) {
        const matchesAnyInclude = options.includePatterns.some(p => this.matchesPattern(filePath, p));
        if (!matchesAnyInclude) continue;
      }

      // Filter by Exclude patterns
      if (options.excludePatterns && options.excludePatterns.length > 0) {
        const matchesAnyExclude = options.excludePatterns.some(p => this.matchesPattern(filePath, p));
        if (matchesAnyExclude) continue;
      }

      const matches: SearchResultMatch[] = [];
      const lines = content.split('\n');

      lines.forEach((lineText, index) => {
        let match: RegExpExecArray | null;
        regex.lastIndex = 0;

        while ((match = regex.exec(lineText)) !== null) {
          const startCol = match.index + 1;
          const endCol = match.index + match[0].length + 1;
          const matchId = `${filePath}:${index + 1}:${startCol}`;

          matches.push({
            id: matchId,
            line: index + 1,
            text: lineText,
            preview: lineText.trim(),
            startColumn: startCol,
            endColumn: endCol
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
      includePatterns?: string[];
      excludePatterns?: string[];
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

    for (const [filePath, content] of Object.entries(files)) {
      if (filePath.startsWith('__')) continue;
      if (options.targetFiles && !options.targetFiles.includes(filePath)) continue;

      if (options.includePatterns && options.includePatterns.length > 0) {
        if (!options.includePatterns.some(p => this.matchesPattern(filePath, p))) continue;
      }
      if (options.excludePatterns && options.excludePatterns.length > 0) {
        if (options.excludePatterns.some(p => this.matchesPattern(filePath, p))) continue;
      }

      if (regex.test(content)) {
        updatedFiles[filePath] = content.replace(regex, replacement);
      }
    }

    return updatedFiles;
  }

  /**
   * Selective replacement by specific match IDs
   */
  public static replaceSelective(
    query: string,
    replacement: string,
    files: Record<string, string>,
    selectedMatchIds: Set<string>,
    options: {
      isRegex?: boolean;
      isCaseSensitive?: boolean;
      isWholeWord?: boolean;
    } = {}
  ): Record<string, string> {
    if (!query || selectedMatchIds.size === 0) return {};

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

    for (const [filePath, content] of Object.entries(files)) {
      if (filePath.startsWith('__')) continue;

      const lines = content.split('\n');
      let fileModified = false;

      const newLines = lines.map((lineText, lineIdx) => {
        const lineNum = lineIdx + 1;
        regex.lastIndex = 0;

        // Check if any selected match is on this line
        const hasMatchOnLine = Array.from(selectedMatchIds).some(id =>
          id.startsWith(`${filePath}:${lineNum}:`)
        );

        if (!hasMatchOnLine) return lineText;

        // Replace matches that are selected
        const replacedLine = lineText.replace(regex, (matchStr, ...args) => {
          const offset = typeof args[args.length - 2] === 'number' ? args[args.length - 2] : 0;
          const col = offset + 1;
          const matchId = `${filePath}:${lineNum}:${col}`;

          if (selectedMatchIds.has(matchId)) {
            fileModified = true;
            // Support capture group substitution e.g. $1, $2
            if (options.isRegex) {
              let res = replacement;
              const matches = matchStr.match(new RegExp(query, options.isCaseSensitive ? '' : 'i'));
              if (matches) {
                matches.forEach((grp, idx) => {
                  if (idx > 0) res = res.replace(new RegExp(`\\$${idx}`, 'g'), grp);
                });
              }
              return res;
            }
            return replacement;
          }
          return matchStr;
        });

        return replacedLine;
      });

      if (fileModified) {
        updatedFiles[filePath] = newLines.join('\n');
      }
    }

    return updatedFiles;
  }

  /**
   * Glob pattern matcher supporting wildcards like **\/*.tsx, *.ts, components/*
   */
  public static matchesPattern(path: string, pattern: string): boolean {
    const cleanPattern = pattern.trim().replace(/\\/g, '/');
    const cleanPath = path.replace(/^[/\\]+/, '').replace(/\\/g, '/');

    if (!cleanPattern) return true;

    // Handle comma separated patterns e.g. "*.ts, *.tsx"
    if (cleanPattern.includes(',')) {
      return cleanPattern.split(',').some(p => this.matchesPattern(path, p.trim()));
    }

    // Direct filename match e.g. "Playground.tsx"
    if (!cleanPattern.includes('/') && !cleanPattern.includes('*')) {
      return cleanPath.endsWith(cleanPattern) || cleanPath.split('/').pop() === cleanPattern;
    }

    // Convert glob pattern to regular expression
    const regexPattern = cleanPattern
      .replace(/\./g, '\\.')
      .replace(/\*\*\//g, '(?:.*\\/)?')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');

    try {
      const re = new RegExp(`^${regexPattern}$`, 'i');
      return re.test(cleanPath);
    } catch {
      return cleanPath.includes(cleanPattern);
    }
  }
}
