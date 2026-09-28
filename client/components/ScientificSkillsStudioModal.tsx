import React, { useState, useEffect } from 'react';
import {
  Microscope,
  Search,
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Dna,
  Activity,
  Boxes,
  FlaskConical,
  ShieldAlert,
  Crosshair,
  Binary,
  Atom,
  TrendingUp,
  Network,
  Cpu,
  Sliders,
  BookOpen,
  FileText,
  Database,
  ArrowRight,
  Bot,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { ScientificSkillDefinition, ScientificDomain, scientificSkillsEngine } from '@/lib/ai/scientificSkillsEngine';

interface ScientificSkillsStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile?: string;
  onSelectSkillForAutonomous?: (skillId: string, prompt: string) => void;
  onSelectSkillForComposer?: (skillId: string, prompt: string) => void;
  onInsertToEditor?: (content: string) => void;
}

export const ScientificSkillsStudioModal: React.FC<ScientificSkillsStudioModalProps> = ({
  isOpen,
  onClose,
  activeFile = '',
  onSelectSkillForAutonomous,
  onSelectSkillForComposer,
  onInsertToEditor
}) => {
  const [skills, setSkills] = useState<ScientificSkillDefinition[]>([]);
  const [categories, setCategories] = useState<{ id: ScientificDomain; label: string; color: string; icon: string; count: number }[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<string>('bio-crispr-guide-design');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [researchQuery, setResearchQuery] = useState<string>('');
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<string>('qwen2.5:1.5b');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadSkills();
    }
  }, [isOpen]);

  const loadSkills = async () => {
    try {
      const res = await fetch('/api/scientific-skills');
      if (res.ok) {
        const data = await res.json();
        setSkills(data.skills || []);
        setCategories(data.categories || []);
      } else {
        setSkills(scientificSkillsEngine.getAllSkills());
        setCategories(scientificSkillsEngine.getCategories());
      }
    } catch {
      setSkills(scientificSkillsEngine.getAllSkills());
      setCategories(scientificSkillsEngine.getCategories());
    }
  };

  const selectedSkill = skills.find(s => s.id === selectedSkillId) || skills[0];

  useEffect(() => {
    if (selectedSkill && selectedSkill.exampleQueries && selectedSkill.exampleQueries.length > 0) {
      setResearchQuery(selectedSkill.exampleQueries[0]);
      setExecutionResult(null);
    }
  }, [selectedSkillId]);

  if (!isOpen) return null;

  const filteredSkills = skills.filter(skill => {
    const matchesDomain = selectedDomain === 'all' || skill.domain === selectedDomain;
    const matchesQuery =
      skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.databaseAccess.some(db => db.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDomain && matchesQuery;
  });

  const handleExecute = async () => {
    if (!selectedSkill || !researchQuery.trim()) return;
    setExecuting(true);
    setExecutionResult(null);

    try {
      const res = await fetch('/api/scientific-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'executeSkill',
          skillId: selectedSkill.id,
          task: researchQuery,
          model: selectedModel,
          useOnlineAi: false
        })
      });
      const data = await res.json();
      setExecutionResult(data);
    } catch (err: any) {
      setExecutionResult({
        success: false,
        error: err.message || 'Execution failed'
      });
    } finally {
      setExecuting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDomainIcon = (iconName: string, color: string) => {
    const size = 15;
    switch (iconName) {
      case 'Dna': return <Dna size={size} style={{ color }} />;
      case 'Activity': return <Activity size={size} style={{ color }} />;
      case 'Boxes': return <Boxes size={size} style={{ color }} />;
      case 'FlaskConical': return <FlaskConical size={size} style={{ color }} />;
      case 'ShieldAlert': return <ShieldAlert size={size} style={{ color }} />;
      case 'Crosshair': return <Crosshair size={size} style={{ color }} />;
      case 'Binary': return <Binary size={size} style={{ color }} />;
      case 'Atom': return <Atom size={size} style={{ color }} />;
      case 'TrendingUp': return <TrendingUp size={size} style={{ color }} />;
      case 'Network': return <Network size={size} style={{ color }} />;
      case 'Cpu': return <Cpu size={size} style={{ color }} />;
      case 'Sliders': return <Sliders size={size} style={{ color }} />;
      case 'BookOpen': return <BookOpen size={size} style={{ color }} />;
      case 'FileText': return <FileText size={size} style={{ color }} />;
      default: return <Microscope size={size} style={{ color }} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-[#121214] border border-zinc-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-950/40 via-[#18181b] to-cyan-950/40 border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 rounded-lg shadow-inner">
              <Microscope size={18} className="text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Scientific Agent Skills Studio</h2>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-mono font-medium">
                  {skills.length} Validated Skills
                </span>
                <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-full text-[10px] font-mono">
                  100+ DBs Connected
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Peer-reviewed research workflows for bioinformatics, cheminformatics, physics, statistics & AI science.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadSkills}
              className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Refresh Skills"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Split View Content */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar: Search & Skills List */}
          <div className="w-80 border-r border-zinc-800/80 bg-[#141417] flex flex-col shrink-0">
            {/* Search Input */}
            <div className="p-3 border-b border-zinc-800/80">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search scientific skills, DBs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-zinc-700/60 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              {/* Domain Filter Chips */}
              <div className="flex flex-wrap gap-1 mt-2.5 max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                <button
                  onClick={() => setSelectedDomain('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                    selectedDomain === 'all'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All ({skills.length})
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedDomain(cat.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                      selectedDomain === cat.id
                        ? 'bg-zinc-700 text-white border border-zinc-500'
                        : 'bg-zinc-800/40 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {cat.label.split(' ')[0]} ({cat.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Skill List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800">
              {filteredSkills.map(skill => {
                const isSelected = selectedSkill?.id === skill.id;
                return (
                  <div
                    key={skill.id}
                    onClick={() => setSelectedSkillId(skill.id)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start justify-between group ${
                      isSelected
                        ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm'
                        : 'bg-zinc-900/30 border-zinc-800/60 hover:bg-zinc-800/40 hover:border-zinc-700/80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-md bg-zinc-800/80 border border-zinc-700/50 shrink-0 mt-0.5">
                        {getDomainIcon(skill.icon, skill.domainColor)}
                      </div>
                      <div className="min-w-0">
                        <span className={`text-xs font-semibold truncate block ${isSelected ? 'text-emerald-200' : 'text-zinc-200'}`}>
                          {skill.name}
                        </span>
                        <p className="text-[10.5px] text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                          {skill.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                          <span
                            className="text-[9px] px-1.5 py-0.2 rounded font-mono font-medium"
                            style={{ backgroundColor: `${skill.domainColor}15`, color: skill.domainColor, border: `1px solid ${skill.domainColor}30` }}
                          >
                            {skill.domainLabel.split('&')[0].trim()}
                          </span>
                          {skill.databaseAccess.slice(0, 1).map(db => (
                            <span key={db} className="text-[9px] px-1 py-0.2 bg-zinc-800/80 text-zinc-400 border border-zinc-700/40 rounded font-mono truncate max-w-[90px]">
                              {db}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Content Area: Skill Detail & Execution */}
          <div className="flex-1 flex flex-col bg-[#101012] overflow-hidden">
            
            {/* Selected Skill Header */}
            {selectedSkill && (
              <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60 mt-0.5">
                      {getDomainIcon(selectedSkill.icon, selectedSkill.domainColor)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{selectedSkill.name}</h3>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-mono font-medium"
                          style={{ backgroundColor: `${selectedSkill.domainColor}20`, color: selectedSkill.domainColor, border: `1px solid ${selectedSkill.domainColor}40` }}
                        >
                          {selectedSkill.domainLabel}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1">{selectedSkill.description}</p>
                      
                      {/* Databases and Required Tools */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                          <Database size={12} className="text-cyan-400" />
                          <span className="font-semibold text-zinc-300">Databases:</span>
                          <span className="text-cyan-300/90">{selectedSkill.databaseAccess.join(', ')}</span>
                        </div>
                        <span className="text-zinc-700">|</span>
                        <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                          <Sparkles size={12} className="text-amber-400" />
                          <span className="font-semibold text-zinc-300">Tools:</span>
                          <span className="text-amber-300/90 font-mono">{selectedSkill.requiredTools.join(', ')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Shortcuts */}
                  <div className="flex items-center gap-2">
                    {onSelectSkillForAutonomous && (
                      <button
                        onClick={() => {
                          onSelectSkillForAutonomous(selectedSkill.id, researchQuery);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 bg-purple-950/70 hover:bg-purple-900 border border-purple-500/40 text-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Dispatch Autonomous AI Scientist"
                      >
                        <Bot size={13} className="text-purple-400" />
                        <span>AI Scientist</span>
                      </button>
                    )}
                    {onSelectSkillForComposer && (
                      <button
                        onClick={() => {
                          onSelectSkillForComposer(selectedSkill.id, researchQuery);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/40 text-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Send to Agentic Composer"
                      >
                        <Sparkles size={13} className="text-indigo-400" />
                        <span>Composer</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Execution & Playground Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                
                {/* Left Column: Query Form & Presets */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Scientific Query & Parameters
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Active Model: {selectedModel}
                    </span>
                  </div>

                  {/* Preset Queries */}
                  {selectedSkill?.exampleQueries && selectedSkill.exampleQueries.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-zinc-400">Research Presets:</label>
                      <div className="space-y-1">
                        {selectedSkill.exampleQueries.map((ex, idx) => (
                          <button
                            key={idx}
                            onClick={() => setResearchQuery(ex)}
                            className="w-full text-left p-2 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-[11px] leading-relaxed transition-colors cursor-pointer"
                          >
                            💡 {ex}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Query Box */}
                  <div className="space-y-1.5 flex-1 flex flex-col">
                    <label className="text-[11px] font-semibold text-zinc-400">Custom Research Prompt:</label>
                    <textarea
                      rows={5}
                      value={researchQuery}
                      onChange={(e) => setResearchQuery(e.target.value)}
                      placeholder="Enter scientific objective, target sequence, SMILES, or dataset question..."
                      className="w-full flex-1 bg-zinc-950 border border-zinc-700/80 rounded-md p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 font-mono resize-none"
                    />
                  </div>

                  <button
                    onClick={handleExecute}
                    disabled={executing || !researchQuery.trim()}
                    className={`w-full py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      executing
                        ? 'bg-emerald-600/50 text-zinc-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-black shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    {executing ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Running Scientific Analysis...</span>
                      </>
                    ) : (
                      <>
                        <Play size={13} fill="currentColor" />
                        <span>Execute Scientific Skill</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Column: Execution Output */}
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Peer-Review Research Analysis
                      </h4>
                      {executionResult && (
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-mono flex items-center gap-1 ${
                          executionResult.success
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {executionResult.success ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                          {executionResult.success ? 'Validated' : 'Error'}
                        </span>
                      )}
                    </div>

                    {executionResult && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-zinc-500">
                          {executionResult.durationMs}ms
                        </span>
                        <button
                          onClick={() => copyToClipboard(executionResult.result || JSON.stringify(executionResult, null, 2))}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white cursor-pointer"
                          title="Copy Output"
                        >
                          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                        {onInsertToEditor && (
                          <button
                            onClick={() => onInsertToEditor(executionResult.result || '')}
                            className="px-2 py-0.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded text-[10.5px] cursor-pointer"
                          >
                            Insert to File
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 bg-zinc-950 border border-zinc-800/80 rounded-lg p-3.5 font-mono text-xs overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
                    {executionResult ? (
                      <div className="text-zinc-200 whitespace-pre-wrap leading-relaxed space-y-2">
                        {executionResult.result}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-600 text-center p-4">
                        <Microscope size={26} className="mb-2 opacity-50" />
                        <p className="text-xs">Select a scientific research query and click "Execute Scientific Skill".</p>
                        <p className="text-[10px] text-zinc-600 mt-1">Outputs mathematical derivations, RDKit/BioPython scripts, and validation steps.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
