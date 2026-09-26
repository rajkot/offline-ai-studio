'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  Lock,
  ArrowRight,
  Code2,
  Bot,
  MessageSquare,
  Check,
  X,
  GripHorizontal
} from 'lucide-react';
import {
  localWhisperEngine,
  WhisperEngineState,
  VoiceTargetDestination
} from '@/lib/ai/localWhisperEngine';

interface VoiceToCodeOverlayProps {
  isOpen?: boolean;
  onInsertToEditor?: (text: string) => void;
  onSendToComposer?: (text: string) => void;
  onSendToAgent?: (text: string) => void;
  onClose?: () => void;
}

export default function VoiceToCodeOverlay({
  isOpen = true,
  onInsertToEditor,
  onSendToComposer,
  onSendToAgent,
  onClose
}: VoiceToCodeOverlayProps) {
  const [whisperState, setWhisperState] = useState<WhisperEngineState>(localWhisperEngine.getState());
  
  // Draggable positioning state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = localWhisperEngine.subscribe((s) => {
      setWhisperState(s);
    });
    return unsub;
  }, []);

  // Global ESC key and F8 listener to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'F8') {
        e.preventDefault();
        e.stopPropagation();
        handleCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  // Mouse move and up handlers for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(20, Math.min(window.innerWidth - 540, dragRef.current.initialX + dx)),
        y: Math.max(20, Math.min(window.innerHeight - 300, dragRef.current.initialY + dy))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from header handle
    if ((e.target as HTMLElement).closest('button')) return;
    
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position ? position.x : rect.left,
      initialY: position ? position.y : rect.top
    };
    setIsDragging(true);
  };

  // If explicitly closed or inactive without recording/transcript
  if (!isOpen) {
    return null;
  }

  if (!whisperState.isRecording && !whisperState.isTranscribing && !whisperState.transcript) {
    return null;
  }

  const handleStopAndDispatch = async () => {
    const finalTranscript = await localWhisperEngine.stopRecording();
    if (!finalTranscript) {
      handleCancel();
      return;
    }

    if (whisperState.targetDestination === 'editor' && onInsertToEditor) {
      onInsertToEditor(finalTranscript);
    } else if (whisperState.targetDestination === 'composer' && onSendToComposer) {
      onSendToComposer(finalTranscript);
    } else if (whisperState.targetDestination === 'agent' && onSendToAgent) {
      onSendToAgent(finalTranscript);
    }

    localWhisperEngine.cancelRecording();
    if (onClose) onClose();
  };

  const handleCancel = () => {
    localWhisperEngine.cancelRecording();
    if (onClose) onClose();
  };

  const currentDisplay = whisperState.transcript + (whisperState.interimTranscript ? ' ' + whisperState.interimTranscript : '');

  const dynamicStyle: React.CSSProperties = position
    ? { position: 'fixed', left: `${position.x}px`, top: `${position.y}px`, zIndex: 9999 }
    : { position: 'fixed', bottom: '60px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999 };

  return (
    <div style={dynamicStyle} className="animate-in slide-in-from-bottom-5 duration-200">
      <div 
        ref={cardRef}
        className="bg-slate-900/98 border border-indigo-500/60 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-2xl p-4 w-[520px] flex flex-col gap-3 text-white ring-1 ring-white/10"
      >
        {/* Drag Handle & Top Controls */}
        <div 
          onMouseDown={handleMouseDown}
          className="flex items-center justify-between pb-1 border-b border-slate-800/80 cursor-grab active:cursor-grabbing select-none"
          title="Drag to move this window anywhere"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal size={14} className="text-slate-500" />
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/30">
                <Mic className="w-3.5 h-3.5 text-white animate-pulse" />
              </div>
              {whisperState.isRecording && (
                <span className="absolute -inset-1 rounded-full border-2 border-rose-500/60 animate-ping" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white tracking-wide">
                  {whisperState.isRecording ? 'Listening (Speak Now)...' : 'Processing Voice...'}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono">
                  F8 / Esc
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Lock size={10} />
                <span>100% Local Air-Gapped Audio</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Target Destination Selector */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
              <button
                onClick={(e) => { e.stopPropagation(); localWhisperEngine.setTargetDestination('editor'); }}
                className={`px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all ${
                  whisperState.targetDestination === 'editor'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Insert transcription into active Monaco editor cursor"
              >
                <Code2 size={11} />
                <span>Cursor</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); localWhisperEngine.setTargetDestination('composer'); }}
                className={`px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all ${
                  whisperState.targetDestination === 'composer'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Send speech as prompt to Multi-File Composer"
              >
                <MessageSquare size={11} />
                <span>Composer</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); localWhisperEngine.setTargetDestination('agent'); }}
                className={`px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all ${
                  whisperState.targetDestination === 'agent'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Send speech as goal to Autonomous Agent"
              >
                <Bot size={11} />
                <span>Agent</span>
              </button>
            </div>

            {/* Prominent Close X Button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleCancel(); }}
              title="Close window (Esc)"
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Live Audio Waveform Bars */}
        <div className="h-7 bg-slate-950/80 rounded-xl px-3 flex items-center justify-between gap-1.5 border border-slate-800/80 overflow-hidden">
          {whisperState.waveformData.length > 0 ? (
            whisperState.waveformData.map((val, idx) => (
              <div
                key={idx}
                className="flex-1 bg-gradient-to-t from-indigo-600 to-pink-500 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, Math.min(100, val))}%`,
                  opacity: val > 5 ? 1 : 0.25
                }}
              />
            ))
          ) : (
            <div className="w-full text-center text-[10px] text-slate-500 font-mono">Microphone ready • Speak naturally</div>
          )}
        </div>

        {/* Live Transcription Speech Bubble */}
        <div className="min-h-[44px] max-h-24 overflow-y-auto bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono leading-relaxed custom-scrollbar">
          {currentDisplay ? (
            <span>
              {currentDisplay}
              <span className="inline-block w-1.5 h-3 bg-indigo-400 ml-1 animate-pulse" />
            </span>
          ) : (
            <span className="text-slate-500 italic">
              Try saying: &quot;Refactor this function to be async and add try-catch error handling&quot;
            </span>
          )}
        </div>

        {/* Intent Badge if detected */}
        {whisperState.detectedIntent && whisperState.detectedIntent.action !== 'dictate' && (
          <div className="flex items-center gap-1.5 text-[11px] text-indigo-300 font-mono">
            <Sparkles size={12} className="text-pink-400" />
            <span>Detected Action:</span>
            <span className="px-2 py-0.5 rounded bg-indigo-950 border border-indigo-700/60 font-bold uppercase text-[10px]">
              {whisperState.detectedIntent.action}
            </span>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer font-medium"
          >
            <X size={14} />
            <span>Cancel</span>
          </button>

          <button
            onClick={handleStopAndDispatch}
            className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Check size={14} />
            <span>Done (Insert / Execute)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
