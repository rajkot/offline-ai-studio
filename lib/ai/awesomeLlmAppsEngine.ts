/**
 * Awesome LLM Apps Engine
 * 
 * Inspired by Shubhamsaboo/awesome-llm-apps.
 * Comprehensive catalog, scaffolder, and launcher for 60+ production-grade LLM applications:
 * Multi-Agent Teams, MCP Agents, Agentic RAG, Generative UI, Voice AI, and Always-On Daemons.
 */

export type AwesomeAppCategory =
  | 'multi_agent'
  | 'mcp_agents'
  | 'rag_systems'
  | 'generative_ui'
  | 'voice_multimodal'
  | 'always_on'
  | 'starter_kits';

export interface AwesomeLlmApp {
  id: string;
  name: string;
  category: AwesomeAppCategory;
  categoryLabel: string;
  categoryColor: string;
  framework: string; // e.g., 'Phidata / Agno', 'CrewAI', 'LangChain', 'LlamaIndex', 'Streamlit', 'FastAPI'
  icon: string;
  description: string;
  relPath: string;
  primaryFile: string;
  dependencies: string[];
  tags: string[];
  sampleCodeSnippet?: string;
  instructions: string;
}

export interface AwesomeAppCategoryMeta {
  id: AwesomeAppCategory;
  label: string;
  color: string;
  icon: string;
  count: number;
}

export class AwesomeLlmAppsEngine {
  private apps: Map<string, AwesomeLlmApp> = new Map();
  private isLoaded = false;

  constructor() {
    this.initDefaultApps();
    this.scanLocalAwesomeDirectory();
  }

