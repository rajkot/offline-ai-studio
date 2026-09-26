'use client';

import React, { useState, useEffect } from 'react';
import {
  Code2,
  BookOpen,
  Feather,
  GraduationCap,
  Briefcase,
  Sparkles,
  Check,
  Copy,
  Plus,
  Play,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Sliders,
  Compass,
  Cpu
} from 'lucide-react';
import {
  universalModesEngine,
  UniversalStudioMode,
  ModeMetadata,
  UNIVERSAL_MODES
} from '@/lib/ai/universalModesEngine';

export interface UniversalModeSwitcherModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  activeFile?: string;
  onOpenFile?: (path: string, line?: number) => void;
  onApplyContent?: (content: string, filename?: string) => void;
}

export default function UniversalModeSwitcherModal({
  isOpen = true,
  onClose,
  activeFile,
  onOpenFile,
  onApplyContent
}: UniversalModeSwitcherModalProps) {
  const [selectedMode, setSelectedMode] = useState<UniversalStudioMode>('creative_story');
  const [activeTab, setActiveTab] = useState<'studio' | 'templates' | 'persona' | 'meter'>('studio');
  const [promptInput, setPromptInput] = useState<string>('The lost library buried beneath the ice');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedOutput, setGeneratedOutput] = useState<{
    title: string;
    content: string;
    metrics?: Record<string, any>;
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [meterInput, setMeterInput] = useState<string>('The quiet frost begins to claim the glass');
  const [meterSyllables, setMeterSyllables] = useState<number>(10);
  const [notification, setNotification] = useState<string | null>(null);

  // Load current mode on mount
  useEffect(() => {
    try {
      const mode = universalModesEngine.getCurrentMode();
      setSelectedMode(mode);
      handleGenerate(mode, 'The lost library buried beneath the ice');
    } catch {
      // fallback
    }
  }, []);

  const meta = UNIVERSAL_MODES[selectedMode];

  const handleSwitchMode = (mode: UniversalStudioMode) => {
    setSelectedMode(mode);
    universalModesEngine.setMode(mode);
    const defaultPrompt = UNIVERSAL_MODES[mode].starterTemplates[0]?.prompt || 'Overview of core topic';
    setPromptInput(defaultPrompt);
    handleGenerate(mode, defaultPrompt);
    showNotice(`Switched IDE Mode to: ${UNIVERSAL_MODES[mode].name}`);
  };

  const handleGenerate = (mode: UniversalStudioMode = selectedMode, prompt: string = promptInput) => {
    setIsGenerating(true);
    setTimeout(() => {
      const result = universalModesEngine.generateDomainContent(mode, prompt);
      setGeneratedOutput(result);
      setIsGenerating(false);
    }, 280);
  };

  const handleMeterCheck = (text: string) => {
    setMeterInput(text);
    const count = universalModesEngine.countSyllables(text);
    setMeterSyllables(count);
  };

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleCopy = () => {
    if (!generatedOutput) return;
    navigator.clipboard.writeText(generatedOutput.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showNotice('Copied generated text to clipboard');
  };

  const handleInsertIntoEditor = () => {
    if (!generatedOutput) return;
    const ext = meta.targetFileExtension || '.md';
    const suggestedFilename = `${selectedMode}_draft_${Date.now()}${ext}`;

    if (onApplyContent) {
      onApplyContent(generatedOutput.content, suggestedFilename);
      showNotice(`Created and opened ${suggestedFilename}`);
    } else if (onOpenFile) {
      onOpenFile(suggestedFilename);
      showNotice(`Opened ${suggestedFilename}`);
    } else {
      handleCopy();
    }
  };

  const modeIcons: Record<UniversalStudioMode, React.ReactNode> = {
    engineering: <Code2 size={16} className="text-emerald-400" />,
    creative_story: <BookOpen size={16} className="text-amber-400" />,
    poetry_lyrics: <Feather size={16} className="text-pink-400" />,
    academic_research: <Compass size={16} className="text-blue-400" />,
    socratic_learning: <GraduationCap size={16} className="text-purple-400" />,
    professional_business: <Briefcase size={16} className="text-cyan-400" />
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0d14] text-zinc-100 overflow-hidden font-sans select-none">
      {/* Top Banner: Mode Selector Navigation Bar */}
      <div className="px-5 py-3 border-b border-slate-800 bg-[#0c101a] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
            <Sparkles size={18} className="text-indigo-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wide text-white">Universal Field Studio</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                All-Subject Engine
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Transform the IDE across 6 sovereign disciplines: Code, Fiction, Poetry, Science, Learning & Legal
            </p>
          </div>
        </div>

        {/* Global Action notification */}
        {notification && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono animate-fadeIn">
            <CheckCircle2 size={13} />
            <span>{notification}</span>
          </div>
        )}

        {/* Active Mode Pill Indicator */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium"
            style={{
              borderColor: `${meta.accentColor}50`,
              backgroundColor: `${meta.accentColor}15`
            }}
          >
            {modeIcons[selectedMode]}
            <span style={{ color: meta.accentColor }}>{meta.name}</span>
            <span className="text-[10px] opacity-75 font-mono">({meta.badge})</span>
          </div>
        </div>
      </div>

      {/* Domain Mode Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-b border-slate-800 bg-[#0d121e]">
        {(Object.keys(UNIVERSAL_MODES) as UniversalStudioMode[]).map((modeKey) => {
          const m = UNIVERSAL_MODES[modeKey];
          const isSelected = selectedMode === modeKey;
          return (
            <button
              key={modeKey}
              onClick={() => handleSwitchMode(modeKey)}
              className={`flex items-center gap-2 px-3 py-2.5 text-xs text-left transition-all border-r border-slate-800/60 last:border-r-0 ${
                isSelected
                  ? 'bg-slate-800/80 font-semibold border-b-2'
                  : 'hover:bg-slate-800/40 text-zinc-400 hover:text-zinc-200'
              }`}
              style={{
                borderBottomColor: isSelected ? m.accentColor : 'transparent'
              }}
            >
              <div className="shrink-0">{modeIcons[modeKey]}</div>
              <div className="min-w-0">
                <div className={`truncate ${isSelected ? 'text-white' : ''}`}>{m.name.split('&')[0]}</div>
                <div className="text-[10px] text-zinc-500 truncate">{m.badge}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Inner Sub-navigation (Studio, Templates, Persona, Meter) */}
      <div className="px-5 py-2 border-b border-slate-800/80 bg-[#0a0d14] flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              activeTab === 'studio'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/50'
            }`}
          >
            Studio Generator
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              activeTab === 'templates'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/50'
            }`}
          >
            Domain Templates ({meta.starterTemplates.length})
          </button>
          <button
            onClick={() => setActiveTab('persona')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              activeTab === 'persona'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/50'
            }`}
          >
            System Persona
          </button>
          {selectedMode === 'poetry_lyrics' && (
            <button
              onClick={() => setActiveTab('meter')}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                activeTab === 'meter'
                  ? 'bg-pink-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/50'
              }`}
            >
              Poetic Meter & Syllable Counter
            </button>
          )}
        </div>

        {/* Suggested Local Tools */}
        <div className="hidden md:flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="text-zinc-500">Accelerated by:</span>
          {meta.suggestedTools.slice(0, 3).map((tool, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px] text-zinc-300"
            >
              {tool}
            </span>
          ))}
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Left Side: Domain Controls & Inputs */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-800 bg-[#0d121e]/50 flex flex-col min-h-0 p-4 overflow-y-auto space-y-4">
          {/* Domain Overview Card */}
          <div
            className="p-3.5 rounded-xl border space-y-2"
            style={{
              borderColor: `${meta.accentColor}30`,
              backgroundColor: `${meta.accentColor}08`
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">{meta.name}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium"
                style={{
                  backgroundColor: `${meta.accentColor}25`,
                  color: meta.accentColor
                }}
              >
                {meta.targetFileExtension} file
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">{meta.description}</p>
            <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>Target: {meta.targetFileExtension}</span>
              <span>Air-Gapped: 100%</span>
            </div>
          </div>

          {/* Quick Starter Prompts */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-400" />
              <span>Recommended Prompts</span>
            </label>
            <div className="space-y-1.5">
              {meta.starterTemplates.map((tmpl, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setPromptInput(tmpl.prompt);
                    handleGenerate(selectedMode, tmpl.prompt);
                  }}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-800 bg-[#0a0e17] hover:border-slate-700 hover:bg-slate-800/40 transition-colors group"
                >
                  <div className="text-xs font-medium text-zinc-200 group-hover:text-white flex items-center justify-between">
                    <span className="truncate">{tmpl.title}</span>
                    <ArrowRight
                      size={12}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400 shrink-0"
                    />
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate mt-0.5">{tmpl.prompt}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input Box */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-zinc-300">Creative Topic / Task Description</label>
            <textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              rows={3}
              placeholder={`Enter prompt for ${meta.name.toLowerCase()}...`}
              className="w-full p-2.5 rounded-lg bg-[#0a0d14] border border-slate-700 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none font-mono"
            />
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || !promptInput.trim()}
              className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Synthesizing Domain Logic...</span>
                </>
              ) : (
                <>
                  <Play size={13} />
                  <span>Generate Sovereign Content</span>
                </>
              )}
            </button>
          </div>

          {/* Privacy Guarantee */}
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-zinc-400 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <ShieldCheck size={13} />
              <span>Offline Data Sovereignty</span>
            </div>
            <p className="text-[10px] text-zinc-500">
              All literature, scientific drafts, and business models are processed on your local machine with zero external cloud telemetry.
            </p>
          </div>
        </div>

        {/* Right Side: Output Canvas / Inspector */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#080b11] overflow-hidden">
          {activeTab === 'studio' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Output Canvas Header */}
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-[#0a0d14]">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-200">
                    {generatedOutput?.title || 'Generated Canvas Draft'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-zinc-300 flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleInsertIntoEditor}
                    className="px-3 py-1 text-xs rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Plus size={12} />
                    <span>Apply to Monaco Editor</span>
                  </button>
                </div>
              </div>

              {/* Metrics Badge Strip */}
              {generatedOutput?.metrics && (
                <div className="px-5 py-2 border-b border-slate-800/60 bg-slate-900/30 flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Metrics:</span>
                  {Object.entries(generatedOutput.metrics).map(([key, val]) => (
                    <div
                      key={key}
                      className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[10px] font-mono text-zinc-300 flex items-center gap-1.5"
                    >
                      <span className="text-zinc-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-semibold text-emerald-400">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Text Canvas Content */}
              <div className="flex-1 p-6 overflow-y-auto font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap select-text bg-[#090c13]">
                {generatedOutput?.content || (
                  <span className="text-zinc-600 italic">No output generated yet. Click &quot;Generate Sovereign Content&quot; to begin.</span>
                )}
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Domain Template Showcase</h3>
                <p className="text-xs text-zinc-400">
                  Ready-to-use blueprints for {meta.name}. Click any template to inspect or insert it.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meta.starterTemplates.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-800 bg-[#0d121e] hover:border-slate-700 transition-colors flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-white">{t.title}</h4>
                        <span className="text-[10px] font-mono text-zinc-500">Template {idx + 1}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">{t.prompt}</p>
                      <pre className="mt-2.5 p-2 rounded bg-[#070a10] border border-slate-800/80 text-[10px] text-zinc-300 font-mono overflow-x-auto whitespace-pre-wrap max-h-32">
                        {t.preview}
                      </pre>
                    </div>

                    <button
                      onClick={() => {
                        setPromptInput(t.prompt);
                        setActiveTab('studio');
                        handleGenerate(selectedMode, t.prompt);
                      }}
                      className="w-full py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-zinc-200 font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                    >
                      <span>Load into Creative Studio</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'persona' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white font-sans">
                  Active Domain System Instructions
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  The foundational system prompt conditioning local LLMs when {meta.name} is active.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-[#0d121e] text-zinc-300 space-y-2 whitespace-pre-wrap">
                <div className="text-emerald-400 font-bold mb-1">// System Persona Prompt</div>
                {selectedMode === 'creative_story' && (
                  `You are an elite creative novelist, world-builder, and literary narrative architect.
Your focus is narrative momentum, character interiority, sensory descriptions, dialogue subtext, and pacing.
Maintain world lore consistency and character flaws across scenes.`
                )}
                {selectedMode === 'poetry_lyrics' && (
                  `You are a master poet and lyricist specializing in classical and contemporary forms.
Enforce strict syllable counts for haikus (5-7-5), sonnets (10-syllable iambic pentameter with ABAB rhyme), and ghazals.
Verify all stress patterns and emotional resonance.`
                )}
                {selectedMode === 'academic_research' && (
                  `You are a rigorous peer-reviewed scientific researcher and academic author.
Format mathematical formulations in standard LaTeX.
Structure outputs using ACM/IEEE standard sections: Abstract, Methodology, Proofs, Benchmarks, and References.`
                )}
                {selectedMode === 'socratic_learning' && (
                  `You are an inquisitive Socratic tutor and pedagogy specialist.
Break down complex ideas into 3 tiers: ELI5 intuitive analogy, Undergraduate formalization, and Graduate frontier.
Include interactive self-assessment quiz questions with detailed explanations.`
                )}
                {selectedMode === 'professional_business' && (
                  `You are a C-suite corporate strategist, commercial contract specialist, and venture analyst.
Draft executive-grade briefs, SWOT matrices, risk models, and defensible contract clauses.`
                )}
                {selectedMode === 'engineering' && (
                  `You are an expert full-stack systems software engineer.
Deliver high-performance, strictly-typed, modular code with automated tests and zero runtime exceptions.`
                )}
              </div>
            </div>
          )}

          {activeTab === 'meter' && selectedMode === 'poetry_lyrics' && (
            <div className="flex-1 p-6 overflow-y-auto space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Poetic Meter & Syllable Verifier</h3>
                <p className="text-xs text-zinc-400">
                  Real-time phonetic syllable and meter parsing for classical sonnets, haikus, and rhymed verse.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-pink-500/30 bg-pink-500/05 space-y-3">
                <label className="text-xs font-semibold text-zinc-200">Verse Line to Analyze:</label>
                <input
                  type="text"
                  value={meterInput}
                  onChange={(e) => handleMeterCheck(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#0a0d14] border border-slate-700 text-xs text-zinc-100 font-mono focus:outline-none focus:border-pink-500"
                />

                <div className="flex items-center gap-4 pt-2">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-3">
                    <span className="text-xs text-zinc-400">Syllable Count:</span>
                    <span className="text-xl font-bold font-mono text-pink-400">{meterSyllables}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-3">
                    <span className="text-xs text-zinc-400">Meter Classification:</span>
                    <span className="text-xs font-semibold font-mono text-zinc-200">
                      {meterSyllables === 10
                        ? 'Iambic Pentameter (Sonnet line)'
                        : meterSyllables === 5
                        ? 'Haiku Line 1 / 3'
                        : meterSyllables === 7
                        ? 'Haiku Line 2'
                        : meterSyllables === 8
                        ? 'Iambic Tetrameter'
                        : `${meterSyllables} syllables (Free verse)`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
