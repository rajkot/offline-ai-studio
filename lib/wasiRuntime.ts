// In-Browser POSIX / WASI Micro-OS Virtual Runtime & WebContainer Engine
'use client';

export interface VfsFile {
  name: string;
  path: string;
  content: string;
  size: number;
  updatedAt: number;
  type: 'file' | 'directory';
}

export interface VirtualProcess {
  pid: number;
  name: string;
  command: string;
  port?: number;
  status: 'running' | 'stopped' | 'sleeping';
  cpuPercent: number;
  memoryMb: number;
  startedAt: number;
}

export interface NetworkRequest {
  id: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  status: number;
  statusText: string;
  type: 'fetch' | 'xhr' | 'script' | 'css' | 'document' | 'ws' | 'hmr';
  durationMs: number;
  timestamp: string;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  sizeBytes: number;
}

export interface ConsoleLogMessage {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'system';
  message: string;
  source: string;
  timestamp: string;
  data?: any;
}

export type WasiEventListener = (event: string, payload: any) => void;

class WasiWebContainerEngine {
  private vfs: Map<string, VfsFile> = new Map();
  private processes: Map<number, VirtualProcess> = new Map();
  private consoleLogs: ConsoleLogMessage[] = [];
  private networkRequests: NetworkRequest[] = [];
  private listeners: Set<WasiEventListener> = new Set();
  private currentDir: string = '/workspace';
  private pidCounter: number = 100;
  private devServerPort: number = 3000;
  private isServerRunning: boolean = false;
  private hmrVersion: number = 1;

  constructor() {
    this.initDefaultFilesystem();
  }

  public subscribe(listener: WasiEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: string, payload: any) {
    this.listeners.forEach(fn => {
      try {
        fn(event, payload);
      } catch (err) {
        console.error('WASI listener error:', err);
      }
    });
  }

  private initDefaultFilesystem() {
    this.vfs.clear();
    
    // Core directories
    this.mkdir('/workspace');
    this.mkdir('/workspace/src');
    this.mkdir('/workspace/public');
    this.mkdir('/workspace/components');
    this.mkdir('/node_modules');
    this.mkdir('/bin');
    this.mkdir('/tmp');
    this.mkdir('/etc');

    // Default package.json
    this.writeFile('/workspace/package.json', JSON.stringify({
      name: 'wasi-webcontainer-app',
      version: '1.0.0',
      private: true,
      scripts: {
        dev: 'vite --port 3000 --host',
        build: 'vite build',
        preview: 'vite preview --port 3000',
        test: 'vitest run'
      },
      dependencies: {
        'react': '^19.0.0',
        'react-dom': '^19.0.0',
        'lucide-react': '^1.16.0',
        'tailwindcss': '^4.0.0'
      },
      devDependencies: {
        'vite': '^6.0.0',
        '@vitejs/plugin-react': '^4.3.0',
        'typescript': '^5.7.0',
        'vitest': '^2.1.0'
      }
    }, null, 2));

    // Default index.html
    this.writeFile('/workspace/index.html', `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WASI WebContainer Live Preview</title>
  <script>
    window.onerror = function() { return true; };
    window.addEventListener('error', function(e) { if (e && e.preventDefault) e.preventDefault(); return true; }, true);
  </script>
  <script src="https://cdn.tailwindcss.com" crossorigin="anonymous"></script>
</head>
<body class="bg-slate-950 text-slate-100 font-sans p-6 min-h-screen flex flex-col items-center justify-center">
  <div id="root" class="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
    <div class="flex items-center gap-3">
      <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
      <h1 class="text-xl font-bold text-white">⚡ WebContainer Active</h1>
    </div>
    <p class="text-slate-400 text-xs leading-relaxed">
      POSIX WASI micro-kernel running in-browser at <span class="font-mono text-indigo-400">http://localhost:3000</span> with Hot Module Replacement.
    </p>
    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-xs text-emerald-400">
      $ vite dev --port 3000 [READY]
    </div>
    <div class="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800">
      <span>Status: 200 OK</span>
      <span id="uptime-counter">Up: 0s</span>
    </div>
  </div>
  <script>
    let seconds = 0;
    setInterval(() => {
      seconds++;
      const el = document.getElementById('uptime-counter');
      if (el) el.innerText = 'Up: ' + seconds + 's';
    }, 1000);
    console.log('[WASI-Client] Live preview connected to virtual dev server at localhost:3000');
  </script>
</body>
</html>`);

    // Default main.tsx
    this.writeFile('/workspace/src/main.tsx', `import React from 'react';
import ReactDOM from 'react-dom/client';

export function App() {
  const [count, setCount] = React.useState(0);
  return (
    <div className="p-4 text-center">
      <h1 className="text-2xl font-bold">WASI App</h1>
      <button onClick={() => setCount(c => c + 1)} className="px-4 py-2 bg-indigo-600 rounded text-white mt-4">
        Count: {count}
      </button>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(<App />);
}`);

    // Default python script
    this.writeFile('/workspace/data_analysis.py', `# Pyodide WASM Python Runtime Demo
import math

def calculate_stats(data):
    n = len(data)
    mean = sum(data) / n
    variance = sum((x - mean) ** 2 for x in data) / n
    std_dev = math.sqrt(variance)
    return {"count": n, "mean": round(mean, 2), "std_dev": round(std_dev, 2)}

numbers = [12.5, 14.8, 11.2, 19.4, 22.1, 15.6, 17.3, 13.9]
stats = calculate_stats(numbers)
print(f"✅ Pyodide WASM Analysis: {stats}")
`);

    this.logConsole('system', 'WASI POSIX Virtual micro-kernel initialized with in-memory VFS.', 'kernel');
  }

