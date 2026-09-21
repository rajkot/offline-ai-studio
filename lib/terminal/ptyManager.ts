/**
 * Real PTY (Pseudo-Terminal) Shell Manager
 * Integrates node-pty with WebSockets and SSE streaming for full interactive terminal emulation.
 * Supports Windows PowerShell, CMD, WSL2, Git Bash, and Unix bash/zsh.
 */

import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';

export interface PtyShellInfo {
  id: string;
  name: string;
  command: string;
  args: string[];
  isAvailable: boolean;
}

export interface PtySession {
  id: string;
  shell: string;
  ptyProcess: any; // IPty from node-pty
  createdAt: number;
  lastActive: number;
  outputBuffer: string[];
  subscribers: Set<(data: string) => void>;
}

class PtyManager {
  private sessions: Map<string, PtySession> = new Map();
  private wsServer: WebSocketServer | null = null;
  private wsPort: number = 3002;
  private isServerStarted: boolean = false;
  private nodePty: any = null;

  constructor() {
    this.initNodePty();
  }

  private initNodePty() {
    try {
      // Dynamic require to prevent bundling errors in client code
      this.nodePty = require('node-pty');
    } catch (err: any) {
      console.warn('[PtyManager] node-pty load failed:', err.message);
    }
  }

  /**
   * Get list of available system shells
   */
  public getAvailableShells(): PtyShellInfo[] {
    const isWin = process.platform === 'win32';
    if (isWin) {
      return [
        { id: 'powershell', name: 'Windows PowerShell', command: 'powershell.exe', args: ['-NoLogo'], isAvailable: true },
        { id: 'pwsh', name: 'PowerShell Core', command: 'pwsh.exe', args: ['-NoLogo'], isAvailable: true },
        { id: 'cmd', name: 'Command Prompt', command: 'cmd.exe', args: [], isAvailable: true },
        { id: 'wsl', name: 'WSL2 (Linux)', command: 'wsl.exe', args: [], isAvailable: true },
        { id: 'bash', name: 'Git Bash', command: 'bash.exe', args: ['--login', '-i'], isAvailable: true }
      ];
    }
    return [
      { id: 'bash', name: 'Bash', command: '/bin/bash', args: ['-l'], isAvailable: true },
      { id: 'zsh', name: 'Zsh', command: '/bin/zsh', args: ['-l'], isAvailable: true },
      { id: 'sh', name: 'Sh', command: '/bin/sh', args: [], isAvailable: true }
    ];
  }

