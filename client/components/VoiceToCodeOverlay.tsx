'use client';

import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import {
  localWhisperEngine,
  WhisperEngineState,
  VoiceTargetDestination
} from '@/lib/ai/localWhisperEngine';

interface VoiceToCodeOverlayProps {
  onInsertToEditor?: (text: string) => void;
  onSendToComposer?: (text: string) => void;
  onSendToAgent?: (text: string) => void;
  onClose?: () => void;
}

export default function VoiceToCodeOverlay({
  onInsertToEditor,
  onSendToComposer,
  onSendToAgent,
  onClose
}: VoiceToCodeOverlayProps) {
  const [whisperState, setWhisperState] = useState<WhisperEngineState>(localWhisperEngine.getState());

  useEffect(() => {
    const unsub = localWhisperEngine.subscribe((s) => {
      setWhisperState(s);
    });
    return unsub;
  }, []);

  if (!whisperState.isRecording && !whisperState.isTranscribing && !whisperState.transcript) {
    return null;
  }

  const handleStopAndDispatch = async () => {
    const finalTranscript = await localWhisperEngine.stopRecording();
    if (!finalTranscript) {
      if (onClose) onClose();
      return;
    }

    if (whisperState.targetDestination === 'editor' && onInsertToEditor) {
      onInsertToEditor(finalTranscript);
    } else if (whisperState.targetDestination === 'composer' && onSendToComposer) {
      onSendToComposer(finalTranscript);
    } else if (whisperState.targetDestination === 'agent' && onSendToAgent) {
      onSendToAgent(finalTranscript);
    }

    if (onClose) onClose();
  };

  const handleCancel = async () => {
    await localWhisperEngine.stopRecording();
    if (onClose) onClose();
  };

  const currentDisplay = whisperState.transcript + (whisperState.interimTranscript ? ' ' + whisperState.interimTranscript : '');

  return (
    <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 duration-200">
      <div className="bg-slate-900/95 border border-indigo-500/50 rounded-2xl shadow-2xl shadow-indigo-500/20 backdrop-blur-xl p-4 w-[520px] flex flex-col gap-3 text-white">
        
        {/* Top Status & Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Pulsing Mic Indicator */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center shadow-lg shadow-rose-600/30">
                <Mic className="w-4 h-4 text-white animate-pulse" />
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
                  F8 to toggle
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Lock size={10} />
                <span>100% Local Air-Gapped Audio</span>
              </div>
            </div>
          </div>

          {/* Target Destination Selector */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              onClick={() => localWhisperEngine.setTargetDestination('editor')}
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
              onClick={() => localWhisperEngine.setTargetDestination('composer')}
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
              onClick={() => localWhisperEngine.setTargetDestination('agent')}
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
        </div>

        {/* Live Audio Waveform Bars */}
        <div className="h-7 bg-slate-950/80 rounded-xl px-3 flex items-center justify-between gap-1.5 border border-slate-800/80 overflow-hidden">
          {whisperState.waveformData.map((val, idx) => (
            <div
              key={idx}
              className="flex-1 bg-gradient-to-t from-indigo-600 to-pink-500 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(4, Math.min(100, val))}%`,
                opacity: val > 5 ? 1 : 0.25
              }}
            />
          ))}
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
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <X size={13} />
            <span>Cancel</span>
          </button>

          <button
            onClick={handleStopAndDispatch}
            className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-pink-600 hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={13} />
            <span>Done (Insert / Execute)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
