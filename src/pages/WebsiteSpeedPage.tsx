import React, { useState } from 'react';
import {
  AlertTriangle,
  Globe,
  Info,
  Loader2,
  Search,
  ShieldCheck,
} from 'lucide-react';
import type { WebsiteSpeedTestEntry } from '../types';

function scoreBadgeColor(score: number | null): string {
  if (score === null) return 'text-[var(--text-muted)]';
  if (score >= 90) return 'text-[var(--status-success)]';
  if (score >= 50) return 'text-[var(--status-warning)]';
  return 'text-[var(--status-error)]';
}

export function WebsiteSpeedPage() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [tests, setTests] = useState<WebsiteSpeedTestEntry[] | null>(null);
  const [emptyNotice, setEmptyNotice] = useState<string | null>(null);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = urlInput.trim();
    if (!cleaned) {
      setError('Enter a full https:// or http:// URL inside your configured Cloudflare Zone.');
      return;
    }

    setLoading(true);
    setError(null);
    setNotConfigured(false);
    setEmptyNotice(null);

    try {
      const params = new URLSearchParams({ url: cleaned });
      const res = await fetch(`/api/website-speed/tests?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        configured?: boolean;
        error?: string;
        message?: string;
        tests?: WebsiteSpeedTestEntry[];
      };

      if (!res.ok) {
        if (res.status === 503 && data.configured === false) {
          setNotConfigured(true);
        }
        setTests(null);
        setError(data.error || `Request failed with HTTP ${res.status}.`);
        return;
      }

      const list = Array.isArray(data.tests) ? data.tests : [];
      setTests(list);
      if (list.length === 0) {
        setEmptyNotice(
          data.message || 'No Cloudflare Observatory test history was found for this URL yet.'
        );
      }
    } catch {
      setTests(null);
      setError('Network error while calling /api/website-speed/tests.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[var(--accent-secondary)]">
          Service 3 · Cloudflare Observatory API
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Website Speed Analyzer
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
          Reads historical desktop &amp; mobile Observatory performance tests from Cloudflare for
          pages belonging to your configured Zone.
        </p>
      </div>

      <div className="surface-card rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[var(--accent-secondary)] shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          Separate from the browser Speed Test. For security (SSRF protection), this read-only
          endpoint verifies the URL belongs to your server-configured{' '}
          <code className="font-mono-tabular">CLOUDFLARE_ZONE_ID</code> and rejects arbitrary
          external or local network targets.
        </p>
      </div>

      <form onSubmit={handleFetch} className="surface-card rounded-xl p-6 space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="obs-url-input"
            className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
          >
            Page URL (must match your Cloudflare Zone domain)
          </label>
          <input
            id="obs-url-input"
            type="url"
            placeholder="https://example.com/"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full px-3.5 py-2.5 min-h-[44px] rounded-md bg-[var(--bg-input)] border border-[var(--border-hairline)] focus:border-[var(--accent-secondary)] focus:outline-none text-sm font-mono-tabular text-[var(--text-primary)]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-amber-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-md text-sm font-semibold disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Observatory...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Fetch Test History</span>
              </>
            )}
          </button>

          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
            <span>Read-only · Max 10 tests · 10 req/min</span>
          </span>
        </div>
      </form>

      {error && (
        <div className="surface-card rounded-xl p-5 border border-red-500/40 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{notConfigured ? 'Observatory Secrets Not Configured' : 'Observatory Error'}</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          {notConfigured && (
            <p className="text-xs text-[var(--text-muted)]">
              Configure server-side secrets{' '}
              <code className="font-mono-tabular">CLOUDFLARE_API_TOKEN</code> (with Zone Settings
              Read permission) and <code className="font-mono-tabular">CLOUDFLARE_ZONE_ID</code>.
              No synthetic scores are ever generated.
            </p>
          )}
        </div>
      )}

      {emptyNotice && (
        <div className="surface-card rounded-xl p-5 text-sm text-[var(--text-secondary)]">
          {emptyNotice}
        </div>
      )}

      {tests && tests.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
            <Globe className="w-4 h-4 text-[var(--accent-secondary)]" />
            <span>Historical Cloudflare Observatory Tests ({tests.length})</span>
          </div>

          <div className="space-y-3">
            {tests.map((item, idx) => (
              <article
                key={item.id || String(idx)}
                className="surface-card rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="text-xs font-mono-tabular text-[var(--text-muted)]">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown date'}
                  </div>
                  <div className="text-sm font-medium text-[var(--text-primary)] break-all">
                    {item.url}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    Region: <span className="font-medium">{item.region}</span> · Schedule:{' '}
                    <span className="font-medium">{item.scheduleFrequency}</span>
                  </div>
                </div>

                <div className="flex items-center gap-5 shrink-0">
                  <div className="text-center">
                    <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                      Desktop
                    </div>
                    <div
                      className={`font-mono-tabular text-xl font-bold ${scoreBadgeColor(
                        item.desktopPerformanceScore
                      )}`}
                    >
                      {item.desktopPerformanceScore !== null
                        ? Number.isInteger(item.desktopPerformanceScore)
                          ? item.desktopPerformanceScore
                          : Number(item.desktopPerformanceScore.toFixed(2))
                        : 'N/A'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                      Mobile
                    </div>
                    <div
                      className={`font-mono-tabular text-xl font-bold ${scoreBadgeColor(
                        item.mobilePerformanceScore
                      )}`}
                    >
                      {item.mobilePerformanceScore !== null
                        ? Number.isInteger(item.mobilePerformanceScore)
                          ? item.mobilePerformanceScore
                          : Number(item.mobilePerformanceScore.toFixed(2))
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
