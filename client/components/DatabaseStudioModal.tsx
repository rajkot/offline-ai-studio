'use client';

import React, { useState, useEffect } from 'react';
import {
  Database,
  Table,
  Key,
  Layers,
  Sparkles,
  Play,
  Download,
  Copy,
  Check,
  ChevronRight,
  Search,
  RefreshCw,
  X,
  FileCode,
  ArrowRight,
  GitBranch,
  ShieldCheck,
  Zap,
  Code2
} from 'lucide-react';
import {
  databaseEngine,
  DbTable,
  ErRelationship,
  QueryResult
} from '@/lib/database/databaseEngine';

interface DatabaseStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSqlToEditor?: (sql: string) => void;
}

export default function DatabaseStudioModal({
  isOpen,
  onClose,
  onInsertSqlToEditor
}: DatabaseStudioModalProps) {
  const [activeTab, setActiveTab] = useState<'grid' | 'diagram' | 'ai_query'>('grid');
  const [tables, setTables] = useState<DbTable[]>([]);
  const [selectedTableName, setSelectedTableName] = useState<string>('users');
  const [relationships, setRelationships] = useState<ErRelationship[]>([]);
  const [searchTableQuery, setSearchTableQuery] = useState('');
  
  // Query Lab State
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT u.id, u.name, u.email, COUNT(o.id) as order_count, SUM(o.total_amount) as total_spent\nFROM users u\nLEFT JOIN orders o ON u.id = o.user_id\nGROUP BY u.id, u.name, u.email;'
  );
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [aiPrompt, setAiPrompt] = useState('Write a migration adding a soft-delete column to users');
  const [isGeneratingSql, setIsGeneratingSql] = useState(false);
  const [copiedQuery, setCopiedQuery] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const allTables = databaseEngine.getTables();
      setTables(allTables);
      setRelationships(databaseEngine.getRelationships());
      if (allTables.length > 0 && !selectedTableName) {
        setSelectedTableName(allTables[0].name);
      }
    }
  }, [isOpen, selectedTableName]);

  if (!isOpen) return null;

  const currentTable = tables.find((t) => t.name === selectedTableName) || tables[0];

  const handleRunQuery = () => {
    const res = databaseEngine.executeQuery(sqlQuery);
    setQueryResult(res);
  };

  const handleAskAiSql = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingSql(true);
    try {
      const generated = await databaseEngine.generateSqlFromPrompt(aiPrompt);
      setSqlQuery(generated);
      // Auto run query
      const res = databaseEngine.executeQuery(generated);
      setQueryResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSql(false);
    }
  };

  const handleExportCsv = () => {
    if (!currentTable) return;
    const cols = currentTable.columns.map((c) => c.name);
    const csvRows = [
      cols.join(','),
      ...currentTable.rows.map((row) => cols.map((col) => JSON.stringify(row[col] ?? '')).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentTable.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(searchTableQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Built-in Database Studio
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-700/50 font-mono">
                  Visual SQLite &amp; PostgreSQL Client
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Inspect relational tables, visualize schema ER diagrams, and generate complex SQL joins via AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Navigation */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('grid')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'grid'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table size={13} />
                <span>Data Grid</span>
              </button>

              <button
                onClick={() => setActiveTab('diagram')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'diagram'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers size={13} />
                <span>Schema Visualizer (ER)</span>
              </button>

              <button
                onClick={() => setActiveTab('ai_query')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'ai_query'
                    ? 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles size={13} className="text-yellow-400" />
                <span>AI SQL Assistant</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Studio Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar: Tables List */}
          <div className="w-72 border-r border-slate-800 bg-slate-950/40 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
              <span>Tables ({tables.length})</span>
              <span className="text-[10px] text-teal-400 font-mono">SQLite / PG</span>
            </div>

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search tables..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
              {filteredTables.map((t) => {
                const isSelected = selectedTableName === t.name;
                return (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTableName(t.name)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-950/80 border border-teal-600/60 text-teal-200 shadow-sm'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Table size={13} className={isSelected ? 'text-teal-400' : 'text-slate-500'} />
                      <span className="font-semibold truncate">{t.name}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 rounded text-slate-400">
                      {t.rowCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Main Panel */}
          <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
            {/* TAB 1: Data Grid */}
            {activeTab === 'grid' && currentTable && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Table size={14} className="text-teal-400" />
                    <span className="font-bold text-white">{currentTable.name}</span>
                    <span className="text-slate-500">({currentTable.columns.length} columns, {currentTable.rows.length} rows)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportCsv}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download size={12} />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* Table Viewport */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead className="sticky top-0 bg-slate-900/95 border-b border-slate-800 text-slate-400">
                      <tr>
                        {currentTable.columns.map((col) => (
                          <th key={col.name} className="px-4 py-2.5 font-semibold text-slate-200">
                            <div className="flex items-center gap-1.5">
                              {col.primaryKey && <Key size={11} className="text-amber-400" />}
                              <span>{col.name}</span>
                              <span className="text-[10px] text-slate-500 font-normal">({col.type})</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {currentTable.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-900/50 transition-colors">
                          {currentTable.columns.map((col) => (
                            <td key={col.name} className="px-4 py-2 text-slate-300 truncate max-w-[200px]">
                              {row[col.name] !== undefined && row[col.name] !== null ? (
                                typeof row[col.name] === 'boolean' ? (
                                  <span className={row[col.name] ? 'text-emerald-400' : 'text-rose-400'}>
                                    {String(row[col.name])}
                                  </span>
                                ) : (
                                  String(row[col.name])
                                )
                              ) : (
                                <span className="text-slate-600 italic">NULL</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Schema Visualizer (ER Diagram) */}
            {activeTab === 'diagram' && (
              <div className="flex-1 p-6 overflow-auto custom-scrollbar flex flex-col gap-6">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Interactive Schema Visualizer: Foreign-key relationships &amp; constraints</span>
                  <span className="text-teal-400 font-mono">{relationships.length} Relationships mapped</span>
                </div>

                {/* Visual Tables Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tables.map((tbl) => (
                    <div
                      key={tbl.name}
                      className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col"
                    >
                      {/* Table Header */}
                      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Table size={13} className="text-teal-400" />
                          <span className="text-xs font-bold text-white font-mono">{tbl.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">{tbl.rowCount} rows</span>
                      </div>

                      {/* Columns List */}
                      <div className="p-3 divide-y divide-slate-800/50 space-y-1.5 font-mono text-xs">
                        {tbl.columns.map((col) => (
                          <div key={col.name} className="pt-1.5 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              {col.primaryKey ? (
                                <Key size={11} className="text-amber-400 shrink-0" />
                              ) : col.foreignKey ? (
                                <GitBranch size={11} className="text-indigo-400 shrink-0" />
                              ) : (
                                <span className="w-2.5" />
                              )}
                              <span className={`text-xs ${col.primaryKey ? 'text-amber-200 font-bold' : 'text-slate-200'}`}>
                                {col.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-500">{col.type}</span>
                              {col.foreignKey && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/50">
                                  ➔ {col.foreignKey.targetTable}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Relationships Summary */}
                <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch size={13} className="text-indigo-400" />
                    <span>Relational Foreign Key Map</span>
                  </span>
                  <div className="space-y-1 text-xs font-mono text-slate-400">
                    {relationships.map((rel) => (
                      <div key={rel.id} className="flex items-center gap-2">
                        <span className="text-teal-300">{rel.fromTable}.{rel.fromColumn}</span>
                        <ArrowRight size={12} className="text-slate-600" />
                        <span className="text-amber-300">{rel.toTable}.{rel.toColumn}</span>
                        <span className="text-[10px] bg-slate-800 px-1.5 rounded text-slate-500">
                          {rel.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: AI SQL Assistant & Query Lab */}
            {activeTab === 'ai_query' && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Natural Language Prompt Input Bar */}
                <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-yellow-400" />
                      <span>Natural Language SQL Synthesizer</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Powered by Local Ollama / OmniRoute AI
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAskAiSql()}
                      placeholder="e.g. Write a migration adding a soft-delete column to users or find highest spending users"
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    <button
                      onClick={handleAskAiSql}
                      disabled={isGeneratingSql}
                      className="px-4 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingSql ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
                      <span>Synthesize SQL</span>
                    </button>
                  </div>
                </div>

                {/* SQL Editor & Execution Actions */}
                <div className="h-44 border-b border-slate-800 flex flex-col bg-slate-950">
                  <div className="px-4 py-1.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-mono">SQL Query Editor</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRunQuery}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>Run Query</span>
                      </button>

                      {onInsertSqlToEditor && (
                        <button
                          onClick={() => onInsertSqlToEditor(sqlQuery)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
                          title="Insert SQL into active Monaco editor"
                        >
                          Insert to Code
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="flex-1 w-full bg-slate-950 p-4 font-mono text-xs text-teal-300 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Query Results Viewport */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
                  <div className="px-6 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">
                      Query Results:{' '}
                      <span className="text-white font-bold">
                        {queryResult ? `${queryResult.rowCount} rows in ${queryResult.durationMs}ms` : 'No query executed yet'}
                      </span>
                    </span>
                  </div>

                  <div className="flex-1 overflow-auto custom-scrollbar">
                    {queryResult && queryResult.columns.length > 0 ? (
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
                          <tr>
                            {queryResult.columns.map((col) => (
                              <th key={col} className="px-4 py-2 font-semibold text-slate-200">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {queryResult.rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              {queryResult.columns.map((col) => (
                                <td key={col} className="px-4 py-1.5 text-slate-300 truncate max-w-[200px]">
                                  {row[col] !== undefined ? String(row[col]) : 'NULL'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center">
                        <Database size={32} className="mb-2 text-slate-700" />
                        <p className="font-semibold text-slate-400 text-xs">Execute a query above to see live results</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
