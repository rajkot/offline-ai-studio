/**
 * Cross-File Language Server Protocol (LSP) Manager for Monaco Editor
 *
 * Provides VS Code-grade project-wide semantic navigation:
 * 1. F12: Cross-File Go to Definition (jumps directly across files to declarations)
 * 2. Shift+F12: Find All References (opens native Monaco Peek + triggers references UI)
 * 3. F2: Safe Semantic Symbol Renaming (atomic workspace-wide write-through)
 * 4. Ctrl+. / Alt+Enter: Quick Fix & Auto-Import from exported symbols
 * 5. Document Symbols & Enclosing Hierarchy for Breadcrumbs Navigation
 */

import { lspWorkspace, LSPSymbol, LSPReference } from '../lspEngine';

export interface ReferencesPeekData {
  symbolName: string;
  references: LSPReference[];
}

export class CrossFileLspManager {
  private monacoInstance: any = null;
  private editorInstance: any = null;
  private disposables: Array<{ dispose: () => void }> = [];
  private onOpenFileCallback?: (filePath: string, line: number, column?: number) => void;
  private onBatchApplyFilesCallback?: (files: Record<string, string>, message?: string) => void;
  private onReferencesFoundCallback?: (data: ReferencesPeekData) => void;
  private isInitialized = false;

  /**
   * Initializes language providers and synchronizes Monaco editor models
   */
  public attach(monaco: any, editor: any) {
    this.monacoInstance = monaco;
    this.editorInstance = editor;

    if (!this.isInitialized) {
      this.registerProviders();
      this.isInitialized = true;
    }
  }

  public setOnOpenFile(cb: (filePath: string, line: number, column?: number) => void) {
    this.onOpenFileCallback = cb;
  }

  public setOnBatchApplyFiles(cb: (files: Record<string, string>, message?: string) => void) {
    this.onBatchApplyFilesCallback = cb;
  }

  public setOnReferencesFound(cb: (data: ReferencesPeekData) => void) {
    this.onReferencesFoundCallback = cb;
  }

  /**
   * Synchronizes Monaco's in-memory model collection with workspace files
   * so Monaco's native Peek and Go-to-Definition can resolve across all files.
   */
  public syncWorkspaceModels(files: Record<string, string>) {
    if (!this.monacoInstance) return;

    // Update internal AST index
    lspWorkspace.updateWorkspace(files);

    // Ensure models exist in Monaco
    for (const [filePath, content] of Object.entries(files)) {
      if (filePath.startsWith('__')) continue;
      this.getOrCreateMonacoModel(filePath, content);
    }
  }

  /**
   * Updates a single file in Monaco and the AST index
   */
  public updateFile(filePath: string, content: string) {
    lspWorkspace.updateFile(filePath, content);
    if (!this.monacoInstance) return;

    const uri = this.getOrCreateUri(filePath);
    const model = this.monacoInstance.editor.getModel(uri);
    if (model && model.getValue() !== content) {
      model.setValue(content);
    }
  }

  public getOrCreateUri(filePath: string) {
    if (!this.monacoInstance) return null;
    const cleanPath = filePath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
    return this.monacoInstance.Uri.parse(`file:///${cleanPath}`);
  }

  public getFilePathFromUri(uri: any): string {
    if (!uri) return '';
    const p = uri.path || uri.fsPath || '';
    return p.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  }

  public getOrCreateMonacoModel(filePath: string, content: string = '') {
    if (!this.monacoInstance) return null;
    const uri = this.getOrCreateUri(filePath);
    let model = this.monacoInstance.editor.getModel(uri);

    if (!model) {
      const ext = filePath.split('.').pop()?.toLowerCase();
      let language = 'typescript';
      if (ext === 'tsx') language = 'typescript';
      else if (ext === 'js' || ext === 'jsx') language = 'javascript';
      else if (ext === 'json') language = 'json';
      else if (ext === 'css') language = 'css';
      else if (ext === 'html') language = 'html';
      else if (ext === 'py') language = 'python';
      else if (ext === 'md') language = 'markdown';

      try {
        model = this.monacoInstance.editor.createModel(content, language, uri);
      } catch {
        model = this.monacoInstance.editor.getModel(uri);
      }
    } else if (content && model.getValue() !== content) {
      model.setValue(content);
    }

    return model;
  }

