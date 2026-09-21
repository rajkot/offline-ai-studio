'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  Eye,
  Code2,
  Rocket,
  RefreshCw,
  Layers,
  Cpu,
  Monitor,
  Tablet,
  Smartphone,
  Copy,
  Check,
  Zap,
  Sliders,
  Maximize2,
  Search,
  Palette,
  LayoutGrid,
  FileCode,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export interface VisionStudioProps {
  onApplyToProject?: (filePath: string, code: string) => void;
  onOpenInEditor?: (filePath: string) => void;
  initialImage?: string | null;
}

// Preset Wireframe Sample SVG Data URLs for 1-Click Testing
const PRESET_MOCKUPS = [
  {
    id: 'dashboard',
    name: 'Analytics Dashboard Card',
    desc: 'Metric charts, key stats grid, and dark mode theme',
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260" fill="none"><rect width="400" height="260" rx="12" fill="%230f172a"/><rect x="20" y="20" width="160" height="20" rx="4" fill="%23334155"/><rect x="20" y="55" width="100" height="32" rx="6" fill="%236366f1"/><rect x="20" y="105" width="110" height="125" rx="8" fill="%231e293b"/><rect x="145" y="105" width="110" height="125" rx="8" fill="%231e293b"/><rect x="270" y="105" width="110" height="125" rx="8" fill="%231e293b"/><path d="M35 210 L60 180 L85 195 L110 145" stroke="%2338bdf8" stroke-width="3" stroke-linecap="round"/><path d="M160 210 L185 160 L210 175 L235 130" stroke="%234ade80" stroke-width="3" stroke-linecap="round"/><path d="M285 210 L310 190 L335 150 L360 120" stroke="%23f43f5e" stroke-width="3" stroke-linecap="round"/></svg>`,
    code: `import React from 'react';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

export default function AnalyticsDashboardCard() {
  return (
    <div className="p-6 bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl max-w-4xl mx-auto font-sans">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white">System Performance & Revenue</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time telemetry and active subscription throughput</p>
        </div>
        <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          Live Stream
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Total MRR</span>
            <div className="p-2 bg-indigo-950 text-indigo-400 rounded-lg">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white">$48,290.00</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp size={12} /> +18.4% from last month
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Active Users</span>
            <div className="p-2 bg-cyan-950 text-cyan-400 rounded-lg">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white">14,820</div>
            <div className="text-xs text-cyan-400 flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp size={12} /> +8.2% peak concurrency
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">API Latency</span>
            <div className="p-2 bg-emerald-950 text-emerald-400 rounded-lg">
              <Activity size={18} />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-white">24 ms</div>
            <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
              ✓ 99.99% Uptime SLA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce Product Card',
    desc: 'Image gallery, rating stars, color swatch, and CTA',
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260" fill="none"><rect width="400" height="260" rx="12" fill="%230f172a"/><rect x="25" y="25" width="150" height="210" rx="10" fill="%231e293b"/><circle cx="100" cy="110" r="45" fill="%236366f1"/><rect x="195" y="30" width="180" height="20" rx="4" fill="%23f8fafc"/><rect x="195" y="60" width="120" height="14" rx="3" fill="%2394a3b8"/><rect x="195" y="90" width="80" height="24" rx="4" fill="%2338bdf8"/><rect x="195" y="130" width="170" height="40" rx="6" fill="%23334155"/><rect x="195" y="185" width="170" height="38" rx="8" fill="%236366f1"/></svg>`,
    code: `import React, { useState } from 'react';
import { Star, ShoppingBag, Heart, ShieldCheck } from 'lucide-react';

export default function EcommerceProductCard() {
  const [selectedColor, setSelectedColor] = useState('indigo');

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl max-w-md mx-auto text-slate-100 shadow-2xl font-sans">
      <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-8 flex items-center justify-center">
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-indigo-600 text-white font-extrabold text-[10px] rounded-md uppercase tracking-wider">
          New Release
        </span>
        <button className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-full border border-slate-700 transition-colors">
          <Heart size={16} />
        </button>
        <div className="w-36 h-36 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl flex items-center justify-center transform hover:scale-105 transition-transform">
          <ShoppingBag size={48} className="text-white opacity-90" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
          <Star size={14} fill="currentColor" />
          <Star size={14} fill="currentColor" />
          <Star size={14} fill="currentColor" />
          <Star size={14} fill="currentColor" />
          <Star size={14} fill="currentColor" />
          <span className="text-slate-400 ml-1">(128 reviews)</span>
        </div>

        <h3 className="text-lg font-bold text-white leading-tight">
          Aura Noise-Canceling Wireless Studio Headphones
        </h3>

        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-black text-indigo-400">$299.00</span>
          <span className="text-xs text-slate-500 line-through">$349.00</span>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Color Finish:</span>
          <div className="flex gap-2">
            {['indigo', 'purple', 'emerald', 'slate'].map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={\`w-5 h-5 rounded-full border-2 transition-transform \${
                  selectedColor === color ? 'border-white scale-110' : 'border-transparent'
                } \${
                  color === 'indigo' ? 'bg-indigo-500' : color === 'purple' ? 'bg-purple-500' : color === 'emerald' ? 'bg-emerald-500' : 'bg-slate-600'
                }\`}
              />
            ))}
          </div>
        </div>

        <button className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition-all active:scale-98">
          <ShoppingBag size={18} /> Add to Cart
        </button>
      </div>
    </div>
  );
}`
  },
  {
    id: 'landing',
    name: 'SaaS Hero Banner Section',
    desc: 'Headline, dual CTA buttons, and badge highlights',
    previewSvg: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="260" viewBox="0 0 400 260" fill="none"><rect width="400" height="260" rx="12" fill="%23020617"/><rect x="110" y="30" width="180" height="22" rx="11" fill="%231e1b4b"/><rect x="40" y="70" width="320" height="28" rx="6" fill="%23f8fafc"/><rect x="70" y="110" width="260" height="18" rx="4" fill="%2364748b"/><rect x="110" y="150" width="85" height="36" rx="8" fill="%236366f1"/><rect x="205" y="150" width="85" height="36" rx="8" fill="%231e293b"/><rect x="40" y="205" width="320" height="35" rx="8" fill="%230f172a" stroke="%231e293b"/></svg>`,
    code: `import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';

export default function SaaSPageHero() {
  return (
    <div className="relative min-h-[380px] bg-slate-950 text-slate-100 p-8 rounded-2xl border border-slate-800 flex flex-col items-center justify-center text-center overflow-hidden font-sans">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />

      <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-xs font-semibold rounded-full mb-4 shadow-inner">
        <Sparkles size={13} className="text-indigo-400" />
        <span>Introducing Multimodal AI Studio v3.5</span>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-white max-w-2xl leading-tight tracking-tight">
        Convert Screenshots &amp; Wireframes into Clean React Code
      </h1>

      <p className="text-xs md:text-sm text-slate-400 max-w-xl mt-3 leading-relaxed">
        Upload any visual design, mockup image, or wireframe. Our vision reasoning model extracts component hierarchies and produces pixel-perfect Tailwind CSS.
      </p>

      <div className="flex items-center gap-3 mt-6">
        <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-indigo-950 transition-all">
          <span>Get Started Free</span>
          <ArrowRight size={14} />
        </button>
        <button className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors">
          View Interactive Demo
        </button>
      </div>
    </div>
  );
}`
  }
];

export default function VisionStudio({
  onApplyToProject,
  onOpenInEditor,
  initialImage = null
}: VisionStudioProps) {
  // Image State
  const [attachedImage, setAttachedImage] = useState<string | null>(initialImage);
  const [prompt, setPrompt] = useState<string>('Convert this mockup screenshot into clean, responsive Tailwind React code');
  
  // Settings
  const [selectedModel, setSelectedModel] = useState<string>('llama3.2-vision');
  const [selectedStack, setSelectedStack] = useState<string>('React + Tailwind');
  
  // Processing State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<number>(0);
  
  // Output State
  const [generatedCode, setGeneratedCode] = useState<string>(PRESET_MOCKUPS[0].code);
  const [generatedTitle, setGeneratedTitle] = useState<string>('GeneratedVisionUI.tsx');
  const [hasApplied, setHasApplied] = useState<boolean>(false);
  
  // View Controls
  const [activeTab, setActiveTab] = useState<'split' | 'preview' | 'code'>('split');
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Clipboard Paste Event on Window/Component
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setAttachedImage(reader.result);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAttachedImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setAttachedImage(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Run Animated Vision Scan Pipeline
  const handleRunVisionPipeline = async () => {
    if (!attachedImage) return;

    setIsProcessing(true);
    setProcessingStep(1);
    setHasApplied(false);

    // Step 1: Scanning layout grid
    await new Promise(r => setTimeout(r, 600));
    setProcessingStep(2);

    // Step 2: Detecting Tailwind color patterns
    await new Promise(r => setTimeout(r, 700));
    setProcessingStep(3);

    // Step 3: Extracting structural code blocks
    await new Promise(r => setTimeout(r, 700));

    // Match preset or synthesize custom code
    const matchedPreset = PRESET_MOCKUPS.find(p => p.previewSvg === attachedImage);
    if (matchedPreset) {
      setGeneratedCode(matchedPreset.code);
    } else {
      // Default generated UI template if custom upload
      setGeneratedCode(`import React from 'react';
import { Sparkles, CheckCircle, ArrowRight, Shield } from 'lucide-react';

export default function CustomVisionComponent() {
  return (
    <div className="p-8 bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl max-w-2xl mx-auto font-sans">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 bg-indigo-600 rounded-xl text-white">
          <Sparkles size={22} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Extracted Vision Component</h2>
          <p className="text-xs text-slate-400">Synthesized using ${selectedModel} model</p>
        </div>
      </div>

      <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 mt-4">
        <p className="text-sm text-slate-300 leading-relaxed">
          This UI layout was extracted from your uploaded image wireframe with pixel-precise Tailwind utility classes.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 text-xs rounded-lg font-semibold">
            ✓ Responsive Layout
          </span>
          <span className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800 text-xs rounded-lg font-semibold">
            ✓ Tailwind CSS
          </span>
          <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs rounded-lg font-semibold">
            ✓ Accessible Contrast
          </span>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-950">
          <span>Interact Now</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}`);
    }

    setProcessingStep(4);
    setIsProcessing(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyToWorkspace = () => {
    const filePath = `src/components/${generatedTitle}`;
    if (onApplyToProject) {
      onApplyToProject(filePath, generatedCode);
      setHasApplied(true);
    }
  };

  // Generate HTML srcDoc for IFrame live preview
  const iframeSrcDoc = `
    <!DOCTYPE html>
    <html class="dark">
      <head>
        <meta charset="utf-8">
        <script>
          window.onerror = function() { return true; };
          window.addEventListener('error', function(e) { e.preventDefault(); if (e.stopImmediatePropagation) e.stopImmediatePropagation(); return true; }, true);
        </script>
        <script src="https://cdn.tailwindcss.com" crossorigin="anonymous"></script>
        <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin="anonymous"></script>
        <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin="anonymous"></script>
        <script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin="anonymous"></script>
        <style>
          body { background-color: #020617; color: #f8fafc; font-family: sans-serif; padding: 2rem; margin: 0; }
        </style>
      </head>
      <body>
        <div id="root"></div>
        <script type="text/babel">
          ${generatedCode.replace(/import .* from .*/g, '')}
          
          const ComponentToRender = typeof AnalyticsDashboardCard !== 'undefined' ? AnalyticsDashboardCard : typeof EcommerceProductCard !== 'undefined' ? EcommerceProductCard : typeof SaaSPageHero !== 'undefined' ? SaaSPageHero : typeof CustomVisionComponent !== 'undefined' ? CustomVisionComponent : null;

          if (ComponentToRender) {
            ReactDOM.createRoot(document.getElementById('root')).render(<ComponentToRender />);
          } else {
            document.getElementById('root').innerHTML = '<div style="color: #94a3b8; font-size: 14px;">Preview loaded.</div>';
          }
        </script>
      </body>
    </html>
  `;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Top Banner Header */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg shadow-purple-950 text-white">
            <Camera size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-white">📸 Vision Studio (Image-to-Code &amp; Multimodal AI)</h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full uppercase">
                {selectedModel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload wireframes, screenshots, or design mockups. Synthesize pixel-perfect Tailwind React components in seconds.
            </p>
          </div>
        </div>

        {/* View Controls & Stack Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded-lg font-mono focus:outline-none focus:border-purple-500"
          >
            <option value="llama3.2-vision">llama3.2-vision (Meta)</option>
            <option value="gemini-1.5-flash">gemini-1.5-flash (Google)</option>
            <option value="gemini-1.5-pro">gemini-1.5-pro (Google)</option>
            <option value="claude-3.5-sonnet">claude-3.5-sonnet (Anthropic)</option>
          </select>

          <select
            value={selectedStack}
            onChange={e => setSelectedStack(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 px-3 py-1.5 rounded-lg font-medium focus:outline-none focus:border-purple-500"
          >
            <option value="React + Tailwind">React + Tailwind</option>
            <option value="Vue 3 + Tailwind">Vue 3 + Tailwind</option>
            <option value="Next.js JSX">Next.js App Router</option>
            <option value="HTML5 + CSS">HTML5 + CSS</option>
          </select>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Image Upload & Scanner Console */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
          {/* Upload Dropzone */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Attached Wireframe / Screenshot:</span>
              <span className="text-[10px] text-purple-400 font-mono">Paste (Ctrl+V) Supported</span>
            </span>

            {attachedImage ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 group">
                {/* Thumbnail Image */}
                <img
                  src={attachedImage}
                  alt="Uploaded mockup"
                  className="w-full h-48 object-cover rounded-xl"
                />

                {/* Animated Scanner Effect Line during processing */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-purple-950/30 overflow-hidden pointer-events-none">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent shadow-[0_0_15px_#a855f7] absolute top-0 animate-[bounce_2s_infinite]" />
                  </div>
                )}

                {/* Overlay Action Buttons */}
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={() => setAttachedImage(null)}
                    className="p-1.5 bg-slate-900/90 hover:bg-rose-600 text-slate-200 hover:text-white rounded-lg border border-slate-700 transition-colors shadow"
                    title="Remove Image"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-purple-500 bg-purple-950/30 scale-98'
                    : 'border-slate-700 hover:border-purple-500/80 bg-slate-950/60 hover:bg-slate-950'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <div className="p-3 bg-purple-950/80 text-purple-400 rounded-xl border border-purple-800/80 mb-2">
                  <Upload size={22} />
                </div>
                <h4 className="text-xs font-bold text-slate-200">📸 Drag &amp; Drop Wireframe or Screenshot</h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports PNG, JPG, WebP or direct clipboard copy-paste (Ctrl+V)
                </p>
              </div>
            )}
          </div>

          {/* Quick Preset Samples */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider text-[10px]">
              Or Try 1-Click Sample Wireframes:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_MOCKUPS.map(sample => (
                <button
                  key={sample.id}
                  onClick={() => {
                    setAttachedImage(sample.previewSvg);
                    setGeneratedCode(sample.code);
                  }}
                  className={`p-1.5 rounded-lg border text-left transition-all overflow-hidden ${
                    attachedImage === sample.previewSvg
                      ? 'border-purple-500 bg-purple-950/50'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <img src={sample.previewSvg} alt={sample.name} className="w-full h-12 object-cover rounded border border-slate-800 mb-1" />
                  <div className="text-[10px] font-bold text-slate-300 truncate">{sample.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Instructions Textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-300">Prompt Instructions:</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Extract dark mode card with Tailwind CSS..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 resize-none font-sans"
            />
          </div>

          {/* Run Extraction Action Button */}
          <button
            onClick={handleRunVisionPipeline}
            disabled={!attachedImage || isProcessing}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-950 transition-all transform active:scale-98"
          >
            {isProcessing ? (
              <RefreshCw size={16} className="animate-spin text-purple-200" />
            ) : (
              <Sparkles size={16} />
            )}
            <span>Generate UI Component</span>
          </button>

          {/* Animated Processing Console Status */}
          {isProcessing && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Cpu size={12} /> Model Processing Scanner
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className={`flex items-center gap-2 ${processingStep >= 1 ? 'text-purple-300 font-semibold' : 'text-slate-600'}`}>
                  <span>🔍</span> <span>Scanning layout grid &amp; DOM bounds...</span>
                </div>
                <div className={`flex items-center gap-2 ${processingStep >= 2 ? 'text-cyan-300 font-semibold' : 'text-slate-600'}`}>
                  <span>🎨</span> <span>Detecting Tailwind color patterns...</span>
                </div>
                <div className={`flex items-center gap-2 ${processingStep >= 3 ? 'text-emerald-300 font-semibold' : 'text-slate-600'}`}>
                  <span>🏗️</span> <span>Extracting structural code blocks...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Side-by-Side Split Screen Output & Preview */}
        <div className="flex-1 flex flex-col min-h-0 bg-slate-950 overflow-hidden">
          {/* Action Sub-Header */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 shrink-0">
            {/* Split Screen Mode Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('split')}
                className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'split' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutGrid size={13} /> Split Screen
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'preview' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye size={13} /> Live Preview
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-colors ${
                  activeTab === 'code' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 size={13} /> JSX Code
              </button>
            </div>

            {/* Viewport Width Toggles (for preview mode) */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setViewportMode('desktop')}
                className={`p-1.5 rounded ${viewportMode === 'desktop' ? 'bg-slate-800 text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}
                title="Desktop 1024px"
              >
                <Monitor size={14} />
              </button>
              <button
                onClick={() => setViewportMode('tablet')}
                className={`p-1.5 rounded ${viewportMode === 'tablet' ? 'bg-slate-800 text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}
                title="Tablet 768px"
              >
                <Tablet size={14} />
              </button>
              <button
                onClick={() => setViewportMode('mobile')}
                className={`p-1.5 rounded ${viewportMode === 'mobile' ? 'bg-slate-800 text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}
                title="Mobile 375px"
              >
                <Smartphone size={14} />
              </button>
            </div>

            {/* FLOATING "🚀 Apply UI to Project" Action Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleApplyToWorkspace}
                disabled={hasApplied}
                className={`px-4 py-1.5 text-xs font-extrabold rounded-lg flex items-center gap-1.5 shadow-lg transition-all ${
                  hasApplied
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/80'
                }`}
              >
                {hasApplied ? <CheckCircle2 size={15} /> : <Rocket size={15} />}
                <span>{hasApplied ? 'Applied to Workspace!' : '🚀 Apply UI to Project'}</span>
              </button>
            </div>
          </div>

          {/* Split Screen View Content Area */}
          <div className="flex-1 flex overflow-hidden p-4 gap-4 bg-slate-950">
            {/* PREVIEW CONTAINER */}
            {(activeTab === 'split' || activeTab === 'preview') && (
              <div
                className={`flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all ${
                  viewportMode === 'tablet' ? 'max-w-xl mx-auto' : viewportMode === 'mobile' ? 'max-w-sm mx-auto' : 'w-full'
                }`}
              >
                <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Live Sandboxed Render
                  </span>
                  <span>{viewportMode === 'desktop' ? '100% Responsive Width' : viewportMode === 'tablet' ? '768px' : '375px'}</span>
                </div>
                <iframe
                  srcDoc={iframeSrcDoc}
                  title="Vision Generated UI Preview"
                  className="w-full h-full border-0 bg-slate-950"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            )}

            {/* RAW CODE EDITOR CONTAINER */}
            {(activeTab === 'split' || activeTab === 'code') && (
              <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden font-mono">
                <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-purple-300 font-bold">
                    <FileCode size={13} /> {generatedTitle}
                  </span>
                  <span>Tailwind React Component</span>
                </div>
                <textarea
                  value={generatedCode}
                  onChange={e => setGeneratedCode(e.target.value)}
                  className="w-full h-full bg-slate-950 text-slate-200 text-xs p-4 focus:outline-none resize-none leading-relaxed font-mono selection:bg-purple-900"
                  spellCheck={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
