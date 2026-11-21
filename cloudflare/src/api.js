export const CONTACT_FACEBOOK_URL = 'https://www.facebook.com/share/1DnqXXosMt/';
export const GAMESKINBO_ENDPOINT = 'https://api.gameskinbo.com/ff-info/get';

export const EXTERNAL_PROVIDER_NOTICE =
  'You are leaving CrazyOpenPlace. Payment and service delivery are handled by the provider. Check the final package, price, fees and payment method on the provider website before paying.';

export const THANK_YOU_RETURN_NOTICE =
  'Thank you for visiting CrazyOpenPlace. Your payment and Guild Glory service are handled directly by the external provider you selected. Keep your provider transaction reference and payment receipt. Returning to CrazyOpenPlace does not confirm payment or service completion.';

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

export const GUILD_GLORY_PROVIDERS = [
  {
    id: 'ffibd-shop',
    name: 'FFIBD Shop',
    domain: 'ffibd.shop',
    url: 'https://ffibd.shop/topup/popular-item-1/ff-glory-bot-19',
    destinationType: 'product_checkout',
    currency: 'BDT',
    packagesSummary: 'See current packages and payment methods at provider checkout.',
    paymentMethodsLabel: 'See current payment methods at provider checkout.',
    checkoutNote:
      'Product checkout destination on ffibd.shop. Prior check noted a redirect to ff-guild-glory-bot-19 and BDT checkout options; verify live price and gateway fees before paying.',
    ctaLabel: 'Buy from FFIBD Shop',
    lastCheckedDate: '2026-11-19',
    enabled: true,
  },
  {
    id: 'bd-games-topup',
    name: 'BD Games Topup',
    domain: 'bdgamestopup.com',
    url: 'https://bdgamestopup.com/topup/64/guild-glory-bot',
    destinationType: 'product_checkout',
    currency: 'BDT',
    packagesSummary: 'See current packages and payment methods at provider checkout.',
    paymentMethodsLabel: 'See current payment methods at provider checkout.',
    checkoutNote:
      'Direct product page on bdgamestopup.com (BDT). Confirm current package rates and payment options directly on bdgamestopup.com.',
    ctaLabel: 'Buy from BD Games Topup',
    lastCheckedDate: '2026-11-19',
    enabled: true,
  },
  {
    id: 'ff-topup-house',
    name: 'FF TopUp House',
    domain: 'fftopuphouse.com',
    url: 'https://fftopuphouse.com/product/guild-glory-bot',
    destinationType: 'product_page',
    currency: 'BDT',
    packagesSummary: 'See current packages and payment methods at provider checkout.',
    paymentMethodsLabel: 'Packages and payment methods load dynamically on provider site.',
    checkoutNote:
      'Product page on fftopuphouse.com (BDT). Prices and payment methods load dynamically in your browser.',
    ctaLabel: 'Buy from FF TopUp House',
    lastCheckedDate: '2026-11-19',
    enabled: true,
  },
  {
    id: 'rio-game-shop',
    name: 'Rio Game Shop',
    domain: 'riogameshop.com',
    url: 'https://riogameshop.com/product/guild-bot',
    destinationType: 'product_page',
    currency: 'BDT',
    packagesSummary: 'See current packages and payment methods at provider checkout.',
    paymentMethodsLabel: 'Packages and payment methods load dynamically on provider site.',
    checkoutNote:
      'Product page on riogameshop.com (BDT). Check live package options, supported regions, and payment methods directly on riogameshop.com.',
    ctaLabel: 'Buy from Rio Game Shop',
    lastCheckedDate: '2026-11-19',
    enabled: true,
  },
  {
    id: 'ffglory-site',
    name: 'FFGlory',
    domain: 'www.ffglory.pro',
    url: 'https://www.ffglory.pro/en/',
    destinationType: 'service_website',
    currency: 'BDT',
    packagesSummary: 'See current packages and payment methods at provider checkout.',
    paymentMethodsLabel: 'External service website (not a direct product-only checkout URL).',
    checkoutNote:
      'General external service website. May show Cloudflare browser verification before loading. Not labeled as a direct payment URL.',
    ctaLabel: 'Continue to FFGlory',
    lastCheckedDate: '2026-11-19',
    enabled: true,
  },
];

