import type { NormalizedUidProfile } from '../types';

export const GAMESKINBO_ENDPOINT = 'https://api.gameskinbo.com/ff-info/get';

export const SUPPORTED_UID_REGIONS = new Set([
  'AUTO',
  'BD',
  'IND',
  'BR',
  'US',
  'SAC',
  'NA',
  'TH',
  'ID',
  'SG',
  'PK',
]);

function formatUnixTimestamp(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (Number.isFinite(num) && num > 1_000_000_000) {
    const ms = num < 10_000_000_000 ? num * 1000 : num;
    return new Date(ms).toISOString();
  }
  if (typeof val === 'string' && !Number.isNaN(Date.parse(val))) {
    return new Date(val).toISOString();
  }
  return null;
}

function toNum(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStr(val: unknown): string | null {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

const SENSITIVE_KEY_PATTERN = /(key|token|secret|password|auth|cookie|email|phone|otp|session)/i;

export function stripSensitiveKeys(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(stripSensitiveKeys);
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) continue;
      out[k] = stripSensitiveKeys(v);
    }
    return out;
  }
  return input;
}

export function normalizeGameSkinboResponse(
  rawInput: Record<string, unknown>,
  requestedUid: string,
  requestedRegion: string
): NormalizedUidProfile {
  const sanitized = stripSensitiveKeys(rawInput) as Record<string, unknown>;
  const raw = ((sanitized.data && typeof sanitized.data === 'object' ? sanitized.data : null) ||
    (sanitized.result && typeof sanitized.result === 'object' ? sanitized.result : null) ||
    sanitized) as Record<string, unknown>;

  const basic = (raw.basicInfo ||
    raw.AccountInfo ||
    raw.accountInfo ||
    raw.player ||
    raw.account ||
    raw) as Record<string, unknown>;

  const profileRaw = (raw.profileInfo ||
    raw.ProfileInfo ||
    raw.AccountProfileInfo ||
    null) as Record<string, unknown> | null;

  const guildRaw = (raw.guildBasicInfo ||
    raw.GuildInfo ||
    raw.clanBasicInfo ||
    raw.guild ||
    null) as Record<string, unknown> | null;

  const socialRaw = (raw.socialInfo || raw.SocialInfo || null) as Record<string, unknown> | null;
  const creditRaw = (raw.creditScoreInfo || raw.CreditScoreInfo || null) as Record<
    string,
    unknown
  > | null;

  const nickname =
    toStr(basic.nickname) || toStr(basic.AccountName) || toStr(basic.name) || null;
  const level = toNum(basic.level ?? basic.AccountLevel);
  const exp = toNum(basic.exp ?? basic.AccountEXP);
  const region =
    toStr(basic.region) ||
    toStr(basic.AccountRegion) ||
    (requestedRegion !== 'AUTO' ? requestedRegion : null);
  const likes = toNum(basic.liked ?? basic.likes ?? basic.AccountLikes);
  const seasonId = (basic.seasonId ?? basic.AccountSeasonId ?? raw.seasonId ?? null) as
    | string
    | number
    | null;

  const brRank = (basic.rank ??
    basic.brRank ??
    basic.maxRank ??
    basic.BrMaxRank ??
    raw.brRank ??
    null) as string | number | null;
  const brRankPoints = toNum(
    basic.rankingPoints ?? basic.brRankPoints ?? basic.BrRankPoint ?? raw.brRankPoints
  );
  const csRank = (basic.csRank ??
    basic.csMaxRank ??
    basic.CsMaxRank ??
    raw.csRank ??
    null) as string | number | null;
  const csRankPoints = toNum(
    basic.csRankingPoints ?? basic.csRankPoints ?? basic.CsRankPoint ?? raw.csRankPoints
  );

  const createdAt = formatUnixTimestamp(
    basic.createAt ?? basic.createdAt ?? basic.AccountCreateTime
  );
  const lastLoginAt = formatUnixTimestamp(
    basic.lastLoginAt ?? basic.lastLogin ?? basic.AccountLastLogin
  );

  const avatarId = (profileRaw?.avatarId ??
    basic.headPic ??
    basic.avatarId ??
    basic.AccountAvatarId ??
    null) as string | number | null;
  const bannerId = (basic.bannerId ??
    profileRaw?.bannerId ??
    basic.AccountBannerId ??
    null) as string | number | null;
  const badgeId = (basic.badgeId ?? profileRaw?.badgeId ?? null) as string | number | null;
  const primeLevel = toNum(basic.primeLevel ?? basic.prime ?? basic.PrimeLevel ?? raw.primeLevel);

  const guild = guildRaw
    ? {
        id:
          guildRaw.clanId ?? guildRaw.guildId ?? guildRaw.GuildID
            ? String(guildRaw.clanId ?? guildRaw.guildId ?? guildRaw.GuildID)
            : null,
        name:
          toStr(guildRaw.clanName) ||
          toStr(guildRaw.guildName) ||
          toStr(guildRaw.GuildName) ||
          null,
        level: toNum(guildRaw.clanLevel ?? guildRaw.level ?? guildRaw.GuildLevel),
        members: toNum(guildRaw.memberNum ?? guildRaw.members ?? guildRaw.GuildMember),
        capacity: toNum(guildRaw.capacity ?? guildRaw.GuildCapacity),
        leaderName:
          toStr(guildRaw.captainName) ||
          toStr(guildRaw.leaderName) ||
          toStr(guildRaw.GuildOwner) ||
          null,
      }
    : null;

  const signature =
    toStr(socialRaw?.signature) ||
    toStr(socialRaw?.AccountSignature) ||
    toStr(profileRaw?.signature) ||
    toStr(basic.signature) ||
    null;

  const creditScore = toNum(
    creditRaw?.creditScore ?? basic.honorScore ?? basic.CreditScore ?? raw.creditScore
  );

  return {
    uid: String(basic.accountId || basic.AccountID || requestedUid),
    fetchedAt: new Date().toISOString(),
    providerLabel: 'GameSkinbo Free Fire Info API (Third-Party Provider)',
    accountInfo: {
      nickname,
      level,
      exp,
      region,
      likes,
      seasonId,
      brRank,
      brRankPoints,
      csRank,
      csRankPoints,
      createdAt,
      lastLoginAt,
    },
    profileDetails: {
      avatarId,
      bannerId,
      badgeId,
      primeLevel,
    },
    guildInfo: guild && (guild.name || guild.id) ? guild : null,
    socialProfile: {
      signature,
      gender: toStr(socialRaw?.gender),
      language: toStr(socialRaw?.language),
    },
    creditScoreDetails: {
      creditScore,
      summaryStatus: toStr(creditRaw?.summaryStatus ?? creditRaw?.status),
    },
  };
}