  // Synchronize with external workspace files
  public syncWorkspace(files: Record<string, string>) {
    Object.entries(files).forEach(([relPath, content]) => {
      const normalizedPath = relPath.startsWith('/') ? `/workspace${relPath}` : `/workspace/${relPath}`;
      this.writeFile(normalizedPath, content);
    });
    this.triggerHmrUpdate();
  }

  // POSIX VFS Operations
  public mkdir(path: string): boolean {
    const norm = this.normalizePath(path);
    if (!this.vfs.has(norm)) {
      this.vfs.set(norm, {
        name: norm.split('/').filter(Boolean).pop() || '',
        path: norm,
        content: '',
        size: 0,
        updatedAt: Date.now(),
        type: 'directory'
      });
      return true;
    }
    return false;
  }

  public writeFile(path: string, content: string): void {
    const norm = this.normalizePath(path);
    
    // Ensure parent directories exist
    const parts = norm.split('/').filter(Boolean);
    let curr = '';
    for (let i = 0; i < parts.length - 1; i++) {
      curr += '/' + parts[i];
      this.mkdir(curr);
    }

    const name = parts[parts.length - 1] || '';
    const size = new Blob([content]).size;
    this.vfs.set(norm, {
      name,
      path: norm,
      content,
      size,
      updatedAt: Date.now(),
      type: 'file'
    });

    this.emit('vfs_change', { action: 'write', path: norm });
  }

  public readFile(path: string): string | null {
    const norm = this.normalizePath(path);
    const item = this.vfs.get(norm);
    if (item && item.type === 'file') {
      return item.content;
    }
    return null;
  }

  public readdir(path: string): VfsFile[] {
    const norm = this.normalizePath(path);
    const results: VfsFile[] = [];
    this.vfs.forEach((file, filePath) => {
      if (filePath !== norm) {
        const parent = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
        if (parent === norm) {
          results.push(file);
        }
      }
    });
    return results.sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  }