// Isolate-local sliding-window rate limiter (note: isolates scale independently in Workers Free)
const rateBuckets = new Map();

export function checkRateLimit(request, bucketName, maxRequests, windowMs = 60_000) {
  const clientIp =
    request.headers.get('cf-connecting-ip') ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    'unknown';
  const key = `${bucketName}:${clientIp}`;
  const now = Date.now();
  const active = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (active.length >= maxRequests) {
    rateBuckets.set(key, active);
    return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  active.push(now);
  rateBuckets.set(key, active);
  if (rateBuckets.size > 500) {
    for (const [k, list] of rateBuckets.entries()) {
      const kept = list.filter((t) => now - t < windowMs);
      if (kept.length === 0) rateBuckets.delete(k);
      else rateBuckets.set(k, kept);
    }
  }
  return { allowed: true };
}

export function buildHeaders(request, contentType, extra = {}) {
  const headers = new Headers({
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    ...extra,
  });
  const origin = request.headers.get('origin');
  const reqHost = new URL(request.url).host;
  if (origin) {
    try {
      if (new URL(origin).host === reqHost) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Vary', 'Origin');
      }
    } catch {
      // ignore malformed origin
    }
  }
  return headers;
}

export function jsonResponse(request, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: buildHeaders(request, 'application/json; charset=utf-8', extraHeaders),
  });
}

function formatUnixTimestamp(val) {
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

function toNum(val) {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toStr(val) {
  if (typeof val === 'string') {
    const t = val.trim();
    return t.length > 0 ? t : null;
  }
  return null;
}

const SENSITIVE_KEY_PATTERN = /(key|token|secret|password|auth|cookie|email|phone|otp|session)/i;

export function stripSensitiveKeys(input) {
  if (Array.isArray(input)) return input.map(stripSensitiveKeys);
  if (input && typeof input === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) continue;
      out[k] = stripSensitiveKeys(v);
    }
    return out;
  }
  return input;
}

export function normalizeGameSkinboResponse(rawInput, requestedUid, requestedRegion) {
  const sanitized = stripSensitiveKeys(rawInput);
  const raw =
    (sanitized.data && typeof sanitized.data === 'object' ? sanitized.data : null) ||
    (sanitized.result && typeof sanitized.result === 'object' ? sanitized.result : null) ||
    sanitized;

  const basic =
    raw.basicInfo ||
    raw.AccountInfo ||
    raw.accountInfo ||
    raw.player ||
    raw.account ||
    raw;
  const profileRaw = raw.profileInfo || raw.ProfileInfo || raw.AccountProfileInfo || null;
  const guildRaw = raw.guildBasicInfo || raw.GuildInfo || raw.clanBasicInfo || raw.guild || null;
  const socialRaw = raw.socialInfo || raw.SocialInfo || null;
  const creditRaw = raw.creditScoreInfo || raw.CreditScoreInfo || null;

  const region =
    toStr(basic.region) ||
    toStr(basic.AccountRegion) ||
    (requestedRegion !== 'AUTO' ? requestedRegion : null);

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

  return {
    uid: String(basic.accountId || basic.AccountID || requestedUid),
    fetchedAt: new Date().toISOString(),
    providerLabel: 'GameSkinbo Free Fire Info API (Third-Party Provider)',
    accountInfo: {
      nickname: toStr(basic.nickname) || toStr(basic.AccountName) || toStr(basic.name) || null,
      level: toNum(basic.level ?? basic.AccountLevel),
      exp: toNum(basic.exp ?? basic.AccountEXP),
      region,
      likes: toNum(basic.liked ?? basic.likes ?? basic.AccountLikes),
      seasonId: basic.seasonId ?? basic.AccountSeasonId ?? raw.seasonId ?? null,
      brRank: basic.rank ?? basic.brRank ?? basic.maxRank ?? basic.BrMaxRank ?? raw.brRank ?? null,
      brRankPoints: toNum(
        basic.rankingPoints ?? basic.brRankPoints ?? basic.BrRankPoint ?? raw.brRankPoints
      ),
      csRank: basic.csRank ?? basic.csMaxRank ?? basic.CsMaxRank ?? raw.csRank ?? null,
      csRankPoints: toNum(
        basic.csRankingPoints ?? basic.csRankPoints ?? basic.CsRankPoint ?? raw.csRankPoints
      ),
      createdAt: formatUnixTimestamp(basic.createAt ?? basic.createdAt ?? basic.AccountCreateTime),
      lastLoginAt: formatUnixTimestamp(
        basic.lastLoginAt ?? basic.lastLogin ?? basic.AccountLastLogin
      ),
    },
    profileDetails: {
      avatarId: profileRaw?.avatarId ?? basic.headPic ?? basic.avatarId ?? basic.AccountAvatarId ?? null,
      bannerId: basic.bannerId ?? profileRaw?.bannerId ?? basic.AccountBannerId ?? null,
      badgeId: basic.badgeId ?? profileRaw?.badgeId ?? null,
      primeLevel: toNum(basic.primeLevel ?? basic.prime ?? basic.PrimeLevel ?? raw.primeLevel),
    },
    guildInfo: guild && (guild.name || guild.id) ? guild : null,
    socialProfile: {
      signature:
        toStr(socialRaw?.signature) ||
        toStr(socialRaw?.AccountSignature) ||
        toStr(profileRaw?.signature) ||
        toStr(basic.signature) ||
        null,
      gender: toStr(socialRaw?.gender),
      language: toStr(socialRaw?.language),
    },
    creditScoreDetails: {
      creditScore: toNum(
        creditRaw?.creditScore ?? basic.honorScore ?? basic.CreditScore ?? raw.creditScore
      ),
      summaryStatus: toStr(creditRaw?.summaryStatus ?? creditRaw?.status),
    },
  };
}

