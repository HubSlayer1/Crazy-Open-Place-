import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const raw = error instanceof Error ? error.message : String(error);
    return { hasError: true, message: raw || 'An unexpected UI error occurred.' };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[CrazyOpenPlace ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0d0d10] text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full rounded-lg border border-zinc-800 bg-[#141418] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400 text-sm font-semibold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Application Error Detected</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed break-words">
              {this.state.message || 'An unexpected runtime error occurred.'}
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-xs font-semibold bg-amber-600 text-zinc-950 hover:bg-amber-500 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload CrazyOpenPlace</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
