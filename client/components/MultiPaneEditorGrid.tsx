'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Columns2,
  Rows2,
  Grid2X2,
  Square,
  X,
  Plus,
  ExternalLink,
  Split,
  ChevronRight,
  Code2,
  FileText,
  Minimize2,
  Maximize2,
  Compass,
  Eye,
  Sliders,
  Layers,
  GitCompare,
  ArrowLeftRight,
  Search
} from 'lucide-react';
import { EditorPane, SplitLayoutType, dockingEngine, WorkbenchLayoutState } from '@/lib/dockingEngine';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
const MonacoDiffEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.DiffEditor), { ssr: false });

interface MultiPaneEditorGridProps {
  parsedFiles: Record<string, string>;
  onFileChange: (filePath: string, newContent: string) => void;
  onSelectFile: (filePath: string) => void;
  onSaveFile?: () => void;
  onDetachTab?: (filePath: string) => void;
  renderToolContent?: (toolId: string) => React.ReactNode;
}

export default function MultiPaneEditorGrid({
  parsedFiles,
  onFileChange,
  onSelectFile,
  onSaveFile,
  onDetachTab,
  renderToolContent
}: MultiPaneEditorGridProps) {
  const [layoutState, setLayoutState] = useState<WorkbenchLayoutState>(dockingEngine.getState());
  const [draggedTab, setDraggedTab] = useState<{ paneId: string; filePath: string } | null>(null);
  const [dropTargetPaneId, setDropTargetPaneId] = useState<string | null>(null);

  // Side-by-side arbitrary file comparison state
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false);
  const [diffFileA, setDiffFileA] = useState<string>('');
  const [diffFileB, setDiffFileB] = useState<string>('');
  const [filterQueryA, setFilterQueryA] = useState('');
  const [filterQueryB, setFilterQueryB] = useState('');

  useEffect(() => {
    return dockingEngine.subscribe(setLayoutState);
  }, []);

  const handlePaneClick = (paneId: string) => {
    dockingEngine.setActivePane(paneId);
  };

  const handleTabClick = (paneId: string, filePath: string) => {
    dockingEngine.openFileInPane(paneId, filePath);
    onSelectFile(filePath);
  };

  const handleCloseTab = (paneId: string, filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dockingEngine.closeTabInPane(paneId, filePath);
  };

  const handleSplit = (direction: 'vertical' | 'horizontal') => {
    dockingEngine.splitActivePane(direction);
  };

  const handleSetLayout = (type: SplitLayoutType) => {
    dockingEngine.setLayoutType(type);
  };

  const handleClosePane = (paneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dockingEngine.closePane(paneId);
  };

  // Drag & Drop tab handlers
  const handleTabDragStart = (e: React.DragEvent, paneId: string, filePath: string) => {
    setDraggedTab({ paneId, filePath });
    e.dataTransfer.setData('text/plain', JSON.stringify({ paneId, filePath }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePaneDragOver = (e: React.DragEvent, paneId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetPaneId !== paneId) {
      setDropTargetPaneId(paneId);
    }
  };

  const handlePaneDragLeave = (e: React.DragEvent, paneId: string) => {
    if (dropTargetPaneId === paneId) {
      setDropTargetPaneId(null);
    }
  };

  const handlePaneDrop = (e: React.DragEvent, targetPaneId: string) => {
    e.preventDefault();
    setDropTargetPaneId(null);
    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      const data = dataStr ? JSON.parse(dataStr) : draggedTab;
      if (data && data.filePath && data.paneId && data.paneId !== targetPaneId) {
        dockingEngine.moveTab(data.paneId, targetPaneId, data.filePath);
      }
    } catch {
      if (draggedTab && draggedTab.paneId !== targetPaneId) {
        dockingEngine.moveTab(draggedTab.paneId, targetPaneId, draggedTab.filePath);
      }
    }
    setDraggedTab(null);
  };

  // Open diff comparator modal
  const handleOpenDiffComparator = () => {
    const validFiles = Object.keys(parsedFiles).filter(f => !f.startsWith('__'));
    const activeFile = layoutState.panes.find(p => p.id === layoutState.activePaneId)?.activeFilePath || validFiles[0] || '';
    const otherFile = validFiles.find(f => f !== activeFile) || validFiles[0] || '';
    setDiffFileA(activeFile);
    setDiffFileB(otherFile);
    setIsDiffModalOpen(true);
  };

  const getLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (ext === 'rs') return 'rust';
    if (ext === 'py') return 'python';
    if (ext === 'json') return 'json';
    if (ext === 'html') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'md') return 'markdown';
    if (ext === 'cpp' || ext === 'c') return 'cpp';
    if (ext === 'go') return 'go';
    return 'typescript';
  };

  const renderEditorForPane = (pane: EditorPane) => {
    const isActive = layoutState.activePaneId === pane.id;
    const currentFilePath = pane.activeFilePath;
    const fileContent = parsedFiles[currentFilePath] || '// Empty buffer or non-existent file';
    const isTool = currentFilePath.startsWith('__');
    const isDropTarget = dropTargetPaneId === pane.id;
    const language = getLanguage(currentFilePath);

    return (
      <div
        key={pane.id}
        onClick={() => handlePaneClick(pane.id)}
        onDragOver={(e) => handlePaneDragOver(e, pane.id)}
        onDragLeave={(e) => handlePaneDragLeave(e, pane.id)}
        onDrop={(e) => handlePaneDrop(e, pane.id)}
        className={`flex-1 flex flex-col min-h-0 min-w-0 bg-[#09090b] border ${
          isDropTarget
            ? 'border-indigo-400 bg-indigo-950/20 ring-2 ring-indigo-500/50'
            : isActive
            ? 'border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
            : 'border-[#27272a]'
        } rounded-lg overflow-hidden transition-all duration-150`}
      >
        {/* PANE HEADER / TAB BAR */}
        <div className="h-9 px-2 bg-[#121318] border-b border-[#27272a] flex items-center justify-between gap-2 overflow-x-auto shrink-0 select-none">
          {/* TABS (Draggable) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
            {pane.openTabs.map(tabFile => {
              const tabName = tabFile.split('/').pop() || tabFile;
              const isTabActive = tabFile === pane.activeFilePath;
              return (
                <div
                  key={tabFile}
                  draggable
                  onDragStart={(e) => handleTabDragStart(e, pane.id, tabFile)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabClick(pane.id, tabFile);
                  }}
                  title={`Drag tab to move between panes: ${tabFile}`}
                  className={`h-7 px-2.5 rounded text-[11px] font-medium flex items-center gap-1.5 cursor-grab active:cursor-grabbing transition-colors shrink-0 select-none ${
                    isTabActive
                      ? 'bg-[#1e2029] text-white border-t-2 border-indigo-400 font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#181920]'
                  }`}
                >
                  <FileText size={12} className={isTabActive ? 'text-indigo-400' : 'text-zinc-500'} />
                  <span className="truncate max-w-[130px]">{tabName}</span>
                  {pane.openTabs.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(pane.id, tabFile, e)}
                      title="Close Tab"
                      className="hover:text-rose-400 p-0.5 rounded ml-1"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* PANE TOOL ACTIONS */}
          <div className="flex items-center gap-1 shrink-0 text-zinc-400">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onDetachTab) onDetachTab(pane.activeFilePath);
                else dockingEngine.detachTabToWindow(pane.activeFilePath);
              }}
              title="Detach pane to floating window / separate monitor"
              className="p-1 hover:text-indigo-300 hover:bg-zinc-800 rounded transition-colors"
            >
              <ExternalLink size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSplit('vertical');
              }}
              title="Split Vertically (Right) (Ctrl+\)"
              className="p-1 hover:text-cyan-300 hover:bg-zinc-800 rounded transition-colors"
            >
              <Columns2 size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSplit('horizontal');
              }}
              title="Split Horizontally (Down)"
              className="p-1 hover:text-cyan-300 hover:bg-zinc-800 rounded transition-colors"
            >
              <Rows2 size={12} />
            </button>
            {layoutState.panes.length > 1 && (
              <button
                onClick={(e) => handleClosePane(pane.id, e)}
                title="Close Split Pane"
                className="p-1 hover:text-rose-400 hover:bg-rose-950/50 rounded transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* BREADCRUMB BAR */}
        <div className="h-6 px-3 bg-[#0d0e12] border-b border-[#1f2026] flex items-center justify-between text-[10px] text-zinc-400 select-none">
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-indigo-400 font-mono">Pane {pane.id.replace('pane-', '#')}</span>
            <ChevronRight size={10} className="text-zinc-600" />
            <span className="text-zinc-300 truncate">{currentFilePath}</span>
          </div>
          <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-wider">
            {language}
          </span>
        </div>

        {/* PANE BODY */}
        <div className="flex-1 min-h-0 bg-[#09090b] relative">
          {isTool && renderToolContent ? (
            <div className="h-full w-full overflow-auto">
              {renderToolContent(currentFilePath)}
            </div>
          ) : (
            <MonacoEditor
              height="100%"
              language={language}
              theme="vs-dark"
              value={fileContent}
              onChange={(newVal) => {
                if (newVal !== undefined) {
                  onFileChange(currentFilePath, newVal);
                }
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 8 },
                tabSize: 2
              }}
            />
          )}
        </div>
      </div>
    );
  };

  const validWorkspaceFiles = Object.keys(parsedFiles).filter(f => !f.startsWith('__'));

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#09090b] overflow-hidden">
      {/* WORKBENCH GLOBAL LAYOUT CONTROLS HEADER */}
      <div className="h-8 px-3 bg-[#0d0e12] border-b border-[#27272a] flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
            <Layers size={13} className="text-indigo-400" />
            Editor Grid:
          </span>
          <div className="flex items-center bg-[#181920] border border-[#27272a] rounded p-0.5 gap-0.5">
            <button
              onClick={() => handleSetLayout('single')}
              title="Single Editor View"
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                layoutState.layoutType === 'single' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Square size={12} />
            </button>
            <button
              onClick={() => handleSetLayout('split-vertical')}
              title="2-Pane Vertical Split (Ctrl+\)"
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                layoutState.layoutType === 'split-vertical' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Columns2 size={12} />
            </button>
            <button
              onClick={() => handleSetLayout('split-horizontal')}
              title="2-Pane Horizontal Split"
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                layoutState.layoutType === 'split-horizontal' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Rows2 size={12} />
            </button>
            <button
              onClick={() => handleSetLayout('3-column')}
              title="3-Column Split Layout"
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                layoutState.layoutType === '3-column' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Split size={12} />
            </button>
            <button
              onClick={() => handleSetLayout('grid-2x2')}
              title="4-Way 2x2 Grid"
              className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                layoutState.layoutType === 'grid-2x2' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Grid2X2 size={12} />
            </button>
          </div>

          {/* Side-by-side diff comparing two arbitrary files */}
          <button
            onClick={handleOpenDiffComparator}
            title="Side-by-side diff comparing two arbitrary files in the project"
            className="px-2 py-0.5 bg-[#181920] hover:bg-indigo-950/80 text-zinc-300 hover:text-indigo-300 border border-[#27272a] hover:border-indigo-500/50 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <GitCompare size={12} className="text-indigo-400" />
            Compare Two Files
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-500 font-sans hidden sm:inline">
            Drag tabs between panes • <kbd className="px-1 py-0.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700 font-mono text-[9px]">Ctrl+\</kbd> to split
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">
            <strong className="text-zinc-200 uppercase">{layoutState.layoutType}</strong> ({layoutState.panes.length} {layoutState.panes.length === 1 ? 'pane' : 'panes'})
          </span>
        </div>
      </div>

      {/* DYNAMIC GRID RENDERING CONTAINER */}
      <div className="flex-1 min-h-0 min-w-0 p-1.5 overflow-hidden flex flex-col gap-1.5">
        {layoutState.layoutType === 'single' && (
          <div className="h-full w-full flex">
            {layoutState.panes[0] && renderEditorForPane(layoutState.panes[0])}
          </div>
        )}

        {layoutState.layoutType === 'split-vertical' && (
          <div className="h-full w-full flex gap-1.5">
            {layoutState.panes.slice(0, 2).map(pane => renderEditorForPane(pane))}
          </div>
        )}

        {layoutState.layoutType === 'split-horizontal' && (
          <div className="h-full w-full flex flex-col gap-1.5">
            {layoutState.panes.slice(0, 2).map(pane => renderEditorForPane(pane))}
          </div>
        )}

        {layoutState.layoutType === '3-column' && (
          <div className="h-full w-full flex gap-1.5">
            {layoutState.panes.slice(0, 3).map(pane => renderEditorForPane(pane))}
          </div>
        )}

        {layoutState.layoutType === 'grid-2x2' && (
          <div className="h-full w-full flex flex-col gap-1.5">
            <div className="flex-1 flex gap-1.5 min-h-0">
              {layoutState.panes.slice(0, 2).map(pane => renderEditorForPane(pane))}
            </div>
            <div className="flex-1 flex gap-1.5 min-h-0">
              {layoutState.panes.slice(2, 4).map(pane => renderEditorForPane(pane))}
            </div>
          </div>
        )}
      </div>

      {/* SIDE-BY-SIDE ARBITRARY FILE COMPARISON MODAL */}
      {isDiffModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-6xl h-[88vh] bg-[#0c0d12] border border-indigo-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans text-zinc-100">
            {/* COMPARATOR HEADER */}
            <div className="px-5 py-3 bg-[#13141c] border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                  <GitCompare size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Side-by-Side File Comparison
                    <span className="px-2 py-0.5 text-[10px] font-mono bg-indigo-950/60 text-indigo-300 rounded border border-indigo-700/50">
                      Monaco Diff
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Compare any two arbitrary files across your project with visual hunk diffing
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDiffModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* FILE SELECTORS BAR */}
            <div className="px-5 py-2.5 bg-[#101117] border-b border-zinc-800/80 flex items-center justify-between gap-4 text-xs shrink-0">
              {/* FILE A SELECTOR */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider shrink-0">
                  Original (A):
                </span>
                <select
                  value={diffFileA}
                  onChange={(e) => setDiffFileA(e.target.value)}
                  className="flex-1 bg-[#181920] border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 truncate"
                >
                  {validWorkspaceFiles.map(file => (
                    <option key={file} value={file}>{file}</option>
                  ))}
                </select>
              </div>

              {/* SWAP BUTTON */}
              <button
                onClick={() => {
                  const temp = diffFileA;
                  setDiffFileA(diffFileB);
                  setDiffFileB(temp);
                }}
                title="Swap File A and File B"
                className="p-1.5 bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white rounded-lg border border-zinc-700 transition-colors shrink-0"
              >
                <ArrowLeftRight size={14} />
              </button>

              {/* FILE B SELECTOR */}
              <div className="flex-1 flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider shrink-0">
                  Modified (B):
                </span>
                <select
                  value={diffFileB}
                  onChange={(e) => setDiffFileB(e.target.value)}
                  className="flex-1 bg-[#181920] border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 truncate"
                >
                  {validWorkspaceFiles.map(file => (
                    <option key={file} value={file}>{file}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* DIFF EDITOR CONTAINER */}
            <div className="flex-1 min-h-0 relative bg-[#09090b]">
              <MonacoDiffEditor
                height="100%"
                language={getLanguage(diffFileB || diffFileA)}
                original={parsedFiles[diffFileA] || ''}
                modified={parsedFiles[diffFileB] || ''}
                theme="vs-dark"
                options={{
                  readOnly: true,
                  renderSideBySide: true,
                  automaticLayout: true,
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                  scrollBeyondLastLine: false,
                  padding: { top: 12 }
                }}
              />
            </div>

            {/* FOOTER */}
            <div className="px-5 py-2.5 bg-[#12131a] border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <div className="flex items-center gap-4 text-[11px] font-mono">
                <span className="text-rose-400">● A: {diffFileA}</span>
                <span className="text-emerald-400">● B: {diffFileB}</span>
              </div>
              <button
                onClick={() => setIsDiffModalOpen(false)}
                className="px-4 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
