import React from 'react';
import { ArrowLeft, Info, ShoppingBag } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { THANK_YOU_RETURN_NOTICE } from '../config/providers';

export function ThankYouPage() {
  const { navigate } = useApp();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[var(--accent-secondary)]">
          External Provider Return Notice
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Thank You for Visiting CrazyOpenPlace
        </h1>
      </div>

      <section className="surface-card rounded-xl p-6 sm:p-8 space-y-5 border border-[var(--border-strong)]">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[var(--accent-secondary)] shrink-0 mt-0.5" />
          <p className="text-sm sm:text-base text-[var(--text-primary)] leading-relaxed">
            {THANK_YOU_RETURN_NOTICE}
          </p>
        </div>

        <div className="surface-elevated rounded-lg p-4 text-xs sm:text-sm text-[var(--text-secondary)] space-y-1.5">
          <p>
            • Keep the transaction ID, payment receipt, or screenshot from the external provider
            website.
          </p>
          <p>
            • If you need order follow-up, contact support directly on the external provider site
            where you paid.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate('/guild-glory')}
            className="btn-amber-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-md text-sm font-semibold"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Back to Guild Glory Shop</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-md text-sm font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return Home</span>
          </button>
        </div>
      </section>
    </div>
  );
}