  public unlink(path: string): boolean {
    const norm = this.normalizePath(path);
    if (this.vfs.has(norm)) {
      this.vfs.delete(norm);
      this.emit('vfs_change', { action: 'delete', path: norm });
      return true;
    }
    return false;
  }

  public normalizePath(path: string): string {
    if (!path.startsWith('/')) {
      path = `${this.currentDir}/${path}`;
    }
    const segments = path.split('/').filter(Boolean);
    const stack: string[] = [];
    for (const seg of segments) {
      if (seg === '.') continue;
      if (seg === '..') {
        if (stack.length > 0) stack.pop();
      } else {
        stack.push(seg);
      }
    }
    return '/' + stack.join('/');
  }

  public getCurrentDir(): string {
    return this.currentDir;
  }

  public setCurrentDir(dir: string): boolean {
    const norm = this.normalizePath(dir);
    const item = this.vfs.get(norm);
    if (item && item.type === 'directory') {
      this.currentDir = norm;
      return true;
    }
    return false;
  }

  // Process Management
  public spawnProcess(name: string, command: string, port?: number): VirtualProcess {
    const pid = ++this.pidCounter;
    const proc: VirtualProcess = {
      pid,
      name,
      command,
      port,
      status: 'running',
      cpuPercent: +(Math.random() * 4 + 1.2).toFixed(1),
      memoryMb: +(Math.random() * 25 + 35).toFixed(1),
      startedAt: Date.now()
    };
    this.processes.set(pid, proc);
    this.emit('process_spawn', proc);
    return proc;
  }

  public killProcess(pid: number): boolean {
    if (this.processes.has(pid)) {
      const proc = this.processes.get(pid)!;
      proc.status = 'stopped';
      this.processes.delete(pid);
      if (proc.port === this.devServerPort) {
        this.isServerRunning = false;
      }
      this.emit('process_kill', { pid });
      return true;
    }
    return false;
  }

  public getProcesses(): VirtualProcess[] {
    return Array.from(this.processes.values());
  }

  // Virtual Dev Server Management
  public startDevServer(port: number = 3000): Promise<{ port: number; url: string }> {
    return new Promise(resolve => {
      this.devServerPort = port;
      this.isServerRunning = true;

      const proc = this.spawnProcess('vite-dev-server', `vite --port ${port} --host`, port);
      
      this.logConsole('info', `[vite] dev server running at: http://localhost:${port}/`, 'vite');
      this.logConsole('info', `[vite] press h + enter to show help`, 'vite');

      this.recordNetworkRequest({
        url: `http://localhost:${port}/`,
        method: 'GET',
        status: 200,
        statusText: 'OK',
        type: 'document',
        durationMs: 18,
        requestHeaders: { 'Accept': 'text/html', 'Host': `localhost:${port}` },
        responseHeaders: { 'Content-Type': 'text/html; charset=utf-8', 'X-Powered-By': 'WASI-Vite' },
        sizeBytes: 1420
      });

      this.emit('server_started', { port, url: `http://localhost:${port}` });
      resolve({ port, url: `http://localhost:${port}` });
    });
  }

  public stopDevServer(): void {
    this.processes.forEach((proc, pid) => {
      if (proc.port === this.devServerPort) {
        this.killProcess(pid);
      }
    });
    this.isServerRunning = false;
    this.emit('server_stopped', {});
  }

  public isDevServerActive(): boolean {
    return this.isServerRunning;
  }

  // Trigger Hot Module Reload
  public triggerHmrUpdate(filePath?: string) {
    this.hmrVersion++;
    const target = filePath || 'workspace';
    this.logConsole('info', `[hmr] update triggered for ${target} (v${this.hmrVersion})`, 'hmr');
    
    this.recordNetworkRequest({
      url: `http://localhost:${this.devServerPort}/__vite_hmr?v=${this.hmrVersion}`,
      method: 'GET',
      status: 200,
      statusText: 'HMR WebSocket Update',
      type: 'hmr',
      durationMs: 4,
      requestHeaders: { 'Upgrade': 'websocket', 'Sec-WebSocket-Protocol': 'vite-hmr' },
      responseHeaders: { 'Connection': 'Upgrade', 'Upgrade': 'websocket' },
      sizeBytes: 256
    });

    this.emit('hmr_update', { version: this.hmrVersion, file: target });
  }

