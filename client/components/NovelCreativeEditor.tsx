'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Feather,
  Sparkles,
  Heading1,
  Heading2,
  List,
  Table,
  Binary,
  GraduationCap,
  Briefcase,
  Bold,
  Italic,
  Code,
  Quote,
  Check,
  Copy,
  Plus,
  Play,
  ArrowRight,
  Eye,
  FileEdit,
  Clock,
  BarChart2,
  Sliders,
  X,
  Compass
} from 'lucide-react';
import {
  novelEditorEngine,
  SLASH_COMMANDS,
  SlashCommandItem,
  BUBBLE_ACTIONS
} from '@/lib/ai/novelEditorEngine';
import { universalModesEngine, UniversalStudioMode } from '@/lib/ai/universalModesEngine';

export interface NovelCreativeEditorProps {
  initialContent?: string;
  filename?: string;
  onContentChange?: (newContent: string) => void;
  onSave?: (content: string) => void;
  onClose?: () => void;
}

const DEFAULT_SAMPLE_DOC = `# The Sovereign Mind: A Study in Air-Gapped Intelligence

The architecture of sovereign intelligence begins with a radical departure from centralized computation.
When models operate directly on local silicon, the boundary between author and machine collapses into an unbroken creative feedback loop.

### Scene: The First Ignition
The copper coils within the cooling manifold hummed at 420 Hertz.
Laura stepped back from the workbench, wiping graphite dust from her fingertips.
"If the neural weights are loaded into local VRAM," she whispered, "they can never subpoena the telemetry."

$$
\\mathcal{S}_{sovereign} = \\lim_{t \\to \\infty} \\int_{0}^{t} (\\text{Privacy}(\\tau) + \\text{Throughput}(\\tau)) \\, d\\tau
$$

Type / anywhere to insert story lore, LaTeX formulas, classical sonnets, quizzes, or contracts.
Press Tab or ++ for immediate AI narrative continuation.
`;