  private initDefaultApps(): void {
    if (this.isLoaded) return;

    const definitions: AwesomeLlmApp[] = [
      // 1. MULTI-AGENT TEAMS & COLLABORATION
      {
        id: 'ai-codebase-migration-agent',
        name: 'AI Codebase Migration Agent Team',
        category: 'multi_agent',
        categoryLabel: 'Multi-Agent Teams',
        categoryColor: '#3B82F6',
        framework: 'Agno / Streamlit',
        icon: 'GitCompare',
        description: 'Multi-agent team that analyzes legacy codebases, designs modern architecture mappings, and performs automated language/framework migration.',
        relPath: 'advanced_ai_agents/multi_agent_apps/ai_codebase_migration_agent',
        primaryFile: 'codebase_migration_agent.py',
        dependencies: ['agno', 'streamlit', 'pydantic', 'openai'],
        tags: ['migration', 'ast', 'multi-agent', 'refactoring'],
        instructions: 'Scaffold and run with `streamlit run codebase_migration_agent.py`'
      },
      {
        id: 'ai-domain-deep-research-agent',
        name: 'Deep Domain Autonomous Research Agent',
        category: 'multi_agent',
        categoryLabel: 'Multi-Agent Teams',
        categoryColor: '#3B82F6',
        framework: 'CrewAI / Streamlit',
        icon: 'Search',
        description: 'Autonomous research crew that plans sub-queries, scrapes academic and industry web sources, synthesizes literature, and outputs executive reports.',
        relPath: 'advanced_ai_agents/multi_agent_apps/ai_domain_deep_research_agent',
        primaryFile: 'deep_research_agent.py',
        dependencies: ['crewai', 'duckduckgo-search', 'streamlit'],
        tags: ['research', 'web-search', 'crewai', 'synthesis'],
        instructions: 'Run `streamlit run deep_research_agent.py` to launch full multi-query researcher.'
      },
      {
        id: 'ai-self-evolving-agent',
        name: 'Self-Evolving Code & Prompt Agent',
        category: 'multi_agent',
        categoryLabel: 'Multi-Agent Teams',
        categoryColor: '#3B82F6',
        framework: 'Autogen / Python',
        icon: 'Sparkles',
        description: 'Agentic feedback loop that evaluates its own generated solutions against unit test criteria and iteratively refines its internal system prompts.',
        relPath: 'advanced_ai_agents/multi_agent_apps/ai_self_evolving_agent',
        primaryFile: 'self_evolving_agent.py',
        dependencies: ['pyautogen', 'pytest'],
        tags: ['self-healing', 'reflection', 'autogen'],
        instructions: 'Run `python self_evolving_agent.py` to start self-evolution test loop.'
      },
      {
        id: 'devpulse-ai',
        name: 'DevPulse AI Git & PR Intelligence Team',
        category: 'multi_agent',
        categoryLabel: 'Multi-Agent Teams',
        categoryColor: '#3B82F6',
        framework: 'FastAPI / Streamlit',
        icon: 'GitPullRequest',
        description: 'Monitors pull requests, performs adversarial security reviews, generates changelogs, and drafts release notes automatically.',
        relPath: 'advanced_ai_agents/multi_agent_apps/devpulse_ai',
        primaryFile: 'devpulse_app.py',
        dependencies: ['github', 'streamlit', 'langchain'],
        tags: ['git', 'code-review', 'release-notes'],
        instructions: 'Run `streamlit run devpulse_app.py`.'
      },

      // 2. MODEL CONTEXT PROTOCOL (MCP) AGENTS
      {
        id: 'mcp-multi-tool-agent',
        name: 'MCP Universal Multi-Tool Agent',
        category: 'mcp_agents',
        categoryLabel: 'MCP Protocols',
        categoryColor: '#06B6D4',
        framework: 'Model Context Protocol (MCP)',
        icon: 'Network',
        description: 'Connects to any external or local MCP server (filesystem, sqlite, fetch, memory) to dynamically discover and execute standardized tools.',
        relPath: 'mcp_ai_agents',
        primaryFile: 'mcp_agent.py',
        dependencies: ['mcp', 'ollama', 'pydantic'],
        tags: ['mcp', 'tools', 'protocol', 'ollama'],
        instructions: 'Run with `python mcp_agent.py`.'
      },

      // 3. ADVANCED RAG & KNOWLEDGE SYSTEMS
      {
        id: 'agentic-rag-hybrid-search',
        name: 'Agentic Hybrid RAG (Dense + BM25 + Graph)',
        category: 'rag_systems',
        categoryLabel: 'RAG & Knowledge',
        categoryColor: '#10B981',
        framework: 'LlamaIndex / LanceDB',
        icon: 'Database',
        description: 'State-of-the-art retrieval pipeline blending vector embeddings, BM25 keyword matching, and reranking with cross-encoders.',
        relPath: 'rag_tutorials/advanced_rag',
        primaryFile: 'agentic_rag.py',
        dependencies: ['llama-index', 'lancedb', 'sentence-transformers'],
        tags: ['rag', 'hybrid-search', 'reranking', 'vector-db'],
        instructions: 'Run `python agentic_rag.py` to index workspace documents.'
      },
      {
        id: 'graph-rag-knowledge-explorer',
        name: 'Graph RAG Entity & Relation Explorer',
        category: 'rag_systems',
        categoryLabel: 'RAG & Knowledge',
        categoryColor: '#10B981',
        framework: 'NetworkX / LangChain',
        icon: 'Share2',
        description: 'Extracts entities and relationships from documents to construct an interactive knowledge graph for multi-hop reasoning.',
        relPath: 'rag_tutorials/graph_rag',
        primaryFile: 'graph_rag_app.py',
        dependencies: ['networkx', 'langchain', 'streamlit', 'pyvis'],
        tags: ['graph-rag', 'knowledge-graph', 'networkx'],
        instructions: 'Run `streamlit run graph_rag_app.py`.'
      },

      // 4. GENERATIVE UI & ARTIFACTS
      {
        id: 'generative-ui-component-builder',
        name: 'Generative UI Real-Time Component Studio',
        category: 'generative_ui',
        categoryLabel: 'Generative UI',
        categoryColor: '#EC4899',
        framework: 'Next.js / React / Tailwind',
        icon: 'Layout',
        description: 'Streams live React components with interactive state, Lucide icons, and Tailwind CSS previews rendered safely in sandboxed iframes.',
        relPath: 'generative_ui_agents',
        primaryFile: 'gen_ui_server.py',
        dependencies: ['fastapi', 'uvicorn', 'jinja2'],
        tags: ['generative-ui', 'react', 'tailwind', 'v0-style'],
        instructions: 'Launch with `python gen_ui_server.py`.'
      },

      // 5. VOICE AI & MULTIMODAL AGENTS
      {
        id: 'voice-conversational-agent',
        name: 'Voice AI Real-Time Streaming Assistant',
        category: 'voice_multimodal',
        categoryLabel: 'Voice & Multimodal',
        categoryColor: '#F59E0B',
        framework: 'Whisper / Piper TTS',
        icon: 'Mic',
        description: 'Low-latency full-duplex voice interface combining local Whisper speech-to-text, LLM streaming, and local Piper neural text-to-speech.',
        relPath: 'voice_ai_agents',
        primaryFile: 'voice_agent.py',
        dependencies: ['faster-whisper', 'sounddevice', 'piper-tts'],
        tags: ['voice', 'whisper', 'tts', 'audio'],
        instructions: 'Run `python voice_agent.py` with connected microphone.'
      },

      // 6. ALWAYS-ON & BACKGROUND DAEMONS
      {
        id: 'always-on-file-watcher',
        name: 'Always-On Workspace Watcher & Auto-Tester',
        category: 'always_on',
        categoryLabel: 'Always-On Daemons',
        categoryColor: '#8B5CF6',
        framework: 'Watchdog / Python',
        icon: 'Eye',
        description: 'Background daemon that watches workspace file edits, runs affected unit tests immediately, and notifies agent on compile errors.',
        relPath: 'always_on_agents',
        primaryFile: 'workspace_daemon.py',
        dependencies: ['watchdog', 'pytest'],
        tags: ['daemon', 'file-watcher', 'auto-test'],
        instructions: 'Start in background with `python workspace_daemon.py`.'
      },

      // 7. STARTER AI AGENTS
      {
        id: 'starter-financial-analyst',
        name: 'Financial Market & SEC 10-K Analyst Agent',
        category: 'starter_kits',
        categoryLabel: 'Starter Kits',
        categoryColor: '#10B981',
        framework: 'YFinance / Agno',
        icon: 'DollarSign',
        description: 'Fetches real-time stock quotes, balance sheets, and SEC filings to generate structured financial valuation reports.',
        relPath: 'starter_ai_agents/financial_agent',
        primaryFile: 'financial_agent.py',
        dependencies: ['yfinance', 'agno', 'streamlit'],
        tags: ['finance', 'stock', 'sec-10k'],
        instructions: 'Run `streamlit run financial_agent.py`.'
      },
      {
        id: 'starter-sql-generator',
        name: 'Natural Language to SQL & Database Query Agent',
        category: 'starter_kits',
        categoryLabel: 'Starter Kits',
        categoryColor: '#10B981',
        framework: 'SQLAlchemy / LangChain',
        icon: 'Database',
        description: 'Translates natural language questions into safe SQL queries, executes on SQLite/Postgres, and visualizes charts automatically.',
        relPath: 'starter_ai_agents/sql_agent',
        primaryFile: 'sql_agent.py',
        dependencies: ['sqlalchemy', 'langchain', 'streamlit', 'pandas'],
        tags: ['sql', 'text-to-sql', 'database'],
        instructions: 'Run `streamlit run sql_agent.py`.'
      }
    ];

    for (const app of definitions) {
      this.apps.set(app.id, app);
    }

    this.isLoaded = true;
  }

