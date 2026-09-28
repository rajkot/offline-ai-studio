export interface AgencyDivisionMeta {
  label: string;
  icon: string;
  color: string;
}

export interface AgencyAgent {
  id: string;
  name: string;
  division: string;
  divisionLabel: string;
  divisionColor: string;
  divisionIcon: string;
  description: string;
  color: string;
  emoji: string;
  vibe: string;
  systemPrompt: string;
  filePath: string;
  byteSize?: number;
}

export interface AgencyAgentsCatalog {
  version: string;
  generatedAt: string;
  divisions: Record<string, AgencyDivisionMeta>;
  totalAgents: number;
  agents: AgencyAgent[];
}

export interface AgencyAgentFilterOptions {
  division?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

export class AgencyAgentsEngine {
  private catalog: AgencyAgentsCatalog | null = null;
  private isLoaded = false;
  private activeAgentId: string = 'engineering-senior-developer';

  constructor() {
    this.ensureLoaded();
  }

  private ensureLoaded(): void {
    if (this.isLoaded && this.catalog) return;

    // In browser environment, defer to API or public catalog fetch
    if (typeof window !== 'undefined') {
      return;
    }

    try {
      // Server-only dynamic require to prevent Webpack client-side bundle errors
      const nodeFs = eval('require')('fs') as typeof import('fs');
      const nodePath = eval('require')('path') as typeof import('path');

      // 1. Try public JSON catalog
      const catalogPath = nodePath.join(process.cwd(), 'public', 'agency-agents-catalog.json');
      if (nodeFs.existsSync(catalogPath)) {
        try {
          const raw = nodeFs.readFileSync(catalogPath, 'utf8');
          this.catalog = JSON.parse(raw);
          this.isLoaded = true;
          return;
        } catch (err) {
          console.error('[AgencyAgentsEngine] Error loading static catalog JSON:', err);
        }
      }

      // 2. Direct directory parsing fallback
      const baseDir = nodePath.join(process.cwd(), 'agency-agents');
      if (nodeFs.existsSync(baseDir)) {
        try {
          this.catalog = this.parseFromDirectory(baseDir, nodeFs, nodePath);
          this.isLoaded = true;
        } catch (err) {
          console.error('[AgencyAgentsEngine] Error parsing agency-agents directory:', err);
        }
      }
    } catch (err) {
      console.warn('[AgencyAgentsEngine] Server-side agent loader unavailable:', err);
    }
  }

  private parseFromDirectory(baseDir: string, fs: typeof import('fs'), path: typeof import('path')): AgencyAgentsCatalog {
    let divisions: Record<string, AgencyDivisionMeta> = {
      academic: { label: 'Academic', icon: 'GraduationCap', color: '#8B5CF6' },
      design: { label: 'Design', icon: 'PenTool', color: '#EC4899' },
      engineering: { label: 'Engineering', icon: 'Code', color: '#3B82F6' },
      finance: { label: 'Finance', icon: 'DollarSign', color: '#22C55E' },
      'game-development': { label: 'Game Development', icon: 'Gamepad2', color: '#A855F7' },
      gis: { label: 'GIS', icon: 'Map', color: '#14B8A6' },
      healthcare: { label: 'Healthcare', icon: 'Stethoscope', color: '#0D9488' },
      marketing: { label: 'Marketing', icon: 'Megaphone', color: '#F97316' },
      'paid-media': { label: 'Paid Media', icon: 'Target', color: '#EAB308' },
      product: { label: 'Product', icon: 'Box', color: '#D946EF' },
      'project-management': { label: 'Project Management', icon: 'ClipboardList', color: '#0EA5E9' },
      research: { label: 'Research', icon: 'Search', color: '#7C3AED' },
      sales: { label: 'Sales', icon: 'TrendingUp', color: '#10B981' },
      security: { label: 'Security', icon: 'ShieldCheck', color: '#EF4444' },
      'spatial-computing': { label: 'Spatial Computing', icon: 'Boxes', color: '#06B6D4' },
      specialized: { label: 'Specialized', icon: 'Sparkles', color: '#6366F1' },
      strategy: { label: 'Strategy', icon: 'Lightbulb', color: '#F59E0B' },
      support: { label: 'Support', icon: 'LifeBuoy', color: '#84CC16' },
      testing: { label: 'Testing', icon: 'FlaskConical', color: '#F59E0B' }
    };

    const divsFile = path.join(baseDir, 'divisions.json');
    if (fs.existsSync(divsFile)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(divsFile, 'utf8'));
        if (parsed.divisions) {
          divisions = { ...divisions, ...parsed.divisions };
        }
      } catch {}
    }

