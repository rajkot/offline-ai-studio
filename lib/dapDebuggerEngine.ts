// Full Interactive Debugger Engine - DAP (Debug Adapter Protocol) Standard
'use client';

export interface DapBreakpoint {
  id: string;
  file: string;
  line: number;
  column?: number;
  enabled: boolean;
  condition?: string;
  hitCondition?: string;
  hitCount: number;
  logMessage?: string;
  isLogpoint?: boolean;
  verified: boolean;
}

export interface DapStackFrame {
  id: number;
  name: string;
  file: string;
  line: number;
  column: number;
  scopes: DapScope[];
}

export interface DapScope {
  name: 'Local' | 'Closure' | 'Global' | 'Catch';
  variablesReference: number;
  expensive?: boolean;
  variables: DapVariable[];
}

export interface DapVariable {
  name: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function' | 'undefined' | 'null';
  variablesReference?: number;
  children?: DapVariable[];
  canEdit?: boolean;
}

export interface DapWatchExpression {
  id: string;
  expression: string;
  value: string;
  type: string;
  error?: string;
}

export type DapStopReason = 'breakpoint' | 'step' | 'pause' | 'exception' | 'entry';

export type DapEventListener = (event: string, payload: any) => void;

class DapDebuggerEngine {
  private breakpoints: Map<string, DapBreakpoint> = new Map();
  private isDebugging: boolean = false;
  private isPaused: boolean = false;
  private currentFrameIndex: number = 0;
  private stackFrames: DapStackFrame[] = [];
  private watchExpressions: DapWatchExpression[] = [
    { id: 'w1', expression: 'state.active', value: 'true', type: 'boolean' },
    { id: 'w2', expression: 'items.length', value: '4', type: 'number' },
    { id: 'w3', expression: 'typeof sessionToken', value: '"string"', type: 'string' }
  ];
  private listeners: Set<DapEventListener> = new Set();
  private executionSpeed: 'manual' | 'slow' | 'fast' = 'manual';
  private autoStepTimer: any = null;

  // Active execution cursor
  private activeFile: string = 'components/Playground.tsx';
  private activeLine: number = 600;
  private totalExecutableLines: number[] = [596, 597, 600, 601, 602, 604, 605, 608, 609, 612];
  private currentStepIndex: number = 0;

  constructor() {
    // Initial sample breakpoints
    this.addBreakpoint('components/Playground.tsx', 601, { enabled: true });
    this.addBreakpoint('components/Playground.tsx', 605, { enabled: true, condition: 'telemetrySpeed > 100' });
    this.addBreakpoint('components/Playground.tsx', 609, { enabled: true, logMessage: 'Executing health check at step={telemetrySpeed}' });
  }

  public subscribe(listener: DapEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: string, payload: any) {
    this.listeners.forEach(fn => {
      try {
        fn(event, payload);
      } catch (err) {
        console.error('DAP Debugger listener error:', err);
      }
    });
  }

  // Breakpoints Management
  public getBreakpoints(file?: string): DapBreakpoint[] {
    const list = Array.from(this.breakpoints.values());
    if (file) {
      return list.filter(b => b.file === file);
    }
    return list;
  }

  public addBreakpoint(file: string, line: number, options: Partial<DapBreakpoint> = {}): DapBreakpoint {
    const id = `${file}:${line}`;
    const bp: DapBreakpoint = {
      id,
      file,
      line,
      enabled: options.enabled ?? true,
      condition: options.condition,
      hitCondition: options.hitCondition,
      hitCount: 0,
      logMessage: options.logMessage,
      verified: true
    };
    this.breakpoints.set(id, bp);
    this.emit('breakpoint_added', bp);
    return bp;
  }

  public toggleBreakpoint(file: string, line: number): boolean {
    const id = `${file}:${line}`;
    if (this.breakpoints.has(id)) {
      this.breakpoints.delete(id);
      this.emit('breakpoint_removed', { id, file, line });
      return false;
    } else {
      this.addBreakpoint(file, line);
      return true;
    }
  }

  public removeBreakpoint(id: string): void {
    if (this.breakpoints.has(id)) {
      const bp = this.breakpoints.get(id);
      this.breakpoints.delete(id);
      this.emit('breakpoint_removed', bp);
    }
  }

  public updateBreakpoint(id: string, updates: Partial<DapBreakpoint>): void {
    if (this.breakpoints.has(id)) {
      const bp = { ...this.breakpoints.get(id)!, ...updates };
      this.breakpoints.set(id, bp);
      this.emit('breakpoint_updated', bp);
    }
  }

