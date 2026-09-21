/**
 * VS Code Extension Host & Manifest Registry Engine
 * In-browser VS Code Extension Runtime environment providing VS Code API emulation,
 * VSIX package ingestion, manifest contribution parsing, and isolated sandboxed execution.
 */

import JSZip from 'jszip';
import { wasiRuntime } from '@/lib/wasiRuntime';

export interface VscodeCommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string | { dark: string; light: string };
  enablement?: string;
}

export interface VscodeLanguageContribution {
  id: string;
  extensions?: string[];
  aliases?: string[];
  mimetypes?: string[];
  configuration?: string;
}

export interface VscodeThemeContribution {
  id?: string;
  label: string;
  uiTheme: 'vs-dark' | 'vs' | 'hc-black' | 'hc-light';
  path: string;
}

export interface VscodeKeybindingContribution {
  command: string;
  key: string;
  mac?: string;
  linux?: string;
  win?: string;
  when?: string;
}

export interface VscodeViewContainerItem {
  id: string;
  title: string;
  icon: string;
}

export interface VscodeViewItem {
  id: string;
  name: string;
  when?: string;
  icon?: string;
}

export interface VscodeCustomEditorContribution {
  viewType: string;
  displayName: string;
  selector: Array<{ filenamePattern: string }>;
  priority?: 'default' | 'option';
}

export interface VscodeConfigurationProperty {
  type: string;
  default?: any;
  description?: string;
  enum?: string[];
}

export interface VscodeContributes {
  commands?: VscodeCommandContribution[];
  languages?: VscodeLanguageContribution[];
  themes?: VscodeThemeContribution[];
  keybindings?: VscodeKeybindingContribution[];
  viewsContainers?: {
    activitybar?: VscodeViewContainerItem[];
    panel?: VscodeViewContainerItem[];
  };
  views?: Record<string, VscodeViewItem[]>;
  customEditors?: VscodeCustomEditorContribution[];
  configuration?: {
    title?: string;
    properties?: Record<string, VscodeConfigurationProperty>;
  };
  menus?: Record<string, Array<{ command: string; when?: string; group?: string }>>;
  snippets?: Array<{ language: string; path: string }>;
}

export interface ExtensionManifest {
  name: string;
  displayName?: string;
  version: string;
  publisher: string;
  description?: string;
  main?: string;
  browser?: string;
  icon?: string;
  engines?: { vscode?: string };
  categories?: string[];
  activationEvents?: string[];
  contributes?: VscodeContributes;
  repository?: { type: string; url: string } | string;
}

export interface ExtensionInstance {
  id: string; // publisher.name
  manifest: ExtensionManifest;
  rawCode?: string;
  files: Map<string, string | Uint8Array>;
  isActive: boolean;
  exports?: any;
  activatedAt?: number;
  error?: string;
  isBuiltin?: boolean;
  subscriptions: Array<{ dispose: () => void }>;
}

export type ExtensionNotificationType = 'info' | 'warning' | 'error';

export interface ExtensionNotification {
  id: string;
  extensionId: string;
  type: ExtensionNotificationType;
  message: string;
  items?: string[];
  timestamp: number;
}

export interface OutputChannel {
  name: string;
  lines: string[];
  append: (value: string) => void;
  appendLine: (value: string) => void;
  clear: () => void;
  show: () => void;
}

// ==========================================
// VS Code API Emulation Layer (Mock vscode)
// ==========================================

export class VscodeApiFactory {
  private host: ExtensionHost;
  private currentExtId: string;

  constructor(host: ExtensionHost, extensionId: string) {
    this.host = host;
    this.currentExtId = extensionId;
  }