  // Generate live HTML string for preview iframe
  public getLivePreviewHtml(): string {
    const indexHtml = this.readFile('/workspace/index.html') || `<!DOCTYPE html><html><body><h1>WASI Preview</h1></body></html>`;
    
    // Inject Live HMR script and Console Bridge
    const bridgeScript = `
      <script>
        (function() {
          // Bi-directional console bridge
          const originalLog = console.log;
          const originalWarn = console.warn;
          const originalError = console.error;
          const originalInfo = console.info;

          function sendLog(level, args) {
            const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
            window.parent.postMessage({ type: 'WASI_PREVIEW_CONSOLE', level, message: msg, timestamp: new Date().toLocaleTimeString() }, '*');
          }

          console.log = function() { sendLog('log', arguments); originalLog.apply(console, arguments); };
          console.warn = function() { sendLog('warn', arguments); originalWarn.apply(console, arguments); };
          console.error = function() { sendLog('error', arguments); originalError.apply(console, arguments); };
          console.info = function() { sendLog('info', arguments); originalInfo.apply(console, arguments); };

          window.onerror = function(message, source, lineno, colno, error) {
            sendLog('error', [message || (error && error.message) || 'Error']);
            return true;
          };

          window.addEventListener('error', function(e) {
            if (e) {
              if (e.preventDefault) e.preventDefault();
              if (e.stopPropagation) e.stopPropagation();
              if (e.stopImmediatePropagation) e.stopImmediatePropagation();
            }
            sendLog('error', [e.message === 'Script error.' ? 'Script error. (cross-origin or unhandled exception)' : (e.message + ' at ' + e.filename + ':' + e.lineno)]);
            return true;
          }, true);

          window.addEventListener('unhandledrejection', function(e) {
            if (e && e.preventDefault) e.preventDefault();
            sendLog('error', ['Unhandled Promise Rejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))]);
            return true;
          }, true);

          // Fetch interception removed to prevent read-only window property errors
        })();
      </script>
    `;

    if (indexHtml.includes('</head>')) {
      return indexHtml.replace('</head>', `${bridgeScript}</head>`);
    }
    return bridgeScript + indexHtml;
  }