  /**
   * Registers F12, Shift+F12, F2, and Auto-Import Quick Fixes
   */
  private registerProviders() {
    const monaco = this.monacoInstance;
    if (!monaco) return;

    const languages = ['typescript', 'javascript'];

    // 1. Cross-File Go to Definition (F12)
    const defDisp = monaco.languages.registerDefinitionProvider(languages, {
      provideDefinition: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const currentPath = this.getFilePathFromUri(model.uri);
        const def = lspWorkspace.findDefinition(word.word, currentPath);
        if (!def) return null;

        const targetUri = this.getOrCreateUri(def.filePath);

        // If target file is in another file, open tab and jump
        if (def.filePath !== currentPath && this.onOpenFileCallback) {
          this.onOpenFileCallback(def.filePath, def.line, def.column);
        }

        return {
          uri: targetUri,
          range: {
            startLineNumber: def.line,
            startColumn: def.column,
            endLineNumber: def.endLine || def.line,
            endColumn: def.endColumn || (def.column + def.name.length)
          }
        };
      }
    });
    this.disposables.push(defDisp);

    // 2. Cross-File Find All References (Shift+F12)
    const refDisp = monaco.languages.registerReferenceProvider(languages, {
      provideReferences: (model: any, position: any, _context: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return [];

        const refs = lspWorkspace.findReferences(word.word);
        if (this.onReferencesFoundCallback && refs.length > 0) {
          this.onReferencesFoundCallback({
            symbolName: word.word,
            references: refs
          });
        }

        return refs.map(r => ({
          uri: this.getOrCreateUri(r.filePath),
          range: {
            startLineNumber: r.line,
            startColumn: r.column,
            endLineNumber: r.line,
            endColumn: r.column + word.word.length
          }
        }));
      }
    });
    this.disposables.push(refDisp);

