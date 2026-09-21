/**
 * Live Split-Screen Webview Preview Engine
 * Bundles HTML/CSS/JS workspace files into interactive live preview document
 * with real-time console mirroring and bidirectional DOM click-to-code inspection.
 */

export interface MirroredConsoleLog {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  args: string[];
  timestamp: number;
}

export interface InspectedElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  sourceLine?: number | null;
}

export interface DevicePreset {
  id: string;
  name: string;
  width: number | string;
  height: number | string;
  scale?: number;
  icon: string;
}

export const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'responsive', name: 'Responsive', width: '100%', height: '100%', icon: 'Maximize2' },
  { id: 'iphone-15', name: 'iPhone 15 Pro', width: 393, height: 852, icon: 'Smartphone' },
  { id: 'ipad-air', name: 'iPad Air', width: 820, height: 1180, scale: 0.75, icon: 'Tablet' },
  { id: 'desktop-1080p', name: 'Desktop 1080p', width: 1280, height: 720, scale: 0.75, icon: 'Monitor' }
];

export class LivePreviewEngine {
  /**
   * Generates a complete standalone HTML document with console mirroring
   * and bidirectional DOM inspector scripts injected.
   */
  public generatePreviewDoc(files: Record<string, string>, activeFilePath?: string): string {
    // 1. Locate primary HTML file or synthesize
    let htmlContent = '';
    const htmlKey = Object.keys(files).find(
      (k) => k.endsWith('index.html') || k.endsWith('.html')
    );

    if (htmlKey && files[htmlKey]) {
      htmlContent = files[htmlKey];
    } else {
      // Synthesize HTML from active file or JSX/TSX
      const fileNames = Object.keys(files).join(', ');
      htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline AI Studio - Live Preview</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      margin: 0;
      padding: 24px;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 32px;
      max-width: 540px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    h1 { color: #38bdf8; margin-top: 0; font-size: 24px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
    .btn {
      display: inline-block;
      margin-top: 16px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #0ea5e9, #6366f1);
      color: white;
      text-decoration: none;
      border-radius: 10px;
      font-weight: bold;
      font-size: 13px;
      cursor: pointer;
      border: none;
    }
    .files-list {
      margin-top: 16px;
      font-family: monospace;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="card" data-source-line="1">
    <h1 data-source-line="2">⚡ Offline AI Studio Web Preview</h1>
    <p data-source-line="3">Live hot reload active. Click any element with Inspector Mode enabled to jump to code!</p>
    <button class="btn" onclick="console.log('Button clicked at', new Date().toLocaleTimeString())" data-source-line="4">
      Click to Test Console Mirroring
    </button>
    <div class="files-list">Files in buffer: ${fileNames}</div>
  </div>
</body>
</html>`;
    }

    // 2. Locate and inline CSS files
    let inlinedStyles = '';
    Object.entries(files).forEach(([name, content]) => {
      if (name.endsWith('.css')) {
        inlinedStyles += `\n/* Inlined: ${name} */\n<style>\n${content}\n</style>\n`;
      }
    });

    // 3. Locate and inline JS files
    let inlinedScripts = '';
    Object.entries(files).forEach(([name, content]) => {
      if ((name.endsWith('.js') && !name.includes('config')) || name.endsWith('main.js') || name.endsWith('index.js')) {
        inlinedScripts += `\n<!-- Inlined Script: ${name} -->\n<script>\n${content}\n</script>\n`;
      }
    });

    // 4. Inject Console Mirroring & Bidirectional Inspector
    const injectionScript = `
<script id="__offline_ai_runtime_bridge__">
(function() {
  // Console Mirroring Bridge
  const levels = ['log', 'info', 'warn', 'error', 'debug'];
  levels.forEach(level => {
    const orig = console[level];
    console[level] = function(...args) {
      try {
        window.parent.postMessage({
          type: 'preview-console-log',
          level: level,
          args: args.map(a => {
            if (typeof a === 'object') {
              try { return JSON.stringify(a); } catch(e) { return String(a); }
            }
            return String(a);
          }),
          timestamp: Date.now()
        }, '*');
      } catch(e) {}
      orig.apply(console, args);
    };
  });

  window.addEventListener('error', function(e) {
    window.parent.postMessage({
      type: 'preview-console-log',
      level: 'error',
      args: [e.message + ' (' + (e.filename || 'script') + ':' + (e.lineno || 0) + ')'],
      timestamp: Date.now()
    }, '*');
  });

  // Bidirectional DOM Element Inspector
  let highlightBox = null;
  window.__inspectorActive = false;

  window.addEventListener('message', function(ev) {
    if (ev.data && ev.data.type === 'set-inspector-mode') {
      window.__inspectorActive = !!ev.data.enabled;
      if (!window.__inspectorActive && highlightBox) {
        highlightBox.style.display = 'none';
      }
    }
  });

  document.addEventListener('mouseover', function(e) {
    if (!window.__inspectorActive) return;
    const el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;

    if (!highlightBox) {
      highlightBox = document.createElement('div');
      highlightBox.style.position = 'fixed';
      highlightBox.style.pointerEvents = 'none';
      highlightBox.style.border = '2px solid #38bdf8';
      highlightBox.style.backgroundColor = 'rgba(56, 189, 248, 0.2)';
      highlightBox.style.zIndex = '999999';
      highlightBox.style.transition = 'all 0.05s ease';
      document.body.appendChild(highlightBox);
    }

    const rect = el.getBoundingClientRect();
    highlightBox.style.top = rect.top + 'px';
    highlightBox.style.left = rect.left + 'px';
    highlightBox.style.width = rect.width + 'px';
    highlightBox.style.height = rect.height + 'px';
    highlightBox.style.display = 'block';
  });

  document.addEventListener('click', function(e) {
    if (!window.__inspectorActive) return;
    e.preventDefault();
    e.stopPropagation();

    const el = e.target;
    const lineAttr = el.getAttribute('data-source-line');

    window.parent.postMessage({
      type: 'preview-element-inspected',
      tagName: el.tagName ? el.tagName.toLowerCase() : 'div',
      id: el.id || '',
      className: typeof el.className === 'string' ? el.className : '',
      textContent: (el.textContent || '').trim().slice(0, 50),
      sourceLine: lineAttr ? parseInt(lineAttr, 10) : null
    }, '*');
  }, true);
})();
</script>
`;

    // Inject into head or top of html
    if (htmlContent.includes('</head>')) {
      return htmlContent.replace('</head>', `${inlinedStyles}${injectionScript}</head>`) + inlinedScripts;
    }
    return `${injectionScript}${inlinedStyles}${htmlContent}${inlinedScripts}`;
  }
}

export const livePreviewEngine = new LivePreviewEngine();
