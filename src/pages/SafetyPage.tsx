import React from 'react';
import { Lock, ShieldAlert, ShieldCheck, ShoppingBag } from 'lucide-react';

export function SafetyPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-2">
        <div className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[var(--accent-secondary)]">
          Safety &amp; Disclaimers
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Safety Rules &amp; Privacy Notice
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Clear rules to protect your Free Fire account, your payments, and your privacy when
          using CrazyOpenPlace.
        </p>
      </div>

      <div className="space-y-4">
        <section className="surface-card rounded-xl p-6 space-y-3 border border-[var(--border-strong)]">
          <div className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <ShieldAlert className="w-5 h-5 text-[var(--accent-secondary)]" />
            <span>Account Security (Never Share Credentials)</span>
          </div>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)] leading-relaxed">
            <li>
              • CrazyOpenPlace will <strong className="text-[var(--text-primary)]">never</strong>{' '}
              ask for your Free Fire password, OTP, Gmail password, Facebook login, or recovery
              codes.
            </li>
            <li>
              • The UID Checker uses your <strong className="text-[var(--text-primary)]">UID only</strong>{' '}
              and is not endorsed by or officially affiliated with Garena.
            </li>
            <li>• CrazyOpenPlace requires zero account registration or login.</li>
          </ul>
        </section>

        <section className="surface-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <ShoppingBag className="w-5 h-5 text-[var(--accent-secondary)]" />
            <span>External Guild Glory Purchases</span>
          </div>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)] leading-relaxed">
            <li>
              • CrazyOpenPlace does <strong className="text-[var(--text-primary)]">not</strong>{' '}
              collect money, hold balances, approve orders, or confirm payment completion.
            </li>
            <li>
              • Always verify the exact external website URL, current package rate, gateway fees,
              and payment method before paying on a provider&apos;s site.
            </li>
            <li>
              • Always save your transaction reference and receipt from the provider website.
              Returning to CrazyOpenPlace never proves payment or service delivery.
            </li>
          </ul>
        </section>

        <section className="surface-card rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-base font-semibold text-[var(--text-primary)]">
            <Lock className="w-5 h-5 text-[var(--accent-secondary)]" />
            <span>Server Secrets &amp; Data Privacy</span>
          </div>
          <ul className="space-y-2 text-sm text-[var(--text-secondary)] leading-relaxed">
            <li>
              • Third-party API keys (<code className="font-mono-tabular">GAMESKINBO_API_KEY</code>,{' '}
              <code className="font-mono-tabular">CLOUDFLARE_API_TOKEN</code>,{' '}
              <code className="font-mono-tabular">CLOUDFLARE_ZONE_ID</code>) are stored strictly
              server-side and never sent to your browser.
            </li>
            <li>
              • When you run a UID lookup, the numeric UID and selected region are sent to
              GameSkinbo to fetch the profile. CrazyOpenPlace does not save UID lookup histories in
              a database.
            </li>
            <li>
              • When you run the Cloudflare Speed Test, your browser exchanges test payloads with
              Cloudflare&apos;s public edge servers (<code className="font-mono-tabular">speed.cloudflare.com</code>).
            </li>
          </ul>
        </section>

        <section className="surface-card rounded-xl p-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[var(--accent-secondary)] shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Observatory Website Speed requests are strictly restricted to URLs belonging to the
            server-configured Cloudflare Zone to prevent SSRF or unauthorized third-party proxying.
          </p>
        </section>
      </div>
    </div>
  );
}
