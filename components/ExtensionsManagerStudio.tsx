'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Package,
  Radio,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Power,
  ShieldCheck,
  Sparkles,
  Terminal,
  FileCode,
  Layers,
  Database,
  ExternalLink,
  Code,
  Copy,
  Check,
  Sliders,
  ChevronDown,
  ChevronRight,
  Activity,
  Globe,
  HardDrive
} from 'lucide-react';
import {
  extensionHost,
  ExtensionInstance,
  ExtensionManifest,
  VscodeConfigurationProperty
} from '@/lib/extensions/ExtensionHost';
import {
  mcpHub,
  McpServerConfig,
  McpServerState,
  McpTool,
  McpResource,
  McpPrompt,
  McpCallLog,
  McpTransportType
} from '@/lib/mcp/McpClient';
import { prettierFormatterEngine, browserLinterEngine } from '@/lib/extensions/builtin/formatters';

export interface MarketplaceExtensionItem {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  version: string;
  description: string;
  icon?: string;
  category: 'Formatters' | 'Linters' | 'Themes' | 'Languages' | 'SCM' | 'AI & Cloud' | 'Productivity';
  downloads: string;
  rating: number;
  verified: boolean;
  manifest: ExtensionManifest;
  sourceCode?: string;
}

const MARKETPLACE_CATALOG: MarketplaceExtensionItem[] = [
  {
    id: 'esbenp.prettier-vscode',
    name: 'prettier-vscode',
    displayName: 'Prettier — Code Formatter',
    publisher: 'esbenp',
    version: '10.4.0',
    description: 'Universal opinionated code formatter for TypeScript, JavaScript, HTML, CSS, Markdown, and JSON.',
    category: 'Formatters',
    downloads: '42.8M',
    rating: 4.9,
    verified: true,
    manifest: {
      name: 'prettier-vscode',
      displayName: 'Prettier — Code Formatter',
      publisher: 'esbenp',
      version: '10.4.0',
      description: 'Universal opinionated code formatter.',
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
            'prettier.trailingComma': { type: 'string', default: 'es5', enum: ['all', 'es5', 'none'], description: 'Trailing comma formatting rule.' },
          },
        },
      },
    },
    sourceCode: `
      function activate(context) {
        context.subscriptions.push(
          vscode.commands.registerCommand('prettier.formatDocument', () => {
            vscode.window.showInformationMessage('✨ Prettier: In-browser formatting triggered.');
          })
        );
      }
      module.exports = { activate };
    `,
  },
  {
    id: 'dbaeumer.vscode-eslint',
    name: 'vscode-eslint',
    displayName: 'ESLint Code Quality Guard',
    publisher: 'dbaeumer',
    version: '3.0.10',
    description: 'Integrates in-browser ESLint diagnostics into Monaco Editor with automatic quick-fixes and squiggles.',
    category: 'Linters',
    downloads: '38.2M',
    rating: 4.8,
    verified: true,
    manifest: {
      name: 'vscode-eslint',
      displayName: 'ESLint Code Quality Guard',
      publisher: 'dbaeumer',
      version: '3.0.10',
      description: 'Integrates ESLint into your workflow.',
      categories: ['Linters'],
      contributes: {
        commands: [
          { command: 'eslint.fixAll', title: 'Fix All Auto-Fixable ESLint Problems', category: 'ESLint' },
          { command: 'eslint.revalidate', title: 'Revalidate Open Document', category: 'ESLint' },
        ],
        configuration: {
          title: 'ESLint',
          properties: {
            'eslint.enable': { type: 'boolean', default: true, description: 'Enable/disable ESLint in workspace.' },
            'eslint.autoFixOnSave': { type: 'boolean', default: true, description: 'Run auto-fix on file save.' },
          },
        },
      },
    },
    sourceCode: `
      function activate(context) {
        context.subscriptions.push(
          vscode.commands.registerCommand('eslint.fixAll', () => {
            vscode.window.showInformationMessage('🛡️ ESLint: All auto-fixable diagnostics resolved.');
          }),
          vscode.commands.registerCommand('eslint.revalidate', () => {
            vscode.window.showInformationMessage('🛡️ ESLint: Active workspace buffer revalidated.');
          })
        );
      }
      module.exports = { activate };
    `,
  },
  {
    id: 'gitkraken.gitlens-lite',
    name: 'gitlens-lite',
    displayName: 'GitLens — Visual Git Supercharged',
    publisher: 'gitkraken',
    version: '15.2.0',
    description: 'Supercharge Git in Monaco with interactive blame annotations, visual commit graph, and history.',
    category: 'SCM',
    downloads: '29.4M',
    rating: 4.9,
    verified: true,
    manifest: {
      name: 'gitlens-lite',
      displayName: 'GitLens — Visual Git Supercharged',
      publisher: 'gitkraken',
      version: '15.2.0',
      description: 'Visual Git history, blame, and repository exploration.',
      categories: ['SCM Providers'],
      contributes: {
        commands: [
          { command: 'gitlens.toggleLineBlame', title: 'Toggle File Line Blame Annotations', category: 'GitLens' },
          { command: 'gitlens.showCommitGraph', title: 'Open Visual Commit Graph DAG', category: 'GitLens' },
        ],
        viewsContainers: {
          activitybar: [{ id: 'gitlens', title: 'GitLens', icon: 'git-branch' }],
        },
        configuration: {
          title: 'GitLens',
          properties: {
            'gitlens.currentLine.enabled': { type: 'boolean', default: true, description: 'Show author blame for active cursor line.' },
            'gitlens.codeLens.enabled': { type: 'boolean', default: true, description: 'Show Git CodeLens references above functions.' },
          },
        },
      },
    },
    sourceCode: `
      function activate(context) {
        context.subscriptions.push(
          vscode.commands.registerCommand('gitlens.toggleLineBlame', () => {
            vscode.window.showInformationMessage('🌿 GitLens: Active line author blame toggled.');
          }),
          vscode.commands.registerCommand('gitlens.showCommitGraph', () => {
            vscode.window.showInformationMessage('🌿 GitLens: Visual Commit Graph opened.');
          })
        );
      }
      module.exports = { activate };
    `,
  },
  {
    id: 'ms-python.python-lite',
    name: 'python-lite',
    displayName: 'Python Language Tooling',
    publisher: 'ms-python',
    version: '2024.12.0',
    description: 'Python syntax intelligence, Pyodide WASI runner integration, and linting.',
    category: 'Languages',
    downloads: '95.1M',
    rating: 4.7,
    verified: true,
    manifest: {
      name: 'python-lite',
      displayName: 'Python Language Tooling',
      publisher: 'ms-python',
      version: '2024.12.0',
      description: 'Python language support.',
      categories: ['Programming Languages'],
      contributes: {
        commands: [
          { command: 'python.runInTerminal', title: 'Run Python File in WASI Container', category: 'Python' },
          { command: 'python.formatWithBlack', title: 'Format Document with Black/Ruff', category: 'Python' },
        ],
        configuration: {
          title: 'Python',
          properties: {
            'python.linting.enabled': { type: 'boolean', default: true, description: 'Enable in-browser Python analysis.' },
          },
        },
      },
    },
    sourceCode: `
      function activate(context) {
        context.subscriptions.push(
          vscode.commands.registerCommand('python.runInTerminal', () => {
            vscode.window.showInformationMessage('🐍 Python: Executing script in WASM sandbox...');
          })
        );
      }
      module.exports = { activate };
    `,
  },
  {
    id: 'bradlc.vscode-tailwindcss',
    name: 'vscode-tailwindcss',
    displayName: 'Tailwind CSS IntelliSense',
    publisher: 'bradlc',
    version: '0.12.5',
    description: 'Intelligent Tailwind CSS completions, class hover previews, and linting.',
    category: 'Productivity',
    downloads: '18.9M',
    rating: 4.9,
    verified: true,
    manifest: {
      name: 'vscode-tailwindcss',
      displayName: 'Tailwind CSS IntelliSense',
      publisher: 'bradlc',
      version: '0.12.5',
      description: 'Tailwind CSS utility autocomplete.',
      categories: ['Other'],
      contributes: {
        commands: [
          { command: 'tailwind.sortClasses', title: 'Sort Tailwind Utility Classes', category: 'Tailwind CSS' },
        ],
        configuration: {
          title: 'Tailwind CSS',
          properties: {
            'tailwindCSS.emmetCompletions': { type: 'boolean', default: true, description: 'Enable Emmet abbreviations with Tailwind classes.' },
          },
        },
      },
    },
    sourceCode: `
      function activate(context) {
        context.subscriptions.push(
          vscode.commands.registerCommand('tailwind.sortClasses', () => {
            vscode.window.showInformationMessage('🎨 Tailwind CSS: Class order optimized.');
          })
        );
      }
      module.exports = { activate };
    `,
  },
  {
    id: 'dracula-theme.theme-dracula',
    name: 'theme-dracula',
    displayName: 'Dracula Official Theme Pack',
    publisher: 'dracula-theme',
    version: '2.24.3',
    description: 'The famous dark theme for modern developers and code editors.',
    category: 'Themes',
    downloads: '7.8M',
    rating: 4.9,
    verified: true,
    manifest: {
      name: 'theme-dracula',
      displayName: 'Dracula Official Theme Pack',
      publisher: 'dracula-theme',
      version: '2.24.3',
      description: 'Official Dracula theme for Monaco.',
      categories: ['Themes'],
      contributes: {
        themes: [
          { label: 'Dracula Official', uiTheme: 'vs-dark', path: './themes/dracula.json' },
          { label: 'Dracula Soft', uiTheme: 'vs-dark', path: './themes/dracula-soft.json' },
        ],
      },
    },
  },
  {
    id: 'rust-lang.rust-analyzer-lite',
    name: 'rust-analyzer-lite',
    displayName: 'Rust Analyzer Lite',
    publisher: 'rust-lang',
    version: '0.4.1900',
    description: 'Rust language support and syntax verification for WASM rust binaries.',
    category: 'Languages',
    downloads: '11.3M',
    rating: 4.9,
    verified: true,
    manifest: {
      name: 'rust-analyzer-lite',
      displayName: 'Rust Analyzer Lite',
      publisher: 'rust-lang',
      version: '0.4.1900',
      description: 'Rust analyzer language tools.',
      categories: ['Programming Languages'],
      contributes: {
        commands: [
          { command: 'rust-analyzer.cargoCheck', title: 'Cargo Check Workspace', category: 'Rust' },
        ],
      },
    },
  },
  {
    id: 'yzhang.markdown-all-in-one',
    name: 'markdown-all-in-one',
    displayName: 'Markdown All in One',
    publisher: 'yzhang',
    version: '3.6.2',
    description: 'All you need for Markdown (keyboard shortcuts, table of contents, auto-preview).',
    category: 'Productivity',
    downloads: '9.4M',
    rating: 4.8,
    verified: true,
    manifest: {
      name: 'markdown-all-in-one',
      displayName: 'Markdown All in One',
      publisher: 'yzhang',
      version: '3.6.2',
      description: 'Markdown tools and shortcuts.',
      categories: ['Other'],
      contributes: {
        commands: [
          { command: 'markdown.generateToc', title: 'Create Table of Contents', category: 'Markdown' },
        ],
      },
    },
  },
  {
    id: 'wasi.system-explorer',
    name: 'system-explorer',
    displayName: 'WASI System Explorer',
    publisher: 'wasi-team',
    version: '1.0.0',
    description: 'Inspect POSIX micro-kernel state using real VS Code terminal and FS APIs.',
    category: 'Productivity',
    downloads: '1.2M',
    rating: 5.0,
    verified: true,
    manifest: {
      name: 'system-explorer',
      displayName: 'WASI System Explorer',
      publisher: 'wasi-team',
      version: '1.0.0',
      description: 'System inspection tools.',
      categories: ['Other'],
      contributes: {
        commands: [
          { command: 'wasi.showSystemInfo', title: 'Show WASI System Info', category: 'WASI' },
          { command: 'wasi.listWorkspaceFiles', title: 'List Workspace Files (FS API)', category: 'WASI' },
        ],
      },
    },
    sourceCode: `
      function activate(context) {
        context.subscriptions.push(
          vscode.commands.registerCommand('wasi.showSystemInfo', () => {
            const terminal = vscode.window.createTerminal('WASI Info');
            terminal.show();
            terminal.sendText('uname -a && whoami && pwd');
          }),
          vscode.commands.registerCommand('wasi.listWorkspaceFiles', async () => {
            try {
              const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file('/workspace'));
              const list = entries.map(([name, type]) => (type === 2 ? '[DIR] ' : '[FILE] ') + name).join('\\n');
              vscode.window.showInformationMessage('Workspace Contents:\\n' + list);
            } catch (err) {
              vscode.window.showErrorMessage('FS Error: ' + err.message);
            }
          })
        );
      }
      module.exports = { activate };
    `,
  },
];

