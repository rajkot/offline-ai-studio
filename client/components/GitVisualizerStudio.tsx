'use client';

import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  GitCommit as GitCommitIcon, 
  GitMerge, 
  GitPullRequest, 
  Layers, 
  Plus, 
  Tag, 
  Clock, 
  User, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  Copy,
  Trash2,
  Archive,
  Split,
  FileCode,
  Check,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { gitEngine, GitCommit, GitBranch as GitBranchType, GitStash, GitBlameLine } from '@/lib/gitEngine';
import MergeConflictResolver from './MergeConflictResolver';

interface GitVisualizerStudioProps {
  workspaceFiles?: Record<string, string>;
  currentFile?: string;
  onOpenFile?: (path: string) => void;
  onUpdateWorkspace?: (files: Record<string, string>) => void;
}

export default function GitVisualizerStudio({
  workspaceFiles = {},
  currentFile = 'components/Playground.tsx',
  onOpenFile,
  onUpdateWorkspace
}: GitVisualizerStudioProps) {
  const [commits, setCommits] = useState<GitCommit[]>([]);
  const [branches, setBranches] = useState<GitBranchType[]>([]);
  const [currentBranch, setCurrentBranch] = useState('main');
  const [stashes, setStashes] = useState<GitStash[]>([]);
  const [tags, setTags] = useState<Record<string, string>>({});
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null);
  const [activeTab, setActiveTab] = useState<'dag_graph' | 'merge_resolver' | 'blame_inspector' | 'stash_stack'>('dag_graph');
  const [newBranchName, setNewBranchName] = useState('');
  const [commitMessageInput, setCommitMessageInput] = useState('');
  const [blameLines, setBlameLines] = useState<GitBlameLine[]>([]);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshGitState = () => {
    setCommits(gitEngine.getCommits());
    setBranches(gitEngine.getBranches());
    setCurrentBranch(gitEngine.getCurrentBranch());
    setStashes(gitEngine.getStashes());
    setTags(gitEngine.getTags());

    const blame = gitEngine.computeBlame(currentFile, workspaceFiles[currentFile]);
    setBlameLines(blame);
  };

  useEffect(() => {
    refreshGitState();
    const unsubscribe = gitEngine.subscribe(() => {
      refreshGitState();
    });
    return () => unsubscribe();
  }, [currentFile, workspaceFiles]);

  const handleCreateCommit = () => {
    if (!commitMessageInput.trim()) return;
    try {
      const newCommit = gitEngine.commit(commitMessageInput.trim(), workspaceFiles);
      setCommitMessageInput('');
      setStatusMessage(`Created commit ${newCommit.shortSha}: "${newCommit.message}"`);
      setSelectedCommit(newCommit);
    } catch (err: any) {
      setStatusMessage(`Commit error: ${err.message}`);
    }
  };

  const handleCheckoutBranch = (branchName: string) => {
    try {
      const tree = gitEngine.checkout(branchName);
      if (tree && onUpdateWorkspace) {
        onUpdateWorkspace(tree);
      }
      setStatusMessage(`Switched to branch '${branchName}'`);
    } catch (err: any) {
      setStatusMessage(`Checkout error: ${err.message}`);
    }
  };

  const handleCreateNewBranch = () => {
    if (!newBranchName.trim()) return;
    try {
      gitEngine.createBranch(newBranchName.trim(), true);
      setStatusMessage(`Created and checked out branch '${newBranchName}'`);
      setNewBranchName('');
      setIsCreatingBranch(false);
    } catch (err: any) {
      setStatusMessage(`Branch error: ${err.message}`);
    }
  };

  const handleCherryPick = (sha: string) => {
    try {
      const c = gitEngine.cherryPick(sha);
      if (onUpdateWorkspace) {
        onUpdateWorkspace(c.tree);
      }
      setStatusMessage(`Cherry-picked commit ${c.shortSha} onto ${currentBranch}`);
    } catch (err: any) {
      setStatusMessage(`Cherry-pick error: ${err.message}`);
    }
  };

  const handleStashPush = () => {
    try {
      const stash = gitEngine.stashPush(`WIP on ${currentBranch}`, workspaceFiles);
      setStatusMessage(`Saved working directory state to ${stash.id}`);
    } catch (err: any) {
      setStatusMessage(`Stash error: ${err.message}`);
    }
  };

  const handleStashPop = () => {
    try {
      const popped = gitEngine.stashPop();
      if (popped && onUpdateWorkspace) {
        onUpdateWorkspace(popped.files);
        setStatusMessage(`Applied and dropped ${popped.id}`);
      }
    } catch (err: any) {
      setStatusMessage(`Stash pop error: ${err.message}`);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#0b0c10] text-zinc-200 select-none overflow-hidden font-sans border-r border-[#1f2028]">
      {/* Top Header */}
      <div className="p-3 bg-[#121319] border-b border-[#242531] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-950/90 border border-indigo-600/60 flex items-center justify-center text-indigo-400 shadow-md">
            <GitBranch size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Visual Git DAG & Merge Engine</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 font-mono">
                Branch: {currentBranch}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Interactive DAG topologies, 3-way merge resolver & line blame</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreatingBranch(!isCreatingBranch)}
            className="px-2.5 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-200 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus size={13} className="text-indigo-400" />
            New Branch
          </button>

          <button
            onClick={() => gitEngine.start3WayMerge('feature/dap-debugger')}
            className="px-2.5 py-1.5 rounded-md bg-purple-900/80 hover:bg-purple-800 border border-purple-600 text-xs font-semibold text-purple-100 flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <GitMerge size={13} className="text-purple-300" />
            Simulate 3-Way Merge
          </button>
        </div>
      </div>

      {/* Inline Create Branch Prompt */}
      {isCreatingBranch && (
        <div className="p-2.5 bg-[#171822] border-b border-[#242531] flex items-center gap-2">
          <span className="text-xs text-zinc-300 font-semibold">New branch name:</span>
          <input
            type="text"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="e.g., feature/vector-search"
            className="flex-1 bg-[#0a0b0e] text-white text-xs px-2.5 py-1.5 rounded border border-zinc-700 outline-none font-mono"
          />
          <button
            onClick={handleCreateNewBranch}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold cursor-pointer"
          >
            Create & Switch
          </button>
          <button
            onClick={() => setIsCreatingBranch(false)}
            className="px-2.5 py-1.5 bg-zinc-800 text-zinc-400 rounded text-xs cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Status banner */}
      {statusMessage && (
        <div className="px-3 py-1 bg-indigo-950/40 border-b border-indigo-800/40 text-indigo-300 text-[11px] flex items-center justify-between font-mono">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="text-zinc-500 hover:text-zinc-300 ml-2">×</button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex border-b border-[#242531] bg-[#101117] text-xs font-semibold">
        <button
          onClick={() => setActiveTab('dag_graph')}
          className={`px-4 py-2.5 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'dag_graph' 
              ? 'border-indigo-500 text-white bg-[#181922]' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <GitCommitIcon size={14} className="text-indigo-400" />
          Interactive DAG Graph ({commits.length})
        </button>

        <button
          onClick={() => setActiveTab('merge_resolver')}
          className={`px-4 py-2.5 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'merge_resolver' 
              ? 'border-indigo-500 text-white bg-[#181922]' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <GitMerge size={14} className="text-purple-400" />
          3-Way Conflict Resolver
        </button>

        <button
          onClick={() => setActiveTab('blame_inspector')}
          className={`px-4 py-2.5 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'blame_inspector' 
              ? 'border-indigo-500 text-white bg-[#181922]' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Eye size={14} className="text-cyan-400" />
          Real-Time Git Blame
        </button>

        <button
          onClick={() => setActiveTab('stash_stack')}
          className={`px-4 py-2.5 flex items-center gap-2 border-b-2 cursor-pointer transition-colors ${
            activeTab === 'stash_stack' 
              ? 'border-indigo-500 text-white bg-[#181922]' 
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Archive size={14} className="text-amber-400" />
          Stash Stack ({stashes.length})
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {activeTab === 'dag_graph' && (
          <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* Left: Commit History & Branch DAG */}
            <div className="w-3/5 min-h-0 border-r border-[#1f2028] flex flex-col bg-[#0d0e12]">
              {/* Commit Creation Input */}
              <div className="p-3 bg-[#13141a] border-b border-[#242531] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={commitMessageInput}
                    onChange={(e) => setCommitMessageInput(e.target.value)}
                    placeholder="Commit message (e.g., feat: add zero-copy OPFS persistence)..."
                    className="flex-1 bg-[#090a0e] text-white text-xs px-3 py-1.5 rounded border border-[#27272a] focus:border-indigo-500 outline-none font-mono"
                  />
                  <button
                    onClick={handleCreateCommit}
                    disabled={!commitMessageInput.trim()}
                    className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs cursor-pointer"
                  >
                    Commit
                  </button>
                </div>

                {/* Branches bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
                  <span className="text-zinc-500 font-mono">Branches:</span>
                  {branches.map(b => (
                    <button
                      key={b.name}
                      onClick={() => handleCheckoutBranch(b.name)}
                      className={`px-2 py-0.5 rounded font-mono flex items-center gap-1 cursor-pointer transition-colors ${
                        b.isHead 
                          ? 'bg-indigo-950 border border-indigo-600 text-indigo-200 font-bold' 
                          : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <GitBranch size={11} />
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Commit DAG List */}
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar divide-y divide-[#171821] font-mono text-xs">
                {commits.map((commit, index) => {
                  const isHead = commit.sha === gitEngine.getHeadSha();
                  const isSelected = selectedCommit?.sha === commit.sha;
                  const branchColor = commit.branch === 'main' ? 'text-indigo-400' : 'text-cyan-400';

                  return (
                    <div
                      key={commit.sha}
                      onClick={() => setSelectedCommit(commit)}
                      className={`p-3 flex items-start gap-3 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-indigo-950/60 text-indigo-100' 
                          : 'hover:bg-zinc-800/40 text-zinc-300'
                      }`}
                    >
                      {/* DAG Node Line */}
                      <div className="flex flex-col items-center shrink-0 pt-0.5">
                        <div className={`w-3 h-3 rounded-full border-2 ${
                          isHead 
                            ? 'bg-indigo-500 border-white ring-2 ring-indigo-500/50' 
                            : 'bg-zinc-700 border-zinc-500'
                        }`} />
                        {index < commits.length - 1 && (
                          <div className="w-0.5 h-10 bg-zinc-700/80 my-1" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white truncate">{commit.message}</span>
                          {isHead && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">
                              HEAD
                            </span>
                          )}
                          {commit.tags?.map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-600 text-amber-300 font-bold flex items-center gap-0.5">
                              <Tag size={8} /> {tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
                          <span className={`font-semibold ${branchColor}`}>({commit.branch})</span>
                          <span className="text-zinc-400">{commit.author.name}</span>
                          <span>{commit.shortSha}</span>
                          <span>{new Date(commit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCherryPick(commit.sha);
                        }}
                        title="Cherry-pick this commit"
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-[10px] shrink-0"
                      >
                        Cherry-Pick
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Commit Tree & Diff Detail */}
            <div className="w-2/5 min-h-0 flex flex-col bg-[#07080b]">
              <div className="p-2.5 bg-[#101117] border-b border-[#242531] flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300">
                  {selectedCommit ? `Commit: ${selectedCommit.shortSha}` : 'Select a commit to inspect'}
                </span>
                {selectedCommit && (
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {Object.keys(selectedCommit.tree).length} files in tree
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-4 font-mono text-xs">
                {selectedCommit ? (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-[#0d0e12] border border-zinc-800 space-y-1 text-xs">
                      <div><span className="text-zinc-500">Author:</span> {selectedCommit.author.name} &lt;{selectedCommit.author.email}&gt;</div>
                      <div><span className="text-zinc-500">Date:</span> {new Date(selectedCommit.timestamp).toLocaleString()}</div>
                      <div><span className="text-zinc-500">SHA:</span> <span className="text-indigo-400">{selectedCommit.sha}</span></div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-zinc-300 mb-2">Files in Snapshot Tree:</h4>
                      <div className="space-y-1">
                        {Object.keys(selectedCommit.tree).map(path => (
                          <div
                            key={path}
                            onClick={() => onOpenFile && onOpenFile(path)}
                            className="p-2 rounded bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between cursor-pointer hover:border-indigo-600 transition-colors"
                          >
                            <span className="text-zinc-300 flex items-center gap-1.5">
                              <FileCode size={12} className="text-indigo-400" />
                              {path}
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              {selectedCommit.tree[path].length} chars
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
                    Select a commit from the DAG graph on the left
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'merge_resolver' && (
          <div className="flex-1 flex overflow-hidden">
            <MergeConflictResolver
              onMergeComplete={(mergedFiles) => {
                if (onUpdateWorkspace) onUpdateWorkspace(mergedFiles);
                setStatusMessage('Merge successfully applied to workspace!');
                setActiveTab('dag_graph');
              }}
              onAbort={() => {
                setStatusMessage('Merge session aborted');
                setActiveTab('dag_graph');
              }}
            />
          </div>
        )}

        {activeTab === 'blame_inspector' && (
          <div className="flex-1 min-h-0 flex flex-col bg-[#07080b] overflow-hidden">
            <div className="p-2.5 bg-[#101117] border-b border-[#242531] flex items-center justify-between text-xs">
              <span className="font-semibold text-zinc-300 flex items-center gap-2">
                <FileCode size={14} className="text-cyan-400" />
                Real-Time Git Blame: <span className="text-white font-mono">{currentFile}</span>
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                {blameLines.length} lines annotated
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-auto custom-scrollbar p-2 font-mono text-xs divide-y divide-[#171821]">
              {blameLines.map((line) => (
                <div key={line.lineNumber} className="py-1.5 px-2 flex items-center gap-3 hover:bg-zinc-800/40 transition-colors group">
                  <span className="w-8 text-right text-zinc-600 select-none text-[11px]">{line.lineNumber}</span>
                  <span className="w-16 text-indigo-400 font-bold text-[11px] shrink-0">{line.shortSha}</span>
                  <span className="w-32 text-zinc-400 truncate text-[11px] shrink-0">{line.author}</span>
                  <span className="w-20 text-zinc-500 text-[10px] shrink-0">{line.relativeTime}</span>
                  <span className="text-zinc-200 truncate flex-1">{line.code}</span>
                  <span className="text-zinc-500 text-[10px] hidden group-hover:block truncate max-w-[200px]">
                    {line.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stash_stack' && (
          <div className="flex-1 min-h-0 p-6 overflow-y-auto custom-scrollbar bg-[#090a0e] flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <div className="bg-[#13141a] p-5 rounded-xl border border-[#27272a] shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-600/60 text-amber-400">
                    <Archive size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Git Stash Stack</h3>
                    <p className="text-xs text-zinc-400">Save uncommitted workspace changes to a temporary stack</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStashPush}
                    className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer shadow-md"
                  >
                    Stash Changes
                  </button>
                  <button
                    onClick={handleStashPop}
                    disabled={stashes.length === 0}
                    className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 text-xs cursor-pointer"
                  >
                    Pop Stash
                  </button>
                </div>
              </div>

              {stashes.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-zinc-800 rounded-lg">
                  No active stashes on the stack
                </div>
              ) : (
                <div className="space-y-2">
                  {stashes.map((stash, idx) => (
                    <div key={stash.id} className="p-3 bg-[#0a0b0e] rounded-lg border border-zinc-800 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-xs text-amber-300 font-bold">{stash.id}: {stash.message}</div>
                        <div className="text-[11px] text-zinc-500 mt-1">Branch: {stash.branch} • {new Date(stash.timestamp).toLocaleTimeString()}</div>
                      </div>
                      <button
                        onClick={() => gitEngine.stashDrop(idx)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
