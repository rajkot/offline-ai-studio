/**
 * Terminal Multi-Session & Split Engine
 * Manages concurrent terminal sessions, split grid layouts, shell types,
 * and compiler/build path regex detection for interactive links.
 */

export type ShellTypeId = 'powershell' | 'cmd' | 'bash' | 'wsl' | 'wasi' | 'sandbox';

export interface TerminalShellOption {
  id: ShellTypeId;
  name: string;
  command: string;
  icon: string;
  description: string;
  isAvailable: boolean;
}

export interface TerminalSessionItem {
  id: string;
  title: string;
  shellType: ShellTypeId;
  shellCommand: string;
  createdAt: number;
  lastActive: number;
  outputBuffer?: string;
  status: 'active' | 'idle' | 'busy' | 'terminated';
}

export type TerminalGridLayout = 'single' | 'split-vertical' | 'split-horizontal';

export interface TerminalGridState {
  sessions: TerminalSessionItem[];
  primarySessionId: string;
  secondarySessionId: string | null;
  layout: TerminalGridLayout;
  splitRatio: number; // 0.2 to 0.8, default 0.5
}

export interface ExtractedTerminalLink {
  text: string;
  filePath: string;
  line: number;
  column: number;
  startIndex: number;
  endIndex: number;
}

export const AVAILABLE_SHELLS: TerminalShellOption[] = [
  {
    id: 'powershell',
    name: 'PowerShell',
    command: 'powershell.exe',
    icon: 'Terminal',
    description: 'Windows PowerShell 5.1 / 7 with full script execution',
    isAvailable: true
  },
  {
    id: 'cmd',
    name: 'Command Prompt',
    command: 'cmd.exe',
    icon: 'Square',
    description: 'Standard Windows Command Prompt (cmd.exe)',
    isAvailable: true
  },
  {
    id: 'bash',
    name: 'Git Bash',
    command: 'bash.exe',
    icon: 'GitBranch',
    description: 'MinGW64 Git Bash with Unix utilities (grep, curl, ssh)',
    isAvailable: true
  },
  {
    id: 'wsl',
    name: 'WSL2 (Ubuntu/Linux)',
    command: 'wsl.exe',
    icon: 'Cpu',
    description: 'Windows Subsystem for Linux (WSL2 Debian/Ubuntu)',
    isAvailable: true
  },
  {
    id: 'wasi',
    name: 'Sandboxed WASI WebContainer',
    command: 'wasi',
    icon: 'Zap',
    description: '100% In-Browser POSIX Micro-Kernel with Node.js runtime',
    isAvailable: true
  },
  {
    id: 'sandbox',
    name: 'Test Task Runner',
    command: 'sandbox',
    icon: 'Play',
    description: 'Vitest / Jest / Pytest runner with AI auto-patching',
    isAvailable: true
  }
];

class TerminalMultiSessionEngine {
  private state: TerminalGridState;
  private listeners: Set<(state: TerminalGridState) => void> = new Set();
  private sessionCounter = 1;

  constructor() {
    const initialSessionId = 'term-1';
    this.state = {
      sessions: [
        {
          id: initialSessionId,
          title: '1: PowerShell',
          shellType: 'powershell',
          shellCommand: 'powershell.exe',
          createdAt: Date.now(),
          lastActive: Date.now(),
          status: 'active'
        }
      ],
      primarySessionId: initialSessionId,
      secondarySessionId: null,
      layout: 'single',
      splitRatio: 0.5
    };
  }

  public getState(): TerminalGridState {
    return { ...this.state, sessions: [...this.state.sessions] };
  }