export default function ExtensionsManagerStudio() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'installed' | 'mcp'>('marketplace');
  
  // Marketplace & Installed State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [installedExtensions, setInstalledExtensions] = useState<ExtensionInstance[]>([]);
  const [activeConfigExt, setActiveConfigExt] = useState<ExtensionInstance | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, any>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // MCP Servers State
  const [mcpServers, setMcpServers] = useState<McpServerState[]>([]);
  const [selectedMcpServerId, setSelectedMcpServerId] = useState<string>('');
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [toolArgsJson, setToolArgsJson] = useState<string>('{}');
  const [toolExecuting, setToolExecuting] = useState<boolean>(false);
  const [toolExecResult, setToolExecResult] = useState<any>(null);
  const [toolExecLatency, setToolExecLatency] = useState<number | null>(null);
  const [callLogs, setCallLogs] = useState<McpCallLog[]>([]);

  // Add Custom MCP Server Form Modal State
  const [isAddMcpOpen, setIsAddMcpOpen] = useState(false);
  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpTransport, setNewMcpTransport] = useState<McpTransportType>('sse');
  const [newMcpUrl, setNewMcpUrl] = useState('http://localhost:8080/sse');
  const [newMcpDescription, setNewMcpDescription] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importConfigInputRef = useRef<HTMLInputElement>(null);

  // Refresh installed extensions and MCP state
  const refreshState = () => {
    const all = extensionHost.getAllExtensions();
    setInstalledExtensions([...all]);

    const mcpStates = mcpHub.getAllStates();
    setMcpServers([...mcpStates]);
    setCallLogs([...mcpHub.getCallLogs()]);

    if (!selectedMcpServerId && mcpStates.length > 0) {
      setSelectedMcpServerId(mcpStates[0].config.id);
    }
  };

  useEffect(() => {
    refreshState();

    const unsubMcp = mcpHub.subscribe(() => {
      refreshState();
    });

    return () => {
      unsubMcp();
    };
  }, []);

  // Filter marketplace extensions
  const categories = ['All', 'Formatters', 'Linters', 'Themes', 'Languages', 'SCM', 'Productivity'];

  const filteredMarketplace = MARKETPLACE_CATALOG.filter(item => {
    const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchSearch =
      item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.publisher.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const isInstalled = (extId: string) => {
    return installedExtensions.some(e => e.id === extId || e.manifest.name === extId);
  };

  const getInstalledInstance = (extId: string) => {
    return installedExtensions.find(e => e.id === extId || e.manifest.name === extId);
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Handle Extension Install
  const handleInstallExtension = async (item: MarketplaceExtensionItem) => {
    try {
      const instance = extensionHost.registerManifest(item.manifest, item.sourceCode, false);
      await extensionHost.activateExtension(instance.id);
      refreshState();
      showToast(`Installed "${item.displayName}" successfully!`);
    } catch (err: any) {
      showToast(`Failed to install: ${err.message}`, 'error');
    }
  };

  // Handle Extension Uninstall
  const handleUninstallExtension = (extId: string) => {
    extensionHost.uninstallExtension(extId);
    if (activeConfigExt?.id === extId) setActiveConfigExt(null);
    refreshState();
    showToast(`Uninstalled extension cleanly.`);
  };

  // Handle Extension Toggle Active/Disable
  const handleToggleActive = async (ext: ExtensionInstance) => {
    if (ext.isActive) {
      extensionHost.deactivateExtension(ext.id);
      showToast(`Deactivated "${ext.manifest.displayName || ext.manifest.name}".`);
    } else {
      await extensionHost.activateExtension(ext.id);
      showToast(`Activated "${ext.manifest.displayName || ext.manifest.name}".`);
    }
    refreshState();
  };

  // VSIX Upload Handler
  const handleVsixUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const instance = await extensionHost.installFromVsix(file);
      refreshState();
      showToast(`Installed VSIX package "${instance.manifest.displayName || instance.manifest.name}"!`);
    } catch (err: any) {
      showToast(`VSIX Install Error: ${err.message}`, 'error');
    }
    if (e.target) e.target.value = '';
  };

  // Save Extension Configuration Settings
  const handleSaveConfig = (extId: string, key: string, val: any) => {
    extensionHost.getConfiguration().update(key, val);
    setConfigValues(prev => ({ ...prev, [key]: val }));
    showToast(`Configuration updated: ${key} = ${JSON.stringify(val)}`);
  };

  // Execute Contributed Command
  const handleRunCommand = async (cmdId: string) => {
    try {
      await extensionHost.executeCommand(cmdId);
      showToast(`Executed command: ${cmdId}`);
    } catch (err: any) {
      showToast(`Command error: ${err.message}`, 'error');
    }
  };

  // MCP Server Add
  const handleAddMcpServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcpName.trim()) return;

    const id = `custom-${newMcpName.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}-${Date.now().toString(36).slice(-4)}`;
    const config: McpServerConfig = {
      id,
      name: newMcpName.trim(),
      version: '1.0.0',
      transport: newMcpTransport,
      url: newMcpTransport !== 'in-memory' ? newMcpUrl.trim() : undefined,
      description: newMcpDescription.trim() || 'Custom registered MCP server endpoint',
      enabled: true,
    };

    await mcpHub.addServer(config);
    setIsAddMcpOpen(false);
    setNewMcpName('');
    setNewMcpDescription('');
    showToast(`Registered MCP server "${config.name}".`);
    refreshState();

    // Auto-connect
    mcpHub.connectServer(id).catch(err => {
      console.warn('Auto-connect MCP error:', err);
    });
  };

  // MCP Server Connect / Disconnect / Remove
  const handleToggleMcpServer = async (server: McpServerState) => {
    if (server.status === 'connected') {
      await mcpHub.disconnectServer(server.config.id);
      showToast(`Disconnected ${server.config.name}.`);
    } else {
      await mcpHub.connectServer(server.config.id);
      showToast(`Connecting to ${server.config.name}...`);
    }
    refreshState();
  };

  const handleRemoveMcpServer = async (serverId: string) => {
    await mcpHub.removeServer(serverId);
    showToast(`Removed MCP server.`);
    refreshState();
  };

  // Tool Execution in Playground
  const handleSelectTool = (tool: McpTool) => {
    setSelectedTool(tool);
    // Create initial template args from schema
    const initial: Record<string, any> = {};
    if (tool.inputSchema?.properties) {
      Object.entries(tool.inputSchema.properties).forEach(([k, v]) => {
        if (v.default !== undefined) {
          initial[k] = v.default;
        } else if (v.type === 'string') {
          initial[k] = '';
        } else if (v.type === 'number') {
          initial[k] = 0;
        } else if (v.type === 'boolean') {
          initial[k] = false;
        } else if (v.type === 'array') {
          initial[k] = [];
        } else {
          initial[k] = {};
        }
      });
    }
    setToolArgsJson(JSON.stringify(initial, null, 2));
    setToolExecResult(null);
    setToolExecLatency(null);
  };

  const handleExecuteTool = async () => {
    if (!selectedTool) return;
    setToolExecuting(true);
    setToolExecResult(null);
    const start = performance.now();

    try {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(toolArgsJson);
      } catch (e: any) {
        throw new Error(`Invalid JSON parameters: ${e.message}`);
      }

      const result = await mcpHub.executeTool(selectedTool.name, parsedArgs, selectedTool.serverId);
      const elapsed = Math.round(performance.now() - start);
      setToolExecLatency(elapsed);
      setToolExecResult(result);
      showToast(`Tool "${selectedTool.name}" completed in ${elapsed}ms!`);
    } catch (err: any) {
      setToolExecResult({ isError: true, error: err.message || String(err) });
      showToast(`Tool execution failed: ${err.message}`, 'error');
    } finally {
      setToolExecuting(false);
      refreshState();
    }
  };

  // Export JSON Configuration
  const handleExportConfig = () => {
    const allExts = extensionHost.getAllExtensions().map(e => ({
      id: e.id,
      manifest: e.manifest,
      isActive: e.isActive,
    }));

    const allMcp = mcpHub.getAllStates().map(s => s.config);

    const exportPayload = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      extensions: allExts,
      mcpServers: allMcp,
      prettierConfig: prettierFormatterEngine.getConfig(),
      eslintRules: browserLinterEngine.getRules(),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ide-extensions-and-mcp-config-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Configuration exported as JSON!');
  };

  // Import JSON Configuration
  const handleImportConfig = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Ingest extensions
      if (Array.isArray(data.extensions)) {
        for (const ext of data.extensions) {
          if (ext.manifest) {
            const inst = extensionHost.registerManifest(ext.manifest, undefined, false);
            if (ext.isActive) await extensionHost.activateExtension(inst.id);
          }
        }
      }

      // Ingest MCP servers
      if (Array.isArray(data.mcpServers)) {
        for (const cfg of data.mcpServers) {
          await mcpHub.addServer(cfg);
        }
      }

      // Ingest Prettier
      if (data.prettierConfig) {
        prettierFormatterEngine.updateConfig(data.prettierConfig);
      }

      refreshState();
      showToast('Imported extensions & MCP configurations successfully!');
    } catch (err: any) {
      showToast(`Import failed: ${err.message}`, 'error');
    }

    if (e.target) e.target.value = '';
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const selectedServerState = mcpServers.find(s => s.config.id === selectedMcpServerId) || mcpServers[0];

  return (
    <div className="flex flex-col w-full h-full bg-[#0d0b12] text-zinc-100 overflow-hidden font-sans select-none">
      {/* Hidden File Inputs for VSIX and Config Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleVsixUpload}
        accept=".vsix,.zip"
        className="hidden"
      />
      <input
        type="file"
        ref={importConfigInputRef}
        onChange={handleImportConfig}
        accept=".json"
        className="hidden"
      />

      {/* Top Studio Header */}
      <header className="px-5 py-3.5 bg-[#120f1a] border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Package size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">Extensions &amp; MCP Studio</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-700/60 rounded">
                VS Code / MCP Spec 2.0
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Manage in-browser extensions, Prettier/ESLint tools, and Model Context Protocol servers
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-medium border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Install package from local .vsix file"
          >
            <Upload size={13} className="text-purple-400" />
            <span>Install from VSIX...</span>
          </button>

          <button
            onClick={handleExportConfig}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-medium border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Export configuration JSON"
          >
            <Download size={13} className="text-emerald-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => importConfigInputRef.current?.click()}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-xs font-medium border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Import configuration JSON"
          >
            <HardDrive size={13} className="text-cyan-400" />
            <span>Import JSON</span>
          </button>
        </div>
      </header>

      {/* Toast Feedback */}
      {feedbackMsg && (
        <div
          className={`mx-5 mt-3 p-2.5 rounded-lg border text-xs font-medium flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
              : 'bg-rose-950/80 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-zinc-400 hover:text-white">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="px-5 pt-3 bg-[#120f1a] border-b border-zinc-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'marketplace'
                ? 'bg-[#0d0b12] text-white border-indigo-500 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/40'
            }`}
          >
            <Sparkles size={14} className={activeTab === 'marketplace' ? 'text-indigo-400' : 'text-zinc-500'} />
            <span>Marketplace</span>
            <span className="px-1.5 py-0.2 bg-zinc-800 text-[10px] rounded-full text-zinc-300">
              {MARKETPLACE_CATALOG.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('installed')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'installed'
                ? 'bg-[#0d0b12] text-white border-indigo-500 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/40'
            }`}
          >
            <Package size={14} className={activeTab === 'installed' ? 'text-indigo-400' : 'text-zinc-500'} />
            <span>Installed Extensions</span>
            <span className="px-1.5 py-0.2 bg-indigo-950 border border-indigo-800/50 text-[10px] rounded-full text-indigo-300">
              {installedExtensions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('mcp')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'mcp'
                ? 'bg-[#0d0b12] text-white border-indigo-500 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-800/40'
            }`}
          >
            <Radio size={14} className={activeTab === 'mcp' ? 'text-purple-400 animate-pulse' : 'text-zinc-500'} />
            <span>MCP Servers &amp; Tools</span>
            <span className="px-1.5 py-0.2 bg-purple-950 border border-purple-800/50 text-[10px] rounded-full text-purple-300">
              {mcpServers.length}
            </span>
          </button>
        </div>

        {/* Global Stats pill */}
        <div className="text-[11px] text-zinc-400 font-mono hidden md:flex items-center gap-3 pb-2">
          <span>Active Extensions: <strong className="text-emerald-400">{installedExtensions.filter(e => e.isActive).length}</strong></span>
          <span>•</span>
          <span>Connected MCP Servers: <strong className="text-purple-400">{mcpServers.filter(s => s.status === 'connected').length}</strong></span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-5">
        {/* ========================================================================= */}
        {/* TAB 1: EXTENSION MARKETPLACE */}
        {/* ========================================================================= */}
        {activeTab === 'marketplace' && (
          <div className="h-full flex flex-col gap-4 overflow-hidden">
            {/* Search & Category Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              <div className="relative flex-1 max-w-md">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search extensions by name, publisher, tag..."
                  className="w-full pl-9 pr-3 py-2 bg-[#16131f] border border-zinc-800 focus:border-indigo-500 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 outline-none transition-colors"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-[#181522] text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Marketplace Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {filteredMarketplace.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-xs">
                  <Package size={36} className="mb-2 text-zinc-600" />
                  <p>No extensions match your search criteria.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredMarketplace.map(item => {
                    const installed = isInstalled(item.id);
                    const instance = getInstalledInstance(item.id);

                    return (
                      <div
                        key={item.id}
                        className="bg-[#14111d] border border-zinc-800/80 hover:border-zinc-700/80 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-black/40 group"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-sm">
                                {item.displayName.slice(0, 1)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h3 className="text-xs font-bold text-zinc-100 group-hover:text-indigo-300 transition-colors">
                                    {item.displayName}
                                  </h3>
                                  {item.verified && (
                                    <ShieldCheck size={13} className="text-indigo-400" />
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-500 font-mono">
                                  {item.publisher} • v{item.version}
                                </p>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 text-[9.5px] font-medium bg-zinc-800/80 text-zinc-400 rounded-md border border-zinc-700/50">
                              {item.category}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        </div>

                        {/* Metadata & Actions */}
                        <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Download size={11} className="text-zinc-500" />
                              {item.downloads}
                            </span>
                            <span className="flex items-center gap-1 text-amber-400">
                              ★ {item.rating}
                            </span>
                          </div>

                          {installed ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-1 bg-emerald-950/70 border border-emerald-700/50 text-emerald-300 text-[11px] font-medium rounded-lg flex items-center gap-1">
                                <Check size={12} />
                                {instance?.isActive ? 'Active' : 'Disabled'}
                              </span>
                              <button
                                onClick={() => handleUninstallExtension(item.id)}
                                className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors cursor-pointer"
                                title="Uninstall"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleInstallExtension(item)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-950 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Download size={12} />
                              <span>Install</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INSTALLED EXTENSIONS & CONFIGURATION */}
        {/* ========================================================================= */}
        {activeTab === 'installed' && (
          <div className="h-full flex flex-col md:flex-row gap-4 overflow-hidden">
            {/* Installed List */}
            <div className="w-full md:w-1/2 flex flex-col gap-3 overflow-hidden">
              <div className="flex items-center justify-between text-xs text-zinc-400 shrink-0">
                <span className="font-semibold text-zinc-200">Installed Packages ({installedExtensions.length})</span>
                <span>Select an extension to inspect contributions and configure settings</span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {installedExtensions.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-xs">
                    <Package size={36} className="mb-2 text-zinc-600" />
                    <p>No extensions currently installed in workspace.</p>
                  </div>
                ) : (
                  installedExtensions.map(ext => {
                    const isSelected = activeConfigExt?.id === ext.id;
                    const cmdsCount = ext.manifest.contributes?.commands?.length || 0;
                    const propsCount = Object.keys(ext.manifest.contributes?.configuration?.properties || {}).length;

                    return (
                      <div
                        key={ext.id}
                        onClick={() => setActiveConfigExt(ext)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#181424] border-indigo-500 shadow-md'
                            : 'bg-[#14111d] border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              ext.isActive
                                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40'
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                            }`}>
                              {ext.manifest.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-zinc-100">
                                  {ext.manifest.displayName || ext.manifest.name}
                                </h4>
                                {ext.isBuiltin && (
                                  <span className="px-1.5 py-0.2 text-[9px] font-mono bg-zinc-800 text-zinc-400 rounded">
                                    Built-in
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-zinc-500 font-mono">
                                {ext.id} • v{ext.manifest.version}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleActive(ext)}
                              className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                                ext.isActive
                                  ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900/60'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                              }`}
                              title={ext.isActive ? 'Disable Extension' : 'Enable Extension'}
                            >
                              <Power size={13} />
                              <span className="text-[10px]">{ext.isActive ? 'Enabled' : 'Disabled'}</span>
                            </button>

                            {!ext.isBuiltin && (
                              <button
                                onClick={() => handleUninstallExtension(ext.id)}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800 rounded-lg transition-colors cursor-pointer"
                                title="Uninstall Extension"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center gap-3 text-[10.5px] text-zinc-400">
                          <span>Commands: <strong className="text-zinc-200">{cmdsCount}</strong></span>
                          <span>•</span>
                          <span>Settings: <strong className="text-zinc-200">{propsCount}</strong></span>
                          {ext.error && (
                            <span className="text-rose-400 flex items-center gap-1 font-mono">
                              <AlertTriangle size={11} /> {ext.error}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Selected Extension Settings & Inspector Panel */}
            <div className="w-full md:w-1/2 bg-[#14111d] border border-zinc-800/80 rounded-xl p-4 flex flex-col overflow-hidden">
              {activeConfigExt ? (
                <div className="h-full flex flex-col gap-4 overflow-y-auto pr-1">
                  <div className="pb-3 border-b border-zinc-800 flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {activeConfigExt.manifest.displayName || activeConfigExt.manifest.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{activeConfigExt.manifest.description}</p>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 bg-black/40 px-2 py-1 rounded border border-zinc-800">
                      ID: {activeConfigExt.id}
                    </span>
                  </div>

                  {/* Contributed Settings Section */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sliders size={13} className="text-indigo-400" />
                      Configuration Properties
                    </h4>

                    {activeConfigExt.manifest.contributes?.configuration?.properties ? (
                      <div className="space-y-3 bg-[#0f0d16] p-3 rounded-lg border border-zinc-800/80">
                        {Object.entries(activeConfigExt.manifest.contributes.configuration.properties).map(([key, prop]: [string, VscodeConfigurationProperty]) => {
                          const currentVal = configValues[key] ?? extensionHost.getConfiguration().get(key, prop.default);

                          return (
                            <div key={key} className="space-y-1.5 pb-2.5 border-b border-zinc-800/60 last:border-b-0">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-mono font-medium text-zinc-300">{key}</label>
                                <span className="text-[9.5px] font-mono text-zinc-500 uppercase">{prop.type}</span>
                              </div>
                              {prop.description && (
                                <p className="text-[11px] text-zinc-400">{prop.description}</p>
                              )}

                              {/* Dynamic Input based on schema type */}
                              {prop.type === 'boolean' ? (
                                <label className="inline-flex items-center gap-2 cursor-pointer pt-1">
                                  <input
                                    type="checkbox"
                                    checked={!!currentVal}
                                    onChange={e => handleSaveConfig(activeConfigExt.id, key, e.target.checked)}
                                    className="w-4 h-4 rounded text-indigo-600 bg-zinc-800 border-zinc-700"
                                  />
                                  <span className="text-xs text-zinc-300 font-mono">{currentVal ? 'true' : 'false'}</span>
                                </label>
                              ) : prop.enum ? (
                                <select
                                  value={currentVal || ''}
                                  onChange={e => handleSaveConfig(activeConfigExt.id, key, e.target.value)}
                                  className="w-full bg-[#181522] border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 outline-none"
                                >
                                  {prop.enum.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : prop.type === 'number' ? (
                                <input
                                  type="number"
                                  value={currentVal ?? prop.default ?? 0}
                                  onChange={e => handleSaveConfig(activeConfigExt.id, key, Number(e.target.value))}
                                  className="w-full bg-[#181522] border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 outline-none font-mono"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={currentVal ?? prop.default ?? ''}
                                  onChange={e => handleSaveConfig(activeConfigExt.id, key, e.target.value)}
                                  className="w-full bg-[#181522] border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 outline-none"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">This extension provides no user-configurable options.</p>
                    )}
                  </div>

                  {/* Contributed Commands Section */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Terminal size={13} className="text-purple-400" />
                      Contributed Commands
                    </h4>

                    {activeConfigExt.manifest.contributes?.commands && activeConfigExt.manifest.contributes.commands.length > 0 ? (
                      <div className="space-y-1.5 bg-[#0f0d16] p-2.5 rounded-lg border border-zinc-800/80">
                        {activeConfigExt.manifest.contributes.commands.map(cmd => (
                          <div
                            key={cmd.command}
                            className="flex items-center justify-between p-2 rounded bg-[#181522] border border-zinc-800/50"
                          >
                            <div>
                              <div className="text-xs font-medium text-zinc-200">{cmd.title}</div>
                              <div className="text-[10px] font-mono text-zinc-500">{cmd.command}</div>
                            </div>

                            <button
                              onClick={() => handleRunCommand(cmd.command)}
                              className="px-2.5 py-1 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Play size={10} />
                              <span>Run</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">No registered commands found.</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                  <Sliders size={32} className="mb-2 text-zinc-600" />
                  <p>Select an extension on the left to inspect and configure.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MCP SERVERS & INTERACTIVE TOOL PLAYGROUND */}
        {/* ========================================================================= */}
        {activeTab === 'mcp' && (
          <div className="h-full flex flex-col lg:flex-row gap-4 overflow-hidden">
            {/* Left: Registered MCP Servers List */}
            <div className="w-full lg:w-1/3 flex flex-col gap-3 overflow-hidden">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  MCP Servers ({mcpServers.length})
                </span>

                <button
                  onClick={() => setIsAddMcpOpen(true)}
                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                >
                  <Plus size={13} />
                  <span>Add Server</span>
                </button>
              </div>

              {/* Add Server Modal Dialog */}
              {isAddMcpOpen && (
                <form
                  onSubmit={handleAddMcpServer}
                  className="p-3 bg-[#181424] border border-purple-500/40 rounded-xl space-y-2.5 animate-in fade-in shrink-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-300">Connect Custom MCP Server</span>
                    <button type="button" onClick={() => setIsAddMcpOpen(false)} className="text-zinc-400 hover:text-white">
                      <XCircle size={14} />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 font-mono">Server Identifier / Name:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Postgres DB Server"
                      value={newMcpName}
                      onChange={e => setNewMcpName(e.target.value)}
                      className="w-full bg-[#100d18] border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none mt-0.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 font-mono">Transport:</label>
                      <select
                        value={newMcpTransport}
                        onChange={e => setNewMcpTransport(e.target.value as McpTransportType)}
                        className="w-full bg-[#100d18] border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none mt-0.5"
                      >
                        <option value="sse">SSE (Server-Sent)</option>
                        <option value="websocket">WebSocket</option>
                        <option value="in-memory">In-Memory</option>
                        <option value="worker">Web Worker</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-zinc-400 font-mono">Endpoint URL:</label>
                      <input
                        type="text"
                        placeholder="http://..."
                        value={newMcpUrl}
                        onChange={e => setNewMcpUrl(e.target.value)}
                        className="w-full bg-[#100d18] border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 outline-none mt-0.5 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddMcpOpen(false)}
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold"
                    >
                      Register Server
                    </button>
                  </div>
                </form>
              )}

              {/* Server Cards List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
                {mcpServers.map(server => {
                  const isSelected = selectedMcpServerId === server.config.id;
                  const isConnected = server.status === 'connected';

                  return (
                    <div
                      key={server.config.id}
                      onClick={() => setSelectedMcpServerId(server.config.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#181424] border-purple-500 shadow-md'
                          : 'bg-[#14111d] border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-zinc-100">{server.config.name}</h4>
                            <span className="px-1.5 py-0.2 text-[9px] font-mono bg-zinc-800 text-zinc-400 rounded">
                              {server.config.transport}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{server.config.id}</p>
                        </div>

                        {/* Connection status badge */}
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border flex items-center gap-1 ${
                              isConnected
                                ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                                : server.status === 'connecting'
                                ? 'bg-amber-950/70 border-amber-700 text-amber-300'
                                : 'bg-rose-950/70 border-rose-700 text-rose-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                            {server.status.toUpperCase()}
                          </span>

                          <button
                            onClick={() => handleToggleMcpServer(server)}
                            className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                            title={isConnected ? 'Disconnect' : 'Connect'}
                          >
                            <Power size={12} />
                          </button>

                          {!server.config.isPreset && (
                            <button
                              onClick={() => handleRemoveMcpServer(server.config.id)}
                              className="p-1 text-zinc-400 hover:text-rose-400 rounded hover:bg-rose-950/30"
                              title="Delete Server"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10.5px] text-zinc-400">
                        <span>Tools: <strong className="text-purple-300">{server.tools.length}</strong></span>
                        <span>Resources: <strong className="text-zinc-300">{server.resources.length}</strong></span>
                        <span>Prompts: <strong className="text-zinc-300">{server.prompts.length}</strong></span>
                        {server.latencyMs !== undefined && (
                          <span className="font-mono text-emerald-400 text-[10px]">{server.latencyMs}ms</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Center: Selected Server Capabilities & Tools Catalog */}
            <div className="w-full lg:w-1/3 bg-[#14111d] border border-zinc-800/80 rounded-xl p-4 flex flex-col overflow-hidden">
              <div className="pb-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Radio size={14} className="text-purple-400" />
                    Server Tools &amp; Primitives
                  </h3>
                  <p className="text-[11px] text-zinc-400">{selectedServerState?.config.name || 'Select a server'}</p>
                </div>

                <button
                  onClick={() => refreshState()}
                  className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                  title="Refresh tools"
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2">
                {selectedServerState?.tools.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-zinc-500 text-xs">
                    <Terminal size={28} className="mb-2 text-zinc-600" />
                    <p>No tools published by this MCP server.</p>
                  </div>
                ) : (
                  selectedServerState?.tools.map(tool => {
                    const isSelected = selectedTool?.name === tool.name && selectedTool?.serverId === tool.serverId;

                    return (
                      <div
                        key={tool.name}
                        onClick={() => handleSelectTool(tool)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1e192c] border-purple-500 shadow-sm'
                            : 'bg-[#181522] border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-purple-300">{tool.name}()</span>
                          <span className="text-[9.5px] font-mono text-zinc-500">
                            {Object.keys(tool.inputSchema?.properties || {}).length} args
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{tool.description}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: Interactive Tool Execution Playground */}
            <div className="w-full lg:w-1/3 bg-[#14111d] border border-zinc-800/80 rounded-xl p-4 flex flex-col overflow-hidden">
              <div className="pb-3 border-b border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Tool Playground</h3>
                </div>

                {selectedTool && (
                  <button
                    onClick={handleExecuteTool}
                    disabled={toolExecuting}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-emerald-950"
                  >
                    {toolExecuting ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                    <span>{toolExecuting ? 'Executing...' : 'Execute Tool'}</span>
                  </button>
                )}
              </div>

              {selectedTool ? (
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto mt-3 pr-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase text-zinc-400">Input Arguments (JSON):</span>
                      <button
                        onClick={() => copyToClipboard(toolArgsJson, 'tool-args')}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                      >
                        {copiedId === 'tool-args' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <textarea
                      value={toolArgsJson}
                      onChange={e => setToolArgsJson(e.target.value)}
                      rows={6}
                      className="w-full bg-[#0d0a14] border border-zinc-800 focus:border-purple-500 rounded-lg p-2.5 text-xs font-mono text-emerald-400 outline-none resize-none leading-relaxed"
                    />
                  </div>

                  {/* Execution Output Window */}
                  <div className="flex-1 flex flex-col min-h-[140px]">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-zinc-400">Response Payload:</span>
                        {toolExecLatency !== null && (
                          <span className="text-[10px] font-mono text-emerald-400">({toolExecLatency}ms)</span>
                        )}
                      </div>

                      {toolExecResult && (
                        <button
                          onClick={() => copyToClipboard(JSON.stringify(toolExecResult, null, 2), 'tool-res')}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
                        >
                          {copiedId === 'tool-res' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>Copy Output</span>
                        </button>
                      )}
                    </div>

                    <pre className="flex-1 bg-[#0d0a14] border border-zinc-800 rounded-lg p-2.5 text-xs font-mono text-zinc-200 overflow-auto select-text whitespace-pre-wrap leading-relaxed">
                      {toolExecResult ? JSON.stringify(toolExecResult, null, 2) : '// Output will appear here after execution'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs">
                  <Terminal size={32} className="mb-2 text-zinc-600" />
                  <p>Select a tool from the middle column to test.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
