'use client';

import React, { useState } from 'react';
import {
  Binary,
  Layers,
  Sparkles,
  Zap,
  Code2,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  Terminal,
  FileText,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Cpu
} from 'lucide-react';
import {
  PREBUILT_OUTLINES_TEMPLATES,
  StructuredTemplate,
  outlinesEngine,
  GuidedGenerationResult,
  FsmState
} from '@/lib/ai/outlinesEngine';

export interface OutlinesStructuredStudioProps {
  isOpen?: boolean;
  onClose?: () => void;
  workspaceFiles?: Record<string, string>;
  activeFile?: string;
  onOpenFile?: (path: string) => void;
}

export default function OutlinesStructuredStudio({
  isOpen = true,
  onClose,
  workspaceFiles = {},
  activeFile,
  onOpenFile
}: OutlinesStructuredStudioProps) {
  const [activeTab, setActiveTab] = useState<'arena' | 'fsm' | 'schema' | 'python' | 'architecture'>('arena');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('conventional_commit');
  const [customPrompt, setCustomPrompt] = useState<string>('Synthesize a commit for fixing a memory leak in the JWT cache session store.');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationResult, setGenerationResult] = useState<GuidedGenerationResult | null>(() => {
    return {
      templateId: 'conventional_commit',
      output: JSON.stringify({
        type: 'fix',
        scope: 'auth',
        description: 'resolve memory leak in JWT cache session store',
        breaking: false,
        details: [
          'Added LRU eviction policy with 3600s TTL',
          'Enforced garbage collection bounds on stale tokens'
        ]
      }, null, 2),
      parsedJson: {
        type: 'fix',
        scope: 'auth',
        description: 'resolve memory leak in JWT cache session store',
        breaking: false,
        details: [
          'Added LRU eviction policy with 3600s TTL',
          'Enforced garbage collection bounds on stale tokens'
        ]
      },
      isValid: true,
      fsmSteps: [
        { step: 1, token: '{', fromState: 0, toState: 1, allowedTokensCount: 1, maskedTokensCount: 31999 },
        { step: 2, token: '"type": "fix"', fromState: 1, toState: 2, allowedTokensCount: 7, maskedTokensCount: 31993 },
        { step: 3, token: '"scope": "auth"', fromState: 2, toState: 3, allowedTokensCount: 42, maskedTokensCount: 31958 },
        { step: 4, token: '"breaking": false', fromState: 3, toState: 4, allowedTokensCount: 2, maskedTokensCount: 31998 },
        { step: 5, token: '}', fromState: 4, toState: 5, allowedTokensCount: 1, maskedTokensCount: 31999 }
      ],
      durationMs: 8
    };
  });
  const [isCopied, setIsCopied] = useState<string | null>(null);

  const currentTemplate = PREBUILT_OUTLINES_TEMPLATES.find(t => t.id === selectedTemplateId) || PREBUILT_OUTLINES_TEMPLATES[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 2000);
  };

  const handleRunGuidedGeneration = async () => {
    setIsGenerating(true);
    try {
      const res = await outlinesEngine.generateGuided(customPrompt, currentTemplate);
      setGenerationResult(res);
    } finally {
      setIsGenerating(false);
    }
  };

  const compiledStates: FsmState[] = outlinesEngine.compileFsm(
    currentTemplate.schemaOrPattern,
    currentTemplate.type === 'regex' ? 'regex' : 'json_schema'
  );

  return (
    <div className="flex flex-col h-full bg-[#0a0d16] text-slate-100 overflow-hidden font-sans border border-slate-800 shadow-2xl">
      {/* Top Studio Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#0e1320] border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 shadow-inner">
            <Binary size={22} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white tracking-wide">
                Outlines Guided Generation Studio
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                FSM Guided Decoding
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck size={11} />
                100% Guaranteed Valid Schema
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Constrain local LLMs to valid JSON Schemas, Regular Expressions, and Grammars via Finite State Machine logit masking.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close Studio
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center px-5 border-b border-slate-800/80 bg-[#0c101c] gap-1 shrink-0 overflow-x-auto scrollbar-none">
        {[
          { id: 'arena' as const, label: '🎯 Guided Generation Arena', icon: <Sparkles size={13} /> },
          { id: 'fsm' as const, label: '⚙️ FSM State Graph & Masking', icon: <Binary size={13} /> },
          { id: 'schema' as const, label: '📐 JSON Schema Inspector', icon: <Layers size={13} /> },
          { id: 'python' as const, label: '🐍 Python Outlines Code', icon: <Terminal size={13} /> },
          { id: 'architecture' as const, label: '📖 Architecture Explainer', icon: <FileText size={13} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Tab 1: Guided Generation Arena */}
        {activeTab === 'arena' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Template Selector Bar */}
            <div className="bg-[#111728] p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Structured Output Preset</span>
                <select
                  value={selectedTemplateId}
                  onChange={e => {
                    const nextId = e.target.value;
                    setSelectedTemplateId(nextId);
                    const t = PREBUILT_OUTLINES_TEMPLATES.find(x => x.id === nextId);
                    if (t) setCustomPrompt(t.examplePrompt);
                  }}
                  className="mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400 font-semibold"
                >
                  {PREBUILT_OUTLINES_TEMPLATES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.type.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 text-right">
                <span className="text-xs text-slate-400 block">{currentTemplate.description}</span>
                <span className="text-[10px] font-mono text-cyan-400 mt-0.5 inline-block">
                  Type: {currentTemplate.type === 'json_schema' ? 'Strict JSON Schema' : 'Regex State Transition'}
                </span>
              </div>
            </div>

            {/* Prompt Input Box */}
            <div className="bg-[#111625] rounded-xl border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Prompt / Task Description</span>
                <button
                  onClick={handleRunGuidedGeneration}
                  disabled={isGenerating}
                  className="px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
                >
                  {isGenerating ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>Generate with FSM Guidance</span>
                </button>
              </div>
              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                className="w-full min-h-[75px] p-3 text-xs font-mono bg-slate-950 border border-slate-800 rounded-lg text-slate-200 resize-none outline-none focus:border-cyan-500"
                placeholder="Enter prompt to guide..."
              />
            </div>

            {/* Generation Results */}
            {generationResult && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Generated Valid Output */}
                <div className="bg-[#111625] rounded-xl border border-slate-800 overflow-hidden flex flex-col">
                  <div className="px-4 py-2.5 bg-[#151c2e] border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      Guaranteed Valid Output
                    </span>
                    <button
                      onClick={() => handleCopy(generationResult.output, 'out-copy')}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
                    >
                      {isCopied === 'out-copy' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{isCopied === 'out-copy' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-emerald-300 bg-slate-950 flex-1 overflow-x-auto leading-relaxed">
                    <code>{generationResult.output}</code>
                  </pre>
                </div>

                {/* Right: Token-by-Token FSM Step Visualizer */}
                <div className="bg-[#111625] rounded-xl border border-slate-800 overflow-hidden flex flex-col">
                  <div className="px-4 py-2.5 bg-[#151c2e] border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <Binary size={14} className="text-cyan-400" />
                      FSM State Transitions & Token Logit Masks
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{generationResult.durationMs}ms latency</span>
                  </div>
                  <div className="p-3 bg-slate-950 flex-1 overflow-y-auto space-y-2 max-h-[300px]">
                    {generationResult.fsmSteps.map(step => (
                      <div key={step.step} className="p-2 bg-[#101422] rounded-md border border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-mono text-[10px] flex items-center justify-center font-bold">
                            {step.step}
                          </span>
                          <span className="font-mono text-slate-200 bg-slate-900 px-1.5 py-0.5 rounded text-[11px]">
                            {step.token.slice(0, 24)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px]">
                          <span className="text-slate-400">
                            q{step.fromState} &rarr; q{step.toState}
                          </span>
                          <span className="text-emerald-400 font-bold" title="Allowed tokens according to FSM">
                            {step.allowedTokensCount} allowed
                          </span>
                          <span className="text-slate-600" title="Tokens masked to -Infinity">
                            {step.maskedTokensCount} masked
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: FSM State Graph & Masking */}
        {activeTab === 'fsm' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#111728] p-5 rounded-xl border border-slate-800 space-y-3">
              <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                <Binary size={16} className="text-cyan-400" />
                Compiled Finite State Machine Topology
              </h3>
              <p className="text-xs text-slate-400">
                Outlines indexes the entire vocabulary into state transitions. At each state, any token that does not advance the state machine towards an accepting terminal node is completely masked from the LLM&apos;s logit distribution.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {compiledStates.map(state => (
                <div key={state.id} className="p-4 bg-[#111625] rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center justify-center">
                        q{state.id}
                      </span>
                      <span className="font-bold text-xs text-white">{state.label}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      state.isTerminal
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {state.isTerminal ? 'TERMINAL (ACCEPT)' : 'TRANSITION'}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Permitted Transitions</span>
                    {state.transitions.length > 0 ? (
                      <div className="space-y-1">
                        {state.transitions.map((tr, i) => (
                          <div key={i} className="flex items-center justify-between text-xs font-mono text-slate-300">
                            <span className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">&quot;{tr.charOrToken}&quot;</span>
                            <span className="text-cyan-400">&rarr; State q{tr.targetStateId}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">No further outgoing transitions (End of string)</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: JSON Schema Inspector */}
        {activeTab === 'schema' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#111625] rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-[#151c2e] border-b border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-white font-mono">{currentTemplate.name} Schema Definition</span>
                <button
                  onClick={() => handleCopy(JSON.stringify(currentTemplate.schemaOrPattern, null, 2), 'schema-copy')}
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-xs cursor-pointer"
                >
                  {isCopied === 'schema-copy' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{isCopied === 'schema-copy' ? 'Copied' : 'Copy Schema'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 bg-slate-950 overflow-x-auto leading-relaxed">
                <code>{JSON.stringify(currentTemplate.schemaOrPattern, null, 2)}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: Python Outlines Code Exporter */}
        {activeTab === 'python' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-slate-200">Production Python Script with Outlines</h3>
              <p className="text-xs text-slate-400">
                You can run this exact script in any environment with <code className="text-cyan-300 font-mono">pip install outlines</code>:
              </p>
            </div>

            <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-mono text-slate-300 font-semibold">guided_generation.py</span>
                <button
                  onClick={() => handleCopy(outlinesEngine.generatePythonScript(currentTemplate), 'py-script')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-mono"
                >
                  {isCopied === 'py-script' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{isCopied === 'py-script' ? 'Copied' : 'Copy Script'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                <code>{outlinesEngine.generatePythonScript(currentTemplate)}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tab 5: Architecture Explainer */}
        {activeTab === 'architecture' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#111728] p-6 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                Why Outlines FSM Guided Generation is Revolutionary for AI IDEs
              </h3>
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
                <p>
                  In standard LLM interactions, prompts like <em>&quot;Return valid JSON only&quot;</em> fail 5% to 20% of the time due to markdown code blocks (<code className="text-amber-300 font-mono">```json</code>), missing quotes, trailing commas, or truncated brackets.
                </p>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 font-mono text-[11px]">
                  <div className="text-rose-400">❌ Naive Generation: Prompt: &quot;Return JSON&quot; &rarr; Output: &quot;Sure! Here is the JSON: &#123; ...&quot; &rarr; 💥 JSON.parse() syntax crash</div>
                  <div className="text-emerald-400">✅ Outlines FSM: Logit Masking guarantees token #1 is &#123;, keys are strictly quoted, and terminating bracket &#125; is reached &rarr; 100% Valid Object</div>
                </div>
                <p>
                  Outlines converts schemas directly into state graphs. Before each token is sampled, the logits of all tokens that would violate the schema are set to $-\infty$, mathematically preventing the model from ever outputting illegal characters.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