    const agents: AgencyAgent[] = [];
    const walk = (dir: string, currentDiv: string) => {
      const list = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of list) {
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
          if (item.name !== '.git' && item.name !== 'node_modules') {
            walk(full, currentDiv || item.name);
          }
        } else if (item.name.endsWith('.md') && !['README.md', 'CONTRIBUTING.md', 'CONTRIBUTING_zh-CN.md', 'SECURITY.md', 'LICENSE'].includes(item.name)) {
          const rel = path.relative(baseDir, full);
          const div = currentDiv || rel.split(path.sep)[0] || 'specialized';
          const divMeta = divisions[div] || { label: div, icon: 'Sparkles', color: '#6366F1' };
          const raw = fs.readFileSync(full, 'utf8');
          
          const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
          const rawYaml = match ? match[1] : '';
          const body = match ? match[2] : raw;
          const data: Record<string, string> = {};
          
          rawYaml.split(/\r?\n/).forEach(line => {
            const colonIdx = line.indexOf(':');
            if (colonIdx > 0) {
              const key = line.slice(0, colonIdx).trim();
              let val = line.slice(colonIdx + 1).trim();
              if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
              }
              data[key] = val;
            }
          });

          const fileName = path.basename(item.name, '.md');
          const id = fileName;
          const name = data.name || fileName.replace(/^[a-z]+-/, '').split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
          const description = data.description || (body.slice(0, 160).replace(/[#*`\n]/g, ' ').trim() + '...');
          const emoji = data.emoji || '🤖';
          const color = data.color || divMeta.color || '#3b82f6';
          const vibe = data.vibe || description;

          agents.push({
            id,
            name,
            division: div,
            divisionLabel: divMeta.label,
            divisionColor: divMeta.color,
            divisionIcon: divMeta.icon,
            description,
            color,
            emoji,
            vibe,
            systemPrompt: body.trim(),
            filePath: rel,
            byteSize: Buffer.byteLength(raw)
          });
        }
      }
    };

    walk(baseDir, '');

    return {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      divisions,
      totalAgents: agents.length,
      agents
    };
  }

  public getAllAgents(): AgencyAgent[] {
    this.ensureLoaded();
    return this.catalog?.agents || [];
  }

  public getDivisions(): Record<string, AgencyDivisionMeta> {
    this.ensureLoaded();
    return this.catalog?.divisions || {};
  }

  public getAgentById(id: string): AgencyAgent | null {
    this.ensureLoaded();
    if (!this.catalog) return null;
    return this.catalog.agents.find(a => a.id === id || a.id.toLowerCase() === id.toLowerCase()) || null;
  }

  public getActiveAgent(): AgencyAgent | null {
    return this.getAgentById(this.activeAgentId) || this.getAllAgents()[0] || null;
  }

  public setActiveAgent(id: string): boolean {
    const found = this.getAgentById(id);
    if (found) {
      this.activeAgentId = found.id;
      return true;
    }
    return false;
  }

  public searchAgents(options: AgencyAgentFilterOptions = {}): { agents: AgencyAgent[]; total: number } {
    this.ensureLoaded();
    let list = this.catalog?.agents || [];

    if (options.division && options.division !== 'all') {
      list = list.filter(a => a.division.toLowerCase() === options.division?.toLowerCase());
    }

    if (options.query && options.query.trim()) {
      const q = options.query.toLowerCase().trim();
      list = list.filter(a => 
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.vibe.toLowerCase().includes(q) ||
        a.division.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const offset = options.offset || 0;
    const limit = options.limit || list.length;

    return {
      agents: list.slice(offset, offset + limit),
      total
    };
  }

  public getStats(): {
    totalAgents: number;
    divisionsCount: number;
    byDivision: Record<string, number>;
  } {
    this.ensureLoaded();
    const agents = this.catalog?.agents || [];
    const byDivision: Record<string, number> = {};
    for (const a of agents) {
      byDivision[a.division] = (byDivision[a.division] || 0) + 1;
    }
    return {
      totalAgents: agents.length,
      divisionsCount: Object.keys(this.catalog?.divisions || {}).length,
      byDivision
    };
  }

  /**
   * Builds an enriched prompt injected with the Agency Agent's specific persona, rules, and philosophy
   */
  public buildAgentPrompt(agentId: string, userTask: string, contextSnippet?: string): string {
    const agent = this.getAgentById(agentId);
    if (!agent) {
      return `User Task: ${userTask}\n\nContext:\n${contextSnippet || 'No file context provided.'}`;
    }

    return `=== ACTIVE AGENT PERSONA: ${agent.name.toUpperCase()} (${agent.emoji}) ===
DIVISION: ${agent.divisionLabel}
VIBE: ${agent.vibe}

--- SYSTEM PROMPT & EXPERTISE ---
${agent.systemPrompt}
--------------------------------

You must execute the following user request adhering strictly to the above persona, rules, and architectural standards.

USER TASK:
${userTask}

${contextSnippet ? `CODE / WORKSPACE CONTEXT:\n${contextSnippet}\n` : ''}
Provide clean, production-grade output. Follow all persona guidelines.`;
  }
}

export const agencyAgentsEngine = new AgencyAgentsEngine();
