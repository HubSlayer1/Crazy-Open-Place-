import React from 'react';
import { Copy, ExternalLink, Mail, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CONTACT_FACEBOOK_URL } from '../config/providers';
import { FacebookIcon } from '../components/BrandMark';

export function ContactPage() {
  const { copyToClipboard, navigate } = useApp();

  return (
    <div className="max-w-2xl space-y-8">
      <div className="space-y-2">
        <div className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[var(--accent-secondary)]">
          Contact CrazyOpenPlace
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Direct Support &amp; Contact
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Questions about CrazyOpenPlace utilities or reporting a broken external provider link?
          Reach out directly via Facebook.
        </p>
      </div>

      <section className="surface-card rounded-xl p-6 sm:p-8 space-y-5 border border-[var(--border-strong)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] flex items-center justify-center">
            <FacebookIcon className="w-5 h-5 text-[var(--accent-secondary)]" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
              Official Facebook Page
            </h2>
            <p className="text-xs font-mono-tabular text-[var(--text-muted)] break-all">
              {CONTACT_FACEBOOK_URL}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={CONTACT_FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-amber-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-md text-sm font-semibold"
          >
            <FacebookIcon className="w-4 h-4" />
            <span>Open Facebook Contact</span>
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={() => copyToClipboard(CONTACT_FACEBOOK_URL, 'Facebook link')}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-md text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Link</span>
          </button>
        </div>

        <div className="surface-elevated rounded-lg p-4 flex items-start gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-[var(--accent-secondary)] shrink-0 mt-0.5" />
          <span>
            Never send passwords, OTPs, or payment PINs over messages. For external Guild Glory
            orders, contact the specific provider website where you completed payment.
          </span>
        </div>
      </section>

      <section className="surface-card rounded-xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm text-[var(--text-secondary)]">
          <Mail className="w-4 h-4 text-[var(--accent-secondary)] shrink-0" />
          <span>Looking for safety rules or service disclaimers?</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/safety')}
          className="text-xs font-semibold text-[var(--accent-secondary)] hover:underline whitespace-nowrap min-h-[36px]"
        >
          View Safety Page
        </button>
      </section>
    </div>
  );
}
