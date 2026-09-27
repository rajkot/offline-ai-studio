'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  Camera,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Terminal,
  Maximize2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  Zap,
  Activity,
  Code2,
  Layers
} from 'lucide-react';
import { BrowserAuditResult, BrowserConsoleMessage } from '@/lib/ai/browserAgentEngine';

interface BrowserInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUrl?: string;
  onTriggerSelfHealing?: (errorSummary: string) => void;
}

export default function BrowserInspectorModal({
  isOpen,
  onClose,
  defaultUrl = 'http://127.0.0.1:3000',
  onTriggerSelfHealing
}: BrowserInspectorModalProps) {
  const [url, setUrl] = useState(defaultUrl);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isLoading, setIsLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<BrowserAuditResult | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'console' | 'dom'>('preview');
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (isOpen && !auditResult) {
      handleRunAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getViewportDimensions = () => {
    switch (viewport) {
      case 'mobile':
        return { width: 375, height: 667 };
      case 'tablet':
        return { width: 768, height: 1024 };
      case 'desktop':
      default:
        return { width: 1280, height: 800 };
    }
  };

  const handleRunAudit = async () => {
    setIsLoading(true);
    const dims = getViewportDimensions();

    try {
      const res = await fetch('/api/pipeline/browser-inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          viewportWidth: dims.width,
          viewportHeight: dims.height,
          timeoutMs: 12000,
          captureScreenshot: true
        })
      });

      const data = await res.json();
      if (data && data.ok) {
        setAuditResult(data.data);
      } else {
        setAuditResult({
          success: false,
          url,
          title: 'Audit Failed',
          consoleLogs: [],
          errorsCount: 1,
          warningsCount: 0,
          domSummary: '',
          latencyMs: 0,
          browserChannel: 'none',
          error: data.error || 'Navigation failed'
        });
      }
    } catch (err: any) {
      setAuditResult({
        success: false,
        url,
        title: 'Network Error',
        consoleLogs: [],
        errorsCount: 1,
        warningsCount: 0,
        domSummary: '',
        latencyMs: 0,
        browserChannel: 'none',
        error: err.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLogs = () => {
    if (!auditResult?.consoleLogs) return;
    const text = auditResult.consoleLogs.map((l) => `[${l.type.toUpperCase()}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendToHealing = () => {
    if (!auditResult) return;
    const errorLogs = auditResult.consoleLogs
      .filter((l) => l.type === 'error')
      .map((l) => l.text)
      .join('\n');

    const summary = `Browser Runtime Audit for ${auditResult.url}:\nErrors: ${auditResult.errorsCount}\nLogs:\n${errorLogs || auditResult.error || 'DOM render check needed.'}`;

    if (onTriggerSelfHealing) {
      onTriggerSelfHealing(summary);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[88vh] bg-[#0c0d12] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200 font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#12131a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white tracking-tight">
                  Local Headless Browser & Visual Self-Correction Agent
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Step 1 Autonomous Builder
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Live DOM auditing, viewport screenshot capture & DevTools console error detection
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* URL Input & Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-zinc-800/80 bg-[#0e0f16]">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <div className="relative flex-1">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:3000"
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg pl-9 pr-4 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              onClick={handleRunAudit}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors shadow-lg shadow-indigo-600/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Auditing...' : 'Run Audit'}</span>
            </button>
          </div>

          {/* Viewport Presets */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setViewport('desktop')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                viewport === 'desktop' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Desktop (1280x800)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setViewport('tablet')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                viewport === 'tablet' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Tablet (768x1024)"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Tablet</span>
            </button>
            <button
              onClick={() => setViewport('mobile')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                viewport === 'mobile' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Mobile (375x667)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-zinc-800 bg-[#0c0d12]">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('preview')}
              className={`pb-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Visual Snapshot</span>
            </button>
            <button
              onClick={() => setActiveTab('console')}
              className={`pb-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'console'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>DevTools Console</span>
              {auditResult?.errorsCount ? (
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500/20 text-rose-400 font-mono">
                  {auditResult.errorsCount}
                </span>
              ) : null}
            </button>
            <button
              onClick={() => setActiveTab('dom')}
              className={`pb-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'dom'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>DOM Hierarchy</span>
            </button>
          </div>

          {auditResult ? (
            <div className="flex items-center gap-3 pb-2 text-[11px] font-mono text-zinc-400">
              <span>Channel: <strong className="text-zinc-200">{auditResult.browserChannel}</strong></span>
              <span>Latency: <strong className="text-zinc-200">{auditResult.latencyMs}ms</strong></span>
            </div>
          ) : null}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0b0e]">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-medium">Launching local headless browser & auditing viewport...</p>
              <p className="text-xs text-zinc-500">Capturing DOM hierarchy and DevTools console stream</p>
            </div>
          ) : !auditResult ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-500 text-sm">
              <Globe className="w-8 h-8 opacity-40" />
              <span>Click "Run Audit" to inspect the target web application.</span>
            </div>
          ) : activeTab === 'preview' ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              {auditResult.screenshotBase64 ? (
                <div className="relative group max-w-4xl max-h-[58vh] overflow-hidden rounded-xl border border-zinc-800 shadow-2xl bg-zinc-950">
                  <img
                    src={`data:image/png;base64,${auditResult.screenshotBase64}`}
                    alt="Page Preview"
                    className="w-full h-auto object-contain cursor-zoom-in"
                    onClick={() => setIsZoomed(!isZoomed)}
                  />
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur p-1.5 rounded-lg border border-white/10 text-white flex items-center gap-2 text-xs">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Click to zoom</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500">
                  <XCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                  <p className="text-sm">No screenshot available for this URL.</p>
                  <p className="text-xs text-zinc-600 mt-1">{auditResult.error || 'Navigation error encountered.'}</p>
                </div>
              )}

              {/* Status Pill */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
                {auditResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                <span>Title: <strong className="text-zinc-200">{auditResult.title || 'Untitled'}</strong></span>
                <span className="text-zinc-600">•</span>
                <span className={auditResult.errorsCount > 0 ? 'text-rose-400 font-semibold' : 'text-zinc-400'}>
                  {auditResult.errorsCount} Errors
                </span>
                <span className="text-zinc-600">•</span>
                <span>{auditResult.warningsCount} Warnings</span>
              </div>
            </div>
          ) : activeTab === 'console' ? (
            <div className="flex flex-col h-full gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-400">
                  Total Captured Events: {auditResult.consoleLogs.length}
                </span>
                <button
                  onClick={handleCopyLogs}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 bg-zinc-900 border border-zinc-800 rounded"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Logs'}</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-black/50 border border-zinc-800 rounded-xl p-3 font-mono text-xs space-y-1.5">
                {auditResult.consoleLogs.length === 0 ? (
                  <div className="text-zinc-500 py-6 text-center">No console warnings or errors detected! 🎉</div>
                ) : (
                  auditResult.consoleLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded border flex items-start gap-2 ${
                        log.type === 'error'
                          ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                          : log.type === 'warn'
                          ? 'bg-amber-950/20 border-amber-800/40 text-amber-300'
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span className="text-[10px] font-bold px-1 rounded uppercase bg-black/40">
                        {log.type}
                      </span>
                      <div className="flex-1 overflow-x-auto whitespace-pre-wrap">
                        {log.text}
                        {log.location ? (
                          <div className="text-[10px] text-zinc-500 mt-1">{log.location}</div>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-2">
              <span className="text-xs font-mono text-zinc-400">Extracted Live DOM Elements & Hierarchy:</span>
              <pre className="flex-1 overflow-y-auto bg-black/60 border border-zinc-800 rounded-xl p-4 font-mono text-xs text-emerald-400 whitespace-pre-wrap">
                {auditResult.domSummary || '// No DOM elements extracted'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-[#12131a]">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Activity className="w-4 h-4 text-indigo-400" />
            <span>Ready for autonomous visual verification loop</span>
          </div>

          <div className="flex items-center gap-3">
            {auditResult?.errorsCount ? (
              <button
                onClick={handleSendToHealing}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Auto-Heal UI Errors with AI ({auditResult.errorsCount})</span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
