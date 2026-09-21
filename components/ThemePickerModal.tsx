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
  ArrowRight
} from 'lucide-react';
import { themeEngine, IdeThemeMeta, VsCodeThemeJson } from '@/lib/themes/ThemeEngine';

interface ThemePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  monacoInstance?: any;
}

export default function ThemePickerModal({ isOpen, onClose, monacoInstance }: ThemePickerModalProps) {
  const [themes, setThemes] = useState<IdeThemeMeta[]>([]);
  const [activeThemeId, setActiveThemeId] = useState<string>('one-dark-pro');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [importJsonOpen, setImportJsonOpen] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);

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
    } else if (prevIsOpenRef.current) {
      // Revert if preview was active but not selected when modal was closed
      themeEngine.previewTheme(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

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

  // Keyboard navigation & live preview
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, selectedIndex, filteredThemes, monacoInstance, handleSelectTheme, onClose]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#12131a] border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header with Search */}
        <div className="p-3.5 border-b border-zinc-800 bg-[#161722] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-indigo-400">
            <Palette size={18} />
            <span className="font-semibold text-xs tracking-wide text-zinc-100 uppercase">VS Code Color Themes</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportJsonOpen(!importJsonOpen)}
              className="px-2 py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload size={12} />
              <span>Import VS Code JSON</span>
            </button>
            <button
              onClick={() => {
                themeEngine.previewTheme(null);
                onClose();
              }}
              className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-zinc-800/80 bg-[#101118] flex items-center gap-2.5">
          <Search size={15} className="text-zinc-500 shrink-0" />
          <input
            type="text"
            placeholder="Select Color Theme (up/down arrows to live preview, enter to apply)..."
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

        {/* Custom JSON Importer Sub-Panel */}
        {importJsonOpen && (
          <form onSubmit={handleImportJson} className="p-3 bg-[#191a26] border-b border-indigo-900/50 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-indigo-300">
              <span className="font-semibold">Paste VS Code Theme package.json or theme .json:</span>
              <span className="text-[10px] text-zinc-400">Dracula, One Dark, Catppuccin, etc.</span>
            </div>
            <textarea
              rows={4}
              placeholder='{ "name": "My Custom Theme", "type": "dark", "colors": { "editor.background": "#121212" }, "tokenColors": [] }'
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              className="w-full bg-[#0d0e14] border border-zinc-700 rounded p-2 text-[11px] font-mono text-zinc-200 focus:outline-none focus:border-indigo-500 resize-none"
            />
            {importError && (
              <p className="text-[11px] text-rose-400 font-medium">{importError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setImportJsonOpen(false)}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded shadow-sm cursor-pointer"
              >
                Import & Apply Theme
              </button>
            </div>
          </form>
        )}

        {/* Theme List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-zinc-800/40">
          {filteredThemes.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
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
                      ? 'bg-indigo-950/70 border border-indigo-600/60 text-white'
                      : 'hover:bg-zinc-800/60 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-md border border-zinc-700 shadow-inner flex items-center justify-center shrink-0"
                      style={{ backgroundColor: theme.previewColors.bg }}
                    >
                      {theme.type === 'light' ? (
                        <Sun size={10} className="text-amber-600" />
                      ) : (
                        <Moon size={10} className="text-indigo-300" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-100">{theme.name}</span>
                        {isActive && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded font-mono">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-400 capitalize">{theme.type} Theme</span>
                    </div>
                  </div>

                  {/* Visual Color Palette Swatches */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center p-1 bg-black/40 rounded border border-zinc-800 gap-1">
                      <div
                        className="w-3.5 h-3.5 rounded-sm"
                        style={{ backgroundColor: theme.previewColors.sidebar }}
                        title="Sidebar Background"
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-sm"
                        style={{ backgroundColor: theme.previewColors.bg }}
                        title="Editor Background"
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-sm"
                        style={{ backgroundColor: theme.previewColors.accent }}
                        title="Accent Color"
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-sm"
                        style={{ backgroundColor: theme.previewColors.keyword }}
                        title="Syntax Keyword"
                      />
                      <div
                        className="w-3.5 h-3.5 rounded-sm"
                        style={{ backgroundColor: theme.previewColors.string }}
                        title="Syntax String"
                      />
                    </div>

                    {isSelected && (
                      <div className="text-indigo-400 pl-1">
                        <Check size={14} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 border-t border-zinc-800 bg-[#14151e] flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Live Monaco syntax highlighting &amp; workbench UI variable injection active</span>
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
