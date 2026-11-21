import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  EXTERNAL_PROVIDER_NOTICE,
  GUILD_GLORY_PROVIDERS,
  validateAllowlistedProviderUrl,
} from '../config/providers';

export function GuildGloryPage() {
  const { navigate } = useApp();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[var(--accent-secondary)]">
          Service 4 · External Provider Directory (BDT)
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Guild Glory Shop
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
          Browse external Guild Glory service websites below. CrazyOpenPlace does not collect
          payments, process orders, store accounts, or act as an official partner of these sites.
        </p>
      </div>

      {/* Required External Provider Disclaimer */}
      <div className="surface-card rounded-xl p-5 border border-[var(--border-strong)] flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[var(--accent-secondary)] shrink-0 mt-0.5" />
        <div className="space-y-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          <p className="text-[var(--text-primary)] font-medium">{EXTERNAL_PROVIDER_NOTICE}</p>
          <p className="text-xs text-[var(--text-muted)]">
            No UID, phone number, token, or checkout parameter is appended to any outbound link.
            When you finish on an external website, you can return manually via your browser tab or
            visit the{' '}
            <button
              type="button"
              onClick={() => navigate('/thank-you')}
              className="text-[var(--accent-secondary)] underline font-medium"
            >
              External Return Notice
            </button>
            .
          </p>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {GUILD_GLORY_PROVIDERS.map((provider) => {
          const check = validateAllowlistedProviderUrl(provider.url, provider.domain);
          const isServiceOnly = provider.destinationType === 'service_website';

          return (
            <article
              key={provider.id}
              className="surface-card rounded-xl p-6 flex flex-col justify-between gap-5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[var(--accent-secondary)] shrink-0" />
                      <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">
                        {provider.name}
                      </h2>
                    </div>
                    <div className="text-xs font-mono-tabular text-[var(--text-muted)] break-all">
                      {provider.domain} · Currency: {provider.currency}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-[var(--accent-secondary)] shrink-0">
                    {isServiceOnly ? 'External Site' : 'Product Link'}
                  </span>
                </div>

                <div className="surface-elevated rounded-lg p-3 text-xs font-mono-tabular text-[var(--text-secondary)] break-all">
                  {provider.url}
                </div>

                <div className="space-y-1.5 text-xs sm:text-sm text-[var(--text-secondary)]">
                  <p>
                    <strong className="text-[var(--text-primary)]">Packages &amp; Pricing:</strong>{' '}
                    {provider.packagesSummary}
                  </p>
                  <p>
                    <strong className="text-[var(--text-primary)]">Payment Methods:</strong>{' '}
                    {provider.paymentMethodsLabel}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {provider.checkoutNote} (Checked: {provider.lastCheckedDate})
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {check.valid ? (
                  <a
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-amber-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-semibold w-full sm:w-auto"
                  >
                    <span>{provider.ctaLabel}</span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                ) : (
                  <div className="rounded-md p-3 bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Link disabled: {check.reason}</span>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="surface-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs sm:text-sm text-[var(--text-secondary)]">
          Already completed your check or purchase on a provider site?
        </div>
        <button
          type="button"
          onClick={() => navigate('/thank-you')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors self-start sm:self-auto"
        >
          <span>View Return Notice</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
