'use client';

import React, { useState, useEffect } from 'react';
import {
  Layout,
  Columns2,
  Rows2,
  Grid2X2,
  Terminal,
  BookOpen,
  Compass,
  Maximize2,
  Sparkles,
  Check,
  RotateCcw,
  Sliders,
  ExternalLink,
  Code2,
  Folder,
  Layers,
  CheckCircle2,
  Split,
  PanelLeft,
  PanelRight,
  PanelBottom
} from 'lucide-react';
import {
  dockviewLayoutEngine,
  LAYOUT_PRESETS,
  DOCK_PANELS,
  WorkspaceLayoutPreset,
  LayoutPresetId,
  DockPanelId
} from '@/lib/layout/dockviewLayoutEngine';

export interface DockviewLayoutStudioProps {
  currentPresetId?: LayoutPresetId;
  onApplyPreset?: (preset: WorkspaceLayoutPreset) => void;
  onClose?: () => void;
}

export default function DockviewLayoutStudio({
  currentPresetId,
  onApplyPreset,
  onClose
}: DockviewLayoutStudioProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'architect' | 'detached'>('presets');
  const [selectedPresetId, setSelectedPresetId] = useState<LayoutPresetId>(currentPresetId || 'classic-ide');
  const [ratios, setRatios] = useState(dockviewLayoutEngine.getRatios());
  const [detachedPanels, setDetachedPanels] = useState<DockPanelId[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    try {
      const p = dockviewLayoutEngine.getCurrentPreset();
      setSelectedPresetId(p.id);
      setRatios(dockviewLayoutEngine.getRatios());
      setDetachedPanels(dockviewLayoutEngine.getDetachedPanels());
    } catch {
      // fallback
    }
  }, []);

  const showNotice = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSelectPreset = (preset: WorkspaceLayoutPreset) => {
    setSelectedPresetId(preset.id);
    dockviewLayoutEngine.setPreset(preset.id);
    setRatios(preset.ratios);

    if (onApplyPreset) {
      onApplyPreset(preset);
    }
    showNotice(`Applied Layout Preset: ${preset.name}`);
  };

  const handleSliderChange = (key: keyof typeof ratios, value: number) => {
    const updated = { ...ratios, [key]: value };
    setRatios(updated);
    dockviewLayoutEngine.setRatios({ [key]: value });
  };

  const handleToggleDetach = (panelId: DockPanelId) => {
    const isDetached = dockviewLayoutEngine.toggleDetachPanel(panelId);
    setDetachedPanels(dockviewLayoutEngine.getDetachedPanels());
    showNotice(isDetached ? `Detached ${DOCK_PANELS[panelId].title} into floating popout` : `Re-docked ${DOCK_PANELS[panelId].title}`);
  };

  const renderPresetPreviewDiagram = (id: LayoutPresetId) => {
    switch (id) {
      case 'classic-ide':
        return (
          <div className="w-full h-16 bg-[#080b11] border border-slate-700/80 rounded-md p-1 grid grid-cols-12 gap-1 font-mono text-[8px] text-zinc-500">
            <div className="col-span-3 bg-slate-800/80 rounded flex items-center justify-center border border-slate-700/40">Explorer</div>
            <div className="col-span-6 flex flex-col gap-1">
              <div className="flex-1 bg-slate-800/50 rounded flex items-center justify-center border border-slate-700/40">Monaco Editor</div>
              <div className="h-4 bg-slate-800/90 rounded flex items-center justify-center text-cyan-400 border border-slate-700/40">Terminal</div>
            </div>
            <div className="col-span-3 bg-indigo-950/40 rounded flex items-center justify-center border border-indigo-700/40 text-indigo-300">AI Chat</div>
          </div>
        );
      case 'creative-studio':
        return (
          <div className="w-full h-16 bg-[#080b11] border border-slate-700/80 rounded-md p-1 grid grid-cols-12 gap-1 font-mono text-[8px] text-zinc-500">
            <div className="col-span-2 bg-slate-800/80 rounded flex items-center justify-center border border-slate-700/40">Lore</div>
            <div className="col-span-10 bg-amber-950/20 rounded flex items-center justify-center border border-amber-600/40 text-amber-200">
              ✍️ Novel Creative Visual Canvas
            </div>
          </div>
        );
      case 'research-data':
        return (
          <div className="w-full h-16 bg-[#080b11] border border-slate-700/80 rounded-md p-1 grid grid-cols-12 gap-1 font-mono text-[8px] text-zinc-500">
            <div className="col-span-2 bg-slate-800/80 rounded flex items-center justify-center border border-slate-700/40">Docs</div>
            <div className="col-span-5 bg-slate-800/50 rounded flex items-center justify-center border border-slate-700/40">LaTeX Code</div>
            <div className="col-span-5 bg-blue-950/40 rounded flex items-center justify-center border border-blue-600/40 text-blue-200">Math Preview</div>
          </div>
        );
      case 'zen-focus':
        return (
          <div className="w-full h-16 bg-[#080b11] border border-slate-700/80 rounded-md p-1 flex items-center justify-center font-mono text-[9px] text-emerald-400 bg-emerald-950/10 border-emerald-500/30">
            🧘 100% Distraction-Free Full-Screen Editor
          </div>
        );
      case 'dual-code':
        return (
          <div className="w-full h-16 bg-[#080b11] border border-slate-700/80 rounded-md p-1 grid grid-cols-12 gap-1 font-mono text-[8px] text-zinc-500">
            <div className="col-span-2 bg-slate-800/80 rounded flex items-center justify-center border border-slate-700/40">Files</div>
            <div className="col-span-5 bg-slate-800/60 rounded flex items-center justify-center border border-slate-700/40">Editor 1</div>
            <div className="col-span-5 bg-slate-800/60 rounded flex items-center justify-center border border-slate-700/40">Editor 2 (Split)</div>
          </div>
        );
      case 'terminal-grid':
        return (
          <div className="w-full h-16 bg-[#080b11] border border-slate-700/80 rounded-md p-1 grid grid-cols-12 gap-1 font-mono text-[8px] text-zinc-500">
            <div className="col-span-6 bg-slate-800/40 rounded flex items-center justify-center border border-slate-700/40">Code</div>
            <div className="col-span-6 grid grid-rows-2 gap-1">
              <div className="bg-cyan-950/40 border border-cyan-700/40 text-cyan-300 rounded flex items-center justify-center">Shell 1</div>
              <div className="bg-cyan-950/40 border border-cyan-700/40 text-cyan-300 rounded flex items-center justify-center">Shell 2 (Build)</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0d14] text-zinc-100 select-none overflow-hidden font-sans">
      {/* Top Banner */}
      <div className="px-5 py-3 border-b border-slate-800 bg-[#0c101a] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30">
            <Layout size={18} className="text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold tracking-wide text-white">Dockview Layout & Window Manager</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Dockview & Resizable Panels
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Customize multi-pane split docks, floating detached windows, and workspace presets
            </p>
          </div>
        </div>

        {/* Global Notification notice */}
        {notification && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono animate-fadeIn">
            <CheckCircle2 size={13} />
            <span>{notification}</span>
          </div>
        )}

        {/* Active Preset Indicator */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-400">
            Active: {LAYOUT_PRESETS[selectedPresetId]?.name || 'Classic IDE'}
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="px-5 py-2 border-b border-slate-800/80 bg-[#0a0d14] flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              activeTab === 'presets'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/50'
            }`}
          >
            Workspace Presets ({Object.keys(LAYOUT_PRESETS).length})
          </button>
          <button
            onClick={() => setActiveTab('architect')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              activeTab === 'architect'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/50'
            }`}
          >
            Pane Ratio Architect
          </button>
          <button
            onClick={() => setActiveTab('detached')}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              activeTab === 'detached'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-slate-800/50'
            }`}
          >
            Floating & Detached Panels ({detachedPanels.length})
          </button>
        </div>

        <div className="text-[11px] text-zinc-500 font-mono hidden md:block">
          Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-zinc-300 border border-slate-700">Ctrl+Alt+W</kbd>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#080b11]">
        {activeTab === 'presets' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white">Curated IDE & Studio Layout Presets</h2>
              <p className="text-xs text-zinc-400">
                Instantly reconfigure panels, sidebars, and split orientations to fit your active creative or engineering task.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(LAYOUT_PRESETS).map((preset) => {
                const isCurrent = selectedPresetId === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                      isCurrent
                        ? 'border-cyan-500 bg-cyan-950/15 shadow-lg shadow-cyan-950/30'
                        : 'border-slate-800 bg-[#0d121e] hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{preset.name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                            isCurrent
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              : 'bg-slate-800 text-zinc-400'
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{preset.description}</p>

                      {/* Miniature Wireframe Diagram */}
                      <div className="mt-3">{renderPresetPreviewDiagram(preset.id)}</div>
                    </div>

                    <button
                      onClick={() => handleSelectPreset(preset)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        isCurrent
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-zinc-200 border border-slate-700'
                      }`}
                    >
                      {isCurrent ? <Check size={12} /> : null}
                      <span>{isCurrent ? 'Active Workspace' : 'Apply Layout'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'architect' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white">Dynamic Pane Sashes & Ratios</h2>
              <p className="text-xs text-zinc-400">
                Fine-tune pixel widths and split percentages. Changes persist across application reloads.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-slate-800 bg-[#0d121e] space-y-5">
              {/* Left Explorer Width Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                    <PanelLeft size={13} className="text-cyan-400" />
                    <span>Left Explorer Sidebar Width:</span>
                  </span>
                  <span className="font-mono text-cyan-400">{ratios.leftWidth}px</span>
                </div>
                <input
                  type="range"
                  min="180"
                  max="450"
                  value={ratios.leftWidth}
                  onChange={(e) => handleSliderChange('leftWidth', Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              {/* Right Copilot Width Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                    <PanelRight size={13} className="text-indigo-400" />
                    <span>Right Copilot Chat Panel Width:</span>
                  </span>
                  <span className="font-mono text-indigo-400">{ratios.rightWidth}px</span>
                </div>
                <input
                  type="range"
                  min="260"
                  max="600"
                  value={ratios.rightWidth}
                  onChange={(e) => handleSliderChange('rightWidth', Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Bottom Shell Height Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                    <PanelBottom size={13} className="text-amber-400" />
                    <span>Bottom Terminal & Console Tray Height:</span>
                  </span>
                  <span className="font-mono text-amber-400">{ratios.bottomHeight}px</span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="500"
                  value={ratios.bottomHeight}
                  onChange={(e) => handleSliderChange('bottomHeight', Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    const defaults = { leftWidth: 260, rightWidth: 380, bottomHeight: 240, splitRatio: 0.5 };
                    setRatios(defaults);
                    dockviewLayoutEngine.setRatios(defaults);
                    showNotice('Reset ratios to standard defaults');
                  }}
                  className="px-3 py-1.5 text-xs rounded bg-slate-800 hover:bg-slate-700 text-zinc-300 flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <RotateCcw size={12} />
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'detached' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-white">Detachable Floating Popout Panels</h2>
              <p className="text-xs text-zinc-400">
                Pop out any IDE panel into a separate floating window for multi-monitor desktop setups.
              </p>
            </div>

            <div className="space-y-2">
              {Object.values(DOCK_PANELS).map((panel) => {
                const isDetached = detachedPanels.includes(panel.id);
                return (
                  <div
                    key={panel.id}
                    className="p-3 rounded-xl border border-slate-800 bg-[#0d121e] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-800 text-zinc-300">
                        <Layers size={14} />
                      </div>
                      <div>
                        <div className="font-medium text-white">{panel.title}</div>
                        <div className="text-[10px] text-zinc-500 font-mono">Panel ID: {panel.id}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                          isDetached ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-zinc-400'
                        }`}
                      >
                        {isDetached ? 'Floating Popout' : 'Docked in IDE'}
                      </span>

                      {panel.canFloat ? (
                        <button
                          onClick={() => handleToggleDetach(panel.id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-zinc-200 flex items-center gap-1 transition-colors border border-slate-700"
                        >
                          <ExternalLink size={11} />
                          <span>{isDetached ? 'Re-Dock' : 'Detach Window'}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-600 font-mono">Fixed Core Pane</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