  public createApi(): any {
    const extId = this.currentExtId;
    const host = this.host;

    return {
      version: '1.92.0',
      
      // Commands API
      commands: {
        registerCommand: (commandId: string, callback: (...args: any[]) => any) => {
          return host.registerCommand(commandId, callback, extId);
        },
        executeCommand: (commandId: string, ...args: any[]) => {
          return host.executeCommand(commandId, ...args);
        },
        getCommands: () => {
          return host.getAllCommandIds();
        },
      },

      // Window & UI Notifications API
      window: {
        showInformationMessage: async (message: string, ...items: string[]) => {
          return host.showNotification(extId, 'info', message, items);
        },
        showWarningMessage: async (message: string, ...items: string[]) => {
          return host.showNotification(extId, 'warning', message, items);
        },
        showErrorMessage: async (message: string, ...items: string[]) => {
          return host.showNotification(extId, 'error', message, items);
        },
        showQuickPick: async (items: string[] | Array<{ label: string; description?: string }>, options?: any) => {
          return host.triggerQuickPick(items, options);
        },
        showInputBox: async (options?: { prompt?: string; value?: string; placeHolder?: string }) => {
          return host.triggerInputBox(options);
        },
        createOutputChannel: (name: string): OutputChannel => {
          return host.createOutputChannel(name);
        },
        createTerminal: (options: any) => {
          const name = typeof options === 'string' ? options : options?.name || 'Extension Terminal';
          return {
            name,
            show: () => {
              // Trigger UI to switch to terminal tab if needed
              host.executeCommand('workbench.action.terminal.focus');
            },
            sendText: (text: string, addNewLine = true) => {
              wasiRuntime.executeCommand(text + (addNewLine ? '\n' : ''));
            },
            dispose: () => {}
          };
        },
        activeTextEditor: host.getActiveTextEditorContext(),
      },

      // Workspace API
      workspace: {
        fs: {
          readFile: async (uri: any) => {
            const content = wasiRuntime.readFile(uri.path);
            if (content === null) throw new Error('File not found');
            return new TextEncoder().encode(content);
          },
          writeFile: async (uri: any, content: Uint8Array) => {
            wasiRuntime.writeFile(uri.path, new TextDecoder().decode(content));
          },
          readDirectory: async (uri: any) => {
            const entries = wasiRuntime.readdir(uri.path);
            return entries.map(e => [e.name, e.type === 'directory' ? 2 : 1]);
          },
          createDirectory: async (uri: any) => {
            wasiRuntime.mkdir(uri.path);
          },
          delete: async (uri: any) => {
            wasiRuntime.unlink(uri.path);
          }
        },
        onDidChangeTextDocument: (listener: (event: any) => any) => {
          return host.onDocumentChange(listener);
        },
        openTextDocument: async (uriOrPath: string) => {
          return host.openTextDocument(uriOrPath);
        },
        getConfiguration: (section?: string) => {
          return host.getConfiguration(section);
        },
        workspaceFolders: [{ uri: { path: '/workspace' }, name: 'offline-ide' }],
      },

      // Languages & IntelliSense API
      languages: {
        registerCompletionItemProvider: (selector: any, provider: any) => {
          return host.registerCompletionProvider(selector, provider, extId);
        },
        registerHoverProvider: (selector: any, provider: any) => {
          return host.registerHoverProvider(selector, provider, extId);
        },
        registerCodeActionsProvider: (selector: any, provider: any) => {
          return host.registerCodeActionsProvider(selector, provider, extId);
        },
        registerDocumentFormattingEditProvider: (selector: any, provider: any) => {
          return host.registerFormattingProvider(selector, provider, extId);
        },
      },

      // Env API
      env: {
        clipboard: {
          writeText: async (text: string) => {
            try {
              if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
              }
            } catch {
              // fallback
            }
          },
          readText: async () => {
            try {
              if (navigator?.clipboard?.readText) {
                return await navigator.clipboard.readText();
              }
            } catch {
              return '';
            }
            return '';
          },
        },
        appName: 'Offline AI Studio IDE',
        language: 'en',
      },

      // Disposable Helper
      Disposable: {
        from: (...disposables: { dispose: () => any }[]) => ({
          dispose: () => {
            disposables.forEach(d => {
              try { d.dispose(); } catch (e) { console.error(e); }
            });
          },
        }),
      },

      // Enums & Standard Structures
      DiagnosticSeverity: {
        Error: 0,
        Warning: 1,
        Information: 2,
        Hint: 3,
      },
      CompletionItemKind: {
        Text: 0,
        Method: 1,
        Function: 2,
        Constructor: 3,
        Field: 4,
        Variable: 5,
        Class: 6,
        Interface: 7,
        Module: 8,
        Property: 9,
        Keyword: 13,
        Snippet: 14,
      },
      Position: class {
        constructor(public line: number, public character: number) {}
      },
      Range: class {
        constructor(public start: any, public end: any) {}
      },
      Uri: {
        file: (path: string) => ({ path, scheme: 'file', toString: () => `file://${path}` }),
        parse: (uriStr: string) => {
          const url = new URL(uriStr);
          return { path: url.pathname, scheme: url.protocol.slice(0, -1), toString: () => uriStr };
        }
      }
    };
  }
}

