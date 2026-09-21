'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Cpu,
  Gauge,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Zap,
  TrendingUp,
  Sliders,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
  Server,
  Activity,
  Globe,
  Lock,
  RotateCcw
} from 'lucide-react';

export interface FinOpsUsageData {
  dailySpend: number;
  dailyBudgetLimit: number;
  warningThreshold: number;
  failoverAction: string; // 'Local Fallback' | 'Hard Block' | 'Notify Only'
  inrRate: number;
  promptTokens: number;
  completionTokens: number;
  currentRpm: number;
  rpmLimit: number;
  currentTpm: number;
  tpmLimit: number;
  alerts: { id: string; timestamp: string; level: 'warning' | 'info' | 'success' | 'error'; message: string }[];
}

export default function FinOpsDashboard() {
  const [data, setData] = useState<FinOpsUsageData>({
    dailySpend: 14.82,
    dailyBudgetLimit: 20.00,
    warningThreshold: 80,
    failoverAction: 'Local Fallback',
    inrRate: 83.50,
    promptTokens: 1420500,
    completionTokens: 480200,
    currentRpm: 42,
    rpmLimit: 120,
    currentTpm: 34500,
    tpmLimit: 100000,
    alerts: [
      { id: '1', timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'warning', message: 'Warning: 74% of Daily Budget reached ($14.82 / $20.00).' },
      { id: '2', timestamp: new Date(Date.now() - 7200000).toISOString(), level: 'info', message: 'RPM rate limit pacing normal (42 / 120 RPM).' },
      { id: '3', timestamp: new Date(Date.now() - 86400000).toISOString(), level: 'success', message: 'Daily quota reset successfully at 00:00 UTC.' }
    ]
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [savingBudget, setSavingBudget] = useState<boolean>(false);
  const [currencyMode, setCurrencyMode] = useState<'USD' | 'INR' | 'BOTH'>('BOTH');

  // Form State
  const [inputBudgetLimit, setInputBudgetLimit] = useState<number>(20.00);
  const [inputWarningThreshold, setInputWarningThreshold] = useState<number>(80);
  const [inputFailoverAction, setInputFailoverAction] = useState<string>('Local Fallback');
  const [inputInrRate, setInputInrRate] = useState<number>(83.50);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Fetch telemetry from API
  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finops/usage');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.dailyBudgetLimit !== undefined) setInputBudgetLimit(json.dailyBudgetLimit);
        if (json.warningThreshold !== undefined) setInputWarningThreshold(json.warningThreshold);
        if (json.failoverAction !== undefined) setInputFailoverAction(json.failoverAction);
        if (json.inrRate !== undefined) setInputInrRate(json.inrRate);
      }
    } catch (err) {
      console.error('Failed to fetch finops usage', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  // Update policy handler
  const handleSavePolicy = async () => {
    setSavingBudget(true);
    try {
      const res = await fetch('/api/finops/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyBudgetLimit: inputBudgetLimit,
          warningThreshold: inputWarningThreshold,
          failoverAction: inputFailoverAction,
          inrRate: inputInrRate
        })
      });
      const json = await res.json();
      if (json.success && json.usage) {
        setData(json.usage);
        setSaveToast('FinOps Budget & Failover Policy Applied Successfully!');
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to save finops policy', err);
    } finally {
      setSavingBudget(false);
    }
  };

  const handleResetQuota = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finops/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });
      const json = await res.json();
      if (json.success && json.usage) {
        setData(json.usage);
        setSaveToast('Quota & Spend Reset to $0.00');
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch (err) {
      console.error('Failed to reset quota', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const spendPercentage = Math.min(100, Math.round((data.dailySpend / (data.dailyBudgetLimit || 1)) * 100));
  const totalTokens = data.promptTokens + data.completionTokens;
  const promptTokenPct = totalTokens > 0 ? Math.round((data.promptTokens / totalTokens) * 100) : 75;
  const completionTokenPct = 100 - promptTokenPct;

  const inrSpend = data.dailySpend * (data.inrRate || 83.50);
  const inrBudgetLimit = data.dailyBudgetLimit * (data.inrRate || 83.50);

  const rpmPercentage = Math.min(100, Math.round((data.currentRpm / (data.rpmLimit || 1)) * 100));
  const tpmPercentage = Math.min(100, Math.round((data.currentTpm / (data.tpmLimit || 1)) * 100));

  const isWarningActive = spendPercentage >= (data.warningThreshold || 80);
  const isCeilingReached = spendPercentage >= 100;

  // Determine Routing Failover Mode
  let activeRouteStatus = 'cloud';
  if (isCeilingReached || isWarningActive) {
    if (data.failoverAction === 'Local Fallback') {
      activeRouteStatus = 'ollama_failover';
    } else if (data.failoverAction === 'Hard Block') {
      activeRouteStatus = 'hard_block';
    } else {
      activeRouteStatus = 'cloud_warning';
    }
  }

  // Circular gauge calculation
  const gaugeRadius = 38;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeStrokeDashoffset = gaugeCircumference - (spendPercentage / 100) * gaugeCircumference;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-slate-100 font-sans overflow-y-auto p-4 md:p-6 gap-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-inner">
            <DollarSign size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-white">📊 FinOps Token Budget &amp; Rate Control</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full uppercase">
                Real-Time Quotas
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Monitor real-time API token consumption, enforce budget caps, convert USD/INR costs, and automate Local Ollama failover.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchUsage}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs rounded-xl border border-slate-800 shadow-sm transition-colors flex items-center gap-2"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-emerald-400' : 'text-slate-400'} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleResetQuota}
            disabled={loading}
            className="px-3.5 py-2 bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            <span>Reset Quota</span>
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-2 shadow-md animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* SECTION 1: Real-Time FinOps Usage & Cost Monitor */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Estimated Cost with Dynamic Gauge */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign size={14} className="text-emerald-400" /> Real-Time Cost
            </span>

            {/* Currency Mode Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-[10px]">
              <button
                onClick={() => setCurrencyMode('USD')}
                className={`px-1.5 py-0.5 rounded font-bold transition-colors ${currencyMode === 'USD' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                USD
              </button>
              <button
                onClick={() => setCurrencyMode('INR')}
                className={`px-1.5 py-0.5 rounded font-bold transition-colors ${currencyMode === 'INR' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                INR
              </button>
              <button
                onClick={() => setCurrencyMode('BOTH')}
                className={`px-1.5 py-0.5 rounded font-bold transition-colors ${currencyMode === 'BOTH' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Both
              </button>
            </div>
          </div>

          <div className="my-4 flex items-center justify-between gap-4">
            <div>
              {(currencyMode === 'USD' || currencyMode === 'BOTH') && (
                <div className="text-3xl font-black text-white font-mono tracking-tight">
                  ${data.dailySpend.toFixed(2)}
                </div>
              )}
              {(currencyMode === 'INR' || currencyMode === 'BOTH') && (
                <div className={`font-mono font-bold text-emerald-400 ${currencyMode === 'BOTH' ? 'text-sm mt-0.5' : 'text-3xl'}`}>
                  ₹{inrSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              <div className="text-[11px] text-slate-400 mt-1">
                Limit: ${data.dailyBudgetLimit.toFixed(2)} (₹{inrBudgetLimit.toFixed(0)}) / day
              </div>
            </div>

            {/* Circular Gauge SVG */}
            <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r={gaugeRadius}
                  stroke="#1e293b"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={gaugeRadius}
                  stroke={spendPercentage > 85 ? '#f43f5e' : spendPercentage > 70 ? '#f59e0b' : '#10b981'}
                  strokeWidth="7"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={gaugeStrokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <span className="absolute text-xs font-mono font-black text-white">
                {spendPercentage}%
              </span>
            </div>
          </div>

          {/* Daily Budget Limit Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Daily Budget Spent</span>
              <span className="font-mono text-slate-200 font-bold">
                ${data.dailySpend.toFixed(2)} / ${data.dailyBudgetLimit.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  spendPercentage >= 85 ? 'bg-rose-500 animate-pulse' : spendPercentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${spendPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Token Consumption Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu size={14} className="text-indigo-400" /> Token Consumption
            </span>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold font-mono">
              {totalTokens.toLocaleString()} Total
            </span>
          </div>

          <div className="my-3 space-y-2">
            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Prompt Tokens (Input)</div>
                <div className="text-sm font-bold text-white font-mono">{data.promptTokens.toLocaleString()}</div>
              </div>
              <span className="text-xs font-mono text-indigo-400 font-bold">{promptTokenPct}%</span>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Completion Tokens (Output)</div>
                <div className="text-sm font-bold text-white font-mono">{data.completionTokens.toLocaleString()}</div>
              </div>
              <span className="text-xs font-mono text-purple-400 font-bold">{completionTokenPct}%</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
              <TrendingUp size={13} /> 99.4% Semantic Cache Hit Efficiency
            </div>
          </div>
        </div>

        {/* Card 3: Rate Limits & Pacing (RPM / TPM) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Gauge size={14} className="text-purple-400" /> Rate Limits &amp; Pacing
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
              Adaptive
            </span>
          </div>

          <div className="my-3 space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">RPM (Requests / min): {data.currentRpm} / {data.rpmLimit}</span>
                <span className="font-mono font-bold text-purple-400">{rpmPercentage}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${rpmPercentage}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300 font-medium">TPM (Tokens / min): {data.currentTpm.toLocaleString()} / {data.tpmLimit.toLocaleString()}</span>
                <span className="font-mono font-bold text-indigo-400">{tpmPercentage}%</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${tpmPercentage}%` }}></div>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Quota Window: Rolling 60s</span>
            <span className="text-emerald-400 font-mono">Pacing Normal</span>
          </div>
        </div>
      </div>

      {/* SECTION 2 & 3 GRID: Provider Allocation & Failover Map + Interactive Budget Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PROVIDER ALLOCATION & FAILOVER FLOWCHART */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Layers size={16} className="text-emerald-400" /> Provider Allocation &amp; Active Routing Channels
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Live Traffic Flow</span>
          </div>

          {/* Active Status Badge Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            activeRouteStatus === 'ollama_failover'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 animate-pulse'
              : activeRouteStatus === 'hard_block'
              ? 'bg-rose-950/80 border-rose-500 text-rose-200'
              : activeRouteStatus === 'cloud_warning'
              ? 'bg-amber-950/80 border-amber-500 text-amber-200'
              : 'bg-indigo-950/60 border-indigo-700 text-indigo-200'
          }`}>
            <div className="flex items-center gap-2 text-xs font-bold">
              <Activity size={16} className="shrink-0" />
              <span>
                {activeRouteStatus === 'ollama_failover' && '🟢 Local Ollama Failover active (Cloud Budget Ceiled)'}
                {activeRouteStatus === 'hard_block' && '🛑 Hard Block Enforced (Budget Limit Exceeded)'}
                {activeRouteStatus === 'cloud_warning' && '🟡 Warning Threshold Exceeded (Notify Only)'}
                {activeRouteStatus === 'cloud' && '⚡ Primary Cloud Gemini API Active'}
              </span>
            </div>
            <span className="text-[10px] font-mono bg-black/40 px-2 py-0.5 rounded uppercase">
              Action: {data.failoverAction}
            </span>
          </div>

          {/* Visual Interactive Flowchart Nodes */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Node 1: Cloud Gemini API */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                activeRouteStatus === 'cloud' || activeRouteStatus === 'cloud_warning'
                  ? 'bg-indigo-950/60 border-indigo-500 shadow-lg shadow-indigo-950/50'
                  : 'bg-slate-900/60 border-slate-800 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <Globe size={14} /> Cloud Gemini API
                  </span>
                  <span className={`w-2 h-2 rounded-full ${activeRouteStatus === 'cloud' ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Primary High-Throughput Cloud AI Model</p>
                <div className="mt-2 text-[10px] font-mono text-indigo-400">gemini-1.5-flash</div>
              </div>

              {/* Node 2: Local Ollama Fallback */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                activeRouteStatus === 'ollama_failover'
                  ? 'bg-emerald-950/80 border-emerald-500 shadow-lg shadow-emerald-950/80 ring-2 ring-emerald-500/50'
                  : 'bg-slate-900/60 border-slate-800 opacity-60'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Server size={14} /> Local Ollama Fallback
                  </span>
                  <span className={`w-2 h-2 rounded-full ${activeRouteStatus === 'ollama_failover' ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`}></span>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Offline Zero-Cost Local Inference Engine</p>
                <div className="mt-2 text-[10px] font-mono text-emerald-400">llama3.2:3b</div>
              </div>
            </div>

            {/* Router Gateway Bar */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <Shield size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">FinOps Quotas &amp; Rate Limit Router</div>
                  <div className="text-[10px] text-slate-400">Cap: ${data.dailyBudgetLimit.toFixed(2)} | Warning: {data.warningThreshold}%</div>
                </div>
              </div>
              <ArrowRight size={16} className="text-slate-500" />
              <div className="text-xs font-mono font-bold text-emerald-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                Client Output
              </div>
            </div>
          </div>
        </div>

        {/* INTERACTIVE BUDGET SETTINGS & ALERTS FORM */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Sliders size={16} className="text-purple-400" /> Dynamic Budget &amp; Failover Policy Settings
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Real-Time Sync</span>
          </div>

          <div className="space-y-4">
            {/* Daily Budget Limit ($) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Daily Budget Limit ($ USD):</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                    ${inputBudgetLimit.toFixed(2)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    (≈ ₹{(inputBudgetLimit * inputInrRate).toFixed(0)})
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={1.00}
                max={100.00}
                step={1.00}
                value={inputBudgetLimit}
                onChange={e => setInputBudgetLimit(parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            {/* Warning Threshold (%) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">Warning Threshold (% of budget):</label>
                <span className="text-xs font-mono font-bold text-amber-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded">
                  {inputWarningThreshold}% (${((inputBudgetLimit * inputWarningThreshold) / 100).toFixed(2)})
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={95}
                step={5}
                value={inputWarningThreshold}
                onChange={e => setInputWarningThreshold(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Failover Action Selector Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Failover Action Selector:</label>
              <select
                value={inputFailoverAction}
                onChange={e => setInputFailoverAction(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2.5 rounded-xl font-mono focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="Local Fallback">🟢 Local Fallback (Automatic switch to Ollama)</option>
                <option value="Hard Block">🛑 Hard Block (Cease external &amp; local API requests)</option>
                <option value="Notify Only">🟡 Notify Only (Issue alert warning, continue traffic)</option>
              </select>
            </div>

            {/* INR Conversion Rate */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-300">USD to INR Exchange Rate (₹):</label>
                <span className="text-xs font-mono text-cyan-400 font-bold">1 USD = ₹{inputInrRate.toFixed(2)}</span>
              </div>
              <input
                type="number"
                step="0.5"
                value={inputInrRate}
                onChange={e => setInputInrRate(parseFloat(e.target.value) || 83.5)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-2 rounded-xl font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSavePolicy}
              disabled={savingBudget}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              {savingBudget ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
              <span>Save &amp; Apply FinOps Policy</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: Real-Time Alerts & Events Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-400" /> Real-Time FinOps Telemetry &amp; Alert Logs
          </h3>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
            {data.alerts.length} Events
          </span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {data.alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-3 rounded-xl border flex items-start justify-between text-xs transition-all ${
                alert.level === 'warning'
                  ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                  : alert.level === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-start gap-2">
                {alert.level === 'warning' && <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />}
                {alert.level === 'success' && <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />}
                {alert.level === 'info' && <Zap size={15} className="text-indigo-400 shrink-0 mt-0.5" />}
                <div>
                  <div className="font-bold text-[11px] uppercase tracking-wider mb-0.5">{alert.level}</div>
                  <p className="text-xs leading-relaxed font-sans">{alert.message}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 shrink-0">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
