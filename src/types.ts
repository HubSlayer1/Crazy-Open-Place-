export type RoutePath =
  | '/'
  | '/free-services'
  | '/uid-checker'
  | '/speed-test'
  | '/website-speed'
  | '/guild-glory'
  | '/thank-you'
  | '/about'
  | '/safety'
  | '/contact'
  | '/not-found';

export type ThemeMode = 'charcoal-amber' | 'light';

export interface ConfigStatusData {
  status: 'operational';
  gameskinboConfigured: boolean;
  observatoryConfigured: boolean;
  rateLimits: {
    uidPerMinute: number;
    observatoryPerMinute: number;
  };
  checkedAt: string;
}

export interface NetworkInfoData {
  ip: string | null;
  userAgent: string;
  acceptLanguage: string;
  protocol: string;
  host: string;
  serverTimeIso: string;
  cloudflareTrace: {
    ip?: string;
    colo?: string;
    loc?: string;
    tls?: string;
    http?: string;
    warp?: string;
    visitScheme?: string;
  } | null;
}

export interface NormalizedUidProfile {
  uid: string;
  fetchedAt: string;
  providerLabel: string;
  accountInfo: {
    nickname: string | null;
    level: number | null;
    exp: number | null;
    region: string | null;
    likes: number | null;
    seasonId: string | number | null;
    brRank: string | number | null;
    brRankPoints: number | null;
    csRank: string | number | null;
    csRankPoints: number | null;
    createdAt: string | null;
    lastLoginAt: string | null;
  };
  profileDetails: {
    avatarId: string | number | null;
    bannerId: string | number | null;
    badgeId: string | number | null;
    primeLevel: number | null;
  };
  guildInfo: {
    id: string | null;
    name: string | null;
    level: number | null;
    members: number | null;
    capacity: number | null;
    leaderName: string | null;
  } | null;
  socialProfile: {
    signature: string | null;
    gender: string | null;
    language: string | null;
  };
  creditScoreDetails: {
    creditScore: number | null;
    summaryStatus: string | null;
  };
}

export interface SpeedTestMetrics {
  downloadMbps: number | null;
  uploadMbps: number | null;
  unloadedLatencyMs: number | null;
  unloadedJitterMs: number | null;
  downLoadedLatencyMs: number | null;
  downLoadedJitterMs: number | null;
  upLoadedLatencyMs: number | null;
  upLoadedJitterMs: number | null;
  packetLossPercent: number | null;
  packetLossSupported: boolean;
  totalDurationMs: number | null;
}

export interface WebsiteSpeedTestEntry {
  id: string;
  url: string;
  createdAt: string;
  region: string;
  scheduleFrequency: string;
  desktopPerformanceScore: number | null;
  mobilePerformanceScore: number | null;
}
