/**
 * Autonomous Agent Engine with Self-Healing Feedback Loop (Claude Code / Devin Style)
 * 
 * Flow:
 * Prompt -> Plan -> Write Code -> Run Terminal Command (e.g. `npm test`)
 *   -> Catch Errors -> Auto-Read Failing File -> Apply Patch -> Re-test
 * 
 * Supports:
 * - Permission Levels: 'full_autonomous' (automatic execution) vs 'guarded' (human confirmation required).
 * - Checkpointed Undo/Rollback Tree: 1-click revert of entire session or intermediate checkpoints.
 * - Integration with Local Ollama, OmniRoute Gateway, and Cloud AI.
 */

import { generateOllamaText, checkOllamaHealth, listOllamaModels, selectBestOllamaModel } from './ollamaClient';
import { generateWithOnlineAi } from './onlineAiEngine';

export type AgentPermissionMode = 'full_autonomous' | 'guarded';

export type AgentLoopPhase =
  | 'idle'
  | 'planning'
  | 'coding'
  | 'testing'
  | 'analyzing_error'
  | 'patching'
  | 'awaiting_permission'
  | 'completed'
  | 'failed'
  | 'aborted';

export interface AgentCheckpoint {
  id: string;
  iteration: number;
  timestamp: number;
  label: string;
  filesSnapshot: Record<string, string>; // path -> content
  commandExecuted?: string;
  testPassed?: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

export interface AgentStepLog {
  id: string;
  iteration: number;
  phase: AgentLoopPhase;
  message: string;
  timestamp: number;
  type: 'info' | 'plan' | 'code' | 'command' | 'error' | 'success' | 'rollback';
  details?: string;
}

export interface PermissionRequest {
  id: string;
  type: 'terminal_command' | 'file_patch';
  command?: string;
  filePath?: string;
  patchPreview?: string;
  reason: string;
  approve: () => void;
  reject: () => void;
}

export interface AutonomousAgentState {
  isActive: boolean;
  phase: AgentLoopPhase;
  permissionMode: AgentPermissionMode;
  prompt: string;
  testCommand: string;
  activeFile: string;
  iteration: number;
  maxIterations: number;
  logs: AgentStepLog[];
  checkpoints: AgentCheckpoint[];
  currentPendingPermission: PermissionRequest | null;
  errorSummary: string | null;
  successSummary: string | null;
  lastExitCode: number | null;
}

class AutonomousAgentEngine {
  private state: AutonomousAgentState = {
    isActive: false,
    phase: 'idle',
    permissionMode: 'guarded',
    prompt: '',
    testCommand: 'npm test',
    activeFile: '',
    iteration: 0,
    maxIterations: 6,
    logs: [],
    checkpoints: [],
    currentPendingPermission: null,
    errorSummary: null,
    successSummary: null,
    lastExitCode: null,
  };

  private listeners: Set<(state: AutonomousAgentState) => void> = new Set();
  private abortController: AbortController | null = null;
  private initialFilesSnapshot: Record<string, string> = {};
  private currentFiles: Record<string, string> = {};
  private onApplyFileUpdate?: (path: string, content: string) => Promise<void> | void;

  public subscribe(listener: (state: AutonomousAgentState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): AutonomousAgentState {
    return { ...this.state };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((l) => {
      try {
        l(currentState);
      } catch (err) {
        console.error('[AutonomousAgentEngine] Listener error:', err);
      }
    });
  }

  public setPermissionMode(mode: AgentPermissionMode) {
    this.state.permissionMode = mode;
    this.notify();
  }

  private addLog(
    phase: AgentLoopPhase,
    message: string,
    type: AgentStepLog['type'] = 'info',
    details?: string
  ) {
    const log: AgentStepLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      iteration: this.state.iteration,
      phase,
      message,
      timestamp: Date.now(),
      type,
      details,
    };
    this.state.logs.push(log);
    this.notify();
  }

  private saveCheckpoint(label: string, cmd?: string, exitCode?: number, stdout?: string, stderr?: string): AgentCheckpoint {
    const checkpoint: AgentCheckpoint = {
      id: 'cp-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      iteration: this.state.iteration,
      timestamp: Date.now(),
      label,
      filesSnapshot: { ...this.currentFiles },
      commandExecuted: cmd,
      testPassed: exitCode === 0,
      exitCode,
      stdout,
      stderr,
    };
    this.state.checkpoints.push(checkpoint);
    this.notify();
    return checkpoint;
  }

