export interface McpMarketplaceServer {
  id: string;
  name: string;
  displayName: string;
  description: string;
  author: string;
  version: string;
  category: 'System' | 'Database' | 'Web & Browser' | 'DevOps & SCM' | 'Cloud & Productivity' | 'AI & Reasoning';
  transport: 'stdio' | 'sse' | 'websocket' | 'in-memory';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  stars?: number;
  featured?: boolean;
  official?: boolean;
  toolsCount: number;
  documentationUrl?: string;
  repository?: string;
  readme?: string;
  icon?: string;
}

export const MCP_SERVERS_REGISTRY: McpMarketplaceServer[] = [
  // --- System & Host ---
  {
    id: 'filesystem-mcp',
    name: '@modelcontextprotocol/server-filesystem',
    displayName: 'Filesystem MCP Server',
    description: 'Direct read/write access to host OS or virtual workspace directories with sandboxing and atomic writes.',
    author: 'Anthropic',
    version: '1.0.2',
    category: 'System',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    featured: true,
    official: true,
    toolsCount: 7,
    repository: 'https://github.com/modelcontextprotocol/servers',
    icon: 'Folder'
  },
  {
    id: 'terminal-mcp',
    name: 'mcp-server-terminal',
    displayName: 'Terminal & CLI Execution MCP',
    description: 'Execute shell commands on Windows/Linux/macOS with exit code capture, timeout guardrails, and stdout streaming.',
    author: 'Community',
    version: '1.2.0',
    category: 'System',
    transport: 'in-memory',
    command: 'npx',
    args: ['-y', 'mcp-server-terminal'],
    featured: true,
    official: false,
    toolsCount: 4,
    icon: 'Terminal'
  },
  {
    id: 'memory-graph-mcp',
    name: '@modelcontextprotocol/server-memory',
    displayName: 'Memory Graph RAG MCP',
    description: 'Persistent knowledge graph memory engine for tracking entities, relations, observations, and code architecture across sessions.',
    author: 'Anthropic',
    version: '0.6.2',
    category: 'AI & Reasoning',
    transport: 'in-memory',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    featured: true,
    official: true,
    toolsCount: 6,
    icon: 'Brain'
  },

  // --- Database & Storage ---
  {
    id: 'postgres-sqlite-mcp',
    name: '@modelcontextprotocol/server-postgres',
    displayName: 'PostgreSQL & SQLite Client MCP',
    description: 'Direct query runner, schema inspector, index analyzer, and migration manager for PostgreSQL, SQLite, and MySQL.',
    author: 'Anthropic',
    version: '1.1.0',
    category: 'Database',
    transport: 'in-memory',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'],
    featured: true,
    official: true,
    toolsCount: 5,
    icon: 'Database'
  },
  {
    id: 'sqlite-mcp',
    name: 'mcp-server-sqlite',
    displayName: 'SQLite Local Database MCP',
    description: 'Lightweight, serverless SQLite database inspector and query engine for local .db / .sqlite files.',
    author: 'Anthropic',
    version: '1.0.0',
    category: 'Database',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-sqlite', '--db-path', './workspace.db'],
    featured: false,
    official: true,
    toolsCount: 4,
    icon: 'Database'
  },
  {
    id: 'redis-mcp',
    name: 'mcp-server-redis',
    displayName: 'Redis Cache & Key-Value MCP',
    description: 'Read and write Redis keys, inspect Hash/Set/List data structures, and run Redis commands.',
    author: 'Community',
    version: '0.9.1',
    category: 'Database',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-redis', 'redis://127.0.0.1:6379'],
    featured: false,
    official: false,
    toolsCount: 8,
    icon: 'Database'
  },

  // --- Web & Browser Automation ---
  {
    id: 'puppeteer-browser-mcp',
    name: '@modelcontextprotocol/server-puppeteer',
    displayName: 'Puppeteer Headless Browser MCP',
    description: 'Automate browser navigation, take page screenshots, evaluate JavaScript in page context, and fill web forms.',
    author: 'Anthropic',
    version: '1.0.4',
    category: 'Web & Browser',
    transport: 'in-memory',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-puppeteer'],
    featured: true,
    official: true,
    toolsCount: 6,
    icon: 'Globe'
  },
  {
    id: 'playwright-mcp',
    name: 'mcp-server-playwright',
    displayName: 'Playwright Cross-Browser Testing MCP',
    description: 'End-to-end browser automation and testing across Chromium, Firefox, and WebKit.',
    author: 'Community',
    version: '1.1.2',
    category: 'Web & Browser',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-playwright'],
    featured: false,
    official: false,
    toolsCount: 7,
    icon: 'Globe'
  },
  {
    id: 'fetch-http-mcp',
    name: '@modelcontextprotocol/server-fetch',
    displayName: 'Fetch & HTTP Request MCP',
    description: 'Universal HTTP client to perform GET/POST/PUT requests, inspect response headers, and convert HTML to markdown.',
    author: 'Anthropic',
    version: '1.0.1',
    category: 'Web & Browser',
    transport: 'in-memory',
    command: 'uvx',
    args: ['mcp-server-fetch'],
    featured: true,
    official: true,
    toolsCount: 3,
    icon: 'Radio'
  },
  {
    id: 'brave-search-mcp',
    name: '@modelcontextprotocol/server-brave-search',
    displayName: 'Brave Search Engine MCP',
    description: 'Real-time privacy-preserving web search and local POI search using Brave Search REST API.',
    author: 'Anthropic',
    version: '1.0.0',
    category: 'Web & Browser',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-brave-search'],
    env: { BRAVE_API_KEY: 'your-brave-api-key' },
    featured: true,
    official: true,
    toolsCount: 2,
    icon: 'Globe'
  },

  // --- DevOps & SCM ---
  {
    id: 'git-mcp',
    name: '@modelcontextprotocol/server-git',
    displayName: 'Git Version Control MCP',
    description: 'Inspect git status, file diffs, commits, branches, and perform staging and commits directly via MCP.',
    author: 'Anthropic',
    version: '1.0.0',
    category: 'DevOps & SCM',
    transport: 'in-memory',
    command: 'uvx',
    args: ['mcp-server-git', '--repository', '.'],
    featured: true,
    official: true,
    toolsCount: 8,
    icon: 'GitBranch'
  },
  {
    id: 'github-mcp',
    name: '@modelcontextprotocol/server-github',
    displayName: 'GitHub API Explorer MCP',
    description: 'Read and write GitHub issues, create and review pull requests, search repositories, and inspect CI workflows.',
    author: 'Anthropic',
    version: '1.1.2',
    category: 'DevOps & SCM',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-github'],
    env: { GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_xxxx' },
    featured: true,
    official: true,
    toolsCount: 12,
    icon: 'GitBranch'
  },
  {
    id: 'docker-mcp',
    name: 'mcp-server-docker',
    displayName: 'Docker Container Daemon MCP',
    description: 'Manage Docker containers, list images, inspect container logs, execute commands inside containers, and stop/start containers.',
    author: 'Community',
    version: '1.0.8',
    category: 'DevOps & SCM',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'mcp-server-docker'],
    featured: true,
    official: false,
    toolsCount: 9,
    icon: 'Layers'
  },

  // --- AI, Reasoning & Agents ---
  {
    id: 'sequential-thinking-mcp',
    name: '@modelcontextprotocol/server-sequential-thinking',
    displayName: 'Sequential Thinking & Planning MCP',
    description: 'Dynamic step-by-step cognitive reasoning server for agents to formulate, revise, and branch hypotheses.',
    author: 'Anthropic',
    version: '1.0.0',
    category: 'AI & Reasoning',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    featured: true,
    official: true,
    toolsCount: 1,
    icon: 'Brain'
  },
  {
    id: 'everything-mcp',
    name: '@modelcontextprotocol/server-everything',
    displayName: 'Everything MCP Reference Server',
    description: 'Comprehensive test server that exercises all Model Context Protocol capabilities: tools, resources, and prompt templates.',
    author: 'Anthropic',
    version: '1.0.0',
    category: 'AI & Reasoning',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-everything'],
    featured: false,
    official: true,
    toolsCount: 10,
    icon: 'Sparkles'
  },

  // --- Cloud & Productivity ---
  {
    id: 'google-drive-mcp',
    name: '@modelcontextprotocol/server-gdrive',
    displayName: 'Google Drive & Docs MCP',
    description: 'Search files and extract text from Google Docs, Google Sheets, and PDFs stored in Google Drive.',
    author: 'Anthropic',
    version: '1.0.0',
    category: 'Cloud & Productivity',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-gdrive'],
    featured: false,
    official: true,
    toolsCount: 3,
    icon: 'Folder'
  },
  {
    id: 'slack-mcp',
    name: '@modelcontextprotocol/server-slack',
    displayName: 'Slack Team Channels MCP',
    description: 'List public and private Slack channels, search message history, and post updates to channels.',
    author: 'Anthropic',
    version: '1.0.0',
    category: 'Cloud & Productivity',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-slack'],
    env: { SLACK_BOT_TOKEN: 'xoxb-xxxx' },
    featured: false,
    official: true,
    toolsCount: 4,
    icon: 'Activity'
  },
  {
    id: 'sentry-mcp',
    name: '@modelcontextprotocol/server-sentry',
    displayName: 'Sentry Error Monitoring MCP',
    description: 'Retrieve real-time application crash traces, issue frequency, and breadcrumb diagnostics from Sentry.',
    author: 'Anthropic',
    version: '1.0.0',
    category: 'Cloud & Productivity',
    transport: 'stdio',
    command: 'uvx',
    args: ['mcp-server-sentry', '--auth-token', 'sntryu_xxxx'],
    featured: false,
    official: true,
    toolsCount: 4,
    icon: 'AlertCircle'
  }
];
