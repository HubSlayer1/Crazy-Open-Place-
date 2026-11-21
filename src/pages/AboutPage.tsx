import React from 'react';
import { ArrowRight, ExternalLink, Layers, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function AboutPage() {
  const { navigate } = useApp();

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <div className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[var(--accent-secondary)]">
          About CrazyOpenPlace@domain
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          What CrazyOpenPlace Provides
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
          CrazyOpenPlace is a clean, open-access diagnostic and external shop directory built so
          visitors on phones and desktop can run essential checks without creating accounts.
        </p>
      </div>

      <div className="space-y-4">
        <section className="surface-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <Layers className="w-4 h-4 text-[var(--accent-secondary)]" />
            <span>Included Services</span>
          </div>
          <ul className="space-y-2.5 text-sm text-[var(--text-secondary)] leading-relaxed">
            <li>
              <strong className="text-[var(--text-primary)]">1. Free Fire UID Checker:</strong>{' '}
              Proxies public UID lookups through the third-party GameSkinbo API using a server-side
              key so your browser never receives private credentials.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">2. Cloudflare Speed Test:</strong>{' '}
              Measures download, upload, latency, loaded latency, and jitter directly from your
              browser to Cloudflare&apos;s public speed-test infrastructure.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">3. Website Speed Analyzer:</strong>{' '}
              Displays historical Cloudflare Observatory test results for pages inside the site
              owner&apos;s configured Cloudflare Zone.
            </li>
            <li>
              <strong className="text-[var(--text-primary)]">4. Guild Glory Shop Directory:</strong>{' '}
              Lists verified HTTPS links to external BDT providers. Payments and delivery take place
              strictly on those provider websites.
            </li>
          </ul>
        </section>

        <section className="surface-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <ExternalLink className="w-4 h-4 text-[var(--accent-secondary)]" />
            <span>Third-Party Independence</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            CrazyOpenPlace is an independent tool hub. It is not endorsed by or officially partnered
            with Garena Free Fire, GameSkinbo, FFGlory, KakuTopup, FFIBD Shop, BD Games Topup, FF
            TopUp House, or Rio Game Shop. Cloudflare services use Cloudflare&apos;s official public
            speed-test package and Cloudflare Observatory REST API.
          </p>
        </section>

        <section className="surface-card rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm text-[var(--text-primary)] font-medium">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-secondary)]" />
            <span>Want to review privacy &amp; safety rules?</span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/safety')}
            className="btn-amber-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-xs font-semibold self-start sm:self-auto"
          >
            <span>Open Safety Page</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      </div>
    </div>
  );
}