  /**
   * 1-Click Session Rollback: Reverts all workspace files to pre-session state.
   */
  public rollbackSession(): Record<string, string> {
    this.addLog('idle', 'Reverting entire agent session to baseline snapshot...', 'rollback');
    this.currentFiles = { ...this.initialFilesSnapshot };

    if (this.onApplyFileUpdate) {
      Object.entries(this.initialFilesSnapshot).forEach(([path, content]) => {
        this.onApplyFileUpdate!(path, content);
      });
    }

    this.state.phase = 'idle';
    this.state.isActive = false;
    this.state.currentPendingPermission = null;
    this.saveCheckpoint('Session Rollback to Baseline');
    this.notify();
    return { ...this.initialFilesSnapshot };
  }

  /**
   * Revert workspace files to a specific checkpoint.
   */
  public rollbackToCheckpoint(checkpointId: string): Record<string, string> | null {
    const cp = this.state.checkpoints.find((c) => c.id === checkpointId);
    if (!cp) return null;

    this.addLog('idle', `Rolling back workspace to checkpoint: "${cp.label}"`, 'rollback');
    this.currentFiles = { ...cp.filesSnapshot };

    if (this.onApplyFileUpdate) {
      Object.entries(cp.filesSnapshot).forEach(([path, content]) => {
        this.onApplyFileUpdate!(path, content);
      });
    }

    this.notify();
    return { ...cp.filesSnapshot };
  }

  public abortSession() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.state.isActive = false;
    this.state.phase = 'aborted';
    this.state.currentPendingPermission = null;
    this.addLog('aborted', 'Agent session aborted by user.', 'error');
    this.notify();
  }

  /**
   * Request human-in-the-loop permission if in 'guarded' mode.
   */
  private async requestPermission(req: Omit<PermissionRequest, 'id' | 'approve' | 'reject'>): Promise<boolean> {
    if (this.state.permissionMode === 'full_autonomous') {
      return true;
    }

    return new Promise<boolean>((resolve) => {
      const permissionObj: PermissionRequest = {
        id: 'perm-' + Math.random().toString(36).substring(2, 9),
        ...req,
        approve: () => {
          this.state.currentPendingPermission = null;
          this.state.phase = 'testing';
          this.notify();
          resolve(true);
        },
        reject: () => {
          this.state.currentPendingPermission = null;
          this.state.phase = 'idle';
          this.notify();
          resolve(false);
        },
      };

      this.state.currentPendingPermission = permissionObj;
      this.state.phase = 'awaiting_permission';
      this.notify();
    });
  }

  /**
   * Calls AI (Ollama or Cloud) to generate diagnostic reasoning or patches.
   */
  private async callAi(prompt: string, systemInstruction?: string): Promise<string> {
    try {
      const health = await checkOllamaHealth();
      if (health.online) {
        const models = await listOllamaModels();
        const model = selectBestOllamaModel(models);
        const res = await generateOllamaText({
          model,
          prompt: systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt,
          temperature: 0.2,
        });
        if (res && res.trim()) return res;
      }
    } catch (e) {
      console.warn('[AutonomousAgentEngine] Ollama failed, trying online fallback...', e);
    }

    try {
      const res = await generateWithOnlineAi({
        provider: 'omniroute',
        userPrompt: prompt,
        systemPrompt: systemInstruction,
        temperature: 0.2,
        maxTokens: 3000,
      });
      if (res && res.trim()) return res;
    } catch (e) {
      console.warn('[AutonomousAgentEngine] Online AI failed:', e);
    }

    return '';
  }

  /**
   * Executes a terminal command on the host via /api/terminal/execute.
   */
  private async executeTerminalCommand(command: string): Promise<{
    success: boolean;
    exitCode: number;
    stdout: string;
    stderr: string;
    durationMs: number;
  }> {
    const res = await fetch('/api/terminal/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        exitCode: data.exitCode || 1,
        stdout: data.stdout || '',
        stderr: data.error || data.stderr || `HTTP ${res.status}`,
        durationMs: 0,
      };
    }

