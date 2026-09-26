'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Sparkles,
  X
} from 'lucide-react';
import {
  sonnerNotificationEngine,
  SonnerToastItem,
  ToastType
} from '@/lib/ui/sonnerNotificationEngine';

export default function SonnerToastHost() {
  const [toasts, setToasts] = useState<SonnerToastItem[]>([]);

  useEffect(() => {
    const unsubscribe = sonnerNotificationEngine.subscribe((list) => {
      setToasts(list);
    });
    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle size={16} className="text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-400 shrink-0" />;
      case 'ai':
        return <Sparkles size={16} className="text-indigo-400 shrink-0 animate-pulse" />;
      default:
        return <Info size={16} className="text-cyan-400 shrink-0" />;
    }
  };

  const getToastBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/40 bg-emerald-950/20';
      case 'error':
        return 'border-rose-500/40 bg-rose-950/20';
      case 'warning':
        return 'border-amber-500/40 bg-amber-950/20';
      case 'ai':
        return 'border-indigo-500/50 bg-indigo-950/30';
      default:
        return 'border-cyan-500/40 bg-cyan-950/20';
    }
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[99999] flex flex-col-reverse gap-2 max-w-sm w-full pointer-events-none select-none font-sans"
      aria-live="polite"
    >
      {toasts.map((toast, idx) => {
        // Stack visual effect: recent ones are full opacity, older ones scale slightly
        const scale = Math.max(0.92, 1 - idx * 0.03);
        const opacity = Math.max(0.7, 1 - idx * 0.1);

        return (
          <div
            key={toast.id}
            style={{
              transform: `scale(${scale})`,
              opacity
            }}
            className={`pointer-events-auto p-3.5 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 flex items-start gap-3 text-zinc-100 ${getToastBorderColor(
              toast.type
            )}`}
          >
            <div className="pt-0.5">{getToastIcon(toast.type)}</div>

            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold tracking-wide text-white leading-tight">
                {toast.title}
              </div>
              {toast.description && (
                <div className="text-[11px] text-zinc-300 mt-1 leading-snug">
                  {toast.description}
                </div>
              )}
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    sonnerNotificationEngine.dismiss(toast.id);
                  }}
                  className="mt-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            <button
              onClick={() => sonnerNotificationEngine.dismiss(toast.id)}
              className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors shrink-0"
              title="Dismiss"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
