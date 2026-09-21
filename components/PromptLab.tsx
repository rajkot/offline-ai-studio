'use client';

import { useState, useEffect } from 'react';
import { Beaker, GitCompare, Save, Play, BarChart2, SlidersHorizontal, RefreshCw, CheckCircle2 } from 'lucide-react';

interface PromptVersion {
  version: string;
  content: string;
}

interface PromptTemplate {
  id: string;
  name: string;
  versions: PromptVersion[];
}

interface ABTestResults {
  promptA: { latency: number; tokensPerSec: number; qualityScore: number };
  promptB: { latency: number; tokensPerSec: number; qualityScore: number };
  winner: 'A' | 'B';
  trafficSplit: { a: number; b: number };
}

export default function PromptLab() {
  const [activeTab, setActiveTab] = useState<'editor' | 'ab-test'>('editor');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('');
  const [activeVersion, setActiveVersion] = useState<string>('');
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // A/B Test State
  const [selectedPromptA, setSelectedPromptA] = useState('');
  const [selectedPromptB, setSelectedPromptB] = useState('');
  const [splitRatio, setSplitRatio] = useState(50);
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<ABTestResults | null>(null);

  useEffect(() => {
    fetch('/api/prompts')
      .then(res => res.json())
      .then(data => {
        if (data.templates && data.templates.length > 0) {
          setTemplates(data.templates);
          setActiveTemplateId(data.templates[0].id);
          setActiveVersion(data.templates[0].versions[0].version);
          setEditorContent(data.templates[0].versions[0].content);
          
          setSelectedPromptA(`${data.templates[0].id}@${data.templates[0].versions[0].version}`);
          if (data.templates[0].versions.length > 1) {
            setSelectedPromptB(`${data.templates[0].id}@${data.templates[0].versions[1].version}`);
          }
        }
      })
      .catch(err => console.error('Failed to load prompts', err));
  }, []);

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setActiveTemplateId(templateId);
      setActiveVersion(template.versions[0].version);
      setEditorContent(template.versions[0].content);
    }
  };

  const handleVersionChange = (version: string) => {
    const template = templates.find(t => t.id === activeTemplateId);
    if (template) {
      const v = template.versions.find(v => v.version === version);
      if (v) {
        setActiveVersion(version);
        setEditorContent(v.content);
      }
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate save
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 800);
  };

  const runABTest = async () => {
    if (!selectedPromptA || !selectedPromptB) return;
    setIsTesting(true);
    setTestResults(null);
    try {
      const res = await fetch('/api/prompts/ab-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptA: selectedPromptA, promptB: selectedPromptB, splitRatio })
      });
      if (res.ok) {
        const data = await res.json();
        setTestResults(data);
      }
    } catch (e) {
      console.error('A/B Test failed', e);
    } finally {
      setIsTesting(false);
    }
  };

  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  return (
    <div className="h-full flex flex-col bg-slate-50 font-sans overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Beaker size={20} className="text-purple-600" />
              Prompt Lab & A/B Studio
            </h2>
            <p className="text-xs text-slate-500 mt-1">Version control and test system prompts for optimal LLM performance.</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('editor')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'editor' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Template Editor
            </button>
            <button
              onClick={() => setActiveTab('ab-test')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'ab-test' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              A/B Testing
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'editor' && (
          <div className="absolute inset-0 flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-200 bg-white p-4 overflow-y-auto">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">System Prompts</h3>
              <div className="space-y-2">
                {templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateChange(t.id)}
                    className={`w-full text-left p-2 rounded-lg text-sm transition-colors ${activeTemplateId === t.id ? 'bg-purple-50 text-purple-700 font-medium border border-purple-200' : 'text-slate-700 hover:bg-slate-100 border border-transparent'}`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 flex flex-col bg-slate-50 p-4">
              {activeTemplate ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-800">{activeTemplate.name}</h3>
                      <select 
                        value={activeVersion}
                        onChange={(e) => handleVersionChange(e.target.value)}
                        className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:outline-none focus:border-purple-500 font-mono text-purple-700"
                      >
                        {activeTemplate.versions.map(v => (
                          <option key={v.version} value={v.version}>{v.version}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-70"
                    >
                      {isSaving ? <RefreshCw size={16} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={16} /> : <Save size={16} />}
                      {saveSuccess ? 'Saved' : 'Save Version'}
                    </button>
                  </div>
                  <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
                      <span className="text-xs font-mono text-slate-300">system_message.txt</span>
                      <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">Tokens: ~{Math.floor(editorContent.length / 4)}</span>
                    </div>
                    <textarea 
                      value={editorContent}
                      onChange={(e) => setEditorContent(e.target.value)}
                      className="flex-1 w-full p-4 resize-none focus:outline-none text-sm font-mono text-slate-800 leading-relaxed"
                      placeholder="Enter system prompt here..."
                    />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">Select a template to edit</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ab-test' && (
          <div className="absolute inset-0 overflow-y-auto p-6 flex flex-col gap-6">
            
            {/* Controls */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <SlidersHorizontal size={18} className="text-purple-600" />
                Experiment Configuration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Prompt A (Control)</label>
                  <select 
                    value={selectedPromptA} 
                    onChange={e => setSelectedPromptA(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select a prompt version...</option>
                    {templates.map(t => t.versions.map(v => (
                      <option key={`${t.id}@${v.version}`} value={`${t.id}@${v.version}`}>{t.name} - {v.version}</option>
                    )))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">Prompt B (Variant)</label>
                  <select 
                    value={selectedPromptB} 
                    onChange={e => setSelectedPromptB(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">Select a prompt version...</option>
                    {templates.map(t => t.versions.map(v => (
                      <option key={`${t.id}@${v.version}`} value={`${t.id}@${v.version}`}>{t.name} - {v.version}</option>
                    )))}
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex justify-between text-sm font-medium mb-2 text-slate-700">
                  <span>Split Ratio (Traffic)</span>
                  <span className="font-mono">{splitRatio}% A / {100 - splitRatio}% B</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" step="10" 
                  value={splitRatio} 
                  onChange={e => setSplitRatio(parseInt(e.target.value))}
                  className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={runABTest}
                  disabled={!selectedPromptA || !selectedPromptB || isTesting}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-md"
                >
                  {isTesting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                  Run Simulation
                </button>
              </div>
            </div>

            {/* Results */}
            {testResults && (
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <BarChart2 size={18} className="text-purple-600" />
                    Analytics Scorecard
                  </h3>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold border border-green-200">
                    Winner: Prompt {testResults.winner}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Card A */}
                  <div className={`p-4 rounded-xl border-2 transition-colors ${testResults.winner === 'A' ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                    <h4 className="text-center font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200/60">
                      Variant A (Control)
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Average Latency</div>
                        <div className="text-xl font-mono text-slate-900">{testResults.promptA.latency} <span className="text-sm text-slate-500">ms</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Token Utilization</div>
                        <div className="text-xl font-mono text-slate-900">{testResults.promptA.tokensPerSec} <span className="text-sm text-slate-500">tok/s</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Quality Score</div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                          <div className={`h-2 rounded-full ${testResults.promptA.qualityScore > 90 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${testResults.promptA.qualityScore}%` }}></div>
                        </div>
                        <div className="text-right text-xs font-bold">{testResults.promptA.qualityScore}/100</div>
                      </div>
                    </div>
                  </div>

                  {/* Card B */}
                  <div className={`p-4 rounded-xl border-2 transition-colors ${testResults.winner === 'B' ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
                    <h4 className="text-center font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200/60">
                      Variant B (Test)
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Average Latency</div>
                        <div className="text-xl font-mono text-slate-900">{testResults.promptB.latency} <span className="text-sm text-slate-500">ms</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Token Utilization</div>
                        <div className="text-xl font-mono text-slate-900">{testResults.promptB.tokensPerSec} <span className="text-sm text-slate-500">tok/s</span></div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Quality Score</div>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-1">
                          <div className={`h-2 rounded-full ${testResults.promptB.qualityScore > 90 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${testResults.promptB.qualityScore}%` }}></div>
                        </div>
                        <div className="text-right text-xs font-bold">{testResults.promptB.qualityScore}/100</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
