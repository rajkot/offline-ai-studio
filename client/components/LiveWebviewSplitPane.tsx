'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  Maximize2,
  RefreshCw,
  ExternalLink,
  Search,
  Terminal,
  Trash2,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  Sliders
} from 'lucide-react';
import {
  livePreviewEngine,
  MirroredConsoleLog,
  InspectedElementInfo,
  DEVICE_PRESETS,
  DevicePreset
} from '@/lib/preview/livePreviewEngine';

interface LiveWebviewSplitPaneProps {
  files: Record<string, string>;
  activeFilePath?: string;
  onInspectElement?: (info: InspectedElementInfo) => void;
  onClose?: () => void;
  className?: string;
}

export default function LiveWebviewSplitPane({
  files,
  activeFilePath,
  onInspectElement,
  onClose,
  className = ''
}: LiveWebviewSplitPaneProps) {
  const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(DEVICE_PRESETS[0]);
  const [isInspectorActive, setIsInspectorActive] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<MirroredConsoleLog[]>([]);
  const [isConsoleDrawerOpen, setIsConsoleDrawerOpen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Generate preview document
  const previewHtml = React.useMemo(() => {
    return livePreviewEngine.generatePreviewDoc(files, activeFilePath);
  }, [files, activeFilePath]);

  // Listen for console mirroring and DOM element inspection
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      if (event.data.type === 'preview-console-log') {
        const log: MirroredConsoleLog = {
          id: 'log-' + Math.random().toString(36).substring(2, 9),
          level: event.data.level || 'log',
          args: event.data.args || [],
          timestamp: event.data.timestamp || Date.now()
        };
        setConsoleLogs((prev) => [...prev.slice(-100), log]);
      } else if (event.data.type === 'preview-element-inspected') {
        if (onInspectElement) {
          onInspectElement({
            tagName: event.data.tagName,
            id: event.data.id,
            className: event.data.className,
            textContent: event.data.textContent,
            sourceLine: event.data.sourceLine
          });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onInspectElement]);

  // Toggle inspector mode inside iframe
  const toggleInspector = () => {
    const nextState = !isInspectorActive;
    setIsInspectorActive(nextState);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'set-inspector-mode', enabled: nextState },
        '*'
      );
    }
  };

  const handleReload = () => {
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenNewTab = () => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  return (
    <div className={`flex flex-col h-full bg-[#090d16] border-l border-slate-800 overflow-hidden ${className}`}>
      {/* Device Emulation & Controls Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0e1424] border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          {/* Device Presets */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setSelectedDevice(DEVICE_PRESETS[0])}
              className={`p-1 rounded transition-colors ${
                selectedDevice.id === 'responsive' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Responsive (100% Fluid)"
            >
              <Maximize2 size={13} />
            </button>
            <button
              onClick={() => setSelectedDevice(DEVICE_PRESETS[1])}
              className={`p-1 rounded transition-colors ${
                selectedDevice.id === 'iphone-15' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="iPhone 15 Pro (393 x 852)"
            >
              <Smartphone size={13} />
            </button>
            <button
              onClick={() => setSelectedDevice(DEVICE_PRESETS[2])}
              className={`p-1 rounded transition-colors ${
                selectedDevice.id === 'ipad-air' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="iPad Air (820 x 1180)"
            >
              <Tablet size={13} />
            </button>
            <button
              onClick={() => setSelectedDevice(DEVICE_PRESETS[3])}
              className={`p-1 rounded transition-colors ${
                selectedDevice.id === 'desktop-1080p' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop 1080p"
            >
              <Monitor size={13} />
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
            {selectedDevice.name} ({typeof selectedDevice.width === 'number' ? `${selectedDevice.width}x${selectedDevice.height}` : 'Fluid'})
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* DOM Inspector Mode Button */}
          <button
            onClick={toggleInspector}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              isInspectorActive
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            title="Inspect DOM Elements (Click in preview to jump to source code)"
          >
            <Search size={12} />
            <span>Inspect</span>
          </button>

          <button
            onClick={handleReload}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Hot Reload Preview"
          >
            <RefreshCw size={13} />
          </button>

          <button
            onClick={handleOpenNewTab}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Open in External Browser Window"
          >
            <ExternalLink size={13} />
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Close Live Preview"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Frame Container & Viewport */}
      <div className="flex-1 overflow-auto bg-[#030712] flex items-center justify-center p-3 relative">
        <div
          className={`h-full transition-all duration-200 flex flex-col rounded-lg overflow-hidden shadow-2xl ${
            selectedDevice.id !== 'responsive'
              ? 'border-4 border-slate-700 bg-black my-auto shrink-0'
              : 'w-full'
          }`}
          style={{
            width: selectedDevice.width,
            height: selectedDevice.height,
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        >
          <iframe
            key={iframeKey}
            ref={iframeRef}
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-modals allow-same-origin allow-forms"
            className="w-full h-full border-none bg-white"
            title="Live Webview Preview"
            onLoad={() => {
              if (isInspectorActive && iframeRef.current?.contentWindow) {
                iframeRef.current.contentWindow.postMessage(
                  { type: 'set-inspector-mode', enabled: true },
                  '*'
                );
              }
            }}
          />
        </div>
      </div>

      {/* Mirrored Console Drawer */}
      <div className="bg-[#0b0f19] border-t border-slate-800 flex flex-col">
        <div
          onClick={() => setIsConsoleDrawerOpen((prev) => !prev)}
          className="px-3 py-1.5 flex items-center justify-between text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <Terminal size={12} className="text-cyan-400" />
            <span>Mirrored Console</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-cyan-300">
              {consoleLogs.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {consoleLogs.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConsoleLogs([]);
                }}
                className="hover:text-rose-400 p-0.5"
                title="Clear Logs"
              >
                <Trash2 size={11} />
              </button>
            )}
            {isConsoleDrawerOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </div>
        </div>

        {isConsoleDrawerOpen && (
          <div className="h-36 overflow-y-auto p-2 bg-[#050811] space-y-1 font-mono text-[11px] border-t border-slate-800/80 custom-scrollbar">
            {consoleLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-xs">
                No console messages mirrored from preview yet
              </div>
            ) : (
              consoleLogs.map((log) => {
                let badgeClass = 'bg-slate-800 text-slate-300';
                if (log.level === 'warn') badgeClass = 'bg-amber-950 text-amber-300 border border-amber-700/60';
                if (log.level === 'error') badgeClass = 'bg-rose-950 text-rose-300 border border-rose-700/60';
                if (log.level === 'info') badgeClass = 'bg-sky-950 text-sky-300 border border-sky-700/60';

                return (
                  <div key={log.id} className="flex items-start gap-2 py-0.5 leading-tight">
                    <span className={`px-1 rounded text-[9px] font-bold uppercase shrink-0 ${badgeClass}`}>
                      {log.level}
                    </span>
                    <span className="text-slate-300 flex-1 whitespace-pre-wrap break-all">
                      {log.args.join(' ')}
                    </span>
                    <span className="text-[10px] text-slate-600 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