    // 3. Cross-File Safe Semantic Symbol Renaming (F2)
    const renameDisp = monaco.languages.registerRenameProvider(languages, {
      provideRenameEdits: (model: any, position: any, newName: string) => {
        const word = model.getWordAtPosition(position);
        if (!word) return { edits: [] };

        const result = lspWorkspace.renameSymbol(word.word, newName);
        if (result.count > 0 && this.onBatchApplyFilesCallback) {
          this.onBatchApplyFilesCallback(
            result.updatedFiles,
            `Renamed '${word.word}' -> '${newName}' across ${Object.keys(result.updatedFiles).length} files (${result.count} occurrences)`
          );
        }

        const edits: any[] = [];
        for (const [filePath, content] of Object.entries(result.updatedFiles)) {
          const targetUri = this.getOrCreateUri(filePath);
          const targetModel = monaco.editor.getModel(targetUri);
          if (targetModel) {
            edits.push({
              resource: targetUri,
              textEdit: {
                range: targetModel.getFullModelRange(),
                text: content
              }
            });
          }
        }

        return { edits };
      },
      resolveRenameLocation: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) {
          return { canRename: false, rejectReason: 'Cannot rename empty identifier' };
        }
        return {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endLineNumber: position.lineNumber,
            endColumn: word.endColumn
          },
          text: word.word
        };
      }
    });
    this.disposables.push(renameDisp);

    // 4. Ctrl+. / Alt+Enter Quick Fix & Auto-Import Provider
    const codeActionDisp = monaco.languages.registerCodeActionProvider(languages, {
      provideCodeActions: (model: any, range: any, _context: any) => {
        const word = model.getWordAtPosition({
          lineNumber: range.startLineNumber,
          column: range.startColumn
        });
        if (!word) return { actions: [], dispose: () => {} };

        const currentPath = this.getFilePathFromUri(model.uri);
        const currentContent = model.getValue();

        // Check if already imported
        const isImported =
          currentContent.includes(`{ ${word.word} }`) ||
          currentContent.includes(`{${word.word}}`) ||
          currentContent.includes(`import ${word.word} `) ||
          currentContent.includes(`import ${word.word},`);

        if (isImported) {
          return { actions: [], dispose: () => {} };
        }

        // Find candidate exported symbols across the entire workspace
        const exported = lspWorkspace.findExportedSymbols(word.word);
        const candidates = exported.filter(s => s.filePath !== currentPath);

        const actions = candidates.map(sym => {
          const importPath = this.computeImportPath(currentPath, sym.filePath);
          const importLine = `import { ${sym.name} } from '${importPath}';\n`;

          return {
            title: `💡 Add import from '${importPath}' (${sym.kind})`,
            kind: 'quickfix',
            isPreferred: true,
            edit: {
              edits: [
                {
                  resource: model.uri,
                  textEdit: {
                    range: {
                      startLineNumber: 1,
                      startColumn: 1,
                      endLineNumber: 1,
                      endColumn: 1
                    },
                    text: importLine
                  }
                }
              ]
            }
          };
        });

        return { actions, dispose: () => {} };
      }
    });
    this.disposables.push(codeActionDisp);

    // 5. Document Symbol Provider (Monaco Outline & Breadcrumbs)
    const docSymbolDisp = monaco.languages.registerDocumentSymbolProvider(languages, {
      provideDocumentSymbols: (model: any) => {
        const filePath = this.getFilePathFromUri(model.uri);
        const symbols = lspWorkspace.getSymbols(filePath);

        return symbols.map(s => ({
          name: s.name,
          detail: s.signature || s.kind,
          kind: this.mapSymbolKind(s.kind),
          range: {
            startLineNumber: s.line,
            startColumn: s.column,
            endLineNumber: s.endLine,
            endColumn: s.endColumn
          },
          selectionRange: {
            startLineNumber: s.line,
            startColumn: s.column,
            endLineNumber: s.line,
            endColumn: s.column + s.name.length
          }
        }));
      }
    });
    this.disposables.push(docSymbolDisp);
  }

  /**
   * Computes clean alias '@/' or relative path './'
   */
  private computeImportPath(fromFile: string, toFile: string): string {
    const cleanTo = toFile.replace(/\.(tsx?|jsx?)$/, '');

    // Standard Next.js/React path alias '@/' if under root folders
    if (
      cleanTo.startsWith('components/') ||
      cleanTo.startsWith('lib/') ||
      cleanTo.startsWith('client/') ||
      cleanTo.startsWith('app/')
    ) {
      return `@/${cleanTo}`;
    }

    // Relative fallback
    const fromParts = fromFile.split('/');
    fromParts.pop(); // Remove filename
    const toParts = cleanTo.split('/');

    let common = 0;
    while (
      common < fromParts.length &&
      common < toParts.length &&
      fromParts[common] === toParts[common]
    ) {
      common++;
    }

    const upLevels = fromParts.length - common;
    const relParts = [];
    for (let i = 0; i < upLevels; i++) {
      relParts.push('..');
    }
    for (let i = common; i < toParts.length; i++) {
      relParts.push(toParts[i]);
    }

    let rel = relParts.join('/');
    if (!rel.startsWith('.')) {
      rel = `./${rel}`;
    }
    return rel;
  }

  private mapSymbolKind(kind: string): number {
    const monaco = this.monacoInstance;
    if (!monaco) return 1;
    const k = monaco.languages.SymbolKind;
    switch (kind) {
      case 'function': return k.Function || 11;
      case 'class': return k.Class || 4;
      case 'interface': return k.Interface || 10;
      case 'method': return k.Method || 5;
      case 'variable': return k.Variable || 12;
      case 'constant': return k.Constant || 13;
      case 'type': return k.TypeParameter || 25;
      default: return k.Property || 6;
    }
  }

  public dispose() {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.isInitialized = false;
  }
}

export const crossFileLspManager = new CrossFileLspManager();