    return await res.json();
  }

  /**
   * Start Autonomous Loop
   */
  public async startSession(params: {
    prompt: string;
    testCommand: string;
    activeFile: string;
    allFiles: Record<string, string>;
    permissionMode?: AgentPermissionMode;
    maxIterations?: number;
    onApplyFileUpdate?: (path: string, content: string) => Promise<void> | void;
  }) {
    if (this.state.isActive) {
      this.abortSession();
    }

    this.abortController = new AbortController();
    this.initialFilesSnapshot = { ...params.allFiles };
    this.currentFiles = { ...params.allFiles };
    this.onApplyFileUpdate = params.onApplyFileUpdate;

    this.state = {
      isActive: true,
      phase: 'planning',
      permissionMode: params.permissionMode || this.state.permissionMode,
      prompt: params.prompt,
      testCommand: params.testCommand || 'npm test',
      activeFile: params.activeFile,
      iteration: 1,
      maxIterations: params.maxIterations || 6,
      logs: [],
      checkpoints: [],
      currentPendingPermission: null,
      errorSummary: null,
      successSummary: null,
      lastExitCode: null,
    };

    // Save baseline checkpoint 0
    this.saveCheckpoint('Initial Baseline Pre-Agent State');
    this.addLog('planning', `Initiated autonomous session. Goal: "${params.prompt}"`, 'plan');
    this.notify();

    try {
      await this.runLoop();
    } catch (err: any) {
      if (this.abortController?.signal.aborted) return;
      this.state.phase = 'failed';
      this.state.isActive = false;
      this.state.errorSummary = err.message || 'Agent loop encountered an unhandled exception.';
      this.addLog('failed', `Agent execution failed: ${this.state.errorSummary}`, 'error');
      this.notify();
    }
  }

  /**
   * Core Autonomous Feedback Loop:
   * Prompt -> Plan -> Write Code -> Run Terminal Command -> Catch Errors -> Auto-Read Failing File -> Apply Patch -> Re-test
   */
  private async runLoop() {
    while (this.state.isActive && this.state.iteration <= this.state.maxIterations) {
      if (this.abortController?.signal.aborted) return;

      const iter = this.state.iteration;
      this.addLog('planning', `--- Iteration ${iter}/${this.state.maxIterations} Started ---`, 'info');

      // 1. Planning Phase
      this.state.phase = 'planning';
      this.notify();

      const activeContent = this.currentFiles[this.state.activeFile] || '';
      const planPrompt = `You are Devin/Claude Code, an autonomous AI software engineer.
Goal: "${this.state.prompt}"
Active File: "${this.state.activeFile}"
Test Command: "${this.state.testCommand}"
Iteration: ${iter}

Current file preview:
\`\`\`
${activeContent.slice(0, 1500)}
\`\`\`

Provide a high-level concise 2-sentence plan of the code modifications needed to solve the goal and pass the test.`;

      const planExplanation = await this.callAi(planPrompt, 'You are an autonomous coding agent planner.');
      this.addLog('planning', planExplanation || 'Formulating code patch based on requirements and file context.', 'plan');

      // 2. Coding / Patch Generation Phase
      this.state.phase = 'coding';
      this.notify();

      const codingPrompt = `You are Devin/Claude Code. Write the corrected, complete implementation for file "${this.state.activeFile}".
Goal: "${this.state.prompt}"
Previous Errors (if any): "${this.state.errorSummary || 'Initial implementation'}"

Active File Code:
\`\`\`
${activeContent}
\`\`\`

OUTPUT FORMAT:
Return ONLY the raw source code of the file. Do not wrap in conversational chit-chat. Provide production-ready syntax.`;

      this.addLog('coding', `Generating code patch for ${this.state.activeFile}...`, 'code');
      const patchCodeRaw = await this.callAi(codingPrompt);

      let cleanCode = patchCodeRaw.trim();
      if (cleanCode.startsWith('```')) {
        cleanCode = cleanCode.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
      }

      if (cleanCode && cleanCode.length > 20) {
        // Guarded confirmation if needed for file patch
        const approved = await this.requestPermission({
          type: 'file_patch',
          filePath: this.state.activeFile,
          patchPreview: cleanCode.slice(0, 300) + '...',
          reason: `Apply AI patch to ${this.state.activeFile} (Iteration ${iter})`,
        });

        if (!approved) {
          this.addLog('awaiting_permission', 'File patch rejected by user. Pausing session.', 'error');
          this.state.isActive = false;
          this.state.phase = 'idle';
          this.notify();
          return;
        }

        this.currentFiles[this.state.activeFile] = cleanCode;
        if (this.onApplyFileUpdate) {
          await this.onApplyFileUpdate(this.state.activeFile, cleanCode);
        }
        this.addLog('coding', `Applied patch to ${this.state.activeFile} (${cleanCode.length} bytes)`, 'code');
      }

      // 3. Testing Phase: Execute Terminal Command (e.g. `npm test` or `npx tsc --noEmit`)
      this.state.phase = 'testing';
      this.notify();

      // Guarded confirmation for shell execution
      const commandApproved = await this.requestPermission({
        type: 'terminal_command',
        command: this.state.testCommand,
        reason: `Execute test verification: "${this.state.testCommand}"`,
      });

      if (!commandApproved) {
        this.addLog('awaiting_permission', `Execution of "${this.state.testCommand}" rejected by user.`, 'error');
        this.state.isActive = false;
        this.state.phase = 'idle';
        this.notify();
        return;
      }

      this.addLog('testing', `Executing verification command: \`${this.state.testCommand}\`...`, 'command');
      const testResult = await this.executeTerminalCommand(this.state.testCommand);
      this.state.lastExitCode = testResult.exitCode;

      // Save iteration checkpoint
      this.saveCheckpoint(
        `Iteration ${iter}: \`${this.state.testCommand}\` (exit ${testResult.exitCode})`,
        this.state.testCommand,
        testResult.exitCode,
        testResult.stdout,
        testResult.stderr
      );

      // 4. Evaluate Test Results: Did tests pass?
      if (testResult.success && testResult.exitCode === 0) {
        this.state.phase = 'completed';
        this.state.isActive = false;
        this.state.successSummary = `Self-healing verification passed on iteration ${iter}! Command "${this.state.testCommand}" exited with code 0.`;
        this.addLog(
          'completed',
          `✅ All tests passed cleanly! (exit code 0, completed in ${testResult.durationMs}ms)`,
          'success',
          testResult.stdout
        );
        this.notify();
        return;
      }

      // 5. Catch Errors & Auto-Read Failing File
      this.state.phase = 'analyzing_error';
      this.notify();

      const combinedError = (testResult.stderr + '\n' + testResult.stdout).trim();
      this.state.errorSummary = combinedError.slice(0, 1000);

      this.addLog(
        'analyzing_error',
        `❌ Test failed (exit code ${testResult.exitCode}). Analyzing error trace...`,
        'error',
        combinedError.slice(0, 500)
      );

      // Auto-detect failing file mentioned in stack trace
      const fileMatch = combinedError.match(/(?:at\s+|in\s+|\/|[A-Za-z]:\\)([a-zA-Z0-9_\-./\\]+\.[a-zA-Z0-9]+)(?::(\d+))?/);
      if (fileMatch && fileMatch[1]) {
        const detectedPath = fileMatch[1].replace(/\\/g, '/');
        // Match with workspace file if known
        const matchedKey = Object.keys(this.currentFiles).find(
          (k) => k.endsWith(detectedPath) || detectedPath.endsWith(k)
        );
        if (matchedKey && matchedKey !== this.state.activeFile) {
          this.state.activeFile = matchedKey;
          this.addLog('analyzing_error', `Detected failing target file from trace: ${matchedKey}`, 'info');
        }
      }

      // Prepare next iteration
      this.state.iteration += 1;
      if (this.state.iteration > this.state.maxIterations) {
        this.state.phase = 'failed';
        this.state.isActive = false;
        this.addLog(
          'failed',
          `Max iterations (${this.state.maxIterations}) reached without passing tests. You can 1-click rollback or refine prompt.`,
          'error'
        );
        this.notify();
        return;
      }
    }
  }
}

export const autonomousAgentEngine = new AutonomousAgentEngine();