function isPrivateOrBlockedHostname(hostname) {
  const host = hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }
  return /^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
}

export async function handleApiRequest(request, env, url) {
  if (url.pathname === '/healthz' || url.pathname === '/api/health') {
    return jsonResponse(request, {
      ok: true,
      service: 'CrazyOpenPlace',
      runtime: 'Cloudflare Worker',
      timestamp: new Date().toISOString(),
    });
  }

  if (url.pathname === '/api/config-status') {
    const gameskinboConfigured = Boolean((env?.GAMESKINBO_API_KEY || '').trim());
    const observatoryConfigured = Boolean(
      (env?.CLOUDFLARE_API_TOKEN || '').trim() && (env?.CLOUDFLARE_ZONE_ID || '').trim()
    );
    return jsonResponse(request, {
      status: 'operational',
      gameskinboConfigured,
      observatoryConfigured,
      rateLimits: { uidPerMinute: 5, observatoryPerMinute: 10 },
      checkedAt: new Date().toISOString(),
    });
  }

  if (url.pathname === '/api/uid-check') {
    if (request.method !== 'GET') {
      return jsonResponse(request, { code: 'METHOD_NOT_ALLOWED', error: 'Use GET.' }, 405);
    }
    const rl = checkRateLimit(request, 'uidcheck', 5, 60_000);
    if (!rl.allowed) {
      return jsonResponse(
        request,
        {
          code: 'RATE_LIMITED',
          error: 'Rate limit exceeded (5 requests/minute). Please wait before retrying.',
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        429
      );
    }

    const rawUid = (url.searchParams.get('uid') || '').trim();
    const rawRegion = (url.searchParams.get('region') || 'AUTO').trim().toUpperCase();

    if (!/^\d{5,20}$/.test(rawUid)) {
      return jsonResponse(
        request,
        { code: 'INVALID_UID', error: 'UID must contain digits only and be 5 to 20 digits long.' },
        400
      );
    }
    if (!SUPPORTED_UID_REGIONS.has(rawRegion)) {
      return jsonResponse(
        request,
        {
          code: 'UNSUPPORTED_REGION',
          error: `Unsupported region "${rawRegion}". Allowed: AUTO, BD, IND, BR, US, SAC, NA, TH, ID, SG, PK.`,
        },
        400
      );
    }

    const apiKey = (env?.GAMESKINBO_API_KEY || '').trim();
    if (!apiKey) {
      return jsonResponse(
        request,
        {
          configured: false,
          code: 'API_KEY_MISSING',
          error:
            'GAMESKINBO_API_KEY is not configured in Worker secrets. Add GAMESKINBO_API_KEY in Cloudflare Worker Settings -> Variables and Secrets.',
        },
        503
      );
    }

    try {
      const params = new URLSearchParams({ uid: rawUid });
      if (rawRegion !== 'AUTO') params.set('region', rawRegion);

      const upstreamRes = await fetchWithTimeout(
        `${GAMESKINBO_ENDPOINT}?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'x-api-key': apiKey, Accept: 'application/json' },
        },
        12_000
      );

      const parsed = await upstreamRes.json().catch(() => ({}));
      if (!upstreamRes.ok) {
        if (upstreamRes.status === 401 || upstreamRes.status === 403) {
          return jsonResponse(
            request,
            {
              code: 'PROVIDER_UNAUTHORIZED',
              error: 'Upstream provider rejected the configured API key (Unauthorized/Forbidden).',
            },
            upstreamRes.status
          );
        }
        if (upstreamRes.status === 402) {
          return jsonResponse(
            request,
            {
              code: 'PROVIDER_CREDITS_REQUIRED',
              error: 'GameSkinbo API returned HTTP 402 (API credits exhausted or plan quota reached).',
            },
            402
          );
        }
        if (upstreamRes.status === 429) {
          return jsonResponse(
            request,
            {
              code: 'PROVIDER_QUOTA_EXCEEDED',
              error: 'GameSkinbo API quota or upstream rate limit exceeded. Try again later.',
            },
            429
          );
        }
        if (upstreamRes.status === 404) {
          return jsonResponse(
            request,
            { code: 'PLAYER_NOT_FOUND', error: `No player profile found for UID ${rawUid}.` },
            404
          );
        }
        return jsonResponse(
          request,
          {
            code: 'PROVIDER_FAILURE',
            error: `GameSkinbo API returned HTTP ${upstreamRes.status}.`,
          },
          502
        );
      }

      const profile = normalizeGameSkinboResponse(parsed, rawUid, rawRegion);
      if (!profile.accountInfo.nickname && profile.accountInfo.level === null) {
        const safeErr = stripSensitiveKeys(parsed);
        const upstreamMsg =
          typeof safeErr?.error === 'string'
            ? safeErr.error
            : typeof safeErr?.message === 'string'
              ? safeErr.message
              : null;
        return jsonResponse(
          request,
          {
            code: 'PLAYER_NOT_FOUND',
            error: upstreamMsg || `No player details returned for UID ${rawUid}.`,
          },
          404
        );
      }

      return jsonResponse(request, { configured: true, profile });
    } catch (err) {
      const isTimeout =
        err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
      return jsonResponse(
        request,
        {
          code: isTimeout ? 'PROVIDER_TIMEOUT' : 'PROVIDER_NETWORK_ERROR',
          error: isTimeout
            ? 'GameSkinbo lookup timed out after 12 seconds.'
            : 'Unable to reach GameSkinbo API right now.',
        },
        isTimeout ? 504 : 502
      );
    }
  }

  if (url.pathname === '/api/website-speed/tests') {
    if (request.method !== 'GET') {
      return jsonResponse(request, { code: 'METHOD_NOT_ALLOWED', error: 'Use GET.' }, 405);
    }
    const rl = checkRateLimit(request, 'observatory', 10, 60_000);
    if (!rl.allowed) {
      return jsonResponse(
        request,
        {
          code: 'RATE_LIMITED',
          error: 'Rate limit exceeded (10 requests/minute). Wait before retrying.',
          retryAfterSeconds: rl.retryAfterSeconds,
        },
        429
      );
    }

    const token = (env?.CLOUDFLARE_API_TOKEN || '').trim();
    const zoneId = (env?.CLOUDFLARE_ZONE_ID || '').trim();
    if (!token || !zoneId) {
      return jsonResponse(
        request,
        {
          configured: false,
          code: 'OBSERVATORY_NOT_CONFIGURED',
          error:
            'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID are not configured in Worker secrets.',
        },
        503
      );
    }

    const rawUrl = (url.searchParams.get('url') || '').trim();
    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
      if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
        throw new Error('Invalid protocol');
      }
      if (isPrivateOrBlockedHostname(parsedUrl.hostname)) {
        return jsonResponse(
          request,
          { code: 'BLOCKED_URL', error: 'Local or private network URLs are not permitted.' },
          400
        );
      }
    } catch {
      return jsonResponse(
        request,
        {
          code: 'INVALID_URL',
          error: 'Provide a valid public URL starting with https:// or http://.',
        },
        400
      );
    }

    try {
      const zoneRes = await fetchWithTimeout(
        `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        },
        12_000
      );

      if (!zoneRes.ok) {
        return jsonResponse(
          request,
          {
            code: 'ZONE_VERIFY_FAILED',
            error:
              zoneRes.status === 401 || zoneRes.status === 403
                ? 'Cloudflare API token rejected Zone lookup (ensure token includes Zone: Read and Zone Settings: Read for this Zone ID).'
                : `Cloudflare Zone lookup failed with HTTP ${zoneRes.status}.`,
          },
          zoneRes.status === 401 || zoneRes.status === 403 ? zoneRes.status : 502
        );
      }

      const zoneJson = await zoneRes.json().catch(() => ({}));
      const zoneDomain = (zoneJson?.result?.name || '').toLowerCase();
      const targetHost = parsedUrl.hostname.toLowerCase();

      if (!zoneDomain || (targetHost !== zoneDomain && !targetHost.endsWith(`.${zoneDomain}`))) {
        return jsonResponse(
          request,
          {
            code: 'URL_OUTSIDE_ZONE',
            error: `URL hostname "${targetHost}" does not belong to the configured Cloudflare Zone (${zoneDomain || 'unknown'}).`,
          },
          403
        );
      }

      const normalizedPageUrl = parsedUrl.toString();
      const cfRes = await fetchWithTimeout(
        `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(
          zoneId
        )}/speed_api/pages/${encodeURIComponent(normalizedPageUrl)}/tests`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        },
        12_000
      );

      const cfJson = await cfRes.json().catch(() => ({}));
      if (!cfRes.ok || cfJson.success === false) {
        if (cfRes.status === 404) {
          return jsonResponse(request, {
            configured: true,
            url: normalizedPageUrl,
            tests: [],
            message: 'No Cloudflare Observatory test history found for this URL yet.',
          });
        }
        return jsonResponse(
          request,
          {
            code: 'OBSERVATORY_API_ERROR',
            error:
              cfJson.errors?.[0]?.message ||
              `Cloudflare Observatory API returned HTTP ${cfRes.status}.`,
          },
          cfRes.status === 401 || cfRes.status === 403 ? cfRes.status : 502
        );
      }

      const rawTests = Array.isArray(cfJson.result) ? cfJson.result.slice(0, 10) : [];
      const tests = rawTests.map((t) => ({
        id: String(t.id || ''),
        url: String(t.url || normalizedPageUrl),
        createdAt: String(t.date || t.createdAt || ''),
        region: String(t.region?.label || t.region?.value || t.region || 'Not available'),
        scheduleFrequency: String(t.scheduleFrequency || 'On-demand'),
        desktopPerformanceScore:
          typeof t.desktopReport?.performanceScore === 'number'
            ? t.desktopReport.performanceScore
            : null,
        mobilePerformanceScore:
          typeof t.mobileReport?.performanceScore === 'number'
            ? t.mobileReport.performanceScore
            : null,
      }));

      return jsonResponse(request, { configured: true, url: normalizedPageUrl, tests });
    } catch (err) {
      const isTimeout =
        err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
      return jsonResponse(
        request,
        {
          code: isTimeout ? 'OBSERVATORY_TIMEOUT' : 'OBSERVATORY_NETWORK_ERROR',
          error: isTimeout
            ? 'Cloudflare Observatory request timed out after 12 seconds.'
            : 'Unable to reach Cloudflare Observatory API.',
        },
        isTimeout ? 504 : 502
      );
    }
  }

  return jsonResponse(request, { code: 'API_NOT_FOUND', error: 'API endpoint not found.' }, 404);
}
