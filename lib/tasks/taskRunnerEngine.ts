// Tasks Runner Engine (.vscode/tasks.json, Ctrl+Shift+B)
'use client';

import { problemMatcherEngine } from './problemMatcherEngine';
import { LspProblemItem } from '../lsp/LspWorkerHub';

export interface VsCodeTaskGroup {
  kind: 'build' | 'test' | 'none';
  isDefault?: boolean;
}

export interface VsCodeTask {
  label: string;
  type: 'shell' | 'process';
  command: string;
  args?: string[];
  group?: VsCodeTaskGroup | string;
  problemMatcher?: string | string[];
  presentation?: {
    reveal?: 'always' | 'never' | 'silent';
    echo?: boolean;
    focus?: boolean;
  };
}

export interface VsCodeTasksConfig {
  version: string;
  tasks: VsCodeTask[];
}

export interface TaskRunResult {
  task: VsCodeTask;
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  problems: LspProblemItem[];
}

type TaskRunnerListener = (event: 'started' | 'output' | 'completed', data: any) => void;

export class TaskRunnerEngine {
  private static instance: TaskRunnerEngine;
  private currentRunningTask: VsCodeTask | null = null;
  private lastResult: TaskRunResult | null = null;
  private listeners: Set<TaskRunnerListener> = new Set();
  private tasksConfig: VsCodeTasksConfig = {
    version: '2.0.0',
    tasks: [
      {
        label: 'npm: build',
        type: 'shell',
        command: 'npm run build',
        group: { kind: 'build', isDefault: true },
        problemMatcher: '$tsc'
      },
      {
        label: 'tsc: typecheck',
        type: 'shell',
        command: 'npx tsc --noEmit --skipLibCheck',
        group: { kind: 'build', isDefault: false },
        problemMatcher: '$tsc'
      },
      {
        label: 'npm: lint',
        type: 'shell',
        command: 'npm run lint',
        group: { kind: 'test', isDefault: false },
        problemMatcher: '$eslint-stylish'
      },
      {
        label: 'npm: test',
        type: 'shell',
        command: 'npm test',
        group: { kind: 'test', isDefault: true }
      }
    ]
  };

  public static getInstance(): TaskRunnerEngine {
    if (!TaskRunnerEngine.instance) {
      TaskRunnerEngine.instance = new TaskRunnerEngine();
    }
    return TaskRunnerEngine.instance;
  }

  public subscribe(listener: TaskRunnerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: 'started' | 'output' | 'completed', data: any) {
    this.listeners.forEach(l => {
      try {
        l(event, data);
      } catch (e) {}
    });
  }

  /**
   * Load tasks from .vscode/tasks.json if present in workspace files
   */
  public loadFromWorkspace(workspaceFiles: Record<string, string>): void {
    const tasksJson = workspaceFiles['.vscode/tasks.json'] || workspaceFiles['tasks.json'];
    if (tasksJson) {
      try {
        const parsed = JSON.parse(tasksJson);
        if (Array.isArray(parsed.tasks)) {
          this.tasksConfig = {
            version: parsed.version || '2.0.0',
            tasks: parsed.tasks
          };
          return;
        }
      } catch (e) {
        console.warn('[TaskRunnerEngine] Failed to parse .vscode/tasks.json:', e);
      }
    }

    // Auto-discover from package.json if available
    const pkgJson = workspaceFiles['package.json'];
    if (pkgJson) {
      try {
        const parsedPkg = JSON.parse(pkgJson);
        if (parsedPkg.scripts && typeof parsedPkg.scripts === 'object') {
          const generatedTasks: VsCodeTask[] = [];
          
          if (parsedPkg.scripts.build) {
            generatedTasks.push({
              label: 'npm: build',
              type: 'shell',
              command: 'npm run build',
              group: { kind: 'build', isDefault: true },
              problemMatcher: '$tsc'
            });
          }

          generatedTasks.push({
            label: 'tsc: typecheck',
            type: 'shell',
            command: 'npx tsc --noEmit --skipLibCheck',
            group: { kind: 'build', isDefault: !parsedPkg.scripts.build },
            problemMatcher: '$tsc'
          });

          if (parsedPkg.scripts.lint) {
            generatedTasks.push({
              label: 'npm: lint',
              type: 'shell',
              command: 'npm run lint',
              group: { kind: 'test', isDefault: false },
              problemMatcher: '$eslint-stylish'
            });
          }

          if (parsedPkg.scripts.test) {
            generatedTasks.push({
              label: 'npm: test',
              type: 'shell',
              command: 'npm test',
              group: { kind: 'test', isDefault: true }
            });
          }

          // Add any remaining scripts
          for (const [scriptName] of Object.entries(parsedPkg.scripts)) {
            if (!['build', 'lint', 'test'].includes(scriptName)) {
              generatedTasks.push({
                label: `npm: ${scriptName}`,
                type: 'shell',
                command: `npm run ${scriptName}`,
                group: 'none'
              });
            }
          }

          this.tasksConfig.tasks = generatedTasks;
        }
      } catch (e) {}
    }
  }

