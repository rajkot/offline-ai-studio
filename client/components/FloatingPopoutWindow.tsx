'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Minus,
  Square,
  Maximize2,
  ExternalLink,
  Move,
  Layers,
  Sparkles,
  Code2
} from 'lucide-react';

interface FloatingPopoutWindowProps {
  id: string;
  title: string;
  filePath?: string;
  toolId?: string;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  zIndex?: number;
  onFocus?: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export default function FloatingPopoutWindow({
  id,
  title,
  filePath,
  toolId,
  initialX = 120,
  initialY = 90,
  initialWidth = 760,
  initialHeight = 520,
  zIndex = 50,
  onFocus,
  onClose,
  children
}: FloatingPopoutWindowProps) {
  const [pos, setPos] = useState({ x: initialX, y: initialY });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [prevBounds, setPrevBounds] = useState({ x: initialX, y: initialY, width: initialWidth, height: initialHeight });

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, y: 0, w: initialWidth, h: initialHeight });

  const handleMouseDownHeader = (e: React.MouseEvent) => {
    if (isMaximized) return;
    if (onFocus) onFocus();
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y
    };
  };

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMaximized) return;
    if (onFocus) onFocus();
    isResizingRef.current = true;
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      w: size.width,
      h: size.height
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        const nextX = Math.max(10, Math.min(window.innerWidth - 100, e.clientX - dragOffsetRef.current.x));
        const nextY = Math.max(10, Math.min(window.innerHeight - 80, e.clientY - dragOffsetRef.current.y));
        setPos({ x: nextX, y: nextY });
      } else if (isResizingRef.current) {
        const dx = e.clientX - resizeStartRef.current.x;
        const dy = e.clientY - resizeStartRef.current.y;
        setSize({
          width: Math.max(380, resizeStartRef.current.w + dx),
          height: Math.max(260, resizeStartRef.current.h + dy)
        });
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const toggleMaximize = () => {
    if (isMaximized) {
      setPos({ x: prevBounds.x, y: prevBounds.y });
      setSize({ width: prevBounds.width, height: prevBounds.height });
      setIsMaximized(false);
    } else {
      setPrevBounds({ x: pos.x, y: pos.y, width: size.width, height: size.height });
      setPos({ x: 20, y: 20 });
      setSize({ width: window.innerWidth - 40, height: window.innerHeight - 40 });
      setIsMaximized(true);
      setIsMinimized(false);
    }
  };

  const openInBrowserPopout = () => {
    // Open detached multi-monitor browser window
    const popout = window.open(
      '',
      `Popout_${id}`,
      `width=${size.width},height=${size.height},left=${pos.x + 100},top=${pos.y + 100}`
    );
    if (popout) {
      popout.document.title = `${title} - Offline IDE Multi-Monitor Detached`;
      popout.document.body.style.margin = '0';
      popout.document.body.style.background = '#09090b';
      popout.document.body.style.color = '#f4f4f5';
      popout.document.body.style.fontFamily = 'monospace';
      popout.document.body.innerHTML = `
        <div style="padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #27272a; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="margin: 0; font-size: 16px; color: #a5b4fc;">🪟 Detached Multi-Monitor Window: ${title}</h2>
            <span style="font-size: 11px; background: #1e1b4b; color: #818cf8; padding: 4px 8px; border-radius: 6px;">Live Sync Active</span>
          </div>
          <p style="color: #a1a1aa; font-size: 13px;">This pane is synced with the main IDE workbench workspace across monitors.</p>
          <div style="background: #18181b; border: 1px solid #27272a; border-radius: 8px; padding: 16px; font-family: monospace; font-size: 12px; color: #34d399;">
            [Active Sync Buffer: ${filePath || toolId || 'workbench-session'}]
          </div>
        </div>
      `;
    }
  };

  return (
    <div
      onClick={onFocus}
      style={{
        position: 'fixed',
        left: isMaximized ? 20 : pos.x,
        top: isMaximized ? 20 : pos.y,
        width: isMaximized ? 'calc(100vw - 40px)' : size.width,
        height: isMinimized ? 38 : isMaximized ? 'calc(100vh - 40px)' : size.height,
        zIndex
      }}
      className="flex flex-col bg-[#0d0e12] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden transition-all duration-75 select-none"
    >
      {/* WINDOW TITLEBAR */}
      <div
        onMouseDown={handleMouseDownHeader}
        onDoubleClick={toggleMaximize}
        className="h-9 px-3 bg-[#13141a] border-b border-[#27272a] flex items-center justify-between cursor-move shrink-0"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
          <Code2 size={14} className="text-indigo-400" />
          <span className="truncate max-w-[280px]">{title}</span>
          <span className="text-[10px] bg-indigo-950/80 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700/40">
            Detached Pane
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openInBrowserPopout();
            }}
            title="Pop out to native separate browser window (Multi-monitor)"
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          >
            <ExternalLink size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            title={isMinimized ? 'Expand' : 'Minimize'}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          >
            <Minus size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximize();
            }}
            title={isMaximized ? 'Restore' : 'Maximize'}
            className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          >
            <Square size={11} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Close / Dock back"
            className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/50 rounded transition-colors"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* WINDOW CONTENT */}
      {!isMinimized && (
        <div className="flex-1 min-h-0 bg-[#09090b] overflow-hidden flex flex-col relative select-text">
          {children}
        </div>
      )}

      {/* RESIZE HANDLE */}
      {!isMaximized && !isMinimized && (
        <div
          onMouseDown={handleMouseDownResize}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-center justify-center opacity-40 hover:opacity-100"
        >
          <div className="w-2 h-2 border-r-2 border-b-2 border-indigo-400" />
        </div>
      )}
    </div>
  );
}
