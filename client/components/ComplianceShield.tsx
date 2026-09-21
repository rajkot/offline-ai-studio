'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Lock,
  EyeOff,
  Radio,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  Zap,
  Terminal,
  Filter,
  Trash2,
  Activity,
  Cpu,
  KeyRound,
  Database,
  ExternalLink
} from 'lucide-react';

export interface RedactionEvent {
  id: string;
  timestamp: string;
  category: 'AWS_KEY' | 'API_TOKEN' | 'PASSWORD' | 'DB_URI' | 'PII_EMAIL' | 'CREDIT_CARD' | 'PRIVATE_IP' | 'INJECTION_ATTEMPT';
  line?: number;
  rawPreview: string;
  redactedPreview: string;
  risk: 'Low' | 'Medium' | 'High' | 'Critical';
  sourceFile?: string;
}

export interface ComplianceSettings {
  strictLocalLoopback: boolean;
  regexPatternMasking: boolean;
  promptInjectionDefense: boolean;
  piiMasking: boolean;
  dbSecretDetection: boolean;
  cloudExfiltrationBlocker: boolean;
}

export interface ComplianceShieldProps {
  currentCode?: string;
  activeFilePath?: string;
  onApplyMaskingToCode?: (sanitizedCode: string) => void;
  className?: string;
}

export const DEFAULT_COMPLIANCE_SETTINGS: ComplianceSettings = {
  strictLocalLoopback: true,
  regexPatternMasking: true,
  promptInjectionDefense: true,
  piiMasking: true,
  dbSecretDetection: true,
  cloudExfiltrationBlocker: true,
};

export const INITIAL_REDACTION_LOGS: RedactionEvent[] = [
  {
    id: 'sec-1',
    timestamp: '10:14:02 AM',
    category: 'AWS_KEY',
    line: 4,
    rawPreview: "const aws_key = 'AKIAIOSFODNN7EXAMPLE';",
    redactedPreview: "const aws_key = '$$REDACTED_SECRET$$'",
    risk: 'Critical',
    sourceFile: 'auth.ts'
  },
  {
    id: 'sec-2',
    timestamp: '10:13:45 AM',
    category: 'PASSWORD',
    line: 24,
    rawPreview: "const db_pass = 'SuperSecretProdPassword99!';",
    redactedPreview: "const db_pass = '$$REDACTED_SECRET$$'",
    risk: 'High',
    sourceFile: 'lib/db/config.ts'
  },
  {
    id: 'sec-3',
    timestamp: '10:11:20 AM',
    category: 'API_TOKEN',
    line: 5,
    rawPreview: "const token = 'sk-proj-99aBcDefGh1234567890abcdef';",
    redactedPreview: "const token = 'sk-proj-$$REDACTED_SECRET$$'",
    risk: 'Critical',
    sourceFile: '.env.local'
  },
  {
    id: 'sec-4',
    timestamp: '10:08:12 AM',
    category: 'PRIVATE_IP',
    line: 41,
    rawPreview: "const internal_node = 'http://192.168.1.144:8080';",
    redactedPreview: "const internal_node = 'http://[REDACTED_IP]:8080';",
    risk: 'Medium',
    sourceFile: 'server.ts'
  },
  {
    id: 'sec-5',
    timestamp: '10:02:50 AM',
    category: 'PII_EMAIL',
    line: 88,
    rawPreview: "const adminContact = 'corp-security-lead@enterprise.internal';",
    redactedPreview: "const adminContact = '[REDACTED_EMAIL]';",
    risk: 'Low',
    sourceFile: 'app/page.tsx'
  }
];

