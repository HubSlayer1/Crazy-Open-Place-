import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Copy,
  Loader2,
  Search,
  ShieldAlert,
  User,
  Users,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { NormalizedUidProfile } from '../types';

const REGION_OPTIONS = [
  { value: 'AUTO', label: 'AUTO (Provider Auto Lookup)' },
  { value: 'BD', label: 'BD (Bangladesh)' },
  { value: 'IND', label: 'IND (India)' },
  { value: 'BR', label: 'BR (Brazil)' },
  { value: 'US', label: 'US (United States)' },
  { value: 'SAC', label: 'SAC (South America)' },
  { value: 'NA', label: 'NA (North America)' },
  { value: 'TH', label: 'TH (Thailand)' },
  { value: 'ID', label: 'ID (Indonesia)' },
  { value: 'SG', label: 'SG (Singapore)' },
  { value: 'PK', label: 'PK (Pakistan)' },
];

function displayVal(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return 'Not available';
  return String(val);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Not available';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not available';
  return d.toLocaleString();
}

export function UidCheckerPage() {
  const { copyToClipboard } = useApp();
  const [uid, setUid] = useState('');
  const [region, setRegion] = useState('AUTO');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [profile, setProfile] = useState<NormalizedUidProfile | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = uid.trim();
    if (!/^\d{5,20}$/.test(cleaned)) {
      setError('Enter a numeric Free Fire UID (digits only, 5 to 20 digits).');
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);
    setNotConfigured(false);

    try {
      const params = new URLSearchParams({ uid: cleaned, region });
      const res = await fetch(`/api/uid-check?${params.toString()}`);
      const data = (await res.json().catch(() => ({}))) as {
        configured?: boolean;
        error?: string;
        profile?: NormalizedUidProfile;
      };

      if (!res.ok) {
        if (res.status === 503 && data.configured === false) {
          setNotConfigured(true);
        }
        setProfile(null);
        setError(data.error || `Lookup failed with HTTP ${res.status}.`);
        return;
      }

      if (!data.profile) {
        setProfile(null);
        setError('Upstream provider returned an empty player response.');
        return;
      }

      setProfile(data.profile);
    } catch {
      setProfile(null);
      setError('Network error while contacting the CrazyOpenPlace UID lookup endpoint.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="text-xs font-mono-tabular uppercase tracking-[0.14em] text-[var(--accent-secondary)]">
          Service 1 · GameSkinbo Proxy
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
          Free Fire UID Checker
        </h1>
        <p className="text-sm text-[var(--text-secondary)] max-w-2xl">
          Live player lookup powered by the third-party GameSkinbo API via a server-side proxy.
          CrazyOpenPlace is not affiliated with or endorsed by Garena.
        </p>
      </div>

      {/* Privacy Notice */}
      <div className="surface-card rounded-lg p-4 border border-[var(--border-strong)] flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-[var(--accent-secondary)] shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          <strong className="text-[var(--text-primary)]">Privacy Warning:</strong> Enter your public
          numeric Free Fire UID only. Never enter your password, OTP, Gmail, Facebook login, or any
          account credential.
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleLookup} className="surface-card rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label
              htmlFor="ff-uid-input"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Free Fire UID (5–20 digits)
            </label>
            <input
              id="ff-uid-input"
              type="text"
              inputMode="numeric"
              pattern="\d{5,20}"
              placeholder="e.g. 1234567890"
              value={uid}
              onChange={(e) => setUid(e.target.value.replace(/\D+/g, ''))}
              maxLength={20}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-md bg-[var(--bg-input)] border border-[var(--border-hairline)] focus:border-[var(--accent-secondary)] focus:outline-none text-sm font-mono-tabular text-[var(--text-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="ff-region-select"
              className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Region
            </label>
            <select
              id="ff-region-select"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3.5 py-2.5 min-h-[44px] rounded-md bg-[var(--bg-input)] border border-[var(--border-hairline)] focus:border-[var(--accent-secondary)] focus:outline-none text-sm text-[var(--text-primary)]"
            >
              {REGION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="btn-amber-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-md text-sm font-semibold disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking UID...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Check UID</span>
              </>
            )}
          </button>

          <span className="text-xs text-[var(--text-muted)]">
            Rate limit: 5 requests / minute · 12s timeout
          </span>
        </div>
      </form>

      {/* Error / Not Configured State */}
      {error && (
        <div className="surface-card rounded-xl p-5 border border-red-500/40 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{notConfigured ? 'UID Checker API Key Not Configured' : 'Lookup Error'}</span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          {notConfigured && (
            <p className="text-xs text-[var(--text-muted)]">
              Add <code className="font-mono-tabular">GAMESKINBO_API_KEY</code> as a server-side
              secret in your hosting dashboard. No fake player profiles are shown when the key is
              absent.
            </p>
          )}
        </div>
      )}

      {/* Result Cards */}
      {profile && (
        <div className="space-y-5">
          <div className="surface-card rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[var(--border-strong)]">
            <div className="space-y-1">
              <div className="text-xs font-mono-tabular text-[var(--accent-secondary)]">
                {profile.providerLabel} · Not Garena Official
              </div>
              <h2 className="font-display text-xl font-bold text-[var(--text-primary)]">
                {displayVal(profile.accountInfo.nickname)}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                UID: <span className="font-mono-tabular">{profile.uid}</span> · Fetched:{' '}
                {formatDate(profile.fetchedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard(profile.uid, 'UID')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-md text-xs font-medium bg-[var(--bg-elevated)] border border-[var(--border-hairline)] hover:border-[var(--border-strong)] text-[var(--text-primary)] self-start sm:self-auto"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy UID</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Information */}
            <section className="surface-card rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <User className="w-4 h-4 text-[var(--accent-secondary)]" />
                <span>Account Information</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:text-sm">
                <dt className="text-[var(--text-muted)]">Level</dt>
                <dd className="font-mono-tabular text-right">{displayVal(profile.accountInfo.level)}</dd>
                <dt className="text-[var(--text-muted)]">EXP</dt>
                <dd className="font-mono-tabular text-right">{displayVal(profile.accountInfo.exp)}</dd>
                <dt className="text-[var(--text-muted)]">Region</dt>
                <dd className="font-mono-tabular text-right">{displayVal(profile.accountInfo.region)}</dd>
                <dt className="text-[var(--text-muted)]">Likes</dt>
                <dd className="font-mono-tabular text-right">{displayVal(profile.accountInfo.likes)}</dd>
                <dt className="text-[var(--text-muted)]">Season ID</dt>
                <dd className="font-mono-tabular text-right">{displayVal(profile.accountInfo.seasonId)}</dd>
                <dt className="text-[var(--text-muted)]">BR Rank / Pts</dt>
                <dd className="font-mono-tabular text-right">
                  {displayVal(profile.accountInfo.brRank)} / {displayVal(profile.accountInfo.brRankPoints)}
                </dd>
                <dt className="text-[var(--text-muted)]">CS Rank / Pts</dt>
                <dd className="font-mono-tabular text-right">
                  {displayVal(profile.accountInfo.csRank)} / {displayVal(profile.accountInfo.csRankPoints)}
                </dd>
                <dt className="text-[var(--text-muted)]">Created</dt>
                <dd className="text-right text-xs">{formatDate(profile.accountInfo.createdAt)}</dd>
                <dt className="text-[var(--text-muted)]">Last Login</dt>
                <dd className="text-right text-xs">{formatDate(profile.accountInfo.lastLoginAt)}</dd>
              </dl>
            </section>

            {/* Profile & Credit Details */}
            <section className="surface-card rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Award className="w-4 h-4 text-[var(--accent-secondary)]" />
                <span>Profile, Social &amp; Credit Score</span>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:text-sm">
                <dt className="text-[var(--text-muted)]">Avatar ID</dt>
                <dd className="font-mono-tabular text-right">{displayVal(profile.profileDetails.avatarId)}</dd>
                <dt className="text-[var(--text-muted)]">Banner ID</dt>
                <dd className="font-mono-tabular text-right">{displayVal(profile.profileDetails.bannerId)}</dd>
                <dt className="text-[var(--text-muted)]">Badge ID</dt>
                <dd className="font-mono-tabular text-right">{displayVal(profile.profileDetails.badgeId)}</dd>
                <dt className="text-[var(--text-muted)]">Prime Level</dt>
                <dd className="font-mono-tabular text-right">{displayVal(profile.profileDetails.primeLevel)}</dd>
                <dt className="text-[var(--text-muted)]">Language</dt>
                <dd className="text-right">{displayVal(profile.socialProfile.language)}</dd>
                <dt className="text-[var(--text-muted)]">Credit Score</dt>
                <dd className="font-mono-tabular text-right">{displayVal(profile.creditScoreDetails.creditScore)}</dd>
                <dt className="text-[var(--text-muted)]">Credit Status</dt>
                <dd className="text-right">{displayVal(profile.creditScoreDetails.summaryStatus)}</dd>
                <dt className="text-[var(--text-muted)]">Signature</dt>
                <dd className="text-right break-words">{displayVal(profile.socialProfile.signature)}</dd>
              </dl>
            </section>

            {/* Guild Information */}
            <section className="surface-card rounded-xl p-5 space-y-3 md:col-span-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                <Users className="w-4 h-4 text-[var(--accent-secondary)]" />
                <span>Guild Information</span>
              </div>
              {profile.guildInfo ? (
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                  <div>
                    <dt className="text-[var(--text-muted)]">Guild Name</dt>
                    <dd className="font-medium mt-0.5">{displayVal(profile.guildInfo.name)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Guild ID</dt>
                    <dd className="font-mono-tabular mt-0.5">{displayVal(profile.guildInfo.id)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Level</dt>
                    <dd className="font-mono-tabular mt-0.5">{displayVal(profile.guildInfo.level)}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Members</dt>
                    <dd className="font-mono-tabular mt-0.5">
                      {displayVal(profile.guildInfo.members)} / {displayVal(profile.guildInfo.capacity)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[var(--text-muted)]">Leader</dt>
                    <dd className="mt-0.5">{displayVal(profile.guildInfo.leaderName)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  Not available (player is not in a guild or guild info was not returned).
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
