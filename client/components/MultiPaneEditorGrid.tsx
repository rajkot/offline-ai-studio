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
  Layers
} from 'lucide-react';
import { EditorPane, SplitLayoutType, dockingEngine, WorkbenchLayoutState } from '@/lib/dockingEngine';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

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

  const renderEditorForPane = (pane: EditorPane) => {
    const isActive = layoutState.activePaneId === pane.id;
    const currentFilePath = pane.activeFilePath;
    const fileContent = parsedFiles[currentFilePath] || '// Empty buffer or non-existent file';
    const isTool = currentFilePath.startsWith('__');

    // Language detection
    const ext = currentFilePath.split('.').pop()?.toLowerCase();
    let language = 'typescript';
    if (ext === 'rs') language = 'rust';
    else if (ext === 'py') language = 'python';
    else if (ext === 'json') language = 'json';
    else if (ext === 'html') language = 'html';
    else if (ext === 'css') language = 'css';
    else if (ext === 'md') language = 'markdown';
    else if (ext === 'cpp' || ext === 'c') language = 'cpp';
    else if (ext === 'go') language = 'go';

    return (
      <div
        key={pane.id}
        onClick={() => handlePaneClick(pane.id)}
        className={`flex-1 flex flex-col min-h-0 min-w-0 bg-[#09090b] border ${
          isActive ? 'border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30' : 'border-[#27272a]'
        } rounded-lg overflow-hidden transition-all duration-150`}
      >
        {/* PANE HEADER / TAB BAR */}
        <div className="h-9 px-2 bg-[#121318] border-b border-[#27272a] flex items-center justify-between gap-2 overflow-x-auto shrink-0 select-none">
          {/* TABS */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
            {pane.openTabs.map(tabFile => {
              const tabName = tabFile.split('/').pop() || tabFile;
              const isTabActive = tabFile === pane.activeFilePath;
              return (
                <div
                  key={tabFile}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTabClick(pane.id, tabFile);
                  }}
                  className={`h-7 px-2.5 rounded text-[11px] font-medium flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 ${
                    isTabActive
                      ? 'bg-[#1e2029] text-white border-t-2 border-indigo-400 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#181920]'
                  }`}
                >
                  <FileText size={12} className={isTabActive ? 'text-indigo-400' : 'text-zinc-500'} />
                  <span className="truncate max-w-[130px]">{tabName}</span>
                  {pane.openTabs.length > 1 && (
                    <button
                      onClick={(e) => handleCloseTab(pane.id, tabFile, e)}
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
              title="Split Vertically (Right)"
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

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#09090b] overflow-hidden">
      {/* WORKBENCH GLOBAL LAYOUT CONTROLS HEADER */}
      <div className="h-8 px-3 bg-[#0d0e12] border-b border-[#27272a] flex items-center justify-between text-xs shrink-0 select-none">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
            <Layers size={13} className="text-indigo-400" />
            Workbench Panes:
          </span>
          <div className="flex items-center bg-[#181920] border border-[#27272a] rounded p-0.5 gap-0.5">
            <button
              onClick={() => handleSetLayout('single')}
              title="Single Editor View"
              className={`p-1 rounded text-xs transition-colors ${
                layoutState.layoutType === 'single' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Square size={12} />
            </button>
            <button
              onClick={() => handleSetLayout('split-vertical')}
              title="2-Pane Vertical Split"
              className={`p-1 rounded text-xs transition-colors ${
                layoutState.layoutType === 'split-vertical' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Columns2 size={12} />
            </button>
            <button
              onClick={() => handleSetLayout('split-horizontal')}
              title="2-Pane Horizontal Split"
              className={`p-1 rounded text-xs transition-colors ${
                layoutState.layoutType === 'split-horizontal' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Rows2 size={12} />
            </button>
            <button
              onClick={() => handleSetLayout('3-column')}
              title="3-Column Split Layout"
              className={`p-1 rounded text-xs transition-colors ${
                layoutState.layoutType === '3-column' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Split size={12} />
            </button>
            <button
              onClick={() => handleSetLayout('grid-2x2')}
              title="4-Way 2x2 Grid"
              className={`p-1 rounded text-xs transition-colors ${
                layoutState.layoutType === 'grid-2x2' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Grid2X2 size={12} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 font-mono">
            Layout: <strong className="text-zinc-300 uppercase">{layoutState.layoutType}</strong> ({layoutState.panes.length} {layoutState.panes.length === 1 ? 'pane' : 'panes'})
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
    </div>
  );
}