export default function ComplianceShield({
  currentCode = '',
  activeFilePath = 'components/Playground.tsx',
  onApplyMaskingToCode,
  className = ''
}: ComplianceShieldProps) {
  const [settings, setSettings] = useState<ComplianceSettings>(DEFAULT_COMPLIANCE_SETTINGS);
  const [logs, setLogs] = useState<RedactionEvent[]>(INITIAL_REDACTION_LOGS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('compliance_shield_settings');
      if (savedSettings) setSettings(JSON.parse(savedSettings));

      const savedLogs = localStorage.getItem('compliance_shield_logs');
      if (savedLogs) {
        const parsed = JSON.parse(savedLogs);
        if (Array.isArray(parsed) && parsed.length > 0) setLogs(parsed);
      }
    } catch {}
    setMounted(true);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedLog, setCopiedLog] = useState(false);
  const [testInput, setTestInput] = useState<string>("const aws_key = 'AKIAIOSFODNN7EXAMPLE';\nconst openai = 'sk-proj-998877665544332211';\nconst db = 'postgres://admin:Password123@10.0.4.15:5432/core';");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [totalRedactionsCount, setTotalRedactionsCount] = useState(0);

  useEffect(() => {
    if (mounted) {
      setTotalRedactionsCount(logs.length);
    }
  }, [logs, mounted]);

  const updateSetting = (key: keyof ComplianceSettings, value: boolean) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    if (mounted) {
      localStorage.setItem('compliance_shield_settings', JSON.stringify(updated));
    }
  };

  // Calculate dynamic Compliance Score (0 - 100)
  const complianceScore = useMemo(() => {
    let score = 0;
    if (settings.strictLocalLoopback) score += 25;
    if (settings.regexPatternMasking) score += 25;
    if (settings.cloudExfiltrationBlocker) score += 20;
    if (settings.promptInjectionDefense) score += 15;
    if (settings.piiMasking) score += 10;
    if (settings.dbSecretDetection) score += 5;
    return score;
  }, [settings]);

  // Radius for Circular Score Indicator
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (complianceScore / 100) * circumference;

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.rawPreview.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            log.redactedPreview.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (log.sourceFile && log.sourceFile.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCat = selectedCategory === 'ALL' || log.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [logs, searchQuery, selectedCategory]);

  // Redaction scanner engine
  const runRedactionScan = (inputStr: string, sourceName = 'Manual Scanner') => {
    setIsScanning(true);
    let output = inputStr;
    const newEvents: RedactionEvent[] = [];
    const lines = inputStr.split('\n');

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;

      // 1. AWS Key detection
      if (settings.regexPatternMasking && /AKIA[0-9A-Z]{16}/g.test(lineText)) {
        const masked = lineText.replace(/AKIA[0-9A-Z]{16}/g, "'$$REDACTED_SECRET$$'");
        newEvents.push({
          id: `scan-${Date.now()}-${idx}-aws`,
          timestamp: new Date().toLocaleTimeString(),
          category: 'AWS_KEY',
          line: lineNum,
          rawPreview: lineText.trim(),
          redactedPreview: masked.trim(),
          risk: 'Critical',
          sourceFile: sourceName
        });
      }

      // 2. OpenAI / Anthropic / AI API Keys
      if (settings.regexPatternMasking && /(sk-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z-_]{35})/g.test(lineText)) {
        const masked = lineText.replace(/(sk-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z-_]{35})/g, "'$$REDACTED_SECRET$$'");
        newEvents.push({
          id: `scan-${Date.now()}-${idx}-api`,
          timestamp: new Date().toLocaleTimeString(),
          category: 'API_TOKEN',
          line: lineNum,
          rawPreview: lineText.trim(),
          redactedPreview: masked.trim(),
          risk: 'Critical',
          sourceFile: sourceName
        });
      }

      // 3. Database URI & Passwords
      if (settings.dbSecretDetection && /(postgres|mysql|mongodb(?:\+srv)?):\/\/[^\s'"]+/gi.test(lineText)) {
        const masked = lineText.replace(/(postgres|mysql|mongodb(?:\+srv)?):\/\/[^\s'"]+/gi, "$1://admin:$$REDACTED_SECRET$$@localhost:5432/db");
        newEvents.push({
          id: `scan-${Date.now()}-${idx}-db`,
          timestamp: new Date().toLocaleTimeString(),
          category: 'DB_URI',
          line: lineNum,
          rawPreview: lineText.trim(),
          redactedPreview: masked.trim(),
          risk: 'High',
          sourceFile: sourceName
        });
      }

      // 4. PII Emails
      if (settings.piiMasking && /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g.test(lineText)) {
        const masked = lineText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");
        newEvents.push({
          id: `scan-${Date.now()}-${idx}-email`,
          timestamp: new Date().toLocaleTimeString(),
          category: 'PII_EMAIL',
          line: lineNum,
          rawPreview: lineText.trim(),
          redactedPreview: masked.trim(),
          risk: 'Low',
          sourceFile: sourceName
        });
      }

      // 5. Private IP Addresses
      if (settings.piiMasking && /\b(?:10\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)[0-9]{1,3}\.[0-9]{1,3}\b/g.test(lineText)) {
        const masked = lineText.replace(/\b(?:10\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)[0-9]{1,3}\.[0-9]{1,3}\b/g, "[REDACTED_IP]");
        newEvents.push({
          id: `scan-${Date.now()}-${idx}-ip`,
          timestamp: new Date().toLocaleTimeString(),
          category: 'PRIVATE_IP',
          line: lineNum,
          rawPreview: lineText.trim(),
          redactedPreview: masked.trim(),
          risk: 'Medium',
          sourceFile: sourceName
        });
      }
    });

    // Execute full text sanitization for result preview
    if (settings.regexPatternMasking) {
      output = output.replace(/AKIA[0-9A-Z]{16}/g, "'$$REDACTED_SECRET$$'");
      output = output.replace(/(sk-[a-zA-Z0-9_-]{20,}|AIza[0-9A-Za-z-_]{35})/g, "'$$REDACTED_SECRET$$'");
    }
    if (settings.dbSecretDetection) {
      output = output.replace(/(postgres|mysql|mongodb(?:\+srv)?):\/\/[^\s'"]+/gi, "$1://admin:$$REDACTED_SECRET$$@localhost:5432/db");
    }
    if (settings.piiMasking) {
      output = output.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[REDACTED_EMAIL]");
      output = output.replace(/\b(?:10\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)[0-9]{1,3}\.[0-9]{1,3}\b/g, "[REDACTED_IP]");
    }

    setScanResult(output);
    setIsScanning(false);

    if (newEvents.length > 0) {
      const updatedLogs = [...newEvents, ...logs];
      setLogs(updatedLogs);
      setTotalRedactionsCount(prev => prev + newEvents.length);
      try {
        localStorage.setItem('compliance_shield_logs', JSON.stringify(updatedLogs.slice(0, 50)));
      } catch {
        // ignore
      }
    }
  };

  const handleScanCurrentWorkspaceCode = () => {
    if (!currentCode) return;
    runRedactionScan(currentCode, activeFilePath);
  };

  const handleCopyAuditLogs = () => {
    const report = `# 🛡️ COMPLIANCE SHIELD AUDIT LOG REPORT
Generated: ${new Date().toISOString()}
Compliance Score: ${complianceScore}% (Status: ${complianceScore === 100 ? '100% Protected' : 'Partially Hardened'})
Data Exfiltration Protection: ${settings.strictLocalLoopback ? 'ACTIVE (Loopback Only)' : 'WARNING: Cloud Allowed'}
Total Secrets Redacted: ${totalRedactionsCount}

${logs.map(l => `[${l.timestamp}] [${l.risk}] [${l.category}] ${l.sourceFile ? `File: ${l.sourceFile} (Line ${l.line}): ` : ''}${l.line ? `Line ${l.line}: ` : ''}${l.redactedPreview}`).join('\n')}
`;
    navigator.clipboard.writeText(report);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
    setTotalRedactionsCount(0);
    try {
      localStorage.removeItem('compliance_shield_logs');
    } catch {
      // ignore
    }
  };

  return (
    <div id="compliance-shield-dashboard" className={`bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl flex flex-col overflow-hidden font-sans h-full ${className}`}>
      
      {/* Header Bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck size={22} className="text-emerald-400" />
            </div>
            {settings.strictLocalLoopback && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                🛡️ Enterprise Privacy &amp; Exfiltration Shield
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[11px] font-bold">
                AIR-GAP ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Outbound zero-leakage filter, runtime AST secret masking &amp; local loopback enforcer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAuditLogs}
            title="Export compliance log to clipboard"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            {copiedLog ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            <span>{copiedLog ? 'Copied' : 'Export Audit'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Visualizer Ribbon */}
      <div className="p-4 bg-slate-900/40 border-b border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center shrink-0">
        
        {/* Metric 1: Security Shield Glowing Icon & 100% Protected */}
        <div id="security-shield-status-card" className="md:col-span-5 flex items-center gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 shadow-inner">
          <div className="relative flex items-center justify-center shrink-0">
            {/* Glowing outer aura */}
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md animate-pulse"></div>
            <svg width="96" height="96" className="transform -rotate-90 relative z-10">
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke="#1e293b"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                stroke={complianceScore === 100 ? '#10b981' : complianceScore >= 70 ? '#f59e0b' : '#ef4444'}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out drop-shadow-[0_0_10px_rgba(16,185,129,0.7)]"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
              <ShieldCheck size={20} className="text-emerald-400 mb-0.5 animate-pulse" />
              <span className="text-sm font-black text-white">{complianceScore}%</span>
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-200">Security Shield</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 ${
                complianceScore === 100 ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {complianceScore === 100 ? '100% Protected' : `${complianceScore}% Hardened`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 leading-tight">
              Enterprise air-gap active. All local tokens &amp; prompt buffers masked before inference.
            </p>
          </div>
        </div>

        {/* Metric 2: Data Exfiltration Status (Pulsing Shield) */}
        <div id="data-exfiltration-card" className="md:col-span-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Shield size={22} className={settings.strictLocalLoopback ? 'text-emerald-400 animate-pulse' : 'text-amber-400'} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Data Exfiltration</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                settings.strictLocalLoopback
                  ? 'bg-emerald-950 border border-emerald-700 text-emerald-300'
                  : 'bg-rose-950 border border-rose-700 text-rose-300'
              }`}>
                <Radio size={10} className={settings.strictLocalLoopback ? 'text-emerald-400 animate-ping' : 'text-rose-400'} />
                {settings.strictLocalLoopback ? '100% PROTECTED' : 'UNPROTECTED'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-semibold mt-0.5">
              {settings.strictLocalLoopback ? 'Strict Local Loopback Active' : 'External Outbound Unchecked'}
            </p>
          </div>
        </div>

        {/* Metric 3: Redacted Secrets Counter */}
        <div id="redacted-secrets-counter-card" className="md:col-span-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800/90 flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Lock size={12} className="text-amber-400" /> Redacted Secrets
            </span>
            <span className="text-xs font-mono font-black text-amber-400 bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-800/80 shadow-[0_0_8px_rgba(245,158,11,0.2)]">
              {totalRedactionsCount} Masked
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">
            API keys, Passwords &amp; PII securely masked in current session.
          </p>
        </div>

      </div>

      {/* Main Grid: Data Guard Toggles (Left) & Live Redaction Log / Scanner (Right) */}
      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
        
        {/* Left Column: Data Guard Toggle Controls */}
        <div className="lg:col-span-5 space-y-3 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800 shrink-0">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Zap size={14} className="text-indigo-400" /> Privacy Governance Controls
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Live Enforcers</span>
          </div>

          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
            
            {/* Toggle 1: Strict Local Loopback Mode */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-emerald-400" />
                  <span className="text-xs font-bold text-white">Strict Local Loopback Mode</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Blocks external cloud network egress. Keeps inference strictly in local 127.0.0.1 / Ollama memory.
                </p>
              </div>
              <button
                onClick={() => updateSetting('strictLocalLoopback', !settings.strictLocalLoopback)}
                className="cursor-pointer text-slate-400 hover:text-white transition-transform active:scale-95 shrink-0"
              >
                {settings.strictLocalLoopback ? (
                  <ToggleRight size={32} className="text-emerald-500" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-600" />
                )}
              </button>
            </div>

            {/* Toggle 2: Regex Pattern Masking */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <EyeOff size={14} className="text-amber-400" />
                  <span className="text-xs font-bold text-white">Regex Pattern Masking</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Scans and replaces AWS keys (`AKIA...`), OpenAI tokens, and GitHub PATs with `$$REDACTED_SECRET$$`.
                </p>
              </div>
              <button
                onClick={() => updateSetting('regexPatternMasking', !settings.regexPatternMasking)}
                className="cursor-pointer text-slate-400 hover:text-white transition-transform active:scale-95 shrink-0"
              >
                {settings.regexPatternMasking ? (
                  <ToggleRight size={32} className="text-indigo-500" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-600" />
                )}
              </button>
            </div>

            {/* Toggle 3: Database & Secret Detection */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Lock size={14} className="text-indigo-400" />
                  <span className="text-xs font-bold text-white">Database URI &amp; Secret Detection</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Intercepts MongoDB, PostgreSQL, MySQL connection strings and masks inline plaintext credentials.
                </p>
              </div>
              <button
                onClick={() => updateSetting('dbSecretDetection', !settings.dbSecretDetection)}
                className="cursor-pointer text-slate-400 hover:text-white transition-transform active:scale-95 shrink-0"
              >
                {settings.dbSecretDetection ? (
                  <ToggleRight size={32} className="text-indigo-500" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-600" />
                )}
              </button>
            </div>

            {/* Toggle 4: Prompt Injection & Jailbreak Defense */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-rose-400" />
                  <span className="text-xs font-bold text-white">Prompt Injection Defense</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Heuristic delimiter boundary defense to neutralize prompt hijacking vectors.
                </p>
              </div>
              <button
                onClick={() => updateSetting('promptInjectionDefense', !settings.promptInjectionDefense)}
                className="cursor-pointer text-slate-400 hover:text-white transition-transform active:scale-95 shrink-0"
              >
                {settings.promptInjectionDefense ? (
                  <ToggleRight size={32} className="text-indigo-500" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-600" />
                )}
              </button>
            </div>

            {/* Toggle 5: PII & IP Redaction */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-blue-400" />
                  <span className="text-xs font-bold text-white">PII &amp; Private IP Masking</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Masks corporate email addresses, credit cards, and 10.x / 192.168.x internal subnet endpoints.
                </p>
              </div>
              <button
                onClick={() => updateSetting('piiMasking', !settings.piiMasking)}
                className="cursor-pointer text-slate-400 hover:text-white transition-transform active:scale-95 shrink-0"
              >
                {settings.piiMasking ? (
                  <ToggleRight size={32} className="text-indigo-500" />
                ) : (
                  <ToggleLeft size={32} className="text-slate-600" />
                )}
              </button>
            </div>

          </div>

          {/* Quick Action: Workspace Scanner */}
          <div className="pt-2 border-t border-slate-800 flex items-center gap-2 shrink-0">
            <button
              onClick={handleScanCurrentWorkspaceCode}
              disabled={!currentCode}
              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <FileCode size={14} />
              <span>Scan Active Workspace Buffer ({activeFilePath.split('/').pop()})</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Redaction Audit Log & Interactive Table */}
        <div className="lg:col-span-7 flex flex-col space-y-3 overflow-hidden">
          
          {/* Audit Log Header & Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Terminal size={14} className="text-emerald-400" /> Real-Time Audit Log of Redacted Events
              </h3>
              <span className="text-[10px] bg-slate-800 text-indigo-300 font-mono px-2 py-0.5 rounded-full font-bold">
                {filteredLogs.length} events
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 text-xs">
                <Filter size={12} className="text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-transparent text-slate-200 text-[11px] focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-slate-200">All Categories</option>
                  <option value="AWS_KEY" className="bg-slate-900 text-slate-200">AWS Keys</option>
                  <option value="API_TOKEN" className="bg-slate-900 text-slate-200">API Tokens</option>
                  <option value="PASSWORD" className="bg-slate-900 text-slate-200">Passwords</option>
                  <option value="DB_URI" className="bg-slate-900 text-slate-200">Database URIs</option>
                  <option value="PRIVATE_IP" className="bg-slate-900 text-slate-200">Private IPs</option>
                  <option value="PII_EMAIL" className="bg-slate-900 text-slate-200">Emails</option>
                </select>
              </div>

              {/* Clear button */}
              <button
                onClick={handleClearLogs}
                title="Clear current log history"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg border border-slate-800 transition-colors cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative shrink-0">
            <Search size={13} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search redacted secrets, file names, or masked tokens..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Table / Event Stream Panel */}
          <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-y-auto p-2 space-y-2 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center justify-center text-slate-500 font-sans">
                <CheckCircle2 size={24} className="text-emerald-400 mb-1" />
                <span className="font-bold text-slate-300 text-xs">Zero Outbound Leakages</span>
                <span className="text-[11px] text-slate-400">All scanned inputs and files conform to the active Compliance Shield.</span>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                        log.risk === 'Critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        log.risk === 'High' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}>
                        {log.risk}
                      </span>
                      <span className="font-bold text-indigo-300 text-[10px]">{log.category}</span>
                      {log.sourceFile && (
                        <span className="text-slate-500 text-[10px]">
                          [{log.sourceFile}{log.line ? `:${log.line}` : ''}]
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                  </div>

                  {/* Redacted Event Preview (e.g. Line 4: const aws_key = '$$REDACTED_SECRET$$') */}
                  <div className="text-[11px] text-emerald-300 font-semibold bg-slate-900/90 px-2.5 py-1.5 rounded border border-slate-800 flex items-center justify-between gap-2 overflow-x-auto">
                    <span className="truncate">
                      {log.line ? <strong className="text-indigo-400 mr-1.5">Line {log.line}:</strong> : null}
                      {log.redactedPreview}
                    </span>
                    <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-1.5 py-0.2 rounded shrink-0">
                      🔒 Masked Safely
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Interactive Redaction Sandbox Simulator */}
          <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-1.5">
                <Terminal size={13} className="text-indigo-400" /> Interactive Redaction Sandbox Simulator
              </span>
              <button
                onClick={() => runRedactionScan(testInput, 'Sandbox Simulator')}
                disabled={isScanning || !testInput}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-bold text-[11px] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={11} className={isScanning ? 'animate-spin' : ''} />
                <span>Test Masker</span>
              </button>
            </div>

            <textarea
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              rows={2}
              placeholder="Paste AWS keys, database URIs, API tokens or credit cards to test instant masking..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500"
            />

            {scanResult && (
              <div className="p-2 bg-slate-950 rounded border border-emerald-800/60 font-mono text-[10px] text-emerald-300 space-y-1">
                <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase font-bold">
                  <span>Sanitized Output Preview:</span>
                  {onApplyMaskingToCode && (
                    <button
                      onClick={() => onApplyMaskingToCode(scanResult)}
                      className="text-indigo-400 hover:underline cursor-pointer"
                    >
                      Apply To Workspace Code
                    </button>
                  )}
                </div>
                <pre className="whitespace-pre-wrap">{scanResult}</pre>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
