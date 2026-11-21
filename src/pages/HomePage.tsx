import React from 'react';
import {
  ArrowRight,
  Gauge,
  Globe,
  Layers,
  Search,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CONTACT_FACEBOOK_URL } from '../config/providers';
import { FacebookIcon } from '../components/BrandMark';

export function HomePage() {
  const { navigate } = useApp();

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <section className="surface-card rounded-xl p-6 sm:p-8 lg:p-10 relative overflow-hidden">
        <div className="max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 text-xs font-mono-tabular uppercase tracking-[0.14em] text-[var(--accent-secondary)]">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
            <span>CrazyOpenPlace@domain · Open Utility Hub</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.12]">
            Guild Glory Shop &amp; Live Web Diagnostics. No Login Required.
          </h1>

          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            Browse direct external Guild Glory provider links, run a real Cloudflare browser
            speed test, check Free Fire UID profiles via GameSkinbo, or inspect Cloudflare
            Observatory site speed history — cleanly in one place with no account signup.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => navigate('/guild-glory')}
              className="btn-amber-primary inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-md text-sm font-semibold"
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>Open Guild Glory Shop</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/free-services')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-md text-sm font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors"
            >
              <Layers className="w-4 h-4 shrink-0 text-[var(--accent-secondary)]" />
              <span>View Free Services</span>
            </button>
          </div>
        </div>
      </section>

      {/* Primary Service Cards */}
      <section aria-labelledby="services-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="services-heading"
            className="font-display text-lg sm:text-xl font-semibold text-[var(--text-primary)]"
          >
            Available Services
          </h2>
          <span className="text-xs font-mono-tabular text-[var(--text-muted)]">
            4 Dedicated Tools
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Guild Glory Shop */}
          <article className="surface-card rounded-xl p-6 flex flex-col justify-between gap-5 border border-[var(--border-strong)]">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-[var(--accent-secondary)]">
                  <ShoppingBag className="w-5 h-5 shrink-0" />
                  <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                    Guild Glory Shop
                  </h3>
                </div>
                <span className="text-[11px] font-mono-tabular text-[var(--accent-secondary)] uppercase tracking-wider">
                  Featured · BDT
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Compare verified external Guild Glory provider links. Payment, package selection,
                and delivery happen directly on the external provider website.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/guild-glory')}
              className="btn-amber-primary inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-semibold w-full sm:w-auto self-start"
            >
              <span>Browse Providers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </article>

          {/* Free Fire UID Checker */}
          <article className="surface-card rounded-xl p-6 flex flex-col justify-between gap-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-[var(--accent-secondary)]">
                  <Search className="w-5 h-5 shrink-0" />
                  <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                    Free Fire UID Checker
                  </h3>
                </div>
                <span className="text-[11px] font-mono-tabular text-[var(--text-muted)] uppercase tracking-wider">
                  GameSkinbo API
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Look up public Free Fire account level, region, rank points, guild info, and
                credit score using UID only. No password or OTP ever requested.
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

          {/* Cloudflare Speed Test */}
          <article className="surface-card rounded-xl p-6 flex flex-col justify-between gap-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-[var(--accent-secondary)]">
                  <Gauge className="w-5 h-5 shrink-0" />
                  <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                    Cloudflare Speed Test
                  </h3>
                </div>
                <span className="text-[11px] font-mono-tabular text-[var(--text-muted)] uppercase tracking-wider">
                  No Token Needed
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Measure real download, upload, unloaded latency, loaded latency, and jitter from
                your browser using Cloudflare&apos;s official speed-test engine.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/speed-test')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors w-full sm:w-auto self-start"
            >
              <span>Run Speed Test</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </article>

          {/* Website Speed Analyzer */}
          <article className="surface-card rounded-xl p-6 flex flex-col justify-between gap-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-[var(--accent-secondary)]">
                  <Globe className="w-5 h-5 shrink-0" />
                  <h3 className="font-display text-base font-semibold text-[var(--text-primary)]">
                    Website Speed Analyzer
                  </h3>
                </div>
                <span className="text-[11px] font-mono-tabular text-[var(--text-muted)] uppercase tracking-wider">
                  Observatory API
                </span>
              </div>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Read historical desktop and mobile Lighthouse scores from Cloudflare Observatory
                for pages inside the configured Cloudflare Zone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/website-speed')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-sm font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors w-full sm:w-auto self-start"
            >
              <span>Open Analyzer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </article>
        </div>
      </section>

      {/* Safety & Direct Contact Strip */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="surface-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-[var(--accent-secondary)] text-sm font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Transparent &amp; Safe by Design</span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            CrazyOpenPlace never stores passwords or OTPs, never collects Guild Glory payments,
            and never invents fake scores or mock profiles when an upstream API key is absent.
          </p>
          <button
            type="button"
            onClick={() => navigate('/safety')}
            className="text-xs font-semibold text-[var(--accent-secondary)] hover:underline inline-flex items-center gap-1 min-h-[36px]"
          >
            <span>Read Safety &amp; Disclaimers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="surface-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-[var(--accent-secondary)] text-sm font-semibold">
            <FacebookIcon className="w-4 h-4 shrink-0" />
            <span>Need Help or Have a Question?</span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Reach CrazyOpenPlace support directly through our official Facebook page or visit the
            Contact page for links and service guidance.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href={CONTACT_FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[var(--accent-secondary)] hover:underline inline-flex items-center gap-1 min-h-[36px]"
            >
              <span>Message on Facebook</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => navigate('/contact')}
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] min-h-[36px]"
            >
              Contact Details
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
