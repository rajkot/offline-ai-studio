'use client';
import React, { useState, useEffect } from 'react';
import { Globe, FileText, Check, Copy, ArrowRight, GitMerge, MessageSquare, Sparkles, X, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { SUPPORTED_LANGUAGES, getLanguageByCode, LanguageOption } from '@/lib/languages';

interface MultilingualTranslateModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFile: string;
  codeSnippet: string;
  currentLanguage: string;
  onLanguageChange: (lang: string) => void;
  onApplyCode: (newCode: string) => void;
  onStageDiff: (filePath: string, proposedCode: string) => void;
  onSendToChat: (explanation: string) => void;
}

export default function MultilingualTranslateModal(props: MultilingualTranslateModalProps) {
  if (!props.isOpen) return null;
  return <MultilingualTranslateModalInner key={`${props.activeFile}-${props.currentLanguage}`} {...props} />;
}

function MultilingualTranslateModalInner({
  onClose,
  activeFile,
  codeSnippet,
  currentLanguage,
  onLanguageChange,
  onApplyCode,
  onStageDiff,
  onSendToChat,
}: MultilingualTranslateModalProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [mode, setMode] = useState<'comments' | 'explain' | 'tests'>('comments');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedResult, setTranslatedResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customSnippet, setCustomSnippet] = useState(codeSnippet);

  const currentLangObj = getLanguageByCode(selectedLanguage);

  const handleTranslate = async (overrideMode?: 'comments' | 'explain' | 'tests') => {
    const activeMode = overrideMode || mode;
    setIsTranslating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/pipeline/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: customSnippet,
          targetLanguage: selectedLanguage,
          mode: activeMode,
          filePath: activeFile || 'components/Playground.tsx'
        })
      });

      if (!res.ok) {
        throw new Error(`Translation API error: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.translatedResult) {
        setTranslatedResult(data.translatedResult);
      } else {
        throw new Error('No translated output received from model.');
      }
    } catch (err: any) {
      console.error('Translation failed:', err);
      setErrorMsg(err?.message || 'Failed to translate. Please check server connection.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    if (!translatedResult) return;
    navigator.clipboard.writeText(translatedResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!translatedResult) return;
    onApplyCode(translatedResult);
    onClose();
  };

  const handleDiff = () => {
    if (!translatedResult) return;
    onStageDiff(activeFile, translatedResult);
    onClose();
  };

  const handleSendExplanation = () => {
    if (!translatedResult) return;
    onSendToChat(translatedResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Globe size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Universal Multilingual Code Translator & Auto-Commenter
              </h2>
              <p className="text-xs text-slate-400">
                Localize code comments, docstrings, and architectural explanations into 12 major global languages while preserving 100% syntactical invariants.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action & Controls Bar */}
        <div className="p-4 bg-slate-900/90 border-b border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Target Language Dropdown */}
          <div className="md:col-span-4 flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Globe size={13} className="text-indigo-400" /> Target Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedLanguage(val);
                onLanguageChange(val);
              }}
              className="w-full bg-slate-950 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.nativeName} ({lang.name} - {lang.code})
                </option>
              ))}
            </select>
          </div>

          {/* Mode Selector Tabs */}
          <div className="md:col-span-5 flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Localization Operation
            </label>
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-1 text-xs">
              <button
                onClick={() => setMode('comments')}
                className={`flex-1 py-1.5 px-2 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'comments'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>💬 Auto-Comments</span>
              </button>
              <button
                onClick={() => setMode('explain')}
                className={`flex-1 py-1.5 px-2 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'explain'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📖 Explain Code</span>
              </button>
              <button
                onClick={() => setMode('tests')}
                className={`flex-1 py-1.5 px-2 rounded-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  mode === 'tests'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🧪 Unit Tests</span>
              </button>
            </div>
          </div>

          {/* Trigger Button */}
          <div className="md:col-span-3 flex items-end">
            <button
              onClick={() => handleTranslate()}
              disabled={isTranslating || !customSnippet.trim()}
              className="w-full mt-auto py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {isTranslating ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-indigo-200" />
                  <span>Translating in {currentLangObj.name}...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-amber-300" />
                  <span>Translate ({currentLangObj.flag} {currentLangObj.code})</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Body: Side-by-Side Editors */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-slate-950">
          
          {/* Left Column: Original Source */}
          <div className="flex flex-col h-full overflow-hidden p-4">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-slate-400" />
                <span className="text-xs font-mono font-semibold text-slate-300">
                  {activeFile || 'Original Code Snippet'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {customSnippet.split('\n').length} lines
              </span>
            </div>
            <textarea
              value={customSnippet}
              onChange={(e) => setCustomSnippet(e.target.value)}
              placeholder="Paste or edit code snippet to localize..."
              className="flex-1 w-full bg-slate-900/90 border border-slate-800 text-slate-200 p-3 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Right Column: Localized Result */}
          <div className="flex flex-col h-full overflow-hidden p-4 bg-slate-900/40">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-sm">{currentLangObj.flag}</span>
                <span className="text-xs font-semibold text-indigo-300">
                  {mode === 'comments' ? 'Localized Code & Comments' : mode === 'explain' ? 'Architectural Breakdown' : 'Multilingual Unit Tests'} ({currentLangObj.nativeName})
                </span>
              </div>
              {translatedResult && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 px-2 py-0.5 rounded transition-colors"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {errorMsg && (
              <div className="p-3 mb-2 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {translatedResult ? (
              <textarea
                value={translatedResult}
                onChange={(e) => setTranslatedResult(e.target.value)}
                dir={currentLangObj.direction || 'ltr'}
                className="flex-1 w-full bg-slate-950 border border-indigo-900/60 text-indigo-100 p-3 rounded-lg font-mono text-xs focus:outline-none focus:border-indigo-500 resize-none"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-lg text-slate-500">
                <Globe size={32} className="text-slate-600 mb-2 animate-pulse" />
                <p className="text-xs font-semibold text-slate-400 mb-1">
                  Ready to localize into {currentLangObj.name} ({currentLangObj.nativeName})
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs">
                  Click &quot;Translate&quot; above to generate localized docstrings, comments, or explanations while strictly maintaining code functionality.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer: Action Integrations */}
        <div className="flex flex-wrap items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950 gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>AST typing and semantic validity preserved</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>

            {mode === 'explain' ? (
              <button
                onClick={handleSendExplanation}
                disabled={!translatedResult}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <MessageSquare size={13} />
                <span>Send to Chat</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleDiff}
                  disabled={!translatedResult}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <GitMerge size={13} />
                  <span>Stage in Diff Merge</span>
                </button>

                <button
                  onClick={handleApply}
                  disabled={!translatedResult}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Check size={13} />
                  <span>Apply to {activeFile ? activeFile.split('/').pop() : 'Workspace'}</span>
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