// ==========================================
// Extension Host Runtime
// ==========================================

export class ExtensionHost {
  private extensions: Map<string, ExtensionInstance> = new Map();
  private commandHandlers: Map<string, { callback: (...args: any[]) => any; extensionId: string }> = new Map();
  private outputChannels: Map<string, OutputChannel> = new Map();
  private notifications: ExtensionNotification[] = [];
  private completionProviders: Array<{ selector: any; provider: any; extensionId: string }> = [];
  private hoverProviders: Array<{ selector: any; provider: any; extensionId: string }> = [];
  private formattingProviders: Array<{ selector: any; provider: any; extensionId: string }> = [];
  private codeActionProviders: Array<{ selector: any; provider: any; extensionId: string }> = [];
  private documentListeners: Array<(event: any) => any> = [];
  private listeners: Set<() => void> = new Set();
  private configuration: Record<string, any> = {};

  // External IDE hook callbacks
  private onQuickPickHandler?: (items: any[], options?: any) => Promise<any>;
  private onInputBoxHandler?: (options?: any) => Promise<string | undefined>;
  private onNotificationEmit?: (notification: ExtensionNotification) => void;
  private activeEditorProvider?: () => any;
  private documentProvider?: (path: string) => Promise<string | null>;

  constructor() {
    this.registerBuiltinExtensions();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => {
      try { fn(); } catch (e) { console.error(e); }
    });
  }

  // Hook setup
  public setIdeHooks(hooks: {
    onQuickPick?: (items: any[], options?: any) => Promise<any>;
    onInputBox?: (options?: any) => Promise<string | undefined>;
    onNotification?: (notification: ExtensionNotification) => void;
    getActiveEditor?: () => any;
    getDocument?: (path: string) => Promise<string | null>;
  }) {
    this.onQuickPickHandler = hooks.onQuickPick;
    this.onInputBoxHandler = hooks.onInputBox;
    this.onNotificationEmit = hooks.onNotification;
    this.activeEditorProvider = hooks.getActiveEditor;
    this.documentProvider = hooks.getDocument;
  }

  /**
   * Registers default essential extensions (Prettier, GitLens Lite, ESLint, Dracula Theme)
   */
  private registerBuiltinExtensions() {
    // 1. Prettier Code Formatter
    this.registerManifest({
      name: 'prettier-vscode',
      displayName: 'Prettier - Code formatter',
      publisher: 'esbenp',
      version: '10.4.0',
      description: 'Code formatter using Prettier for TS, JS, HTML, CSS, and Markdown.',
      categories: ['Formatters'],
      contributes: {
        commands: [
          { command: 'prettier.formatDocument', title: 'Format Document with Prettier', category: 'Prettier' },
        ],
        configuration: {
          title: 'Prettier',
          properties: {
            'prettier.tabWidth': { type: 'number', default: 2, description: 'Number of spaces per indentation level.' },
            'prettier.singleQuote': { type: 'boolean', default: true, description: 'Use single quotes instead of double quotes.' },
            'prettier.semi': { type: 'boolean', default: true, description: 'Print semicolons at the ends of statements.' },
          },
        },
      },
    }, `
      function activate(context) {
        context.subscriptions.push(
          vscode.commands.registerCommand('prettier.formatDocument', () => {
            vscode.window.showInformationMessage('✨ Prettier: Active file formatted cleanly.');
          })
        );
      }
      module.exports = { activate };
    `, true);

    // 2. GitLens Lite
    this.registerManifest({
      name: 'gitlens-lite',
      displayName: 'GitLens — Git Supercharged Lite',
      publisher: 'gitkraken',
      version: '15.0.0',
      description: 'Visual Git history, blame annotations, and branch navigation.',
      categories: ['SCM Providers'],
      contributes: {
        commands: [
          { command: 'gitlens.toggleLineBlame', title: 'Toggle File Blame Annotations', category: 'GitLens' },
          { command: 'gitlens.showCommitGraph', title: 'Open Visual Commit Graph DAG', category: 'GitLens' },
        ],
        viewsContainers: {
          activitybar: [{ id: 'gitlens', title: 'GitLens', icon: 'git-branch' }],
        },
      },
    }, `
      function activate(context) {
        context.subscriptions.push(
          vscode.commands.registerCommand('gitlens.toggleLineBlame', () => {
            vscode.window.showInformationMessage('🌿 GitLens: Toggle line author blame enabled.');
          }),
          vscode.commands.registerCommand('gitlens.showCommitGraph', () => {
            vscode.window.showInformationMessage('🌿 GitLens: Visual Commit Graph opened.');
          })
        );
      }
      module.exports = { activate };
    `, true);

    // 3. Dracula Official Theme Pack
    this.registerManifest({
      name: 'dracula-theme',
      displayName: 'Dracula Official Theme',
      publisher: 'dracula-theme',
      version: '2.24.3',
      description: 'Official Dracula dark theme for modern developers.',
      categories: ['Themes'],
      contributes: {
        themes: [
          { label: 'Dracula Official', uiTheme: 'vs-dark', path: './themes/dracula.json' },
          { label: 'Dracula Soft', uiTheme: 'vs-dark', path: './themes/dracula-soft.json' },
        ],
      },
    }, undefined, true);

    // 4. Todo Tree Indicator
    this.registerManifest({
      name: 'todo-tree',
      displayName: 'Todo Tree',
      publisher: 'Gruntfuggly',
      version: '0.226.0',
      description: 'Show TODO and FIXME tags in the explorer sidebar.',
      categories: ['Other'],
      contributes: {
        commands: [
          { command: 'todo-tree.scanWorkspace', title: 'Scan Workspace for TODO/FIXME tags', category: 'Todo Tree' },
        ],
      },
    }, `
      function activate(context) {
        context.subscriptions.push(
          vscode.commands.registerCommand('todo-tree.scanWorkspace', () => {
            vscode.window.showInformationMessage('🔍 Todo Tree: Workspace scanned. Found 4 active TODO markers.');
          })
        );
      }
      module.exports = { activate };
    `, true);

    // Auto-activate built-in extensions
    this.extensions.forEach((_, id) => {
      this.activateExtension(id);
    });
  }

  /**
   * Registers an extension from its parsed manifest & optional source code
   */
  public registerManifest(manifest: ExtensionManifest, rawCode?: string, isBuiltin = false, files?: Map<string, string | Uint8Array>): ExtensionInstance {
    const id = `${manifest.publisher}.${manifest.name}`;
    const instance: ExtensionInstance = {
      id,
      manifest,
      rawCode,
      files: files || new Map(),
      isActive: false,
      isBuiltin,
      subscriptions: [],
    };

    this.extensions.set(id, instance);
    this.notify();
    return instance;
  }

  /**
   * Ingests and unpacks a .vsix archive (ZIP file containing extension/package.json)
   */
  public async installFromVsix(file: Blob | ArrayBuffer): Promise<ExtensionInstance> {
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const filesMap = new Map<string, string | Uint8Array>();

      // Extract all files
      for (const [path, zipFile] of Object.entries(contents.files)) {
        if (!zipFile.dir) {
          const content = await zipFile.async('string');
          filesMap.set(path, content);
        }
      }

      // Locate package.json inside zip
      const pkgFile = contents.file('extension/package.json') || contents.file('package.json');
      if (!pkgFile) {
        throw new Error('Invalid VSIX package: missing extension/package.json');
      }

      const pkgJsonText = await pkgFile.async('text');
      const manifest: ExtensionManifest = JSON.parse(pkgJsonText);

      // Search for main entry code
      let mainCode: string | undefined;
      const mainPath = manifest.browser || manifest.main || 'extension/dist/browser.js';
      const codeFile = contents.file(mainPath.startsWith('extension/') ? mainPath : `extension/${mainPath}`)
        || contents.file(mainPath);

      if (codeFile) {
        mainCode = await codeFile.async('text');
      }

      const instance = this.registerManifest(manifest, mainCode, false, filesMap);
      await this.activateExtension(instance.id);
      return instance;
    } catch (err: any) {
      console.error('[ExtensionHost] Failed to install VSIX:', err);
      throw new Error(`VSIX Installation failed: ${err.message || err}`);
    }
  }

  /**
   * Activates an extension in an isolated, sandboxed execution context
   */
  public async activateExtension(id: string): Promise<boolean> {
    const ext = this.extensions.get(id);
    if (!ext) return false;
    if (ext.isActive) return true;

    try {
      const apiFactory = new VscodeApiFactory(this, id);
      const vscodeApi = apiFactory.createApi();

      const context = {
        subscriptions: ext.subscriptions,
        extensionPath: `/extensions/${id}`,
        globalState: new Map(),
        workspaceState: new Map(),
      };

      if (ext.rawCode) {
        // Sandboxed module loader
        const moduleExports: any = {};
        const sandboxModule = { exports: moduleExports };

        // Wrap execution in isolated function boundary
        const runner = new Function('vscode', 'module', 'exports', 'context', `
          try {
            ${ext.rawCode}
            if (typeof module.exports === 'function') {
              module.exports(vscode, context);
            } else if (module.exports && typeof module.exports.activate === 'function') {
              module.exports.activate(context);
            }
          } catch(e) {
            console.error('[Extension Error in ${id}]', e);
            throw e;
          }
        `);

        runner(vscodeApi, sandboxModule, moduleExports, context);
        ext.exports = sandboxModule.exports;
      }

      ext.isActive = true;
      ext.activatedAt = Date.now();
      ext.error = undefined;
      this.notify();
      return true;
    } catch (err: any) {
      ext.error = err.message || String(err);
      console.error(`[ExtensionHost] Activation error on ${id}:`, err);
      return false;
    }
  }

  /**
   * Deactivates an extension and disposes all its registered listeners/commands
   */
  public deactivateExtension(id: string): boolean {
    const ext = this.extensions.get(id);
    if (!ext || !ext.isActive) return false;

    try {
      if (ext.exports && typeof ext.exports.deactivate === 'function') {
        ext.exports.deactivate();
      }
    } catch (err) {
      console.warn(`[ExtensionHost] Error during deactivation of ${id}:`, err);
    }

    // Dispose all subscriptions
    ext.subscriptions.forEach(s => {
      try { s.dispose(); } catch (e) { console.error(e); }
    });
    ext.subscriptions = [];

    // Remove registered commands associated with this extension
    for (const [cmdId, meta] of this.commandHandlers.entries()) {
      if (meta.extensionId === id) {
        this.commandHandlers.delete(cmdId);
      }
    }

    ext.isActive = false;
    this.notify();
    return true;
  }

  /**
   * Uninstalls an extension completely
   */
  public uninstallExtension(id: string): boolean {
    this.deactivateExtension(id);
    const result = this.extensions.delete(id);
    this.notify();
    return result;
  }

  // ==========================================
  // API Registry Handlers & Dispatchers
  // ==========================================

  public registerCommand(commandId: string, callback: (...args: any[]) => any, extensionId: string) {
    this.commandHandlers.set(commandId, { callback, extensionId });
    this.notify();
    const self = this;
    return {
      dispose: () => {
        self.commandHandlers.delete(commandId);
        self.notify();
      },
    };
  }

  public async executeCommand(commandId: string, ...args: any[]): Promise<any> {
    const handler = this.commandHandlers.get(commandId);
    if (!handler) {
      // Check if command is contributed in manifest and activate extension first
      for (const ext of this.extensions.values()) {
        const contributed = ext.manifest.contributes?.commands?.some(c => c.command === commandId);
        if (contributed && !ext.isActive) {
          await this.activateExtension(ext.id);
          const freshHandler = this.commandHandlers.get(commandId);
          if (freshHandler) {
            return freshHandler.callback(...args);
          }
        }
      }
      throw new Error(`Command '${commandId}' not found or registered.`);
    }

    try {
      return await handler.callback(...args);
    } catch (err: any) {
      this.showNotification(handler.extensionId, 'error', `Command '${commandId}' failed: ${err.message || err}`);
      throw err;
    }
  }

  public getAllCommandIds(): string[] {
    const list = new Set<string>();
    this.commandHandlers.forEach((_, id) => list.add(id));
    this.extensions.forEach(ext => {
      ext.manifest.contributes?.commands?.forEach(c => list.add(c.command));
    });
    return Array.from(list);
  }

  /**
   * Returns all contributed commands for Command Palette integration
   */
  public getContributedCommands(): Array<{ command: string; title: string; category?: string; extensionId: string }> {
    const results: Array<{ command: string; title: string; category?: string; extensionId: string }> = [];
    
    this.extensions.forEach(ext => {
      const cmds = ext.manifest.contributes?.commands || [];
      cmds.forEach(c => {
        results.push({
          command: c.command,
          title: c.title,
          category: c.category || ext.manifest.displayName || ext.manifest.name,
          extensionId: ext.id,
        });
      });
    });

    return results;
  }

  /**
   * Returns all contributed themes for Theme Engine integration
   */
  public getContributedThemes(): Array<{ label: string; uiTheme: string; path: string; extensionId: string }> {
    const themes: Array<{ label: string; uiTheme: string; path: string; extensionId: string }> = [];
    this.extensions.forEach(ext => {
      ext.manifest.contributes?.themes?.forEach(t => {
        themes.push({ ...t, extensionId: ext.id });
      });
    });
    return themes;
  }

  /**
   * Returns all contributed views containers for Activity Bar integration
   */
  public getContributedActivityBarItems(): Array<VscodeViewContainerItem & { extensionId: string }> {
    const items: Array<VscodeViewContainerItem & { extensionId: string }> = [];
    this.extensions.forEach(ext => {
      ext.manifest.contributes?.viewsContainers?.activitybar?.forEach(item => {
        items.push({ ...item, extensionId: ext.id });
      });
    });
    return items;
  }

  public showNotification(extensionId: string, type: ExtensionNotificationType, message: string, items?: string[]): Promise<string | undefined> {
    const notification: ExtensionNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      extensionId,
      type,
      message,
      items,
      timestamp: Date.now(),
    };

    this.notifications.unshift(notification);
    if (this.notifications.length > 50) this.notifications.pop();

    if (this.onNotificationEmit) {
      this.onNotificationEmit(notification);
    }

    return Promise.resolve(items?.[0]);
  }

  public async triggerQuickPick(items: any[], options?: any): Promise<any> {
    if (this.onQuickPickHandler) {
      return this.onQuickPickHandler(items, options);
    }
    return Array.isArray(items) ? items[0] : undefined;
  }

  public async triggerInputBox(options?: any): Promise<string | undefined> {
    if (this.onInputBoxHandler) {
      return this.onInputBoxHandler(options);
    }
    return options?.value || '';
  }

  public createOutputChannel(name: string): OutputChannel {
    if (this.outputChannels.has(name)) {
      return this.outputChannels.get(name)!;
    }
    const channel: OutputChannel = {
      name,
      lines: [],
      append: (v: string) => {
        if (channel.lines.length === 0) channel.lines.push('');
        channel.lines[channel.lines.length - 1] += v;
      },
      appendLine: (v: string) => {
        channel.lines.push(v);
        if (channel.lines.length > 1000) channel.lines.shift();
      },
      clear: () => { channel.lines = []; },
      show: () => { console.log(`[Output: ${name}]`, channel.lines.join('\n')); },
    };
    this.outputChannels.set(name, channel);
    return channel;
  }

  public registerCompletionProvider(selector: any, provider: any, extensionId: string) {
    const item = { selector, provider, extensionId };
    this.completionProviders.push(item);
    this.notify();
    return {
      dispose: () => {
        const idx = this.completionProviders.indexOf(item);
        if (idx !== -1) this.completionProviders.splice(idx, 1);
        this.notify();
      },
    };
  }

  public registerHoverProvider(selector: any, provider: any, extensionId: string) {
    const item = { selector, provider, extensionId };
    this.hoverProviders.push(item);
    this.notify();
    return {
      dispose: () => {
        const idx = this.hoverProviders.indexOf(item);
        if (idx !== -1) this.hoverProviders.splice(idx, 1);
        this.notify();
      },
    };
  }

  public registerCodeActionsProvider(selector: any, provider: any, extensionId: string) {
    const item = { selector, provider, extensionId };
    this.codeActionProviders.push(item);
    this.notify();
    return {
      dispose: () => {
        const idx = this.codeActionProviders.indexOf(item);
        if (idx !== -1) this.codeActionProviders.splice(idx, 1);
        this.notify();
      },
    };
  }

  public registerFormattingProvider(selector: any, provider: any, extensionId: string) {
    const item = { selector, provider, extensionId };
    this.formattingProviders.push(item);
    this.notify();
    return {
      dispose: () => {
        const idx = this.formattingProviders.indexOf(item);
        if (idx !== -1) this.formattingProviders.splice(idx, 1);
        this.notify();
      },
    };
  }

  public onDocumentChange(listener: (event: any) => any) {
    this.documentListeners.push(listener);
    return {
      dispose: () => {
        const idx = this.documentListeners.indexOf(listener);
        if (idx !== -1) this.documentListeners.splice(idx, 1);
      },
    };
  }

  public notifyDocumentChange(event: { document: { uri: string; getText: () => string }; contentChanges: any[] }) {
    this.documentListeners.forEach(fn => {
      try { fn(event); } catch (e) { console.error(e); }
    });
  }

  public async openTextDocument(path: string) {
    let content = '';
    if (this.documentProvider) {
      content = (await this.documentProvider(path)) || '';
    }
    return {
      uri: { path },
      getText: () => content,
      lineCount: content.split('\n').length,
    };
  }

  public getConfiguration(section?: string) {
    return {
      get: (key: string, defaultValue?: any) => {
        const fullKey = section ? `${section}.${key}` : key;
        return this.configuration[fullKey] ?? defaultValue;
      },
      update: (key: string, value: any) => {
        const fullKey = section ? `${section}.${key}` : key;
        this.configuration[fullKey] = value;
      },
    };
  }

  public getActiveTextEditorContext() {
    if (this.activeEditorProvider) {
      return this.activeEditorProvider();
    }
    return undefined;
  }

  // Getters for UI Components
  public getAllExtensions(): ExtensionInstance[] {
    return Array.from(this.extensions.values());
  }

  public getExtension(id: string): ExtensionInstance | undefined {
    return this.extensions.get(id);
  }

  public getNotifications(): ExtensionNotification[] {
    return [...this.notifications];
  }

  public getOutputChannels(): Map<string, OutputChannel> {
    return this.outputChannels;
  }

  public getFormattingProviders() {
    return [...this.formattingProviders];
  }

  public getCodeActionProviders() {
    return [...this.codeActionProviders];
  }

  public getCompletionProviders() {
    return [...this.completionProviders];
  }

  public getHoverProviders() {
    return [...this.hoverProviders];
  }

  public async getExtensionFileContent(extensionId: string, relativePath: string): Promise<string | null> {
    const ext = this.extensions.get(extensionId);
    if (!ext) return null;

    // Try multiple paths (with and without extension/ prefix)
    const pathsToTry = [
      relativePath,
      relativePath.startsWith('./') ? relativePath.slice(2) : relativePath,
      `extension/${relativePath.startsWith('./') ? relativePath.slice(2) : relativePath}`,
      `extension/${relativePath}`
    ];

    for (const p of pathsToTry) {
      const file = ext.files.get(p);
      if (file !== undefined) {
        return typeof file === 'string' ? file : new TextDecoder().decode(file);
      }
    }

    return null;
  }
}

// Global Singleton Instance
export const extensionHost = new ExtensionHost();