  public getTasks(): VsCodeTask[] {
    return this.tasksConfig.tasks;
  }

  /**
   * Get default build task (e.g. triggered by Ctrl+Shift+B)
   */
  public getDefaultBuildTask(): VsCodeTask | null {
    const tasks = this.tasksConfig.tasks;
    const defaultBuild = tasks.find(t => {
      if (typeof t.group === 'object' && t.group?.kind === 'build' && t.group?.isDefault) {
        return true;
      }
      return false;
    });

    if (defaultBuild) return defaultBuild;

    // Fallback to first build task
    const anyBuild = tasks.find(t => {
      if (typeof t.group === 'string' && t.group === 'build') return true;
      if (typeof t.group === 'object' && t.group?.kind === 'build') return true;
      return t.label.toLowerCase().includes('build') || t.command.includes('build');
    });

    return anyBuild || tasks[0] || null;
  }

  public isRunning(): boolean {
    return this.currentRunningTask !== null;
  }

  public getCurrentTask(): VsCodeTask | null {
    return this.currentRunningTask;
  }

  public getLastResult(): TaskRunResult | null {
    return this.lastResult;
  }

  /**
   * Executes a task, streams/returns output, and passes compiler output to problemMatcherEngine
   */
  public async runTask(task: VsCodeTask | string): Promise<TaskRunResult> {
    let resolvedTask: VsCodeTask;
    if (typeof task === 'string') {
      const found = this.tasksConfig.tasks.find(t => t.label === task || t.command === task);
      if (found) {
        resolvedTask = found;
      } else {
        resolvedTask = {
          label: task,
          type: 'shell',
          command: task,
          group: 'none'
        };
      }
    } else {
      resolvedTask = task;
    }

    this.currentRunningTask = resolvedTask;
    this.emit('started', { task: resolvedTask });

    try {
      const fullCommand = resolvedTask.args && resolvedTask.args.length > 0
        ? `${resolvedTask.command} ${resolvedTask.args.join(' ')}`
        : resolvedTask.command;

      const res = await fetch('/api/tasks/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: fullCommand })
      });

      const data = await res.json();
      const combinedOutput = `${data.stdout || ''}\n${data.stderr || ''}`;

      // Run output through compiler problem matchers
      const problems = problemMatcherEngine.processAndSyncTerminalOutput(combinedOutput, false);

      const result: TaskRunResult = {
        task: resolvedTask,
        success: data.success && data.exitCode === 0,
        exitCode: data.exitCode || 0,
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        durationMs: data.durationMs || 0,
        problems
      };

      this.lastResult = result;
      this.currentRunningTask = null;
      this.emit('completed', result);
      return result;
    } catch (err: any) {
      const result: TaskRunResult = {
        task: resolvedTask,
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: err.message || 'Task execution error',
        durationMs: 0,
        problems: []
      };

      this.lastResult = result;
      this.currentRunningTask = null;
      this.emit('completed', result);
      return result;
    }
  }

  /**
   * Run the default build task (Ctrl+Shift+B)
   */
  public async runBuildTask(): Promise<TaskRunResult | null> {
    const defaultBuild = this.getDefaultBuildTask();
    if (!defaultBuild) {
      return null;
    }
    return this.runTask(defaultBuild);
  }
}

export const taskRunnerEngine = TaskRunnerEngine.getInstance();