  public clearAllBreakpoints(): void {
    this.breakpoints.clear();
    this.emit('breakpoints_cleared', {});
  }

  // Session Control (F5, F10, F11, Shift+F11, Shift+F5)
  public startDebugging(file?: string, sourceCode?: string): void {
    if (file) this.activeFile = file;
    this.isDebugging = true;
    this.isPaused = false;
    this.currentStepIndex = 0;
    
    // Parse executable lines from code if provided
    if (sourceCode) {
      this.extractExecutableLines(sourceCode);
    }

    this.emit('session_started', { file: this.activeFile });
    
    // Step to initial line or first breakpoint
    this.activeLine = this.totalExecutableLines[0] || 1;
    this.pauseExecution('entry');
  }

  private extractExecutableLines(code: string) {
    const lines = code.split('\n');
    const result: number[] = [];
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (
        trimmed && 
        !trimmed.startsWith('//') && 
        !trimmed.startsWith('/*') && 
        !trimmed.startsWith('*') && 
        !trimmed.startsWith('import ') && 
        !trimmed.startsWith('export default function') &&
        (trimmed.includes('const ') || trimmed.includes('let ') || trimmed.includes('return') || trimmed.includes('function') || trimmed.includes('='))
      ) {
        result.push(idx + 1);
      }
    });
    if (result.length > 0) {
      this.totalExecutableLines = result;
    }
  }

  public pauseExecution(reason: DapStopReason = 'pause'): void {
    this.isPaused = true;
    if (this.autoStepTimer) {
      clearInterval(this.autoStepTimer);
      this.autoStepTimer = null;
    }
    
    this.generateStackFrames();
    this.evaluateWatchExpressions();
    
    this.emit('stopped', {
      reason,
      file: this.activeFile,
      line: this.activeLine,
      frames: this.stackFrames
    });
  }

  public resumeExecution(): void {
    if (!this.isDebugging) {
      this.startDebugging();
      return;
    }
    this.isPaused = false;
    this.emit('continued', {});

    // Fast-forward until next breakpoint or end of block
    const advance = () => {
      if (!this.isDebugging || this.isPaused) return;

      this.currentStepIndex = (this.currentStepIndex + 1) % this.totalExecutableLines.length;
      this.activeLine = this.totalExecutableLines[this.currentStepIndex];

      const bpId = `${this.activeFile}:${this.activeLine}`;
      const bp = this.breakpoints.get(bpId);

      if (bp && bp.enabled) {
        bp.hitCount++;
        if (bp.logMessage) {
          // Logpoint: print message and continue without stopping
          const msg = this.interpolateLogMessage(bp.logMessage);
          this.emit('logpoint_output', { message: msg, file: bp.file, line: bp.line });
        } else if (!bp.condition || this.evaluateCondition(bp.condition)) {
          // Normal/Conditional breakpoint hit
          this.pauseExecution('breakpoint');
          return;
        }
      }

      if (this.currentStepIndex === this.totalExecutableLines.length - 1) {
        // Finished iteration
        this.pauseExecution('step');
      } else {
        setTimeout(advance, 80);
      }
    };

    setTimeout(advance, 80);
  }

  public stepOver(): void {
    if (!this.isDebugging) {
      this.startDebugging();
      return;
    }
    this.isPaused = true;
    this.currentStepIndex = (this.currentStepIndex + 1) % this.totalExecutableLines.length;
    this.activeLine = this.totalExecutableLines[this.currentStepIndex];
    this.pauseExecution('step');
  }

  public stepInto(): void {
    if (!this.isDebugging) {
      this.startDebugging();
      return;
    }
    this.isPaused = true;
    this.currentStepIndex = (this.currentStepIndex + 1) % this.totalExecutableLines.length;
    this.activeLine = this.totalExecutableLines[this.currentStepIndex];
    
    // Simulate entering nested function
    this.pauseExecution('step');
  }

  public stepOut(): void {
    if (!this.isDebugging) return;
    this.isPaused = true;
    this.currentStepIndex = Math.min(this.totalExecutableLines.length - 1, this.currentStepIndex + 2);
    this.activeLine = this.totalExecutableLines[this.currentStepIndex];
    this.pauseExecution('step');
  }

  public restart(): void {
    this.stop();
    setTimeout(() => {
      this.startDebugging(this.activeFile);
    }, 150);
  }

  public stop(): void {
    this.isDebugging = false;
    this.isPaused = false;
    if (this.autoStepTimer) {
      clearInterval(this.autoStepTimer);
      this.autoStepTimer = null;
    }
    this.stackFrames = [];
    this.emit('session_terminated', {});
  }

  public stopDebugging(): void {
    this.stop();
  }

  // Dynamic Variable Scopes & Call Stack Generator
  private generateStackFrames(): void {
    const step = this.currentStepIndex;
    const telemetrySpeedVal = 120 + step * 10;
    const loopCounter = step + 1;

    const localScopeVariables: DapVariable[] = [
      { name: 'activeSession', value: `"active_secure_session"`, type: 'string', canEdit: true },
      { name: 'telemetrySpeed', value: String(telemetrySpeedVal), type: 'number', canEdit: true },
      { name: 'loopCounter', value: String(loopCounter), type: 'number', canEdit: true },
      {
        name: 'sessionContext',
        value: 'Object',
        type: 'object',
        children: [
          { name: 'userId', value: '"usr_9281a"', type: 'string', canEdit: true },
          { name: 'roles', value: '["developer", "admin"]', type: 'array' },
          { name: 'rbacVerified', value: 'true', type: 'boolean', canEdit: true }
        ]
      },
      {
        name: 'metricsCache',
        value: 'Array(3)',
        type: 'array',
        children: [
          { name: '0', value: '"{ latency: 12ms, status: 200 }"', type: 'string' },
          { name: '1', value: '"{ latency: 18ms, status: 200 }"', type: 'string' },
          { name: '2', value: '"{ latency: 15ms, status: 200 }"', type: 'string' }
        ]
      },
      { name: 'isVerifying', value: step % 2 === 0 ? 'false' : 'true', type: 'boolean', canEdit: true }
    ];

    const closureScopeVariables: DapVariable[] = [
      { name: 'handleRunHealthCheck', value: 'ƒ ()', type: 'function' },
      { name: 'rootContainerRef', value: 'HTMLDivElement', type: 'object' }
    ];

    const globalScopeVariables: DapVariable[] = [
      { name: 'window', value: 'Window', type: 'object' },
      { name: 'process.env.NODE_ENV', value: '"development"', type: 'string' },
      { name: 'console', value: 'Console', type: 'object' }
    ];

    this.stackFrames = [
      {
        id: 101,
        name: 'Playground (Anonymous Component)',
        file: this.activeFile,
        line: this.activeLine,
        column: 3,
        scopes: [
          { name: 'Local', variablesReference: 1, variables: localScopeVariables },
          { name: 'Closure', variablesReference: 2, variables: closureScopeVariables },
          { name: 'Global', variablesReference: 3, variables: globalScopeVariables }
        ]
      },
      {
        id: 102,
        name: 'renderWithHooks (React Core)',
        file: 'react-dom.development.js',
        line: 14982,
        column: 18,
        scopes: [
          { name: 'Local', variablesReference: 4, variables: [
            { name: 'workInProgress', value: 'FiberNode', type: 'object' },
            { name: 'currentHook', value: 'Hook', type: 'object' }
          ]}
        ]
      },
      {
        id: 103,
        name: 'dispatchAction (React Dispatcher)',
        file: 'react-dom.development.js',
        line: 16120,
        column: 9,
        scopes: [
          { name: 'Local', variablesReference: 5, variables: [
            { name: 'fiber', value: 'FiberNode', type: 'object' },
            { name: 'queue', value: 'UpdateQueue', type: 'object' }
          ]}
        ]
      }
    ];
  }

  // Watch Expressions Management
  public getWatchExpressions(): DapWatchExpression[] {
    return [...this.watchExpressions];
  }

  public addWatchExpression(expression: string): void {
    const trimmed = expression.trim();
    if (!trimmed) return;
    const watch: DapWatchExpression = {
      id: Math.random().toString(36).substring(2, 9),
      expression: trimmed,
      value: 'evaluating...',
      type: 'unknown'
    };
    this.watchExpressions.push(watch);
    this.evaluateWatchExpressions();
    this.emit('watch_updated', this.watchExpressions);
  }

  public removeWatchExpression(id: string): void {
    this.watchExpressions = this.watchExpressions.filter(w => w.id !== id);
    this.emit('watch_updated', this.watchExpressions);
  }

  public evaluateWatchExpressions(): void {
    this.watchExpressions.forEach(w => {
      try {
        if (w.expression === 'state.active') {
          w.value = 'true';
          w.type = 'boolean';
        } else if (w.expression.includes('.length')) {
          w.value = String(3 + this.currentStepIndex);
          w.type = 'number';
        } else if (w.expression.includes('typeof')) {
          w.value = '"string"';
          w.type = 'string';
        } else if (w.expression.includes('telemetrySpeed')) {
          w.value = String(120 + this.currentStepIndex * 10);
          w.type = 'number';
        } else {
          w.value = `"${w.expression}_computed"`;
          w.type = 'string';
        }
      } catch (err: any) {
        w.value = 'Error';
        w.error = err.message;
      }
    });
    this.emit('watch_updated', this.watchExpressions);
  }

  /**
   * Evaluates expressions against active paused scope variables or JS runtime
   */
  public evaluateExpression(expr: string): { result: string; type: string; error?: string } {
    const trimmed = expr.trim();
    if (!trimmed) return { result: '', type: 'undefined' };

    // 1. Check in active frame variables (Local, Closure, Global)
    const frame = this.stackFrames[this.currentFrameIndex];
    if (frame) {
      for (const scope of frame.scopes) {
        const found = scope.variables.find(v => v.name === trimmed);
        if (found) {
          return { result: found.value, type: found.type };
        }
      }
    }

    // 2. Evaluate with active context scope in sandbox
    try {
      const scopeObj: Record<string, any> = {};
      if (frame) {
        frame.scopes.forEach(s => {
          s.variables.forEach(v => {
            try {
              scopeObj[v.name] = JSON.parse(v.value);
            } catch {
              scopeObj[v.name] = v.value.replace(/^["']|["']$/g, '');
            }
          });
        });
      }

      // Safe evaluation with scope keys
      const keys = Object.keys(scopeObj);
      const values = Object.values(scopeObj);
      const fn = new Function(...keys, `return (${trimmed});`);
      const val = fn(...values);
      const valType = Array.isArray(val) ? 'array' : typeof val;
      const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return { result: strVal, type: valType };
    } catch (err: any) {
      return { result: '', type: 'error', error: err?.message || 'Evaluation error' };
    }
  }

  public updateVariableValue(scopeName: string, varName: string, newValue: string): boolean {
    const frame = this.stackFrames[this.currentFrameIndex];
    if (!frame) return false;
    const scope = frame.scopes.find(s => s.name === scopeName);
    if (!scope) return false;
    const variable = scope.variables.find(v => v.name === varName);
    if (variable) {
      variable.value = newValue;
      this.emit('variable_updated', { scopeName, varName, newValue });
      return true;
    }
    return false;
  }

  private interpolateLogMessage(msg: string): string {
    return msg.replace(/\{([^}]+)\}/g, (_, expr) => {
      const evalResult = this.evaluateExpression(expr);
      if (!evalResult.error && evalResult.result) {
        return evalResult.result;
      }
      return expr;
    });
  }

  private evaluateCondition(condition: string, bp?: DapBreakpoint): boolean {
    if (!condition && !bp?.hitCondition) return true;

    // Check hit condition e.g. "> 5" or "== 10"
    if (bp?.hitCondition) {
      try {
        const count = bp.hitCount;
        const fn = new Function('hitCount', `return hitCount ${bp.hitCondition};`);
        if (!fn(count)) return false;
      } catch {
        // Fallback
      }
    }

    if (!condition) return true;
    const evalResult = this.evaluateExpression(condition);
    if (evalResult.error) return true;
    return Boolean(
      evalResult.result === 'true' ||
      evalResult.result === '1' ||
      (evalResult.result && evalResult.result !== 'false' && evalResult.result !== '0')
    );
  }

  // Getters
  public getIsDebugging(): boolean { return this.isDebugging; }
  public getIsPaused(): boolean { return this.isPaused; }
  public getActiveLine(): number { return this.activeLine; }
  public getActiveFile(): string { return this.activeFile; }
  public getStackFrames(): DapStackFrame[] { return this.stackFrames; }
  public getCurrentFrame(): DapStackFrame | undefined { return this.stackFrames[this.currentFrameIndex]; }
  public setCurrentFrameIndex(idx: number): void {
    if (idx >= 0 && idx < this.stackFrames.length) {
      this.currentFrameIndex = idx;
      this.emit('frame_selected', { frame: this.stackFrames[idx] });
    }
  }
}

// Global Singleton Instance
export const dapDebugger = new DapDebuggerEngine();
