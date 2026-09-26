'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  FolderPlus, 
  MousePointerClick, 
  RefreshCw, 
  ShieldCheck, 
  Terminal, 
  ExternalLink,
  Trash2,
  FolderOpen
} from 'lucide-react';

interface WindowsContextMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFolder?: (folderPath: string) => void;
}

interface ContextMenuStatus {
  platform: string;
  isWindows: boolean;
  registered: boolean;
  commandValue?: string;
  recommendedExecutable?: string;
  menuLabel?: string;
}

export const WindowsContextMenuModal: React.FC<WindowsContextMenuModalProps> = ({
  isOpen,
  onClose,
  onOpenFolder
}) => {
  const [status, setStatus] = useState<ContextMenuStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActing, setIsActing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testFolderInput, setTestFolderInput] = useState<string>('');

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/context-menu');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err: any) {
      console.error('Failed to query context menu status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setFeedback(null);
    }
  }, [isOpen]);

  const handleRegister = async () => {
    setIsActing(true);
    setFeedback(null);
    try {
      // 1. Try Electron API if available
      if ((window as any).electronAPI?.registerContextMenu) {
        const res = await (window as any).electronAPI.registerContextMenu();
        if (res.success) {
          setFeedback({ type: 'success', message: 'Successfully registered in Windows Registry via Desktop Engine!' });
          fetchStatus();
          return;
        }
      }

      // 2. Fallback to API route
      const res = await fetch('/api/context-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register' })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message || 'Context menu registered successfully!' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to register context menu.' });
      }
      fetchStatus();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsActing(false);
    }
  };

  const handleUnregister = async () => {
    setIsActing(true);
    setFeedback(null);
    try {
      if ((window as any).electronAPI?.unregisterContextMenu) {
        await (window as any).electronAPI.unregisterContextMenu();
      }

      const res = await fetch('/api/context-menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unregister' })
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: data.message || 'Removed from Windows context menu.' });
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to unregister.' });
      }
      fetchStatus();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsActing(false);
    }
  };

  const handleTestOpen = () => {
    if (!testFolderInput.trim()) return;
    if (onOpenFolder) {
      onOpenFolder(testFolderInput.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0d1117] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <MousePointerClick size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                Windows File Explorer Integration
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/50 font-mono">
                  VS Code-Style Right Click
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Directly right-click any folder or workspace to launch Offline AI Studio with full permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar text-xs">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            status?.registered 
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200' 
              : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
          }`}>
            {status?.registered ? (
              <CheckCircle2 size={22} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={22} className="text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>{status?.registered ? 'Context Menu Active in Windows Explorer' : 'Context Menu Not Registered'}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                  status?.registered ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {status?.registered ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-zinc-400 leading-relaxed text-xs">
                {status?.registered
                  ? 'Right-clicking any folder, directory background, or drive in Windows File Explorer displays "Open with Offline AI Studio" and mounts that folder with full read/write permissions.'
                  : 'Enable this feature to add "Open with Offline AI Studio" to your Windows File Explorer right-click menu, exactly like VS Code\'s "Open with Code".'}
              </p>
            </div>
          </div>

          {/* Feedback Notice */}
          {feedback && (
            <div className={`p-3 rounded-lg text-xs font-mono border ${
              feedback.type === 'success' 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              {feedback.message}
            </div>
          )}

          {/* Configuration & Path */}
          <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-zinc-300 flex items-center gap-2">
              <Terminal size={14} className="text-indigo-400" />
              Configured Executable / Target Command
            </h3>
            <div className="bg-black/60 p-2.5 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300 break-all select-all">
              {status?.commandValue || status?.recommendedExecutable || 'Auto-detecting executable...'}
            </div>
            <div className="flex items-center gap-4 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={12} className="text-emerald-400" /> Zero Admin Elevation Required (HKCU)
              </span>
              <span className="flex items-center gap-1.5">
                <FolderPlus size={12} className="text-indigo-400" /> Folders + Background + Drives
              </span>
            </div>
          </div>

          {/* Visual Step-by-Step Flow */}
          <div className="space-y-2">
            <h3 className="font-semibold text-zinc-300 flex items-center gap-2">
              <MousePointerClick size={14} className="text-indigo-400" />
              How It Works in Windows Explorer
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">1</span>
                  Right-Click Folder
                </div>
                <p className="text-[11px] text-zinc-400">
                  Select any folder or right-click empty space inside an open directory.
                </p>
              </div>

              <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">2</span>
                  Click Menu Option
                </div>
                <p className="text-[11px] text-zinc-400">
                  Click <span className="text-indigo-300 font-medium">"Open with Offline AI Studio"</span> in the context menu.
                </p>
              </div>

              <div className="p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px]">3</span>
                  Instant Workspace
                </div>
                <p className="text-[11px] text-zinc-400">
                  The IDE opens that folder with full read/write, file creation, editing, and terminal permissions.
                </p>
              </div>
            </div>
          </div>

          {/* Test Folder Launcher */}
          <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-3.5 space-y-2">
            <label className="block text-xs font-semibold text-zinc-300">
              Test Open Folder Path Right Now:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. C:\Users\YourUser\Projects\MyApp"
                value={testFolderInput}
                onChange={(e) => setTestFolderInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestOpen()}
                className="flex-1 bg-black/60 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleTestOpen}
                disabled={!testFolderInput.trim()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <FolderOpen size={13} />
                Open
              </button>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-950/60">
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              disabled={isLoading || isActing}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 flex items-center gap-1.5 text-xs cursor-pointer transition-colors"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {status?.registered && (
              <button
                onClick={handleUnregister}
                disabled={isActing}
                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer transition-colors"
              >
                <Trash2 size={12} />
                Remove Context Menu
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={handleRegister}
              disabled={isActing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <MousePointerClick size={14} />
              {status?.registered ? 'Re-Register / Update Context Menu' : 'Add to Windows Right-Click Menu'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