  public subscribe(listener: (state: TerminalGridState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(fn => fn(state));
  }

  /**
   * Create a new terminal session
   */
  public createSession(shellType: ShellTypeId = 'powershell', customTitle?: string): TerminalSessionItem {
    this.sessionCounter += 1;
    const shellOpt = AVAILABLE_SHELLS.find(s => s.id === shellType) || AVAILABLE_SHELLS[0];
    const id = `term-${this.sessionCounter}`;
    const title = customTitle || `${this.sessionCounter}: ${shellOpt.name}`;

    const newSession: TerminalSessionItem = {
      id,
      title,
      shellType,
      shellCommand: shellOpt.command,
      createdAt: Date.now(),
      lastActive: Date.now(),
      status: 'active'
    };

    this.state.sessions.push(newSession);

    // If we're split and secondary is not set or we want to focus the new one
    if (this.state.layout !== 'single' && !this.state.secondarySessionId) {
      this.state.secondarySessionId = id;
    } else {
      this.state.primarySessionId = id;
    }

    this.notify();
    return newSession;
  }

  /**
   * Close a terminal session
   */
  public closeSession(sessionId: string): void {
    if (this.state.sessions.length <= 1) {
      // Don't close the last session, just reset it
      return;
    }

    this.state.sessions = this.state.sessions.filter(s => s.id !== sessionId);

    if (this.state.primarySessionId === sessionId) {
      this.state.primarySessionId = this.state.sessions[0].id;
    }

    if (this.state.secondarySessionId === sessionId) {
      this.state.secondarySessionId = null;
      this.state.layout = 'single';
    }

    this.notify();
  }

  /**
   * Select active session for primary pane
   */
  public selectPrimarySession(sessionId: string): void {
    if (this.state.sessions.some(s => s.id === sessionId)) {
      this.state.primarySessionId = sessionId;
      this.notify();
    }
  }

  /**
   * Select active session for secondary pane
   */
  public selectSecondarySession(sessionId: string): void {
    if (this.state.sessions.some(s => s.id === sessionId)) {
      this.state.secondarySessionId = sessionId;
      this.notify();
    }
  }

  /**
   * Split Terminal (Ctrl+Shift+5)
   */
  public splitTerminal(direction: 'split-vertical' | 'split-horizontal' = 'split-vertical'): void {
    if (this.state.layout !== 'single') {
      // Already split: toggle back to single
      this.state.layout = 'single';
      this.state.secondarySessionId = null;
      this.notify();
      return;
    }

    // If we only have 1 session, spawn a second session
    if (this.state.sessions.length < 2) {
      const secondSession = this.createSession('powershell');
      this.state.layout = direction;
      this.state.secondarySessionId = secondSession.id;
    } else {
      // Pick a different session for the second pane
      const candidate = this.state.sessions.find(s => s.id !== this.state.primarySessionId) || this.state.sessions[0];
      this.state.layout = direction;
      this.state.secondarySessionId = candidate.id;
    }

    this.notify();
  }

  /**
   * Close split and return to single pane
   */
  public closeSplit(): void {
    this.state.layout = 'single';
    this.state.secondarySessionId = null;
    this.notify();
  }

  /**
   * Update split ratio (0.2 to 0.8)
   */
  public setSplitRatio(ratio: number): void {
    this.state.splitRatio = Math.max(0.2, Math.min(0.8, ratio));
    this.notify();
  }

  /**
   * Change shell type for a session
   */
  public setSessionShell(sessionId: string, shellType: ShellTypeId): void {
    const session = this.state.sessions.find(s => s.id === sessionId);
    if (!session) return;

    const shellOpt = AVAILABLE_SHELLS.find(s => s.id === shellType);
    if (!shellOpt) return;

    session.shellType = shellType;
    session.shellCommand = shellOpt.command;
    session.title = `${session.id.replace('term-', '')}: ${shellOpt.name}`;
    this.notify();
  }

  /**
   * Rename a session title
   */
  public renameSession(sessionId: string, newTitle: string): void {
    const session = this.state.sessions.find(s => s.id === sessionId);
    if (session && newTitle.trim()) {
      session.title = newTitle.trim();
      this.notify();
    }
  }

  /**
   * Extract clickable file paths & compiler error locations from terminal line text.
   * Matches patterns like:
   * - components/Playground.tsx:142:5
   * - app/api/git/route.ts:25
   * - e:/path/to/file.tsx:10:2
   * - /app/runtime/sandbox.ts:42:18
   * - components/Playground.tsx(142,5)
   * - src/__tests__/pipeline.spec.ts:15:23
   */
  public extractFilePathLinks(lineText: string): ExtractedTerminalLink[] {
    if (!lineText) return [];

    const links: ExtractedTerminalLink[] = [];

    // Pattern 1: standard file:line:col or file:line (e.g. components/Playground.tsx:142:5 or at foo (/app/file.ts:10:2))
    const regexColon = /(?:^|[\s"'`(\[])([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+):(\d+)(?::(\d+))?(?=[\s"'`)\]]|$)/g;
    let match: RegExpExecArray | null;

    while ((match = regexColon.exec(lineText)) !== null) {
      const fullMatched = match[0];
      const filePath = match[1];
      const line = parseInt(match[2], 10) || 1;
      const column = match[3] ? parseInt(match[3], 10) : 1;

      // Calculate exact start index of the link within the line
      const startIndex = match.index + (fullMatched.indexOf(filePath));
      const endIndex = startIndex + filePath.length + (match[2] ? `:${match[2]}`.length : 0) + (match[3] ? `:${match[3]}`.length : 0);

      links.push({
        text: lineText.substring(startIndex, endIndex),
        filePath,
        line,
        column,
        startIndex,
        endIndex
      });
    }

    // Pattern 2: file(line,col) (e.g. C# / MSBuild format)
    const regexParen = /(?:^|[\s"'`(\[])([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)\((\d+)(?:,\s*(\d+))?\)(?=[\s"'`)\]]|$)/g;
    while ((match = regexParen.exec(lineText)) !== null) {
      const fullMatched = match[0];
      const filePath = match[1];
      const line = parseInt(match[2], 10) || 1;
      const column = match[3] ? parseInt(match[3], 10) : 1;

      const startIndex = match.index + (fullMatched.indexOf(filePath));
      const text = `${filePath}(${match[2]}${match[3] ? `,${match[3]}` : ''})`;

      links.push({
        text,
        filePath,
        line,
        column,
        startIndex,
        endIndex: startIndex + text.length
      });
    }

    return links;
  }
}

export const terminalMultiSessionEngine = new TerminalMultiSessionEngine();
