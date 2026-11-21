import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Globe,
  RefreshCw,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { ConfigStatusData } from '../types';

export function FreeServicesPage() {
  const { navigate } = useApp();
  const [status, setStatus] = useState<ConfigStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/config-status');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as ConfigStatusData;
      setStatus(data);
    } catch {
      setError('Could not load live server configuration status right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[var(--accent-secondary)]">
            Free Utilities Directory
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Free Services on CrazyOpenPlace
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
            Every diagnostic tool below is free to access with zero signup. API keys stay strictly
            on the server; optional services display an honest setup notice when unconfigured.
          </p>
        </div>

        <button
          type="button"
          onClick={loadStatus}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-xs font-medium bg-[var(--bg-elevated)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] text-[var(--text-primary)] transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {error && (
        <div className="surface-card rounded-lg p-4 border-red-500/40 flex items-center gap-2.5 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Speed Test */}
        <article className="surface-card rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Gauge className="w-5 h-5 text-[var(--accent-secondary)]" />
                <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  Cloudflare Public Speed Test
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--status-success)]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Runs real browser measurements directly against Cloudflare&apos;s public test endpoints
              for download, upload, latency, loaded latency, and jitter. No account token needed.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/speed-test')}
            className="btn-amber-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-semibold w-full sm:w-auto self-start"
          >
            <span>Open Speed Test</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </article>

        {/* UID Checker */}
        <article className="surface-card rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Search className="w-5 h-5 text-[var(--accent-secondary)]" />
                <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  Free Fire UID Checker
                </h2>
              </div>
              {status ? (
                status.gameskinboConfigured ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--status-success)]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    API Key Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--status-warning)]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Secret Not Set
                  </span>
                )
              ) : (
                <span className="text-xs text-[var(--text-muted)]">Checking...</span>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Proxied GameSkinbo Free Fire lookup (`GET /api/uid-check`). Requires server-side{' '}
              <code className="font-mono-tabular text-xs">GAMESKINBO_API_KEY</code> secret. Rate
              limited to {status?.rateLimits.uidPerMinute ?? 5} requests/minute.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/uid-checker')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors w-full sm:w-auto self-start"
          >
            <span>Open UID Checker</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </article>

        {/* Website Speed Analyzer */}
        <article className="surface-card rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Globe className="w-5 h-5 text-[var(--accent-secondary)]" />
                <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  Website Speed Analyzer (Observatory)
                </h2>
              </div>
              {status ? (
                status.observatoryConfigured ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--status-success)]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--status-warning)]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Secrets Not Set
                  </span>
                )
              ) : (
                <span className="text-xs text-[var(--text-muted)]">Checking...</span>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Reads historical desktop &amp; mobile Observatory scores for pages in the site
              owner&apos;s Cloudflare Zone. Requires{' '}
              <code className="font-mono-tabular text-xs">CLOUDFLARE_API_TOKEN</code> and{' '}
              <code className="font-mono-tabular text-xs">CLOUDFLARE_ZONE_ID</code>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/website-speed')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors w-full sm:w-auto self-start"
          >
            <span>Open Website Speed Analyzer</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </article>

        {/* Guild Glory External Directory */}
        <article className="surface-card rounded-xl p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[var(--accent-secondary)]" />
                <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                  Guild Glory External Shop
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--status-success)]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                5 Verified Links
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Curated allowlist of external BDT Guild Glory providers. Payment and fulfillment happen
              directly on the provider website you select.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/guild-glory')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors w-full sm:w-auto self-start"
          >
            <span>Open Guild Glory Shop</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </article>
      </div>
    </div>
  );
}
