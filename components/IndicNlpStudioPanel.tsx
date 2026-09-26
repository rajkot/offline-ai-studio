'use client';

import React, { useState, useEffect } from 'react';
import {
  Languages,
  BookOpen,
  Sparkles,
  Database,
  Cpu,
  Search,
  Copy,
  Check,
  RefreshCw,
  FolderGit2,
  ExternalLink,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileCode,
  ArrowRight,
  Terminal,
  Activity,
  Layers,
  Download,
  Code2,
  Share2,
  Play
} from 'lucide-react';
import { INDIC_LANGUAGES, CLASSIFICATION_BENCHMARKS } from '@/lib/indicNlpEngine';

interface IndicNlpStudioPanelProps {
  onOpenFile?: (path: string) => void;
}

export default function IndicNlpStudioPanel({ onOpenFile }: IndicNlpStudioPanelProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'vector' | 'tokenizer' | 'classifier' | 'recipes'>('catalog');
  const [statusLoading, setStatusLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Backend Status State
  const [backendData, setBackendData] = useState<{
    hasRepo: boolean;
    indicnlpDir: string | null;
    gitBranch: string;
    gitCommit: string;
    hasPython: boolean;
    pythonVersion: string;
    hasFastText: boolean;
    hasIndicNlpLibrary: boolean;
    availableScripts: string[];
    languages: typeof INDIC_LANGUAGES;
    benchmarks: typeof CLASSIFICATION_BENCHMARKS;
  }>({
    hasRepo: true,
    indicnlpDir: 'integrations/indicnlp_corpus',
    gitBranch: 'master',
    gitCommit: 'latest',
    hasPython: true,
    pythonVersion: 'Python 3.11',
    hasFastText: false,
    hasIndicNlpLibrary: false,
    availableScripts: ['txtcls.py', 'word_similarity/wordsim.py', 'word_analogy/word_analogy.py'],
    languages: INDIC_LANGUAGES,
    benchmarks: CLASSIFICATION_BENCHMARKS
  });

  // Filter state for catalog
  const [familyFilter, setFamilyFilter] = useState<'all' | 'Indo-Aryan' | 'Dravidian'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguageCode, setSelectedLanguageCode] = useState('hi');

  // Vector Explorer State
  const [word1, setWord1] = useState('भारत');
  const [word2, setWord2] = useState('देश');
  const [similarityResult, setSimilarityResult] = useState<{
    similarity: number;
    similarityPercent: number;
    nearestToWord1: { word: string; similarity: number }[];
    nearestToWord2: { word: string; similarity: number }[];
  } | null>(null);
  const [isSimLoading, setIsSimLoading] = useState(false);

  // Tokenizer State
  const [tokenizerText, setTokenizerText] = useState(
    'भारत एक विशाल और सांस्कृतिक रूप से समृद्ध लोकतांत्रिक देश है। यहाँ विभिन्न भाषाएं बोली जाती हैं।'
  );
  const [tokenizerResult, setTokenizerResult] = useState<{
    tokens: string[];
    sentences: string[];
    tokenCount: number;
    sentenceCount: number;
    detectedScript: string;
  } | null>(null);
  const [isTokenizing, setIsTokenizing] = useState(false);

  // Classifier State
  const [classifierText, setClassifierText] = useState(
    'भारतीय क्रिकेट टीम ने रोमांचक मुकाबले में फाइनल मैच जीतकर ट्रॉफी अपने नाम की।'
  );
  const [classifierResult, setClassifierResult] = useState<{
    topCategory: string;
    confidence: number;
    predictions: { name: string; label: string; score: number; confidence: number }[];
  } | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);

  // Fetch initial status
  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/indicnlp');
      if (res.ok) {
        const data = await res.json();
        setBackendData(data);
      }
    } catch (e) {
      console.error('Failed to load IndicNLP status', e);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Run initial similarity demo
    handleComputeSimilarity();
    // Run initial tokenization
    handleTokenize();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleComputeSimilarity = async (w1 = word1, w2 = word2) => {
    setIsSimLoading(true);
    try {
      const res = await fetch('/api/indicnlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'similarity', word1: w1, word2: w2 })
      });
      const data = await res.json();
      if (data.success) {
        setSimilarityResult(data);
      }
    } catch (err) {
      console.error('Error computing similarity', err);
    } finally {
      setIsSimLoading(false);
    }
  };

  const handleTokenize = async () => {
    setIsTokenizing(true);
    try {
      const res = await fetch('/api/indicnlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tokenize', text: tokenizerText, lang: selectedLanguageCode })
      });
      const data = await res.json();
      if (data.success) {
        setTokenizerResult(data);
      }
    } catch (err) {
      console.error('Error tokenizing', err);
    } finally {
      setIsTokenizing(false);
    }
  };

  const handleClassify = async () => {
    setIsClassifying(true);
    try {
      const res = await fetch('/api/indicnlp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'classify', text: classifierText, lang: selectedLanguageCode })
      });
      const data = await res.json();
      if (data.success) {
        setClassifierResult(data);
      }
    } catch (err) {
      console.error('Error classifying', err);
    } finally {
      setIsClassifying(false);
    }
  };

  const filteredLanguages = backendData.languages.filter(l => {
    const matchesFamily = familyFilter === 'all' || l.family === familyFilter;
    const matchesSearch =
      searchQuery === '' ||
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.nativeName.includes(searchQuery) ||
      l.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFamily && matchesSearch;
  });

  const activeLangMeta = backendData.languages.find(l => l.code === selectedLanguageCode) || backendData.languages[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0f] text-zinc-200 overflow-hidden font-sans">
      {/* Top Banner & Header */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/80 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shrink-0 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 ring-1 ring-white/20">
            <Languages size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                AI4Bharat IndicNLP Corpus & Vectors
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  v1.0 Integrated
                </span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              General-domain corpora, 300D FastText embeddings, tokenizer & benchmarks across 12 Indian languages
            </p>
          </div>
        </div>

        {/* Status badges & Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
            <FolderGit2 size={13} className="text-cyan-400" />
            <span className="font-mono text-zinc-400">Branch:</span>
            <span className="font-semibold text-white">{backendData.gitBranch}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
            <Cpu size={13} className="text-amber-400" />
            <span className="font-mono text-zinc-400">Runtime:</span>
            <span className="font-semibold text-white">{backendData.pythonVersion || 'Python 3.11'}</span>
          </div>

          <button
            onClick={() => onOpenFile?.('integrations/indicnlp_corpus/README.md')}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 transition-colors cursor-pointer border border-zinc-700"
            title="Open IndicNLP README in Editor"
          >
            <BookOpen size={13} className="text-indigo-400" />
            <span>View README</span>
          </button>

          <button
            onClick={fetchStatus}
            disabled={statusLoading}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer border border-zinc-800"
            title="Refresh integration state"
          >
            <RefreshCw size={14} className={statusLoading ? 'animate-spin text-amber-400' : ''} />
          </button>
        </div>
      </div>

      {/* Primary Tab Navigation */}
      <div className="border-b border-zinc-800/80 bg-zinc-950/40 px-6 flex items-center gap-1 shrink-0 overflow-x-auto">
        {[
          { id: 'catalog', label: '12 Languages & Corpora', icon: <Database size={14} /> },
          { id: 'vector', label: 'Semantic Vector Explorer', icon: <Sparkles size={14} /> },
          { id: 'tokenizer', label: 'Indic Tokenizer & Normalizer', icon: <Languages size={14} /> },
          { id: 'classifier', label: 'News Benchmarks & Classifier', icon: <Activity size={14} /> },
          { id: 'recipes', label: 'Offline RAG & Code Recipes', icon: <Code2 size={14} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-indigo-500 text-white bg-indigo-500/10'
                : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-indigo-400' : 'text-zinc-500'}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: Corpora & Catalog */}
        {activeTab === 'catalog' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-950/80 border border-indigo-700/50 text-indigo-400 flex items-center justify-center shrink-0">
                  <Languages size={22} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Supported Languages</div>
                  <div className="text-2xl font-bold text-white mt-0.5">12 Major Indic</div>
                  <div className="text-[11px] text-indigo-400 mt-0.5">Indo-Aryan & Dravidian</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 flex items-center justify-center shrink-0">
                  <Database size={22} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Total Corpus Tokens</div>
                  <div className="text-2xl font-bold text-white mt-0.5">9.0+ Billion</div>
                  <div className="text-[11px] text-emerald-400 mt-0.5">Monolingual web text</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-950/80 border border-amber-700/50 text-amber-400 flex items-center justify-center shrink-0">
                  <BookOpen size={22} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Total Sentences</div>
                  <div className="text-2xl font-bold text-white mt-0.5">370+ Million</div>
                  <div className="text-[11px] text-amber-400 mt-0.5">Pre-tokenized Indic NLP</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-950/80 border border-purple-700/50 text-purple-400 flex items-center justify-center shrink-0">
                  <Sparkles size={22} />
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">Word Embeddings</div>
                  <div className="text-2xl font-bold text-white mt-0.5">300 Dimensions</div>
                  <div className="text-[11px] text-purple-400 mt-0.5">FastText Skipgram (.vec/.bin)</div>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search languages or script..."
                    className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {(['all', 'Indo-Aryan', 'Dravidian'] as const).map(fam => (
                    <button
                      key={fam}
                      onClick={() => setFamilyFilter(fam)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                        familyFilter === fam
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {fam === 'all' ? 'All Families' : fam}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-xs text-zinc-400">
                Showing <span className="font-semibold text-white">{filteredLanguages.length}</span> of 12 languages
              </div>
            </div>

            {/* Language Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLanguages.map(lang => {
                const isSelected = selectedLanguageCode === lang.code;
                return (
                  <div
                    key={lang.code}
                    onClick={() => setSelectedLanguageCode(lang.code)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-zinc-900/90 border-indigo-500 ring-1 ring-indigo-500/50 shadow-lg'
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/70'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl font-bold font-mono text-zinc-300">{lang.nativeName}</span>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">{lang.name}</span>
                          <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">{lang.code} • {lang.script}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        lang.family === 'Dravidian'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-700/50'
                          : 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50'
                      }`}>
                        {lang.family}
                      </span>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-zinc-800/60 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                        <div className="text-[10px] text-zinc-500">Articles</div>
                        <div className="text-xs font-semibold text-zinc-200 mt-0.5">{lang.articles}</div>
                      </div>
                      <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                        <div className="text-[10px] text-zinc-500">Sentences</div>
                        <div className="text-xs font-semibold text-zinc-200 mt-0.5">{lang.sentences}</div>
                      </div>
                      <div className="bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                        <div className="text-[10px] text-zinc-500">Tokens</div>
                        <div className="text-xs font-semibold text-emerald-400 mt-0.5">{lang.tokens}</div>
                      </div>
                    </div>

                    <div className="mt-3 text-[11px] text-zinc-400 italic line-clamp-2 bg-zinc-950/30 p-2 rounded-lg border border-zinc-800/40">
                      &ldquo;{lang.sampleSentence}&rdquo;
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800/40 text-[11px]">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        {lang.vectorUrl ? (
                          <span className="text-emerald-400 flex items-center gap-1 text-[10px]">
                            <CheckCircle2 size={11} /> 300D FastText
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[10px]">Corpus Only</span>
                        )}
                      </div>
                      <a
                        href={lang.corpusUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Download size={11} />
                        <span>Corpus .txt</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Language Deep Dive */}
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold text-sm">
                    {activeLangMeta.code.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      {activeLangMeta.name} ({activeLangMeta.nativeName}) Resource Pack
                    </h3>
                    <p className="text-xs text-zinc-400">Download links and direct AI4Bharat asset links</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTokenizerText(activeLangMeta.sampleSentence);
                    setActiveTab('tokenizer');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                >
                  <Play size={12} />
                  <span>Test in Tokenizer</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Raw Text Corpus</span>
                    <span className="text-[10px] text-emerald-400">{activeLangMeta.tokens} tokens</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Tokenized monolingual news corpus from AI4Bharat</p>
                  <a
                    href={activeLangMeta.corpusUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline pt-1"
                  >
                    <ExternalLink size={12} /> Direct Download .txt
                  </a>
                </div>

                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">FastText 300D Vectors</span>
                    <span className="text-[10px] text-indigo-400">Skipgram</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Pre-trained word embedding vectors (.vec format)</p>
                  {activeLangMeta.vectorUrl ? (
                    <a
                      href={activeLangMeta.vectorUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline pt-1"
                    >
                      <Download size={12} /> Download .vec.gz
                    </a>
                  ) : (
                    <span className="text-[11px] text-zinc-600">Embedding unavailable</span>
                  )}
                </div>

                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">Morfessor Morphanalyzer</span>
                    <span className="text-[10px] text-purple-400">Unsupervised</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">Subword & morphological segmentation model</p>
                  {activeLangMeta.morfessorUrl ? (
                    <a
                      href={activeLangMeta.morfessorUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline pt-1"
                    >
                      <Download size={12} /> Download .model.gz
                    </a>
                  ) : (
                    <span className="text-[11px] text-zinc-600">Model unavailable</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Semantic Vector Explorer */}
        {activeTab === 'vector' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950 border border-purple-700/60 text-purple-400 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Indic Semantic Vector Similarity</h2>
                  <p className="text-xs text-zinc-400">
                    Compare cosine proximity between Indian language words or test cross-lingual semantic alignment
                  </p>
                </div>
              </div>

              {/* Input pair */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                    <span>Word 1 (Indic / English)</span>
                    <span className="text-[10px] text-zinc-500 font-mono">e.g. भारत, पुस्तक, জল, நாடு</span>
                  </label>
                  <input
                    type="text"
                    value={word1}
                    onChange={e => setWord1(e.target.value)}
                    placeholder="Enter first word..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                    <span>Word 2 (Indic / English)</span>
                    <span className="text-[10px] text-zinc-500 font-mono">e.g. देश, किताब, পানি, மொழி</span>
                  </label>
                  <input
                    type="text"
                    value={word2}
                    onChange={e => setWord2(e.target.value)}
                    placeholder="Enter second word..."
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                <span className="text-zinc-500 text-[11px]">Quick Presets:</span>
                {[
                  { w1: 'भारत', w2: 'देश', label: 'भारत / देश (Country)' },
                  { w1: 'पुस्तक', w2: 'किताब', label: 'पुस्तक / किताब (Book)' },
                  { w1: 'জল', w2: 'পানি', label: 'জল / পানি (Water - Bengali)' },
                  { w1: 'தமிழ்', w2: 'மொழி', label: 'தமிழ் / மொழி (Language - Tamil)' },
                  { w1: 'સૂર્ય', w2: 'ચાંદ', label: 'સૂર્ય / ચાંદ (Sun/Moon - Gujarati)' }
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setWord1(preset.w1);
                      setWord2(preset.w2);
                      handleComputeSimilarity(preset.w1, preset.w2);
                    }}
                    className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors cursor-pointer border border-zinc-700/60"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Compute Button */}
              <button
                onClick={() => handleComputeSimilarity()}
                disabled={isSimLoading || !word1 || !word2}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:brightness-110 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSimLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>Compute Cosine Vector Similarity</span>
              </button>
            </div>

            {/* Results Display */}
            {similarityResult && (
              <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Semantic Match Score</div>
                    <div className="text-3xl font-extrabold text-white mt-1 flex items-baseline gap-2">
                      <span>{similarityResult.similarityPercent}%</span>
                      <span className="text-xs font-mono font-normal text-zinc-400">
                        (Cosine: {similarityResult.similarity.toFixed(4)})
                      </span>
                    </div>
                  </div>

                  <div className="w-full sm:w-64 bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-right">
                    <div className="text-[11px] text-zinc-400">Semantic Alignment</div>
                    <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${similarityResult.similarityPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Nearest Neighbors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                    <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-purple-400" />
                      <span>Nearest Semantic Neighbors to &ldquo;{word1}&rdquo;</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {similarityResult.nearestToWord1?.map(item => (
                        <div
                          key={item.word}
                          onClick={() => {
                            setWord2(item.word);
                            handleComputeSimilarity(word1, item.word);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 text-xs transition-colors cursor-pointer border border-zinc-800/40"
                        >
                          <span className="font-semibold text-white">{item.word}</span>
                          <span className="font-mono text-[11px] text-emerald-400">
                            {(item.similarity * 100).toFixed(1)}% match
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                    <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-cyan-400" />
                      <span>Nearest Semantic Neighbors to &ldquo;{word2}&rdquo;</span>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      {similarityResult.nearestToWord2?.map(item => (
                        <div
                          key={item.word}
                          onClick={() => {
                            setWord1(item.word);
                            handleComputeSimilarity(item.word, word2);
                          }}
                          className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 text-xs transition-colors cursor-pointer border border-zinc-800/40"
                        >
                          <span className="font-semibold text-white">{item.word}</span>
                          <span className="font-mono text-[11px] text-cyan-400">
                            {(item.similarity * 100).toFixed(1)}% match
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Tokenizer & Normalizer */}
        {activeTab === 'tokenizer' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-400 flex items-center justify-center">
                    <Languages size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Indic Text Normalizer & Tokenizer</h2>
                    <p className="text-xs text-zinc-400">
                      Standard IndicNLP punctuation, virama, nukta, and script-aware word boundary segmentation
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedLanguageCode}
                    onChange={e => {
                      setSelectedLanguageCode(e.target.value);
                      const langObj = backendData.languages.find(l => l.code === e.target.value);
                      if (langObj) setTokenizerText(langObj.sampleSentence);
                    }}
                    className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    {backendData.languages.map(l => (
                      <option key={l.code} value={l.code}>
                        {l.name} ({l.nativeName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Text Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Input Indic Text</label>
                <textarea
                  rows={4}
                  value={tokenizerText}
                  onChange={e => setTokenizerText(e.target.value)}
                  placeholder="Paste Hindi, Bengali, Tamil, Telugu, Gujarati, Marathi text here..."
                  className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans"
                />
              </div>

              {/* Action */}
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-zinc-500 font-mono">
                  Characters: {tokenizerText.length}
                </div>
                <button
                  onClick={handleTokenize}
                  disabled={isTokenizing || !tokenizerText.trim()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shadow"
                >
                  {isTokenizing ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                  <span>Tokenize & Analyze</span>
                </button>
              </div>
            </div>

            {/* Tokenizer Output */}
            {tokenizerResult && (
              <div className="p-6 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Total Tokens</div>
                    <div className="text-xl font-bold text-white mt-0.5">{tokenizerResult.tokenCount}</div>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Sentences</div>
                    <div className="text-xl font-bold text-white mt-0.5">{tokenizerResult.sentenceCount}</div>
                  </div>
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 col-span-2">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Detected Script</div>
                    <div className="text-sm font-bold text-indigo-400 mt-0.5 truncate">{tokenizerResult.detectedScript}</div>
                  </div>
                </div>

                {/* Tokens Badges */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-zinc-300">Word Tokens ({tokenizerResult.tokens.length}):</div>
                  <div className="flex flex-wrap gap-1.5 p-4 bg-zinc-950 rounded-xl border border-zinc-800 max-h-56 overflow-y-auto">
                    {tokenizerResult.tokens.map((tok, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 rounded-md text-xs text-zinc-200 font-mono transition-colors"
                      >
                        {tok}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Sentences */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-zinc-300">Segmented Sentences ({tokenizerResult.sentences.length}):</div>
                  <div className="space-y-1.5">
                    {tokenizerResult.sentences.map((sent, idx) => (
                      <div key={idx} className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 text-[10px] font-mono flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span>{sent}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: News Classification & Benchmarks */}
        {activeTab === 'classifier' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Interactive Classifier Playground */}
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-700/60 text-emerald-400 flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Indic News Article Classification Benchmark</h2>
                  <p className="text-xs text-zinc-400">
                    Pre-trained FastText + KNN document classifier evaluation across 9 Indian languages
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Sample News Headline / Paragraph</label>
                <textarea
                  rows={3}
                  value={classifierText}
                  onChange={e => setClassifierText(e.target.value)}
                  placeholder="Enter news text in any Indian language..."
                  className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-sans"
                />
              </div>

              {/* Sample Headline Presets */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-zinc-500 text-[11px]">Sample Headlines:</span>
                {[
                  { label: 'Cricket (Sports)', text: 'भारतीय क्रिकेट टीम ने रोमांचक मुकाबले में फाइनल मैच जीतकर वर्ल्ड कप ट्रॉफी अपने नाम की।' },
                  { label: 'Stock Market (Business)', text: 'शेयर बाजार में आज जबरदस्त उछाल देखा गया, सेंसेक्स और निफ्टी नए रिकॉर्ड स्तर पर पहुंचे।' },
                  { label: 'Cinema (Entertainment)', text: 'सुपरस्टार की नई फिल्म ने पहले ही दिन बॉक्स ऑफिस पर 100 करोड़ का जादुई आंकड़ा पार किया।' },
                  { label: 'Elections (Politics)', text: 'आगामी लोकसभा चुनाव को लेकर सभी राजनीतिक दलों ने उम्मीदवारों की पहली सूची जारी की।' }
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setClassifierText(item.text);
                    }}
                    className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors cursor-pointer border border-zinc-700/60"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleClassify}
                disabled={isClassifying || !classifierText.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 shadow"
              >
                {isClassifying ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                <span>Classify Article Category</span>
              </button>

              {classifierResult && (
                <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-semibold">Predicted Category:</span>
                      <div className="text-base font-bold text-emerald-400 uppercase tracking-wide">
                        {classifierResult.topCategory} ({classifierResult.confidence}% confidence)
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                    {classifierResult.predictions.map(pred => (
                      <div key={pred.name} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300">{pred.label}</span>
                          <span className="font-mono text-zinc-400">{pred.confidence}%</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pred.name === classifierResult.topCategory ? 'bg-emerald-500' : 'bg-zinc-600'
                            }`}
                            style={{ width: `${pred.confidence}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI4Bharat Official Benchmark Table */}
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">AI4Bharat Classification Dataset Statistics</h3>
                  <p className="text-xs text-zinc-400">Evaluated on news articles across 9 Indian languages</p>
                </div>
                <a
                  href="https://storage.googleapis.com/ai4bharat-public-indic-nlp-corpora/evaluations/classification/indicnlp-news-articles.tgz"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-zinc-700"
                >
                  <Download size={12} className="text-emerald-400" />
                  <span>Download Benchmarks (tgz)</span>
                </a>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 bg-zinc-950/60">
                      <th className="p-3">Language</th>
                      <th className="p-3">Classes</th>
                      <th className="p-3">Articles / Class</th>
                      <th className="p-3">FastText + KNN Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {CLASSIFICATION_BENCHMARKS.map(bench => (
                      <tr key={bench.language} className="hover:bg-zinc-900/40">
                        <td className="p-3 font-semibold text-white">
                          {bench.language} <span className="font-mono text-zinc-500 font-normal">({bench.langCode})</span>
                        </td>
                        <td className="p-3 text-zinc-300">
                          <div className="flex flex-wrap gap-1">
                            {bench.classes.map(c => (
                              <span key={c} className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300">
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-zinc-400 font-mono">{bench.articlesPerClass}</td>
                        <td className="p-3 font-bold font-mono text-emerald-400">{bench.accuracyFastText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Code Recipes & Offline RAG */}
        {activeTab === 'recipes' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-700/60 text-cyan-400 flex items-center justify-center">
                  <Code2 size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">IndicNLP Code Recipes & Integration Guides</h2>
                  <p className="text-xs text-zinc-400">
                    Ready-to-run code snippets for Python, Node.js, and local vector search in Offline AI Studio
                  </p>
                </div>
              </div>

              {/* Recipe 1: Python FastText & Tokenizer */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <FileCode size={13} className="text-amber-400" />
                    Python: Load FastText Embeddings & Indic Tokenizer
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `from indicnlp.tokenize import indic_tokenize\nfrom indicnlp.normalize import indic_normalize\nimport fasttext\n\n# 1. Normalize and Tokenize\nfactory = indic_normalize.IndicNormalizerFactory()\nnormalizer = factory.get_normalizer("hi")\nclean_text = normalizer.normalize("भारत एक महान देश है।")\ntokens = indic_tokenize.trivial_tokenize(clean_text, "hi")\nprint("Tokens:", tokens)\n\n# 2. Query 300D Vector\nmodel = fasttext.load_model("integrations/indicnlp_corpus/embeddings/indicnlp.v1.hi.bin")\nvec = model.get_word_vector("भारत")\nprint("Vector Shape:", vec.shape)\n`,
                        'py-recipe'
                      )
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors cursor-pointer border border-zinc-700"
                  >
                    {copiedKey === 'py-recipe' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === 'py-recipe' ? 'Copied' : 'Copy Python'}</span>
                  </button>
                </div>
                <pre className="p-3.5 bg-zinc-900 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto border border-zinc-800/80">
{`from indicnlp.tokenize import indic_tokenize
from indicnlp.normalize import indic_normalize
import fasttext

# 1. Normalize and Tokenize
factory = indic_normalize.IndicNormalizerFactory()
normalizer = factory.get_normalizer("hi")
clean_text = normalizer.normalize("भारत एक महान देश है।")
tokens = indic_tokenize.trivial_tokenize(clean_text, "hi")
print("Tokens:", tokens)

# 2. Query 300D Vector
model = fasttext.load_model("integrations/indicnlp_corpus/embeddings/indicnlp.v1.hi.bin")
vec = model.get_word_vector("भारत")
print("Vector Shape:", vec.shape)`}
                </pre>
              </div>

              {/* Recipe 2: Next.js / TypeScript API Call */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <FileCode size={13} className="text-indigo-400" />
                    TypeScript: Call Offline AI Studio IndicNLP API
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `const response = await fetch('/api/indicnlp', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({\n    action: 'similarity',\n    word1: 'भारत',\n    word2: 'देश'\n  })\n});\nconst { similarityPercent, nearestToWord1 } = await response.json();\nconsole.log('Cosine Score:', similarityPercent);`,
                        'ts-recipe'
                      )
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors cursor-pointer border border-zinc-700"
                  >
                    {copiedKey === 'ts-recipe' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === 'ts-recipe' ? 'Copied' : 'Copy TS'}</span>
                  </button>
                </div>
                <pre className="p-3.5 bg-zinc-900 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto border border-zinc-800/80">
{`const response = await fetch('/api/indicnlp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'similarity',
    word1: 'भारत',
    word2: 'देश'
  })
});
const { similarityPercent, nearestToWord1 } = await response.json();
console.log('Cosine Score:', similarityPercent);`}
                </pre>
              </div>

              {/* Recipe 3: CLI FastText Skipgram Training */}
              <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Terminal size={13} className="text-emerald-400" />
                    Terminal: FastText Skipgram Training on Indic Corpus
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `fasttext skipgram -epoch 10 -thread 16 -ws 5 -neg 10 -minCount 5 -dim 300 -input integrations/indicnlp_corpus/data/hi.txt -output integrations/indicnlp_corpus/embeddings/indicnlp.v1.hi`,
                        'cli-recipe'
                      )
                    }
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors cursor-pointer border border-zinc-700"
                  >
                    {copiedKey === 'cli-recipe' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedKey === 'cli-recipe' ? 'Copied' : 'Copy CLI'}</span>
                  </button>
                </div>
                <pre className="p-3.5 bg-zinc-900 rounded-lg text-xs font-mono text-zinc-300 overflow-x-auto border border-zinc-800/80">
{`fasttext skipgram -epoch 10 -thread 16 -ws 5 -neg 10 -minCount 5 -dim 300 \\
  -input integrations/indicnlp_corpus/data/hi.txt \\
  -output integrations/indicnlp_corpus/embeddings/indicnlp.v1.hi`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