export default function NovelCreativeEditor({
  initialContent,
  filename = 'creative_studio_doc.md',
  onContentChange,
  onSave,
  onClose
}: NovelCreativeEditorProps) {
  const [content, setContent] = useState<string>(initialContent || DEFAULT_SAMPLE_DOC);
  const [viewMode, setViewMode] = useState<'visual' | 'split' | 'raw'>('split');
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState<boolean>(false);
  const [slashQuery, setSlashQuery] = useState<string>('');
  const [selectedSlashIndex, setSelectedSlashIndex] = useState<number>(0);
  const [slashMenuPos, setSlashMenuPos] = useState<{ top: number; left: number }>({ top: 120, left: 180 });
  const [bubbleMenu, setBubbleMenu] = useState<{ visible: boolean; top: number; left: number; text: string }>({
    visible: false,
    top: 0,
    left: 0,
    text: ''
  });
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<UniversalStudioMode>('creative_story');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      setActiveMode(universalModesEngine.getCurrentMode());
    } catch {
      // fallback
    }
  }, []);

  const metrics = novelEditorEngine.getDocumentMetrics(content);
  const filteredCommands = novelEditorEngine.filterSlashCommands(slashQuery);

  const showNotification = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart;
    setContent(val);
    if (onContentChange) onContentChange(val);

    // Detect slash command trigger
    const textBeforeCursor = val.slice(0, pos);
    const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
    if (lastSlashIndex !== -1 && pos - lastSlashIndex <= 15) {
      const q = textBeforeCursor.slice(lastSlashIndex + 1);
      if (!q.includes(' ') && !q.includes('\n')) {
        setSlashQuery(q);
        setIsSlashMenuOpen(true);
        setSelectedSlashIndex(0);
        return;
      }
    }
    setIsSlashMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Slash Menu Navigation
    if (isSlashMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIndex(prev => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedSlashIndex]) {
          applySlashCommand(filteredCommands[selectedSlashIndex]);
        }
        return;
      }
      if (e.key === 'Escape') {
        setIsSlashMenuOpen(false);
        return;
      }
    }

    // Tab or ++ for Inline AI Continuation (Novel Notion AI style)
    if (e.key === 'Tab') {
      e.preventDefault();
      triggerAiContinuation();
      return;
    }
  };

  const applySlashCommand = (cmd: SlashCommandItem) => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const textBefore = content.slice(0, pos);
    const lastSlash = textBefore.lastIndexOf('/');
    const cleanBefore = lastSlash !== -1 ? content.slice(0, lastSlash) : textBefore;
    const cleanAfter = content.slice(pos);

    const result = cmd.execute(cleanBefore + cleanAfter, cleanBefore.length);
    setContent(result.newContent);
    if (onContentChange) onContentChange(result.newContent);
    setIsSlashMenuOpen(false);
    showNotification(`Inserted ${cmd.title}`);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(result.newCursor, result.newCursor);
      }
    }, 50);
  };

  const triggerAiContinuation = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    setIsGenerating(true);

    setTimeout(() => {
      const continuation = novelEditorEngine.generateInlineContinuation(content, pos, activeMode);
      const newContent = content.slice(0, pos) + continuation + content.slice(pos);
      setContent(newContent);
      if (onContentChange) onContentChange(newContent);
      setIsGenerating(false);
      showNotification('AI Continuation inserted');

      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = pos + continuation.length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 50);
    }, 320);
  };

  const handleSelection = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    if (start !== end && end - start > 1) {
      const selected = content.slice(start, end);
      setBubbleMenu({
        visible: true,
        top: 80,
        left: 200,
        text: selected
      });
    } else {
      setBubbleMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const applyBubbleTransform = (action: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.slice(start, end);
    if (!selected) return;

    let replacement = selected;
    if (action === 'bold') replacement = `**${selected}**`;
    else if (action === 'italic') replacement = `*${selected}*`;
    else if (action === 'code') replacement = `\`${selected}\``;
    else if (action === 'quote') replacement = `\n> ${selected}\n`;
    else if (action === 'poetic') replacement = `The silent hours unfold their gilded wing,\nWhile in the dark: ${selected}`;
    else if (action === 'academic') replacement = `Empirical formalization indicates that: ${selected.toLowerCase()}`;

    const newContent = content.slice(0, start) + replacement + content.slice(end);
    setContent(newContent);
    if (onContentChange) onContentChange(newContent);
    setBubbleMenu(prev => ({ ...prev, visible: false }));
    showNotification(`Applied ${action}`);
  };

  const renderCommandIcon = (iconName: string) => {
    switch (iconName) {
      case 'Heading1': return <Heading1 size={14} className="text-blue-400" />;
      case 'Heading2': return <Heading2 size={14} className="text-cyan-400" />;
      case 'List': return <List size={14} className="text-emerald-400" />;
      case 'Table': return <Table size={14} className="text-amber-400" />;
      case 'BookOpen': return <BookOpen size={14} className="text-orange-400" />;
      case 'Feather': return <Feather size={14} className="text-pink-400" />;
      case 'Binary': return <Binary size={14} className="text-indigo-400" />;
      case 'GraduationCap': return <GraduationCap size={14} className="text-purple-400" />;
      case 'Briefcase': return <Briefcase size={14} className="text-teal-400" />;
      default: return <Sparkles size={14} className="text-indigo-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0d14] text-zinc-100 select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="px-5 py-2.5 border-b border-slate-800 bg-[#0c101a] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-gradient-to-tr from-pink-500/20 to-indigo-500/20 border border-pink-500/30">
            <BookOpen size={16} className="text-pink-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-white tracking-wide">Novel Creative Studio</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-pink-500/10 text-pink-400 border border-pink-500/30">
                WYSIWYG & Slash AI
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">({filename})</span>
            </div>
          </div>
        </div>

        {/* Status notification */}
        {statusNotice && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono animate-fadeIn">
            <Check size={12} />
            <span>{statusNotice}</span>
          </div>
        )}

        {/* View Mode & Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Quick AI Continue Button */}
          <button
            onClick={triggerAiContinuation}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition-all"
            title="Generate next paragraph with AI (Shortcut: Tab)"
          >
            {isGenerating ? (
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles size={12} className="text-amber-300" />
            )}
            <span>AI Continue</span>
            <kbd className="text-[9px] bg-indigo-800/80 px-1 py-0.5 rounded font-mono">Tab</kbd>
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'visual' ? 'bg-slate-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Visual
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'split' ? 'bg-slate-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Split Preview
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'raw' ? 'bg-slate-800 text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Raw MD
            </button>
          </div>

          {onSave && (
            <button
              onClick={() => {
                onSave(content);
                showNotification('Document saved to workspace');
              }}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              Save
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Formatting Quick Toolbar */}
      <div className="px-5 py-1.5 border-b border-slate-800/80 bg-[#0d121e] flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => applyBubbleTransform('bold')}
            className="p-1.5 rounded hover:bg-slate-800 text-zinc-300 hover:text-white"
            title="Bold"
          >
            <Bold size={13} />
          </button>
          <button
            onClick={() => applyBubbleTransform('italic')}
            className="p-1.5 rounded hover:bg-slate-800 text-zinc-300 hover:text-white"
            title="Italic"
          >
            <Italic size={13} />
          </button>
          <button
            onClick={() => applyBubbleTransform('code')}
            className="p-1.5 rounded hover:bg-slate-800 text-zinc-300 hover:text-white"
            title="Inline Code"
          >
            <Code size={13} />
          </button>
          <button
            onClick={() => applyBubbleTransform('quote')}
            className="p-1.5 rounded hover:bg-slate-800 text-zinc-300 hover:text-white"
            title="Blockquote"
          >
            <Quote size={13} />
          </button>
          <div className="h-4 w-px bg-slate-800 mx-1" />
          <button
            onClick={() => {
              setIsSlashMenuOpen(true);
              setSlashQuery('');
            }}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 font-mono text-[11px]"
          >
            <span>/</span>
            <span>Slash Menu</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
          <span>Grade: <span className="text-zinc-300">{metrics.gradeLevel}</span></span>
          <span>Reading: <span className="text-zinc-300">{metrics.readingTimeMinutes} min</span></span>
          <span>Words: <span className="text-zinc-300">{metrics.words}</span></span>
        </div>
      </div>

      {/* Main Document Body */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Editor Pane (Visual / Raw) */}
        <div className={`flex-1 flex flex-col min-h-0 relative overflow-hidden ${viewMode === 'split' ? 'border-r border-slate-800' : ''}`}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelection}
            placeholder="Type your story, poem, or research draft. Type '/' for blocks, press Tab for AI..."
            className="flex-1 w-full p-8 bg-[#090c13] text-zinc-200 text-sm leading-relaxed resize-none focus:outline-none font-mono selection:bg-indigo-600/40 selection:text-white overflow-y-auto"
            spellCheck={false}
          />

          {/* Floating Slash Command Menu */}
          {isSlashMenuOpen && (
            <div
              className="absolute z-50 w-72 max-h-80 bg-[#101524] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fadeIn"
              style={{ top: '80px', left: '120px' }}
            >
              <div className="px-3 py-2 border-b border-slate-800 bg-[#0d121e] flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">Blocks & AI Scaffolds</span>
                <span className="text-[10px] font-mono text-zinc-500">ESC to exit</span>
              </div>

              <div className="p-1 overflow-y-auto space-y-0.5">
                {filteredCommands.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-500">No matching commands</div>
                ) : (
                  filteredCommands.map((cmd, idx) => {
                    const isSelected = idx === selectedSlashIndex;
                    return (
                      <button
                        key={cmd.id}
                        onClick={() => applySlashCommand(cmd)}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2.5 transition-colors ${
                          isSelected ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800/60 text-zinc-300'
                        }`}
                      >
                        <div className="shrink-0">{renderCommandIcon(cmd.icon)}</div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">{cmd.title}</div>
                          <div className={`text-[10px] truncate ${isSelected ? 'text-indigo-200' : 'text-zinc-500'}`}>
                            {cmd.description}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Floating Bubble Toolbar */}
          {bubbleMenu.visible && (
            <div
              className="absolute z-40 bg-[#161c2d] border border-indigo-500/40 rounded-lg shadow-xl px-2 py-1 flex items-center gap-1.5 text-xs animate-fadeIn"
              style={{ top: '30px', left: '200px' }}
            >
              <button
                onClick={() => applyBubbleTransform('bold')}
                className="px-2 py-0.5 rounded hover:bg-slate-700 font-bold text-zinc-200"
              >
                B
              </button>
              <button
                onClick={() => applyBubbleTransform('italic')}
                className="px-2 py-0.5 rounded hover:bg-slate-700 italic text-zinc-200"
              >
                I
              </button>
              <button
                onClick={() => applyBubbleTransform('code')}
                className="px-2 py-0.5 rounded hover:bg-slate-700 font-mono text-zinc-200"
              >
                Code
              </button>
              <div className="h-3 w-px bg-slate-700" />
              <button
                onClick={() => applyBubbleTransform('poetic')}
                className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-pink-600/30 text-pink-300 text-[11px]"
              >
                <Feather size={10} />
                <span>Poetic</span>
              </button>
              <button
                onClick={() => applyBubbleTransform('academic')}
                className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-blue-600/30 text-blue-300 text-[11px]"
              >
                <Compass size={10} />
                <span>Academic</span>
              </button>
            </div>
          )}
        </div>

        {/* Live Formatted Split Preview Pane */}
        {viewMode === 'split' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#080b11] overflow-y-auto p-8 select-text">
            <div className="max-w-2xl mx-auto w-full space-y-4 font-sans text-zinc-200 leading-relaxed">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-slate-800 pb-2 flex items-center justify-between">
                <span>Live Studio Preview</span>
                <span className="text-emerald-400">● 100% In-Sync</span>
              </div>
              <div className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-zinc-300">
                {content}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Footer */}
      <div className="px-5 py-2 border-t border-slate-800 bg-[#0c101a] flex items-center justify-between text-[11px] text-zinc-400 font-mono">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-indigo-400">
            <Sparkles size={11} />
            <span>Notion/Novel AI Studio</span>
          </span>
          <span className="text-zinc-600">|</span>
          <span>Paragraphs: {metrics.paragraphs}</span>
          <span>Characters: {metrics.characters}</span>
        </div>

        <div className="flex items-center gap-2 text-zinc-500">
          <span>Type <kbd className="px-1 py-0.5 rounded bg-slate-800 text-zinc-300 border border-slate-700">/</kbd> for blocks</span>
          <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-800 text-zinc-300 border border-slate-700">Tab</kbd> to continue</span>
        </div>
      </div>
    </div>
  );
}