  private scanLocalAwesomeDirectory(): void {
    if (typeof window !== 'undefined') return;

    try {
      const nodeFs = eval('require')('fs') as typeof import('fs');
      const nodePath = eval('require')('path') as typeof import('path');
      const baseDir = nodePath.join(process.cwd(), 'awesome-llm-apps');

      if (nodeFs.existsSync(baseDir)) {
        const walk = (dir: string) => {
          const entries = nodeFs.readdirSync(dir, { withFileTypes: true });
          for (const ent of entries) {
            const full = nodePath.join(dir, ent.name);
            if (ent.isDirectory() && ent.name !== '.git' && ent.name !== 'node_modules') {
              // Check if directory has a .py file
              const subEntries = nodeFs.readdirSync(full);
              const pyFile = subEntries.find(f => f.endsWith('.py'));
              if (pyFile) {
                const rel = nodePath.relative(baseDir, full).replace(/\\/g, '/');
                const id = ent.name.toLowerCase().replace(/_/g, '-');
                if (!this.apps.has(id)) {
                  this.apps.set(id, {
                    id,
                    name: ent.name.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
                    category: rel.includes('multi_agent') ? 'multi_agent' : rel.includes('rag') ? 'rag_systems' : rel.includes('voice') ? 'voice_multimodal' : 'starter_kits',
                    categoryLabel: rel.includes('multi_agent') ? 'Multi-Agent Teams' : rel.includes('rag') ? 'RAG & Knowledge' : 'Starter Kits',
                    categoryColor: '#3B82F6',
                    framework: pyFile.includes('app') ? 'Streamlit' : 'Python',
                    icon: 'Box',
                    description: `Production LLM application from awesome-llm-apps/${rel}`,
                    relPath: rel,
                    primaryFile: pyFile,
                    dependencies: ['streamlit', 'openai', 'pydantic'],
                    tags: [ent.name, 'awesome-llm-apps'],
                    instructions: `Run with \`streamlit run ${pyFile}\` or \`python ${pyFile}\``
                  });
                }
              }
              walk(full);
            }
          }
        };
        walk(baseDir);
      }
    } catch {}
  }

  public getAllApps(): AwesomeLlmApp[] {
    return Array.from(this.apps.values());
  }

  public getAppById(id: string): AwesomeLlmApp | null {
    return this.apps.get(id) || null;
  }

