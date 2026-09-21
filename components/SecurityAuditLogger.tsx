'use client';
import { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  risk: 'Critical' | 'High' | 'Medium' | 'Low';
  type: string;
  detail: string;
}

export default function SecurityAuditLogger() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/pipeline/guardrails/audit-logs');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs);
        }
      } catch (e) {
        console.error('Failed to fetch audit logs', e);
      }
    };
    fetchLogs();
    
    // Refresh logs periodically to simulate real-time updates
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-3 h-full overflow-y-auto bg-slate-900 text-slate-200 font-sans">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2 text-rose-400">
          <ShieldAlert size={16} />
          <span className="font-semibold text-sm">Access Audit & Security Violation Logs</span>
        </div>
        <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          {logs.length} Total Events Tracked
        </span>
      </div>

      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="py-2 px-3 font-semibold text-slate-400">Timestamp</th>
            <th className="py-2 px-3 font-semibold text-slate-400">Risk Level</th>
            <th className="py-2 px-3 font-semibold text-slate-400">Event Type</th>
            <th className="py-2 px-3 font-semibold text-slate-400">Details & Access Context</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-4 text-center text-slate-500 italic">No access violations or security warnings detected.</td>
            </tr>
          ) : (
            logs.map((log) => {
              const isAccessViolation = log.type === 'UNAUTHORIZED_ACCESS' || log.risk === 'Critical' || log.risk === 'High';
              return (
                <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 whitespace-nowrap font-mono text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1
                      ${log.risk === 'Critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 
                        log.risk === 'High' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 
                        'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}
                    `}>
                      {isAccessViolation ? (
                        <AlertTriangle size={11} className="text-rose-500 animate-pulse shrink-0" />
                      ) : (
                        <Info size={11} className="shrink-0" />
                      )}
                      {log.risk}
                    </span>
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap font-medium text-slate-300">
                    {log.type}
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {log.detail}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

