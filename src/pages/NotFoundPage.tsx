import React from 'react';
import { AlertCircle, Home, Layers } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function NotFoundPage() {
  const { navigate } = useApp();

  return (
    <div className="max-w-xl mx-auto py-10">
      <section className="surface-card rounded-xl p-6 sm:p-8 space-y-5 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-strong)] text-[var(--accent-secondary)] mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[var(--accent-secondary)]">
            404 · Page Not Found
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
            That CrazyOpenPlace route does not exist
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Check the web address or jump back to one of the main services below.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-amber-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-md text-sm font-semibold"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/free-services')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-md text-sm font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>Free Services</span>
          </button>
        </div>
      </section>
    </div>
  );
}