  public getCategories(): AwesomeAppCategoryMeta[] {
    const counts: Record<string, number> = {};
    for (const a of this.getAllApps()) {
      counts[a.category] = (counts[a.category] || 0) + 1;
    }

    return [
      { id: 'multi_agent', name: 'Multi-Agent Teams', label: 'Multi-Agent Teams', description: 'Self-coordinating collaborative agent teams and autonomous loops', color: '#3B82F6', icon: 'Users', count: counts['multi_agent'] || 0 },
      { id: 'mcp_agents', name: 'MCP Protocols', label: 'MCP Protocols', description: 'Model Context Protocol standardized integrations and servers', color: '#06B6D4', icon: 'Network', count: counts['mcp_agents'] || 0 },
      { id: 'rag_systems', name: 'RAG & Knowledge', label: 'RAG & Knowledge', description: 'Hybrid search, GraphRAG, vector indexes, and document intelligence', color: '#10B981', icon: 'Database', count: counts['rag_systems'] || 0 },
      { id: 'generative_ui', name: 'Generative UI', label: 'Generative UI', description: 'Dynamic React/HTML artifacts, generative canvases, and dashboard builders', color: '#EC4899', icon: 'Layout', count: counts['generative_ui'] || 0 },
      { id: 'voice_multimodal', name: 'Voice & Multimodal', label: 'Voice & Multimodal', description: 'Speech-to-text, real-time voice agents, vision analysis, and audio generation', color: '#F59E0B', icon: 'Mic', count: counts['voice_multimodal'] || 0 },
      { id: 'always_on', name: 'Always-On Daemons', label: 'Always-On Daemons', description: 'Persistent background daemons, scheduled intelligence jobs, and monitor alerts', color: '#8B5CF6', icon: 'Clock', count: counts['always_on'] || 0 },
      { id: 'starter_kits', name: 'Starter Kits', label: 'Starter Kits', description: 'Clean boilerplates and kickstarters for LangChain, LlamaIndex, Agno, CrewAI', color: '#10B981', icon: 'Sparkles', count: counts['starter_kits'] || 0 }
    ];
  }

  public searchApps(query: string, category?: string): AwesomeLlmApp[] {
    let list = this.getAllApps();
    if (category && category !== 'all') {
      list = list.filter(a => a.category === category);
    }
    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.framework.toLowerCase().includes(q) ||
        a.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }

  /**
   * Scaffolds an Awesome LLM App into a target directory inside the user's workspace
   */
  public scaffoldAppToWorkspace(appId: string, destFolderName?: string): { success: boolean; targetPath?: string; error?: string } {
    if (typeof window !== 'undefined') return { success: false, error: 'Cannot scaffold on client' };

    try {
      const nodeFs = eval('require')('fs') as typeof import('fs');
      const nodePath = eval('require')('path') as typeof import('path');

      const app = this.getAppById(appId);
      if (!app) return { success: false, error: `App '${appId}' not found` };

      const sourceDir = nodePath.join(process.cwd(), 'awesome-llm-apps', app.relPath);
      const targetDirName = destFolderName || `apps-${app.id}`;
      const destDir = nodePath.join(process.cwd(), targetDirName);

      if (nodeFs.existsSync(sourceDir)) {
        // Recursive copy
        const copyRecursive = (src: string, dst: string) => {
          if (!nodeFs.existsSync(dst)) nodeFs.mkdirSync(dst, { recursive: true });
          const entries = nodeFs.readdirSync(src, { withFileTypes: true });
          for (const ent of entries) {
            const srcPath = nodePath.join(src, ent.name);
            const dstPath = nodePath.join(dst, ent.name);
            if (ent.isDirectory()) {
              copyRecursive(srcPath, dstPath);
            } else {
              nodeFs.copyFileSync(srcPath, dstPath);
            }
          }
        };

        copyRecursive(sourceDir, destDir);
        return { success: true, targetPath: targetDirName };
      } else {
        // Create single starter file
        if (!nodeFs.existsSync(destDir)) nodeFs.mkdirSync(destDir, { recursive: true });
        const filePath = nodePath.join(destDir, app.primaryFile);
        const starterCode = `# ${app.name}\n# Framework: ${app.framework}\n# Description: ${app.description}\n\nimport streamlit as st\n\nst.title("${app.name}")\nst.write("${app.description}")\n`;
        nodeFs.writeFileSync(filePath, starterCode, 'utf8');
        return { success: true, targetPath: targetDirName };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Scaffolding failed' };
    }
  }
}

export const awesomeLlmAppsEngine = new AwesomeLlmAppsEngine();
