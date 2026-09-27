'use client';

import React, { useState } from 'react';
import {
  Crosshair,
  Monitor,
  MousePointer,
  Keyboard,
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  Layers,
  Zap,
  Target
} from 'lucide-react';
import { uiTarsEngine, UiTarsParsedAction } from '@/lib/ai/uiTarsEngine';

interface UiTarsStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UiTarsStudioModal({
  isOpen,
  onClose
}: UiTarsStudioModalProps) {
  const [taskGoal, setTaskGoal] = useState<string>('Click the CRM Search input, type "Acme Corp", and press Enter');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [crosshairPos, setCrosshairPos] = useState<[number, number]>([500, 320]);
  const [parsedAction, setParsedAction] = useState<UiTarsParsedAction>({
    action: 'click',
    point: [500, 320],
    thought: 'The CRM Search input field is visible at the center of the application bar.',
    rawActionText: 'click(point=[500, 320])'
  });

  const [actionHistory, setActionHistory] = useState<Array<{
    step: number;
    action: UiTarsParsedAction;
    scaled: [number, number];
    time: string;
    safe: boolean;
  }>>([
    {
      step: 1,
      action: {
        action: 'click',
        point: [500, 320],
        thought: 'Identify Search input box on CRM header',
        rawActionText: 'click(point=[500, 320])'
      },
      scaled: [960, 345],
      time: '12:00:01',
      safe: true
    }
  ]);

  // Simulate next UI-TARS action step
  const handleNextStep = () => {
    setIsProcessing(true);
    setTimeout(() => {
      let nextAction: UiTarsParsedAction;
      let nextPoint: [number, number] = [crosshairPos[0], crosshairPos[1]];

      if (currentStep === 1) {
        nextAction = {
          action: 'type',
          content: 'Acme Corp',
          thought: 'Search bar is focused. Typing query "Acme Corp".',
          rawActionText: 'type(content="Acme Corp")'
        };
      } else if (currentStep === 2) {
        nextAction = {
          action: 'hotkey',
          key: 'enter',
          thought: 'Query typed. Triggering Enter hotkey to execute search.',
          rawActionText: 'hotkey(key="enter")'
        };
      } else {
        nextPoint = [Math.floor(Math.random() * 600 + 200), Math.floor(Math.random() * 500 + 200)];
        nextAction = {
          action: 'click',
          point: nextPoint,
          thought: 'Found search result card. Clicking to open lead details.',
          rawActionText: `click(point=[${nextPoint[0]}, ${nextPoint[1]}])`
        };
      }

      const scaled = uiTarsEngine.scaleCoordinates(nextPoint, 1920, 1080);
      const safety = uiTarsEngine.validateActionSafety(nextAction);

      setCrosshairPos(nextPoint);
      setParsedAction(nextAction);
      setCurrentStep((prev) => prev + 1);

      setActionHistory((prev) => [
        {
          step: currentStep + 1,
          action: nextAction,
          scaled,
          time: new Date().toLocaleTimeString(),
          safe: safety.safe
        },
        ...prev
      ]);
      setIsProcessing(false);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-6xl h-[90vh] bg-zinc-950 border border-zinc-800/90 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-rose-500/20 to-red-500/20 border border-rose-500/30 text-rose-400">
              <Crosshair className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-100">UI-TARS Computer-Use Studio</h2>
                <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  bytedance/UI-TARS
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Native Vision-Language GUI Agent & Screen Coordinate Normalizer [0..1000]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Task Goal Input Bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-zinc-800/60 bg-zinc-900/30">
          <Target className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <input
            type="text"
            value={taskGoal}
            onChange={(e) => setTaskGoal(e.target.value)}
            placeholder="Describe the desktop OS or GUI task for UI-TARS..."
            className="flex-1 bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
          <button
            onClick={handleNextStep}
            disabled={isProcessing}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-md shadow-rose-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            {isProcessing ? 'Predicting...' : 'Step Next Action'}
          </button>
        </div>

        {/* Main Body Split View */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Canvas: Screen Simulator with Visual Crosshairs */}
          <div className="w-7/12 flex flex-col border-r border-zinc-800/80 bg-zinc-950/70 p-6 relative">
            <div className="flex items-center justify-between mb-3 text-xs">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-rose-400" /> Target GUI Viewport (Simulated 1920x1080)
              </span>
              <span className="font-mono text-zinc-500 text-[11px]">
                Target: [{crosshairPos[0]}, {crosshairPos[1]}]
              </span>
            </div>

            {/* Virtual Screen Container */}
            <div className="flex-1 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 relative overflow-hidden flex flex-col shadow-inner">
              {/* Fake Window Titlebar */}
              <div className="h-7 bg-zinc-900 border-b border-zinc-800 px-3 flex items-center justify-between text-[11px] text-zinc-400 select-none">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-2 font-medium">Enterprise Desktop CRM Client (Active Viewport)</span>
                </div>
                <span>100% Zoom</span>
              </div>

              {/* Fake App Mock Contents */}
              <div className="flex-1 p-6 relative select-none">
                <div className="h-8 bg-zinc-800/60 rounded-lg mb-4 flex items-center px-3 text-xs text-zinc-400 border border-zinc-700/50">
                  🔍 Search leads, invoices, accounts...
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="h-20 bg-zinc-800/40 rounded-lg border border-zinc-800 p-2.5 text-[11px] text-zinc-400">
                    Total Active Leads
                    <div className="text-lg font-bold text-zinc-200 mt-1">1,248</div>
                  </div>
                  <div className="h-20 bg-zinc-800/40 rounded-lg border border-zinc-800 p-2.5 text-[11px] text-zinc-400">
                    Pending Invoices
                    <div className="text-lg font-bold text-amber-400 mt-1">42</div>
                  </div>
                  <div className="h-20 bg-zinc-800/40 rounded-lg border border-zinc-800 p-2.5 text-[11px] text-zinc-400">
                    System Health
                    <div className="text-lg font-bold text-emerald-400 mt-1">100%</div>
                  </div>
                </div>

                {/* Animated UI-TARS Red Target Crosshairs */}
                <div
                  className="absolute pointer-events-none transition-all duration-500 ease-out z-20 flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${(crosshairPos[0] / 1000) * 100}%`,
                    top: `${(crosshairPos[1] / 1000) * 100}%`
                  }}
                >
                  <div className="w-8 h-8 rounded-full border-2 border-rose-500 bg-rose-500/20 animate-ping absolute" />
                  <div className="w-6 h-6 rounded-full border border-rose-400 flex items-center justify-center bg-rose-500/40 shadow-lg shadow-rose-500/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                  <div className="absolute top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-rose-500/80 text-[10px] font-mono text-rose-300 whitespace-nowrap shadow-xl">
                    UI-TARS Click [{crosshairPos[0]}, {crosshairPos[1]}]
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Pane: Action History & Thought Stream */}
          <div className="w-5/12 flex flex-col bg-zinc-950 p-6 space-y-4">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-rose-400" /> UI-TARS Action Stream & Reasoning
            </h3>

            {/* Current Active Step Box */}
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-rose-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono font-bold text-rose-400">
                  Step {currentStep} Active Prediction
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                  {parsedAction.action}
                </span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                {parsedAction.thought}
              </p>
              <div className="p-2 rounded bg-black/60 font-mono text-xs text-rose-300 border border-zinc-800">
                Action: {parsedAction.rawActionText}
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <span className="text-[10px] uppercase font-mono text-zinc-500 block mb-1">
                Execution History ({actionHistory.length} actions)
              </span>
              {actionHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">
                      #{item.step} {item.action.action.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">{item.time}</span>
                  </div>
                  <div className="font-mono text-[11px] text-zinc-400">
                    {item.action.rawActionText}
                  </div>
                  <div className="text-[10px] text-zinc-500 flex items-center justify-between pt-1">
                    <span>Mapped: [{item.scaled[0]}px, {item.scaled[1]}px]</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Safe
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800/80 bg-zinc-900/60 text-xs">
          <span className="text-zinc-400">
            Coordinate System: <strong className="text-zinc-200">Normalized [0..1000]</strong> | Safety Shield: <strong className="text-emerald-400">Active</strong>
          </span>
          <button
            onClick={() => {
              setActionHistory([]);
              setCurrentStep(1);
            }}
            className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition text-xs"
          >
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
}
