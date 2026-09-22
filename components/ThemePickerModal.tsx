'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Palette,
  Search,
  Check,
  Upload,
  Sun,
  Moon,
  X,
  Code2,
  Sparkles,
  Layers,
  ArrowRight,
  Download,
  Sliders,
  Copy,
  RefreshCw
} from 'lucide-react';
import { themeEngine, IdeThemeMeta, VsCodeThemeJson } from '@/lib/themes/ThemeEngine';

interface ThemePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  monacoInstance?: any;
}

export default function ThemePickerModal({ isOpen, onClose, monacoInstance }: ThemePickerModalProps) {
  const [modalTab, setModalTab] = useState<'presets' | 'customizer'>('presets');
  const [themes, setThemes] = useState<IdeThemeMeta[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string>('one-dark-pro');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [importJsonOpen, setImportJsonOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);

  // Live Theme Customizer State
  const [customThemeName, setCustomThemeName] = useState<string>('My Custom Theme');
  const [customThemeType, setCustomThemeType] = useState<'dark' | 'light'>('dark');
  const [workbenchColors, setWorkbenchColors] = useState({
    editorBg: '#1e1e2e',
    editorFg: '#cdd6f4',
    activityBarBg: '#181825',
    sidebarBg: '#11111b',
    statusBarBg: '#181825',
    tabActiveBg: '#1e1e2e',
    tabInactiveBg: '#181825',
    lineHighlight: '#313244',
    selectionBg: '#45475a',
    accentColor: '#cba6f7',
    borderColor: '#313244'
  });

  const [tokenColors, setTokenColors] = useState({
    keyword: '#cba6f7',
    string: '#a6e3a1',
    function: '#89b4fa',
    type: '#f9e2af',
    comment: '#6c7086',
    number: '#fab387',
    variable: '#cdd6f4'
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const initialThemeIdRef = useRef<string>('one-dark-pro');

  useEffect(() => {
    const unsub = themeEngine.subscribe((active, all) => {
      setThemes(all);
      setActiveThemeId(themeEngine.getActiveThemeId());
    });
    return unsub;
  }, []);

  const prevIsOpenRef = useRef(isOpen);
  useEffect(() => {
    if (isOpen) {
      initialThemeIdRef.current = themeEngine.getActiveThemeId();
      const currentThemes = themeEngine.getAllThemes();
      const idx = currentThemes.findIndex(t => t.id === initialThemeIdRef.current);
      setSelectedIndex(idx >= 0 ? idx : 0);

      // Load active theme colors into customizer
      const active = themeEngine.getActiveTheme();
      if (active) {
        setCustomThemeName(`${active.name} (Custom)`);
        setCustomThemeType(active.type);
        setWorkbenchColors({
          editorBg: active.colors['editor.background'] || '#1e1e2e',
          editorFg: active.colors['editor.foreground'] || '#cdd6f4',
          activityBarBg: active.colors['activityBar.background'] || '#181825',
          sidebarBg: active.colors['sideBar.background'] || '#11111b',
          statusBarBg: active.colors['statusBar.background'] || '#181825',
          tabActiveBg: active.colors['tab.activeBackground'] || '#1e1e2e',
          tabInactiveBg: active.colors['tab.inactiveBackground'] || '#181825',
          lineHighlight: active.colors['editor.lineHighlightBackground'] || '#313244',
          selectionBg: active.colors['editor.selectionBackground'] || '#45475a',
          accentColor: active.colors['activityBarBadge.background'] || '#cba6f7',
          borderColor: active.colors['sideBar.border'] || '#313244'
        });

        const kw = active.tokenColors?.find(r => String(r.scope).includes('keyword'))?.settings.foreground;
        const str = active.tokenColors?.find(r => String(r.scope).includes('string'))?.settings.foreground;
        const fn = active.tokenColors?.find(r => String(r.scope).includes('function'))?.settings.foreground;
        const ty = active.tokenColors?.find(r => String(r.scope).includes('type'))?.settings.foreground;
        const com = active.tokenColors?.find(r => String(r.scope).includes('comment'))?.settings.foreground;
        const num = active.tokenColors?.find(r => String(r.scope).includes('numeric') || String(r.scope).includes('number'))?.settings.foreground;
        const vr = active.tokenColors?.find(r => String(r.scope).includes('variable'))?.settings.foreground;

        setTokenColors({
          keyword: kw || '#cba6f7',
          string: str || '#a6e3a1',
          function: fn || '#89b4fa',
          type: ty || '#f9e2af',
          comment: com || '#6c7086',
          number: num || '#fab387',
          variable: vr || '#cdd6f4'
        });
      }
    } else if (prevIsOpenRef.current) {
      themeEngine.previewTheme(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Push live updates to Monaco & DOM whenever customizer colors change
  const applyLiveCustomTheme = useCallback((
    name: string,
    type: 'dark' | 'light',
    wb: typeof workbenchColors,
    tok: typeof tokenColors
  ) => {
    const customJson: VsCodeThemeJson = {
      name,
      type,
      colors: {
        'editor.background': wb.editorBg,
        'editor.foreground': wb.editorFg,
        'activityBar.background': wb.activityBarBg,
        'activityBar.foreground': type === 'dark' ? '#d7dae0' : '#333333',
        'activityBarBadge.background': wb.accentColor,
        'sideBar.background': wb.sidebarBg,
        'sideBar.foreground': wb.editorFg,
        'sideBar.border': wb.borderColor,
        'statusBar.background': wb.statusBarBg,
        'statusBar.foreground': type === 'dark' ? '#9da5b4' : '#444444',
        'tab.activeBackground': wb.tabActiveBg,
        'tab.inactiveBackground': wb.tabInactiveBg,
        'editorLineNumber.foreground': type === 'dark' ? '#5c6370' : '#a0a0a0',
        'editorLineNumber.activeForeground': wb.editorFg,
        'editor.selectionBackground': wb.selectionBg,
        'editor.lineHighlightBackground': wb.lineHighlight
      },
      tokenColors: [
        { scope: ['comment'], settings: { foreground: tok.comment, fontStyle: 'italic' } },
        { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier'], settings: { foreground: tok.keyword } },
        { scope: ['string', 'string.quoted', 'string.template'], settings: { foreground: tok.string } },
        { scope: ['entity.name.function', 'support.function'], settings: { foreground: tok.function } },
        { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class'], settings: { foreground: tok.type } },
        { scope: ['constant.numeric', 'number'], settings: { foreground: tok.number } },
        { scope: ['variable', 'variable.parameter'], settings: { foreground: tok.variable } }
      ]
    };

    themeEngine.updateThemeLive(customJson);
  }, []);

  const handleWorkbenchColorChange = (key: keyof typeof workbenchColors, value: string) => {
    const updated = { ...workbenchColors, [key]: value };
    setWorkbenchColors(updated);
    applyLiveCustomTheme(customThemeName, customThemeType, updated, tokenColors);
  };

  const handleTokenColorChange = (key: keyof typeof tokenColors, value: string) => {
    const updated = { ...tokenColors, [key]: value };
    setTokenColors(updated);
    applyLiveCustomTheme(customThemeName, customThemeType, workbenchColors, updated);
  };

  const handleSaveCustomTheme = () => {
    const id = themeEngine.registerTheme({
      name: customThemeName,
      type: customThemeType,
      colors: {
        'editor.background': workbenchColors.editorBg,
        'editor.foreground': workbenchColors.editorFg,
        'activityBar.background': workbenchColors.activityBarBg,
        'activityBar.foreground': customThemeType === 'dark' ? '#d7dae0' : '#333333',
        'activityBarBadge.background': workbenchColors.accentColor,
        'sideBar.background': workbenchColors.sidebarBg,
        'sideBar.foreground': workbenchColors.editorFg,
        'sideBar.border': workbenchColors.borderColor,
        'statusBar.background': workbenchColors.statusBarBg,
        'statusBar.foreground': customThemeType === 'dark' ? '#9da5b4' : '#444444',
        'tab.activeBackground': workbenchColors.tabActiveBg,
        'tab.inactiveBackground': workbenchColors.tabInactiveBg,
        'editor.selectionBackground': workbenchColors.selectionBg,
        'editor.lineHighlightBackground': workbenchColors.lineHighlight
      },
      tokenColors: [
        { scope: ['comment'], settings: { foreground: tokenColors.comment, fontStyle: 'italic' } },
        { scope: ['keyword', 'storage'], settings: { foreground: tokenColors.keyword } },
        { scope: ['string'], settings: { foreground: tokenColors.string } },
        { scope: ['entity.name.function', 'support.function'], settings: { foreground: tokenColors.function } },
        { scope: ['entity.name.type', 'support.type'], settings: { foreground: tokenColors.type } },
        { scope: ['constant.numeric'], settings: { foreground: tokenColors.number } },
        { scope: ['variable'], settings: { foreground: tokenColors.variable } }
      ]
    });
    themeEngine.setTheme(id);
    setSaveSuccessMsg(`Saved theme "${customThemeName}"!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleExportJson = () => {
    const jsonStr = themeEngine.exportThemeJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customThemeName.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        setImportJsonText(content);
        setImportJsonOpen(true);
      }
    };
    reader.readAsText(file);
  };

  const filteredThemes = themes.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTheme = useCallback((id: string) => {
    themeEngine.setTheme(id);
    if (monacoInstance) {
      themeEngine.registerMonacoTheme(monacoInstance, id);
    }
    onClose();
  }, [monacoInstance, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || modalTab !== 'presets') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        themeEngine.previewTheme(null);
        if (monacoInstance) {
          themeEngine.registerMonacoTheme(monacoInstance, initialThemeIdRef.current);
        }
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev < filteredThemes.length - 1 ? prev + 1 : 0;
          const target = filteredThemes[next];
          if (target) {
            themeEngine.previewTheme(target.id);
            if (monacoInstance) themeEngine.registerMonacoTheme(monacoInstance, target.id);
          }
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => {
          const next = prev > 0 ? prev - 1 : filteredThemes.length - 1;
          const target = filteredThemes[next];
          if (target) {
            themeEngine.previewTheme(target.id);
            if (monacoInstance) themeEngine.registerMonacoTheme(monacoInstance, target.id);
          }
          return next;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredThemes[selectedIndex];
        if (selected) {
          handleSelectTheme(selected.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, modalTab, selectedIndex, filteredThemes, monacoInstance, handleSelectTheme, onClose]);

  const handleHoverTheme = (id: string, idx: number) => {
    setSelectedIndex(idx);
    themeEngine.previewTheme(id);
    if (monacoInstance) {
      themeEngine.registerMonacoTheme(monacoInstance, id);
    }
  };

  const handleImportJson = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    const res = themeEngine.importCustomVsCodeTheme(importJsonText);
    if (res.success && res.themeId) {
      if (monacoInstance) themeEngine.registerMonacoTheme(monacoInstance, res.themeId);
      setImportJsonOpen(false);
      setImportJsonText('');
      onClose();
    } else {
      setImportError(res.error || 'Failed to import theme');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[#10111a] border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header with Mode Tabs */}
        <div className="px-5 py-3.5 border-b border-zinc-800 bg-[#151622] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Palette size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-zinc-100 uppercase tracking-wider font-mono">
                Theme Studio &amp; Customizer
              </h2>
              <p className="text-[11px] text-zinc-400">
                Live color customization, VS Code theme import &amp; instant Monaco re-theming
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              <button
                onClick={() => setModalTab('presets')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  modalTab === 'presets'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Preset Themes
              </button>
              <button
                onClick={() => setModalTab('customizer')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  modalTab === 'customizer'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sliders size={12} />
                Live Customizer
              </button>
            </div>

            <button
              onClick={() => setImportJsonOpen(!importJsonOpen)}
              className="px-2.5 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Import VS Code Theme JSON"
            >
              <Upload size={12} />
              <span>Import JSON</span>
            </button>

            <button
              onClick={() => {
                themeEngine.previewTheme(null);
                onClose();
              }}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Custom JSON Importer Sub-Panel */}
        {importJsonOpen && (
          <form onSubmit={handleImportJson} className="p-4 bg-[#181926] border-b border-indigo-900/50 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-[11px] text-indigo-300 font-semibold">
              <span>Paste VS Code theme .json (Dracula, One Dark Pro, Tokyo Night, Gruvbox, etc.):</span>
              <label className="cursor-pointer text-indigo-400 hover:underline flex items-center gap-1 text-[11px]">
                <Upload size={11} />
                <span>Upload .json File</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            <textarea
              rows={4}
              placeholder='{ "name": "Dracula", "type": "dark", "colors": { "editor.background": "#282a36" }, "tokenColors": [] }'
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="w-full bg-[#0d0e14] border border-zinc-700 rounded-lg p-2.5 text-[11px] font-mono text-zinc-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
            {importError && (
              <p className="text-[11px] text-rose-400 font-medium">{importError}</p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setImportJsonOpen(false)}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 rounded cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-md shadow-sm transition-colors cursor-pointer"
              >
                Apply &amp; Save Theme
              </button>
            </div>
          </form>
        )}

        {/* TAB 1: PRESET THEMES LIST */}
        {modalTab === 'presets' && (
          <>
            {/* Search Bar */}
            <div className="p-3 border-b border-zinc-800/80 bg-[#0d0e14] flex items-center gap-2.5">
              <Search size={15} className="text-zinc-500 shrink-0" />
              <input
                type="text"
                placeholder="Search color theme (use ↑↓ arrow keys to live preview, Enter to select)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                autoFocus
                className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
              <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 bg-zinc-800 rounded">
                Ctrl+K Ctrl+T
              </span>
            </div>

            {/* Themes List */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-zinc-800/40 custom-scrollbar">
              {filteredThemes.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  No themes matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredThemes.map((theme, idx) => {
                  const isSelected = idx === selectedIndex;
                  const isActive = theme.id === activeThemeId;

                  return (
                    <div
                      key={theme.id}
                      onClick={() => handleSelectTheme(theme.id)}
                      onMouseEnter={() => handleHoverTheme(theme.id, idx)}
                      className={`px-3 py-2.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-indigo-950/70 border border-indigo-600/60 text-white shadow-inner'
                          : 'hover:bg-zinc-800/60 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-md border border-zinc-700 shadow-inner flex items-center justify-center shrink-0"
                          style={{ backgroundColor: theme.previewColors.bg }}
                        >
                          {theme.type === 'light' ? (
                            <Sun size={12} className="text-amber-500" />
                          ) : (
                            <Moon size={12} className="text-indigo-400" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-100">{theme.name}</span>
                            {isActive && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded-full font-mono font-bold">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-400 capitalize">{theme.type} Theme</span>
                        </div>
                      </div>

                      {/* Visual Color Palette Swatches */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center p-1 bg-black/40 rounded border border-zinc-800 gap-1.5">
                          <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: theme.previewColors.sidebar }} title="Sidebar" />
                          <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: theme.previewColors.bg }} title="Editor" />
                          <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: theme.previewColors.accent }} title="Accent" />
                          <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: theme.previewColors.keyword }} title="Keyword" />
                          <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: theme.previewColors.string }} title="String" />
                        </div>

                        {isSelected && (
                          <div className="text-indigo-400 pl-1">
                            <Check size={16} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* TAB 2: LIVE THEME CUSTOMIZER STUDIO */}
        {modalTab === 'customizer' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Theme Name</label>
                  <input
                    type="text"
                    value={customThemeName}
                    onChange={(e) => {
                      setCustomThemeName(e.target.value);
                      applyLiveCustomTheme(e.target.value, customThemeType, workbenchColors, tokenColors);
                    }}
                    className="bg-[#0e0e15] border border-zinc-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-zinc-400 block mb-1">Type</label>
                  <select
                    value={customThemeType}
                    onChange={(e) => {
                      const t = e.target.value as 'dark' | 'light';
                      setCustomThemeType(t);
                      applyLiveCustomTheme(customThemeName, t, workbenchColors, tokenColors);
                    }}
                    className="bg-[#0e0e15] border border-zinc-700 rounded px-2 py-1 text-xs text-white focus:outline-none cursor-pointer"
                  >
                    <option value="dark">Dark Theme</option>
                    <option value="light">Light Theme</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {saveSuccessMsg && (
                  <span className="text-xs text-emerald-400 font-semibold animate-pulse">{saveSuccessMsg}</span>
                )}
                <button
                  onClick={handleExportJson}
                  className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-600 bg-zinc-800 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download size={13} />
                  Export .json
                </button>
                <button
                  onClick={handleSaveCustomTheme}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow cursor-pointer"
                >
                  <Sparkles size={13} />
                  Save &amp; Keep Active
                </button>
              </div>
            </div>

            {/* Live Syntax Preview Code Box */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden shadow-lg" style={{ backgroundColor: workbenchColors.editorBg }}>
              <div className="px-3 py-1.5 border-b border-zinc-800/80 flex items-center justify-between text-[11px] font-mono" style={{ backgroundColor: workbenchColors.tabActiveBg, color: workbenchColors.editorFg }}>
                <span>Preview: App.tsx</span>
                <span className="text-[10px] opacity-70">Live Syntax Colors</span>
              </div>
              <div className="p-4 font-mono text-xs leading-relaxed" style={{ color: workbenchColors.editorFg }}>
                <div><span style={{ color: tokenColors.keyword }}>import</span> React, &#123; <span style={{ color: tokenColors.variable }}>useState</span> &#125; <span style={{ color: tokenColors.keyword }}>from</span> <span style={{ color: tokenColors.string }}>&apos;react&apos;</span>;</div>
                <div className="mt-1"><span style={{ color: tokenColors.comment }}>// Live custom token syntax highlighter</span></div>
                <div><span style={{ color: tokenColors.keyword }}>export default function</span> <span style={{ color: tokenColors.function }}>CounterApp</span>() &#123;</div>
                <div className="pl-4"><span style={{ color: tokenColors.keyword }}>const</span> [<span style={{ color: tokenColors.variable }}>count</span>, <span style={{ color: tokenColors.function }}>setCount</span>] = <span style={{ color: tokenColors.function }}>useState</span>&lt;<span style={{ color: tokenColors.type }}>number</span>&gt;(<span style={{ color: tokenColors.number }}>42</span>);</div>
                <div className="pl-4"><span style={{ color: tokenColors.keyword }}>return</span> &lt;<span style={{ color: tokenColors.type }}>button</span> <span style={{ color: tokenColors.variable }}>onClick</span>=&#123;() =&gt; <span style={{ color: tokenColors.function }}>setCount</span>(<span style={{ color: tokenColors.variable }}>c</span> =&gt; <span style={{ color: tokenColors.variable }}>c</span> + <span style={{ color: tokenColors.number }}>1</span>)&#125;&gt;<span style={{ color: tokenColors.string }}>Count: </span>&#123;<span style={{ color: tokenColors.variable }}>count</span>&#125;&lt;/<span style={{ color: tokenColors.type }}>button</span>&gt;;</div>
                <div>&#125;</div>
              </div>
            </div>

            {/* Interactive Color Palettes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* 1. Workbench UI Shell Colors */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Layers size={13} />
                  Workbench &amp; Editor Chrome
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Editor Background', key: 'editorBg' as const },
                    { label: 'Editor Foreground (Text)', key: 'editorFg' as const },
                    { label: 'Sidebar Background', key: 'sidebarBg' as const },
                    { label: 'Activity Bar Background', key: 'activityBarBg' as const },
                    { label: 'Status Bar Background', key: 'statusBarBg' as const },
                    { label: 'Active Tab Background', key: 'tabActiveBg' as const },
                    { label: 'Accent / Badge Color', key: 'accentColor' as const },
                    { label: 'Border & Divider Color', key: 'borderColor' as const },
                    { label: 'Line Highlight Background', key: 'lineHighlight' as const }
                  ].map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-zinc-500 uppercase">{workbenchColors[key]}</span>
                        <input
                          type="color"
                          value={workbenchColors[key]}
                          onChange={(e) => handleWorkbenchColorChange(key, e.target.value)}
                          className="w-6 h-6 rounded border border-zinc-700 cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Syntax Token Highlight Colors */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Code2 size={13} />
                  Syntax Token Highlights
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Keywords (import, function, const)', key: 'keyword' as const },
                    { label: 'Strings & Literals ("hello")', key: 'string' as const },
                    { label: 'Functions & Methods (useState, render)', key: 'function' as const },
                    { label: 'Types & Classes (number, ReactElement)', key: 'type' as const },
                    { label: 'Comments (//, /* ... */)', key: 'comment' as const },
                    { label: 'Numbers & Constants (42, 3.14)', key: 'number' as const },
                    { label: 'Variables & Parameters (count, props)', key: 'variable' as const }
                  ].map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-zinc-500 uppercase">{tokenColors[key]}</span>
                        <input
                          type="color"
                          value={tokenColors[key]}
                          onChange={(e) => handleTokenColorChange(key, e.target.value)}
                          className="w-6 h-6 rounded border border-zinc-700 cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="px-5 py-2.5 border-t border-zinc-800 bg-[#12131d] flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">● Live Re-theming Active</span>
            <span>— Monaco and whole IDE shell reflect changes immediately</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px] text-zinc-500">
            <span>↑↓ Navigate</span>
            <span>•</span>
            <span>↵ Select</span>
            <span>•</span>
            <span>Esc Cancel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