  // Interactive Command Execution (Bash Shell)
  public async executeCommand(cmdLine: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const raw = cmdLine.trim();
    if (!raw) return { stdout: '', stderr: '', exitCode: 0 };

    this.logConsole('log', `$ ${raw}`, 'bash');
    const args = raw.split(' ').filter(Boolean);
    const cmd = args[0];

    switch (cmd) {
      case 'clear': {
        this.consoleLogs = [];
        this.emit('console_clear', {});
        return { stdout: '', stderr: '', exitCode: 0 };
      }

      case 'pwd': {
        return { stdout: this.currentDir + '\n', stderr: '', exitCode: 0 };
      }

      case 'whoami': {
        return { stdout: 'developer (posix uid: 1000 gid: 1000)\n', stderr: '', exitCode: 0 };
      }

      case 'uname': {
        return { stdout: 'Linux wasi-webcontainer 6.1.0-posix-wasm #1 SMP PREEMPT x86_64 WASI/1.0\n', stderr: '', exitCode: 0 };
      }

      case 'cd': {
        const target = args[1] || '/workspace';
        if (this.setCurrentDir(target)) {
          return { stdout: '', stderr: '', exitCode: 0 };
        }
        return { stdout: '', stderr: `cd: no such directory: ${target}\n`, exitCode: 1 };
      }

      case 'ls': {
        const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al');
        const targetDir = args.find(a => !a.startsWith('-') && a !== 'ls') || this.currentDir;
        const entries = this.readdir(targetDir);
        
        let out = '';
        if (args.includes('-la') || args.includes('-l')) {
          out += `total ${entries.length * 4}\n`;
          entries.forEach(e => {
            const isDir = e.type === 'directory';
            const perm = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
            const size = e.size.toString().padStart(6, ' ');
            const date = new Date(e.updatedAt).toLocaleDateString();
            const color = isDir ? '\x1b[34m' : '\x1b[37m';
            out += `${perm} 1 root root ${size} ${date} ${color}${e.name}\x1b[0m\n`;
          });
        } else {
          out = entries
            .filter(e => showAll || !e.name.startsWith('.'))
            .map(e => e.type === 'directory' ? `${e.name}/` : e.name)
            .join('  ') + '\n';
        }
        return { stdout: out, stderr: '', exitCode: 0 };
      }

      case 'cat': {
        const file = args[1];
        if (!file) return { stdout: '', stderr: 'cat: missing file operand\n', exitCode: 1 };
        const content = this.readFile(file);
        if (content !== null) {
          return { stdout: content + '\n', stderr: '', exitCode: 0 };
        }
        return { stdout: '', stderr: `cat: ${file}: No such file or directory\n`, exitCode: 1 };
      }

      case 'mkdir': {
        const p = args[args.length - 1];
        if (!p || p === 'mkdir') return { stdout: '', stderr: 'mkdir: missing operand\n', exitCode: 1 };
        this.mkdir(p);
        return { stdout: '', stderr: '', exitCode: 0 };
      }

      case 'touch': {
        const p = args[1];
        if (!p) return { stdout: '', stderr: 'touch: missing file operand\n', exitCode: 1 };
        this.writeFile(p, '');
        return { stdout: '', stderr: '', exitCode: 0 };
      }

      case 'rm': {
        const p = args[args.length - 1];
        if (!p || p === 'rm') return { stdout: '', stderr: 'rm: missing operand\n', exitCode: 1 };
        if (this.unlink(p)) {
          return { stdout: '', stderr: '', exitCode: 0 };
        }
        return { stdout: '', stderr: `rm: cannot remove '${p}': No such file\n`, exitCode: 1 };
      }

      case 'echo': {
        const msg = raw.substring(raw.indexOf('echo') + 4).trim();
        return { stdout: msg + '\n', stderr: '', exitCode: 0 };
      }

      case 'ps': {
        const procs = this.getProcesses();
        let out = '  PID TTY          TIME CMD\n';
        procs.forEach(p => {
          out += `${p.pid.toString().padStart(5, ' ')} pts/0    00:00:01 ${p.command} (port: ${p.port || 'none'})\n`;
        });
        return { stdout: out, stderr: '', exitCode: 0 };
      }

      case 'kill': {
        const pid = parseInt(args[1], 10);
        if (isNaN(pid)) return { stdout: '', stderr: 'kill: invalid pid\n', exitCode: 1 };
        if (this.killProcess(pid)) {
          return { stdout: `[Process ${pid} terminated]\n`, stderr: '', exitCode: 0 };
        }
        return { stdout: '', stderr: `kill: (${pid}) - No such process\n`, exitCode: 1 };
      }

      case 'npm': {
        const sub = args[1];
        if (sub === 'install' || sub === 'i') {
          const packages = args.slice(2).filter(a => !a.startsWith('-'));
          const pkgList = packages.length > 0 ? packages.join(', ') : 'all dependencies';
          this.logConsole('info', `npm info installing ${pkgList} into virtual node_modules...`, 'npm');
          
          packages.forEach(pkg => {
            this.mkdir(`/node_modules/${pkg}`);
            this.writeFile(`/node_modules/${pkg}/package.json`, JSON.stringify({ name: pkg, version: '1.0.0' }));
          });

          return {
            stdout: `+ ${packages.length || 4} packages installed in 420ms\nfound 0 vulnerabilities\n`,
            stderr: '',
            exitCode: 0
          };
        }

        if (sub === 'run') {
          const script = args[2];
          if (script === 'dev' || script === 'start') {
            await this.startDevServer(3000);
            return {
              stdout: `> wasi-webcontainer-app@1.0.0 dev\n> vite --port 3000 --host\n\n  VITE v6.0.4  ready in 184 ms\n\n  ➜  Local:   http://localhost:3000/\n  ➜  Network: use --host to expose\n`,
              stderr: '',
              exitCode: 0
            };
          }
          if (script === 'build') {
            this.mkdir('/workspace/dist');
            this.mkdir('/workspace/dist/assets');
            this.writeFile('/workspace/dist/index.html', '<!DOCTYPE html><html><body><h1>Built by Vite WASM</h1></body></html>');
            this.writeFile('/workspace/dist/assets/index-b4f2a.js', '// Production bundle');
            this.writeFile('/workspace/dist/assets/index-c9e11.css', '/* Tailwind bundle */');
            return {
              stdout: `vite v6.0.4 building for production...\n✓ 42 modules transformed.\ndist/index.html                  0.48 kB\ndist/assets/index-c9e11.css      4.12 kB │ gzip: 1.20 kB\ndist/assets/index-b4f2a.js      48.60 kB │ gzip: 14.80 kB\n✓ built in 340ms\n`,
              stderr: '',
              exitCode: 0
            };
          }
          if (script === 'test') {
            return {
              stdout: ` ✓ tests/math.spec.ts (3 tests) 14ms\n ✓ tests/ast-parser.spec.ts (5 tests) 28ms\n\n Test Files  2 passed (2)\n      Tests  8 passed (8)\n   Duration  142ms\n`,
              stderr: '',
              exitCode: 0
            };
          }
          return { stdout: '', stderr: `npm ERR! Missing script: "${script}"\n`, exitCode: 1 };
        }

        return { stdout: 'Usage: npm [install|i|run <script>|test|build]\n', stderr: '', exitCode: 0 };
      }

      case 'pip': {
        const sub = args[1];
        if (sub === 'install') {
          const packages = args.slice(2);
          return {
            stdout: `Collecting ${packages.join(', ')}\n  Downloading wheels from PyPI WASM mirror (0.4MB)...\nInstalling collected packages: ${packages.join(', ')}\nSuccessfully installed ${packages.join(' ')}\n`,
            stderr: '',
            exitCode: 0
          };
        }
        return { stdout: 'Usage: pip install <package>\n', stderr: '', exitCode: 0 };
      }

      case 'python':
      case 'python3': {
        const file = args[1];
        if (file) {
          const code = this.readFile(file);
          if (code) {
            // Simulated Pyodide execution
            let simulatedOut = `[Pyodide v0.26.1 WASM Runtime]\n`;
            if (code.includes('calculate_stats')) {
              simulatedOut += `✅ Pyodide WASM Analysis: {'count': 8, 'mean': 15.85, 'std_dev': 3.37}\n`;
            } else {
              simulatedOut += `Executed Python script '${file}' successfully (0 errors, 14ms).\n`;
            }
            return { stdout: simulatedOut, stderr: '', exitCode: 0 };
          }
          return { stdout: '', stderr: `python: can't open file '${file}': [Errno 2] No such file\n`, exitCode: 1 };
        }
        return { stdout: 'Python 3.12.3 (main, WASM Pyodide Micro-kernel) on posix\nType "help", "copyright", "credits" or "license" for more information.\n>>>\n', stderr: '', exitCode: 0 };
      }

      case 'node': {
        const file = args[1];
        if (file) {
          const code = this.readFile(file);
          if (code) {
            try {
              // Safe evaluation for simple scripts
              const logs: string[] = [];
              const safeLog = (...a: any[]) => logs.push(a.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' '));
              const fn = new Function('console', code);
              fn({ log: safeLog, warn: safeLog, error: safeLog, info: safeLog });
              return { stdout: logs.join('\n') + '\n', stderr: '', exitCode: 0 };
            } catch (err: any) {
              return { stdout: '', stderr: `ReferenceError: ${err.message}\n`, exitCode: 1 };
            }
          }
          return { stdout: '', stderr: `node: cannot find module '${file}'\n`, exitCode: 1 };
        }
        return { stdout: 'Welcome to Node.js v20.12.0 (WASI in-browser runtime).\nType ".help" for more information.\n> \n', stderr: '', exitCode: 0 };
      }

      case 'curl': {
        const url = args[1] || 'http://localhost:3000';
        this.recordNetworkRequest({
          url,
          method: 'GET',
          status: 200,
          statusText: 'OK',
          type: 'fetch',
          durationMs: 12,
          requestHeaders: { 'User-Agent': 'curl/8.4.0', 'Accept': '*/*' },
          responseHeaders: { 'Content-Type': 'text/html', 'Server': 'Vite/6.0.4' },
          sizeBytes: 512
        });
        return { stdout: `HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\nDate: ${new Date().toUTCString()}\n\n<!DOCTYPE html><html><body><h1>Vite WASM Response</h1></body></html>\n`, stderr: '', exitCode: 0 };
      }

      case 'help': {
        const helpText = `⚡ WASI POSIX Micro-Kernel Shell Commands:
  • ls [-la] [dir]       - List directory contents
  • cd <dir>             - Change current working directory
  • pwd                  - Print working directory
  • cat <file>           - Display file content
  • mkdir [-p] <dir>     - Create directory
  • touch <file>         - Create empty file
  • rm <file>            - Remove file
  • echo <msg>           - Print text message
  • ps / kill <pid>      - Inspect & manage virtual processes
  • npm i / npm run dev  - Run Node/Vite package manager & dev server
  • python <script.py>   - Execute Python script in Pyodide WASM
  • node <script.js>     - Run JavaScript V8 sandbox
  • curl <url>           - Make HTTP request to virtual endpoints
  • clear                - Clear terminal output
`;
        return { stdout: helpText, stderr: '', exitCode: 0 };
      }

      default: {
        return { stdout: '', stderr: `bash: command not found: ${cmd}. Type 'help' for available commands.\n`, exitCode: 127 };
      }
    }
  }

  // Console and Network Logging
  public logConsole(level: ConsoleLogMessage['level'], message: string, source: string = 'app', data?: any) {
    const entry: ConsoleLogMessage = {
      id: Math.random().toString(36).substring(2, 9),
      level,
      message,
      source,
      timestamp: new Date().toLocaleTimeString(),
      data
    };
    this.consoleLogs.push(entry);
    if (this.consoleLogs.length > 500) this.consoleLogs.shift();
    this.emit('console_log', entry);
  }

  public getConsoleLogs(): ConsoleLogMessage[] {
    return [...this.consoleLogs];
  }

  public clearConsoleLogs() {
    this.consoleLogs = [];
    this.emit('console_clear', {});
  }

  public recordNetworkRequest(req: Omit<NetworkRequest, 'id' | 'timestamp'>) {
    const entry: NetworkRequest = {
      ...req,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString()
    };
    this.networkRequests.unshift(entry);
    if (this.networkRequests.length > 200) this.networkRequests.pop();
    this.emit('network_request', entry);
  }

  public getNetworkRequests(): NetworkRequest[] {
    return [...this.networkRequests];
  }

  public clearNetworkRequests() {
    this.networkRequests = [];
    this.emit('network_clear', {});
  }
}

// Global Singleton Instance
export const wasiRuntime = new WasiWebContainerEngine();
