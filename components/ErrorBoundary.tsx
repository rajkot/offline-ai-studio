'use client';
import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[300px] w-full bg-slate-950 text-slate-200 rounded-xl border border-red-900/40 text-center font-sans">
          <div className="p-3 bg-red-950/60 text-red-400 rounded-full mb-4 border border-red-800/50">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">
            {this.props.fallbackTitle || 'Component Error Recovered'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-6 font-mono bg-slate-900/80 p-3 rounded border border-slate-800 overflow-x-auto">
            {this.state.error?.message || 'A script execution or rendering error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-indigo-950"
          >
            <RefreshCw size={14} />
            <span>Reload &amp; Recover Workspace</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