  /**
   * Ensure standalone WebSocket server is running on port 3002
   */
  public async ensureWebSocketServer(port: number = 3002): Promise<{ online: boolean; port: number; message: string }> {
    this.wsPort = port;

    if (this.isServerStarted && this.wsServer) {
      return { online: true, port: this.wsPort, message: 'PTY WebSocket server already active' };
    }

    try {
      this.wsServer = new WebSocketServer({ port: this.wsPort });

      this.wsServer.on('connection', (ws: WebSocket) => {
        let currentSession: PtySession | null = null;

        ws.on('message', (message: string) => {
          try {
            const msg = JSON.parse(message.toString());

            if (msg.type === 'init') {
              const shellCmd = msg.shell || (process.platform === 'win32' ? 'powershell.exe' : '/bin/bash');
              currentSession = this.createSession(shellCmd, msg.cols || 80, msg.rows || 24, msg.cwd);

              currentSession.subscribers.add((data: string) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'output', data }));
                }
              });

              ws.send(JSON.stringify({
                type: 'ready',
                sessionId: currentSession.id,
                shell: shellCmd
              }));
            } else if (msg.type === 'input') {
              if (currentSession && msg.data) {
                this.writeInput(currentSession.id, msg.data);
              }
            } else if (msg.type === 'resize') {
              if (currentSession && msg.cols && msg.rows) {
                this.resizeSession(currentSession.id, msg.cols, msg.rows);
              }
            } else if (msg.type === 'switch_shell') {
              if (currentSession) {
                this.killSession(currentSession.id);
              }
              const newShell = msg.shell || 'powershell.exe';
              currentSession = this.createSession(newShell, msg.cols || 80, msg.rows || 24);
              currentSession.subscribers.add((data: string) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: 'output', data }));
                }
              });
              ws.send(JSON.stringify({ type: 'ready', sessionId: currentSession.id, shell: newShell }));
            }
          } catch (e: any) {
            console.error('[PtyManager] WS message error:', e);
          }
        });

        ws.on('close', () => {
          if (currentSession) {
            this.killSession(currentSession.id);
            currentSession = null;
          }
        });
      });

      this.wsServer.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`[PtyManager] Port ${this.wsPort} already in use; reusing existing daemon`);
          this.isServerStarted = true;
        } else {
          console.error('[PtyManager] WS Server error:', err);
        }
      });

      this.isServerStarted = true;
      return { online: true, port: this.wsPort, message: `PTY WebSocket server listening on port ${this.wsPort}` };
    } catch (err: any) {
      return { online: false, port: this.wsPort, message: err.message };
    }
  }

  /**
   * Create a new PTY session
   */
  public createSession(
    shellCmd?: string,
    cols: number = 80,
    rows: number = 24,
    customCwd?: string
  ): PtySession {
    if (!this.nodePty) {
      this.initNodePty();
    }

    const isWin = process.platform === 'win32';
    const defaultShell = isWin ? 'powershell.exe' : '/bin/bash';
    const selectedShell = shellCmd || defaultShell;
    const workingDir = customCwd ? path.resolve(customCwd) : process.cwd();

    const sessionId = 'pty-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);

    let ptyProcess: any;
    if (this.nodePty && typeof this.nodePty.spawn === 'function') {
      try {
        ptyProcess = this.nodePty.spawn(selectedShell, [], {
          name: 'xterm-256color',
          cols,
          rows,
          cwd: workingDir,
          env: {
            ...process.env,
            COLORTERM: 'truecolor',
            TERM: 'xterm-256color'
          }
        });
      } catch (err) {
        console.warn(`[PtyManager] Failed to spawn ${selectedShell}, falling back to default cmd:`, err);
        ptyProcess = this.nodePty.spawn(isWin ? 'cmd.exe' : '/bin/sh', [], {
          name: 'xterm-256color',
          cols,
          rows,
          cwd: workingDir,
          env: process.env as any
        });
      }
    } else {
      throw new Error('node-pty is not initialized.');
    }

    const session: PtySession = {
      id: sessionId,
      shell: selectedShell,
      ptyProcess,
      createdAt: Date.now(),
      lastActive: Date.now(),
      outputBuffer: [],
      subscribers: new Set()
    };

    ptyProcess.onData((data: string) => {
      session.lastActive = Date.now();
      session.outputBuffer.push(data);
      if (session.outputBuffer.length > 500) {
        session.outputBuffer.shift();
      }
      session.subscribers.forEach((sub) => {
        try {
          sub(data);
        } catch (e) {}
      });
    });

    ptyProcess.onExit(({ exitCode, signal }: any) => {
      const exitMsg = `\r\n[Process exited with code ${exitCode}]\r\n`;
      session.subscribers.forEach((sub) => sub(exitMsg));
      this.sessions.delete(sessionId);
    });

    this.sessions.set(sessionId, session);
    return session;
  }

  public writeInput(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ptyProcess) return false;
    session.ptyProcess.write(data);
    return true;
  }

  public resizeSession(sessionId: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.ptyProcess) return false;
    try {
      session.ptyProcess.resize(cols, rows);
      return true;
    } catch (e) {
      return false;
    }
  }

  public killSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    try {
      session.ptyProcess.kill();
    } catch (e) {}
    this.sessions.delete(sessionId);
    return true;
  }

  public getSession(sessionId: string): PtySession | undefined {
    return this.sessions.get(sessionId);
  }
}

export const ptyManager = new PtyManager();
