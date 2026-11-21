// cloudflare/src/api.js
var CONTACT_FACEBOOK_URL = "https://www.facebook.com/share/1DnqXXosMt/";
var GAMESKINBO_ENDPOINT = "https://api.gameskinbo.com/ff-info/get";
var EXTERNAL_PROVIDER_NOTICE = "You are leaving CrazyOpenPlace. Payment and service delivery are handled by the provider. Check the final package, price, fees and payment method on the provider website before paying.";
var THANK_YOU_RETURN_NOTICE = "Thank you for visiting CrazyOpenPlace. Your payment and Guild Glory service are handled directly by the external provider you selected. Keep your provider transaction reference and payment receipt. Returning to CrazyOpenPlace does not confirm payment or service completion.";
var SUPPORTED_UID_REGIONS = /* @__PURE__ */ new Set([
  "AUTO",
  "BD",
  "IND",
  "BR",
  "US",
  "SAC",
  "NA",
  "TH",
  "ID",
  "SG",
  "PK"
]);
var GUILD_GLORY_PROVIDERS = [
  {
    id: "ffibd-shop",
    name: "FFIBD Shop",
    domain: "ffibd.shop",
    url: "https://ffibd.shop/topup/popular-item-1/ff-glory-bot-19",
    destinationType: "product_checkout",
    currency: "BDT",
    packagesSummary: "See current packages and payment methods at provider checkout.",
    paymentMethodsLabel: "See current payment methods at provider checkout.",
    checkoutNote: "Product checkout destination on ffibd.shop. Prior check noted a redirect to ff-guild-glory-bot-19 and BDT checkout options; verify live price and gateway fees before paying.",
    ctaLabel: "Buy from FFIBD Shop",
    lastCheckedDate: "2026-11-19",
    enabled: true
  },
  {
    id: "bd-games-topup",
    name: "BD Games Topup",
    domain: "bdgamestopup.com",
    url: "https://bdgamestopup.com/topup/64/guild-glory-bot",
    destinationType: "product_checkout",
    currency: "BDT",
    packagesSummary: "See current packages and payment methods at provider checkout.",
    paymentMethodsLabel: "See current payment methods at provider checkout.",
    checkoutNote: "Direct product page on bdgamestopup.com (BDT). Confirm current package rates and payment options directly on bdgamestopup.com.",
    ctaLabel: "Buy from BD Games Topup",
    lastCheckedDate: "2026-11-19",
    enabled: true
  },
  {
    id: "ff-topup-house",
    name: "FF TopUp House",
    domain: "fftopuphouse.com",
    url: "https://fftopuphouse.com/product/guild-glory-bot",
    destinationType: "product_page",
    currency: "BDT",
    packagesSummary: "See current packages and payment methods at provider checkout.",
    paymentMethodsLabel: "Packages and payment methods load dynamically on provider site.",
    checkoutNote: "Product page on fftopuphouse.com (BDT). Prices and payment methods load dynamically in your browser.",
    ctaLabel: "Buy from FF TopUp House",
    lastCheckedDate: "2026-11-19",
    enabled: true
  },
  {
    id: "rio-game-shop",
    name: "Rio Game Shop",
    domain: "riogameshop.com",
    url: "https://riogameshop.com/product/guild-bot",
    destinationType: "product_page",
    currency: "BDT",
    packagesSummary: "See current packages and payment methods at provider checkout.",
    paymentMethodsLabel: "Packages and payment methods load dynamically on provider site.",
    checkoutNote: "Product page on riogameshop.com (BDT). Check live package options, supported regions, and payment methods directly on riogameshop.com.",
    ctaLabel: "Buy from Rio Game Shop",
    lastCheckedDate: "2026-11-19",
    enabled: true
  },
  {
    id: "ffglory-site",
    name: "FFGlory",
    domain: "www.ffglory.pro",
    url: "https://www.ffglory.pro/en/",
    destinationType: "service_website",
    currency: "BDT",
    packagesSummary: "See current packages and payment methods at provider checkout.",
    paymentMethodsLabel: "External service website (not a direct product-only checkout URL).",
    checkoutNote: "General external service website. May show Cloudflare browser verification before loading. Not labeled as a direct payment URL.",
    ctaLabel: "Continue to FFGlory",
    lastCheckedDate: "2026-11-19",
    enabled: true
  }
];
var rateBuckets = /* @__PURE__ */ new Map();
function checkRateLimit(request, bucketName, maxRequests, windowMs = 6e4) {
  const clientIp = request.headers.get("cf-connecting-ip") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const key = `${bucketName}:${clientIp}`;
  const now = Date.now();
  const active = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
  if (active.length >= maxRequests) {
    rateBuckets.set(key, active);
    return { allowed: false, retryAfterSeconds: Math.ceil(windowMs / 1e3) };
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
function buildHeaders(request, contentType, extra = {}) {
  const headers = new Headers({
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    ...extra
  });
  const origin = request.headers.get("origin");
  const reqHost = new URL(request.url).host;
  if (origin) {
    try {
      if (new URL(origin).host === reqHost) {
        headers.set("Access-Control-Allow-Origin", origin);
        headers.set("Vary", "Origin");
      }
    } catch {
    }
  }
  return headers;
}
function jsonResponse(request, data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: buildHeaders(request, "application/json; charset=utf-8", extraHeaders)
  });
}
function formatUnixTimestamp(val) {
  if (val === null || val === void 0 || val === "") return null;
  const num = Number(val);
  if (Number.isFinite(num) && num > 1e9) {
    const ms = num < 1e10 ? num * 1e3 : num;
    return new Date(ms).toISOString();
  }
  if (typeof val === "string" && !Number.isNaN(Date.parse(val))) {
    return new Date(val).toISOString();
  }
  return null;
}
function toNum(val) {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string" && val.trim() !== "") {
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function toStr(val) {
  if (typeof val === "string") {
    const t = val.trim();
    return t.length > 0 ? t : null;
  }
  return null;
}
var SENSITIVE_KEY_PATTERN = /(key|token|secret|password|auth|cookie|email|phone|otp|session)/i;
function stripSensitiveKeys(input) {
  if (Array.isArray(input)) return input.map(stripSensitiveKeys);
  if (input && typeof input === "object") {
    const out = {};
    for (const [k, v] of Object.entries(input)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) continue;
      out[k] = stripSensitiveKeys(v);
    }
    return out;
  }
  return input;
}
function normalizeGameSkinboResponse(rawInput, requestedUid, requestedRegion) {
  const sanitized = stripSensitiveKeys(rawInput);
  const raw = (sanitized.data && typeof sanitized.data === "object" ? sanitized.data : null) || (sanitized.result && typeof sanitized.result === "object" ? sanitized.result : null) || sanitized;
  const basic = raw.basicInfo || raw.AccountInfo || raw.accountInfo || raw.player || raw.account || raw;
  const profileRaw = raw.profileInfo || raw.ProfileInfo || raw.AccountProfileInfo || null;
  const guildRaw = raw.guildBasicInfo || raw.GuildInfo || raw.clanBasicInfo || raw.guild || null;
  const socialRaw = raw.socialInfo || raw.SocialInfo || null;
  const creditRaw = raw.creditScoreInfo || raw.CreditScoreInfo || null;
  const region = toStr(basic.region) || toStr(basic.AccountRegion) || (requestedRegion !== "AUTO" ? requestedRegion : null);
  const guild = guildRaw ? {
    id: guildRaw.clanId ?? guildRaw.guildId ?? guildRaw.GuildID ? String(guildRaw.clanId ?? guildRaw.guildId ?? guildRaw.GuildID) : null,
    name: toStr(guildRaw.clanName) || toStr(guildRaw.guildName) || toStr(guildRaw.GuildName) || null,
    level: toNum(guildRaw.clanLevel ?? guildRaw.level ?? guildRaw.GuildLevel),
    members: toNum(guildRaw.memberNum ?? guildRaw.members ?? guildRaw.GuildMember),
    capacity: toNum(guildRaw.capacity ?? guildRaw.GuildCapacity),
    leaderName: toStr(guildRaw.captainName) || toStr(guildRaw.leaderName) || toStr(guildRaw.GuildOwner) || null
  } : null;
  return {
    uid: String(basic.accountId || basic.AccountID || requestedUid),
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
    providerLabel: "GameSkinbo Free Fire Info API (Third-Party Provider)",
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
      )
    },
    profileDetails: {
      avatarId: profileRaw?.avatarId ?? basic.headPic ?? basic.avatarId ?? basic.AccountAvatarId ?? null,
      bannerId: basic.bannerId ?? profileRaw?.bannerId ?? basic.AccountBannerId ?? null,
      badgeId: basic.badgeId ?? profileRaw?.badgeId ?? null,
      primeLevel: toNum(basic.primeLevel ?? basic.prime ?? basic.PrimeLevel ?? raw.primeLevel)
    },
    guildInfo: guild && (guild.name || guild.id) ? guild : null,
    socialProfile: {
      signature: toStr(socialRaw?.signature) || toStr(socialRaw?.AccountSignature) || toStr(profileRaw?.signature) || toStr(basic.signature) || null,
      gender: toStr(socialRaw?.gender),
      language: toStr(socialRaw?.language)
    },
    creditScoreDetails: {
      creditScore: toNum(
        creditRaw?.creditScore ?? basic.honorScore ?? basic.CreditScore ?? raw.creditScore
      ),
      summaryStatus: toStr(creditRaw?.summaryStatus ?? creditRaw?.status)
    }
  };
}
function isPrivateOrBlockedHostname(hostname) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local") || host.endsWith(".internal")) {
    return true;
  }
  return /^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
}
async function handleApiRequest(request, env, url) {
  if (url.pathname === "/healthz" || url.pathname === "/api/health") {
    return jsonResponse(request, {
      ok: true,
      service: "CrazyOpenPlace",
      runtime: "Cloudflare Worker",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  if (url.pathname === "/api/config-status") {
    const gameskinboConfigured = Boolean((env?.GAMESKINBO_API_KEY || "").trim());
    const observatoryConfigured = Boolean(
      (env?.CLOUDFLARE_API_TOKEN || "").trim() && (env?.CLOUDFLARE_ZONE_ID || "").trim()
    );
    return jsonResponse(request, {
      status: "operational",
      gameskinboConfigured,
      observatoryConfigured,
      rateLimits: { uidPerMinute: 5, observatoryPerMinute: 10 },
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  if (url.pathname === "/api/uid-check") {
    if (request.method !== "GET") {
      return jsonResponse(request, { code: "METHOD_NOT_ALLOWED", error: "Use GET." }, 405);
    }
    const rl = checkRateLimit(request, "uidcheck", 5, 6e4);
    if (!rl.allowed) {
      return jsonResponse(
        request,
        {
          code: "RATE_LIMITED",
          error: "Rate limit exceeded (5 requests/minute). Please wait before retrying.",
          retryAfterSeconds: rl.retryAfterSeconds
        },
        429
      );
    }
    const rawUid = (url.searchParams.get("uid") || "").trim();
    const rawRegion = (url.searchParams.get("region") || "AUTO").trim().toUpperCase();
    if (!/^\d{5,20}$/.test(rawUid)) {
      return jsonResponse(
        request,
        { code: "INVALID_UID", error: "UID must contain digits only and be 5 to 20 digits long." },
        400
      );
    }
    if (!SUPPORTED_UID_REGIONS.has(rawRegion)) {
      return jsonResponse(
        request,
        {
          code: "UNSUPPORTED_REGION",
          error: `Unsupported region "${rawRegion}". Allowed: AUTO, BD, IND, BR, US, SAC, NA, TH, ID, SG, PK.`
        },
        400
      );
    }
    const apiKey = (env?.GAMESKINBO_API_KEY || "").trim();
    if (!apiKey) {
      return jsonResponse(
        request,
        {
          configured: false,
          code: "API_KEY_MISSING",
          error: "GAMESKINBO_API_KEY is not configured in Worker secrets. Add GAMESKINBO_API_KEY in Cloudflare Worker Settings -> Variables and Secrets."
        },
        503
      );
    }
    try {
      const params = new URLSearchParams({ uid: rawUid });
      if (rawRegion !== "AUTO") params.set("region", rawRegion);
      const upstreamRes = await fetch(`${GAMESKINBO_ENDPOINT}?${params.toString()}`, {
        method: "GET",
        headers: { "x-api-key": apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(12e3)
      });
      const parsed = await upstreamRes.json().catch(() => ({}));
      if (!upstreamRes.ok) {
        if (upstreamRes.status === 401 || upstreamRes.status === 403) {
          return jsonResponse(
            request,
            {
              code: "PROVIDER_UNAUTHORIZED",
              error: "Upstream provider rejected the configured API key (Unauthorized/Forbidden)."
            },
            upstreamRes.status
          );
        }
        if (upstreamRes.status === 402) {
          return jsonResponse(
            request,
            {
              code: "PROVIDER_CREDITS_REQUIRED",
              error: "GameSkinbo API returned HTTP 402 (API credits exhausted or plan quota reached)."
            },
            402
          );
        }
        if (upstreamRes.status === 429) {
          return jsonResponse(
            request,
            {
              code: "PROVIDER_QUOTA_EXCEEDED",
              error: "GameSkinbo API quota or upstream rate limit exceeded. Try again later."
            },
            429
          );
        }
        if (upstreamRes.status === 404) {
          return jsonResponse(
            request,
            { code: "PLAYER_NOT_FOUND", error: `No player profile found for UID ${rawUid}.` },
            404
          );
        }
        return jsonResponse(
          request,
          {
            code: "PROVIDER_FAILURE",
            error: `GameSkinbo API returned HTTP ${upstreamRes.status}.`
          },
          502
        );
      }
      const profile = normalizeGameSkinboResponse(parsed, rawUid, rawRegion);
      if (!profile.accountInfo.nickname && profile.accountInfo.level === null) {
        return jsonResponse(
          request,
          { code: "PLAYER_NOT_FOUND", error: `No player details returned for UID ${rawUid}.` },
          404
        );
      }
      return jsonResponse(request, { configured: true, profile });
    } catch (err) {
      const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      return jsonResponse(
        request,
        {
          code: isTimeout ? "PROVIDER_TIMEOUT" : "PROVIDER_NETWORK_ERROR",
          error: isTimeout ? "GameSkinbo lookup timed out after 12 seconds." : "Unable to reach GameSkinbo API right now."
        },
        isTimeout ? 504 : 502
      );
    }
  }
  if (url.pathname === "/api/website-speed/tests") {
    if (request.method !== "GET") {
      return jsonResponse(request, { code: "METHOD_NOT_ALLOWED", error: "Use GET." }, 405);
    }
    const rl = checkRateLimit(request, "observatory", 10, 6e4);
    if (!rl.allowed) {
      return jsonResponse(
        request,
        {
          code: "RATE_LIMITED",
          error: "Rate limit exceeded (10 requests/minute). Wait before retrying.",
          retryAfterSeconds: rl.retryAfterSeconds
        },
        429
      );
    }
    const token = (env?.CLOUDFLARE_API_TOKEN || "").trim();
    const zoneId = (env?.CLOUDFLARE_ZONE_ID || "").trim();
    if (!token || !zoneId) {
      return jsonResponse(
        request,
        {
          configured: false,
          code: "OBSERVATORY_NOT_CONFIGURED",
          error: "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID are not configured in Worker secrets."
        },
        503
      );
    }
    const rawUrl = (url.searchParams.get("url") || "").trim();
    let parsedUrl;
    try {
      parsedUrl = new URL(rawUrl);
      if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
        throw new Error("Invalid protocol");
      }
      if (isPrivateOrBlockedHostname(parsedUrl.hostname)) {
        return jsonResponse(
          request,
          { code: "BLOCKED_URL", error: "Local or private network URLs are not permitted." },
          400
        );
      }
    } catch {
      return jsonResponse(
        request,
        {
          code: "INVALID_URL",
          error: "Provide a valid public URL starting with https:// or http://."
        },
        400
      );
    }
    try {
      const zoneRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          signal: AbortSignal.timeout(12e3)
        }
      );
      if (!zoneRes.ok) {
        return jsonResponse(
          request,
          {
            code: "ZONE_VERIFY_FAILED",
            error: zoneRes.status === 401 || zoneRes.status === 403 ? "Cloudflare API token lacks permission to read the configured Zone." : `Cloudflare Zone lookup failed with HTTP ${zoneRes.status}.`
          },
          zoneRes.status === 401 || zoneRes.status === 403 ? zoneRes.status : 502
        );
      }
      const zoneJson = await zoneRes.json().catch(() => ({}));
      const zoneDomain = (zoneJson?.result?.name || "").toLowerCase();
      const targetHost = parsedUrl.hostname.toLowerCase();
      if (!zoneDomain || targetHost !== zoneDomain && !targetHost.endsWith(`.${zoneDomain}`)) {
        return jsonResponse(
          request,
          {
            code: "URL_OUTSIDE_ZONE",
            error: `URL hostname "${targetHost}" does not belong to the configured Cloudflare Zone (${zoneDomain || "unknown"}).`
          },
          403
        );
      }
      const normalizedPageUrl = parsedUrl.toString();
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(
          zoneId
        )}/speed_api/pages/${encodeURIComponent(normalizedPageUrl)}/tests`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          signal: AbortSignal.timeout(12e3)
        }
      );
      const cfJson = await cfRes.json().catch(() => ({}));
      if (!cfRes.ok || cfJson.success === false) {
        if (cfRes.status === 404) {
          return jsonResponse(request, {
            configured: true,
            url: normalizedPageUrl,
            tests: [],
            message: "No Cloudflare Observatory test history found for this URL yet."
          });
        }
        return jsonResponse(
          request,
          {
            code: "OBSERVATORY_API_ERROR",
            error: cfJson.errors?.[0]?.message || `Cloudflare Observatory API returned HTTP ${cfRes.status}.`
          },
          cfRes.status === 401 || cfRes.status === 403 ? cfRes.status : 502
        );
      }
      const rawTests = Array.isArray(cfJson.result) ? cfJson.result.slice(0, 10) : [];
      const tests = rawTests.map((t) => ({
        id: String(t.id || ""),
        url: String(t.url || normalizedPageUrl),
        createdAt: String(t.date || t.createdAt || ""),
        region: String(t.region?.label || t.region?.value || t.region || "Not available"),
        scheduleFrequency: String(t.scheduleFrequency || "On-demand"),
        desktopPerformanceScore: typeof t.desktopReport?.performanceScore === "number" ? t.desktopReport.performanceScore : null,
        mobilePerformanceScore: typeof t.mobileReport?.performanceScore === "number" ? t.mobileReport.performanceScore : null
      }));
      return jsonResponse(request, { configured: true, url: normalizedPageUrl, tests });
    } catch (err) {
      const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      return jsonResponse(
        request,
        {
          code: isTimeout ? "OBSERVATORY_TIMEOUT" : "OBSERVATORY_NETWORK_ERROR",
          error: isTimeout ? "Cloudflare Observatory request timed out after 12 seconds." : "Unable to reach Cloudflare Observatory API."
        },
        isTimeout ? 504 : 502
      );
    }
  }
  return jsonResponse(request, { code: "API_NOT_FOUND", error: "API endpoint not found." }, 404);
}

// cloudflare/src/styles.js
var WORKER_CSS = `
:root, [data-theme="charcoal-amber"] {
  color-scheme: dark;
  --bg-canvas: #0d0d10;
  --bg-surface: #141418;
  --bg-elevated: #1c1c22;
  --bg-input: #101014;
  --bg-hover: #23232b;
  --text-primary: #f4f4f5;
  --text-secondary: #b4b4be;
  --text-muted: #787885;
  --border-hairline: rgba(255, 255, 255, 0.1);
  --border-strong: rgba(245, 158, 11, 0.36);
  --accent-primary: #d97706;
  --accent-hover: #b45309;
  --accent-ink: #0b0b0d;
  --accent-secondary: #f59e0b;
  --ok: #22c55e;
  --warn: #f59e0b;
  --err: #ef4444;
}
[data-theme="light"] {
  color-scheme: light;
  --bg-canvas: #f5f5f4;
  --bg-surface: #ffffff;
  --bg-elevated: #ecebe8;
  --bg-input: #ffffff;
  --bg-hover: #e7e5e4;
  --text-primary: #18181b;
  --text-secondary: #3f3f46;
  --text-muted: #71717a;
  --border-hairline: rgba(24, 24, 27, 0.12);
  --border-strong: rgba(180, 83, 9, 0.34);
  --accent-primary: #b45309;
  --accent-hover: #92400e;
  --accent-ink: #ffffff;
  --accent-secondary: #b45309;
  --ok: #16a34a;
  --warn: #d97706;
  --err: #dc2626;
}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-variant-numeric: tabular-nums; }
.shell {
  min-height: 100dvh;
  display: flex;
  background-image:
    radial-gradient(circle at 18% 12%, rgba(217, 119, 6, 0.06), transparent 42%),
    linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: auto, 44px 44px, 44px 44px;
}
.sidebar {
  display: none;
  flex-direction: column;
  width: 264px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100dvh;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-hairline);
}
.sidebar.collapsed { width: 68px; }
@media (min-width: 1024px) { .sidebar { display: flex; } }
.drawer-backdrop {
  position: fixed; inset: 0; z-index: 50; display: none;
  background: rgba(0,0,0,0.75);
}
.drawer-backdrop.open { display: flex; }
.drawer-panel {
  width: 280px; max-width: 85vw; height: 100%;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-strong);
  display: flex; flex-direction: column;
}
.main-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar {
  position: sticky; top: 0; z-index: 30;
  height: 64px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-hairline);
  padding: 0 16px;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
}
@media (min-width: 768px) { .topbar { padding: 0 28px; } }
.top-nav { display: none; align-items: center; gap: 20px; font-size: 14px; }
@media (min-width: 768px) { .top-nav { display: flex; } }
.top-link {
  background: none; border: none; border-bottom: 2px solid transparent;
  color: var(--text-secondary); cursor: pointer; font-size: 14px;
  padding: 6px 0; white-space: nowrap;
}
.top-link:hover, .top-link.active { color: var(--text-primary); }
.top-link.active { border-bottom-color: var(--accent-secondary); font-weight: 600; }
.hamburger {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 44px; min-height: 44px; background: none; border: none;
  color: var(--text-primary); cursor: pointer; font-size: 20px; border-radius: 8px;
}
@media (min-width: 1024px) { .hamburger { display: none; } }
.brand-btn {
  display: inline-flex; align-items: center; gap: 10px; background: none;
  border: none; color: var(--text-primary); cursor: pointer; padding: 4px;
  font-weight: 700; font-size: 15px; white-space: nowrap;
}
.btn-amber {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--accent-primary); color: var(--accent-ink);
  border: none; border-radius: 8px; padding: 10px 16px; min-height: 44px;
  font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none;
}
.btn-amber:hover:not(:disabled) { background: var(--accent-hover); }
.btn-amber:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--bg-elevated); color: var(--text-primary);
  border: 1px solid var(--border-hairline); border-radius: 8px;
  padding: 10px 16px; min-height: 44px; font-size: 14px; font-weight: 500;
  cursor: pointer; text-decoration: none;
}
.btn-secondary:hover { border-color: var(--border-strong); }
.viewport {
  flex: 1; width: 100%; max-width: 1120px; margin: 0 auto;
  padding: 28px 16px 48px;
}
@media (min-width: 768px) { .viewport { padding: 36px 28px 56px; } }
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-hairline);
  border-radius: 12px;
  padding: 22px;
}
.card.accent-border { border-color: var(--border-strong); }
.subcard {
  background: var(--bg-elevated);
  border: 1px solid var(--border-hairline);
  border-radius: 8px;
  padding: 14px;
}
.grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 768px) { .grid-2 { grid-template-columns: repeat(2, 1fr); } }
.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 768px) { .metrics-grid { grid-template-columns: repeat(5, 1fr); } }
.nav-scroll { flex: 1; overflow-y: auto; padding: 14px 10px; }
.nav-group-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
  color: var(--text-muted); padding: 0 10px 6px; margin-top: 12px;
}
.nav-btn {
  width: 100%; display: flex; align-items: center; gap: 10px;
  min-height: 44px; padding: 8px 12px; border-radius: 8px;
  background: transparent; border: 1px solid transparent;
  color: var(--text-secondary); font-size: 14px; text-align: left;
  cursor: pointer; text-decoration: none;
}
.nav-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.nav-btn.active {
  background: var(--bg-elevated); color: var(--text-primary);
  border-color: var(--border-strong); font-weight: 600;
}
.field {
  width: 100%; min-height: 44px; padding: 10px 14px;
  background: var(--bg-input); color: var(--text-primary);
  border: 1px solid var(--border-hairline); border-radius: 8px;
  font-size: 14px;
}
.field:focus { outline: none; border-color: var(--accent-secondary); }
.footer {
  background: var(--bg-surface);
  border-top: 1px solid var(--border-hairline);
  padding: 24px 16px;
}
.footer-inner {
  max-width: 1120px; margin: 0 auto;
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 16px; font-size: 12px; color: var(--text-muted);
}
.progress-track { width: 100%; max-width: 440px; height: 8px; border-radius: 999px; background: var(--bg-elevated); overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent-primary); transition: width 180ms ease; }
.err-box { background: var(--bg-surface); border: 1px solid rgba(239,68,68,0.45); border-radius: 12px; padding: 18px; color: #fca5a5; }
.eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-secondary); }
h1 { font-size: clamp(24px, 4vw, 38px); line-height: 1.15; margin: 8px 0 10px; }
h2 { font-size: 18px; margin: 0 0 10px; }
p { margin: 0; }
.muted { color: var(--text-secondary); }
.small-muted { color: var(--text-muted); font-size: 12px; }
.badge-ok { color: var(--ok); font-size: 12px; font-weight: 600; }
.badge-warn { color: var(--warn); font-size: 12px; font-weight: 600; }
`;

// cloudflare/src/clientScript.js
var WORKER_CLIENT_SCRIPT = `
import SpeedTest from '/vendor/speedtest.js';

const CFG = window.__COP_DATA__;
const validSet = new Set(CFG.validPaths);
let activeRunner = null;
let speedState = {
  running: false,
  finished: false,
  stage: 'Ready to measure',
  progress: 0,
  error: null,
  metrics: {
    downloadMbps: null, uploadMbps: null, unloadedLatencyMs: null, unloadedJitterMs: null,
    downLoadedLatencyMs: null, downLoadedJitterMs: null, upLoadedLatencyMs: null, upLoadedJitterMs: null,
    packetLossPercent: null, packetLossSupported: false, totalDurationMs: null,
  },
};

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getRoute(pathname) {
  const cleaned = (pathname || '/').replace(/\\/+$/, '') || '/';
  return validSet.has(cleaned) ? cleaned : '/not-found';
}

function validateAllowlist(url, expectedDomain) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return { valid: false, reason: 'HTTPS required.' };
    const matched = CFG.providers.find((p) => p.url === url);
    if (!matched || !matched.enabled) return { valid: false, reason: 'Not in allowlist.' };
    if (u.hostname !== matched.domain || u.hostname !== expectedDomain) {
      return { valid: false, reason: 'Hostname mismatch.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL.' };
  }
}

function cancelSpeedTest() {
  if (activeRunner) {
    try { activeRunner.pause(); } catch {}
    activeRunner = null;
  }
  speedState.running = false;
}

window.copNavigate = function copNavigate(path) {
  const target = path === '/not-found' ? '/not-found' : getRoute(path);
  if (location.pathname !== target) history.pushState({}, '', target);
  closeDrawer();
  renderCurrentRoute();
  window.scrollTo(0, 0);
};

window.copToggleTheme = function copToggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'charcoal-amber';
  const next = cur === 'charcoal-amber' ? 'light' : 'charcoal-amber';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('cop_theme', next); } catch {}
  updateThemeLabels();
};

function updateThemeLabels() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  document.querySelectorAll('[data-theme-label]').forEach((el) => {
    el.textContent = isLight ? 'Clean Light' : 'Charcoal Amber';
  });
}

window.openDrawer = function openDrawer() {
  document.getElementById('mobile-drawer')?.classList.add('open');
};
window.closeDrawer = function closeDrawer() {
  document.getElementById('mobile-drawer')?.classList.remove('open');
};

function updateActiveNav(route) {
  document.querySelectorAll('[data-route]').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-route') === route);
  });
  const meta = CFG.routeMeta[route] || CFG.routeMeta['/not-found'];
  document.title = meta.title;
}

function fmtMetric(val, unit) {
  return val === null || val === undefined || !Number.isFinite(val) ? '\u2014' : val + ' ' + unit;
}

function renderSpeedView() {
  const m = speedState.metrics;
  const primary = m.downloadMbps !== null ? m.downloadMbps : (m.uploadMbps !== null ? m.uploadMbps : 0);
  const el = document.getElementById('route-root');
  if (!el) return;
  el.innerHTML = \`
    <div style="display:flex;flex-direction:column;gap:24px;">
      <div>
        <div class="eyebrow mono">Service 2 \xB7 @cloudflare/speedtest</div>
        <h1>Cloudflare Public Speed Test</h1>
        <p class="muted">Real browser connection measurements against Cloudflare edge endpoints. Zero API token needed; no values are simulated.</p>
      </div>
      <div class="card">
        <p class="small-muted" style="font-size:13px;">Tests your visitor connection to Cloudflare. For hosted page history reports, open the separate <strong style="color:var(--text-primary)">Website Speed Analyzer</strong>.</p>
      </div>
      \${speedState.error ? \`<div class="err-box"><strong>Speed Test Error:</strong> \${esc(speedState.error)}</div>\` : ''}
      <div class="card" style="display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center;">
        <div class="mono" style="font-size:44px;font-weight:700;color:var(--text-primary);">\${primary.toFixed(2)} <span style="font-size:16px;color:var(--accent-secondary);">Mbps</span></div>
        <div class="small-muted mono">Unloaded Latency: \${fmtMetric(m.unloadedLatencyMs, 'ms')}</div>
        <div class="progress-track"><div class="progress-fill" style="width:\${speedState.progress}%"></div></div>
        <div class="small-muted mono">\${esc(speedState.stage)} \xB7 \${speedState.progress}%</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          \${!speedState.running
            ? \`<button id="speed-start-btn" type="button" class="btn-amber">\${speedState.finished ? 'Retest Connection' : 'Start Speed Test'}</button>\`
            : \`<button id="speed-cancel-btn" type="button" class="btn-secondary" style="border-color:rgba(239,68,68,0.5);color:#fca5a5;">Cancel Test</button>\`}
        </div>
      </div>
      <div class="metrics-grid">
        <div class="card"><div class="small-muted">DOWNLOAD</div><div class="mono" style="font-size:18px;font-weight:700;margin-top:4px;">\${fmtMetric(m.downloadMbps, 'Mbps')}</div></div>
        <div class="card"><div class="small-muted">UPLOAD</div><div class="mono" style="font-size:18px;font-weight:700;margin-top:4px;">\${fmtMetric(m.uploadMbps, 'Mbps')}</div></div>
        <div class="card"><div class="small-muted">UNLOADED LATENCY</div><div class="mono" style="font-size:18px;font-weight:700;margin-top:4px;">\${fmtMetric(m.unloadedLatencyMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">UNLOADED JITTER</div><div class="mono" style="font-size:18px;font-weight:700;margin-top:4px;">\${fmtMetric(m.unloadedJitterMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">DURATION</div><div class="mono" style="font-size:18px;font-weight:700;margin-top:4px;">\${m.totalDurationMs !== null ? (m.totalDurationMs / 1000).toFixed(1) + ' s' : '\u2014'}</div></div>
        <div class="card"><div class="small-muted">DL LATENCY</div><div class="mono" style="font-size:16px;font-weight:700;margin-top:4px;">\${fmtMetric(m.downLoadedLatencyMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">DL JITTER</div><div class="mono" style="font-size:16px;font-weight:700;margin-top:4px;">\${fmtMetric(m.downLoadedJitterMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">UL LATENCY</div><div class="mono" style="font-size:16px;font-weight:700;margin-top:4px;">\${fmtMetric(m.upLoadedLatencyMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">UL JITTER</div><div class="mono" style="font-size:16px;font-weight:700;margin-top:4px;">\${fmtMetric(m.upLoadedJitterMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">PACKET LOSS</div><div class="mono" style="font-size:14px;font-weight:700;margin-top:4px;">\${m.packetLossSupported && m.packetLossPercent !== null ? m.packetLossPercent + '%' : (speedState.finished ? 'N/A (No TURN)' : '\u2014')}</div></div>
      </div>
    </div>\`;
  document.getElementById('speed-start-btn')?.addEventListener('click', startCloudflareSpeedTest);
  document.getElementById('speed-cancel-btn')?.addEventListener('click', () => {
    cancelSpeedTest();
    speedState.stage = 'Cancelled by user';
    renderSpeedView();
  });
}

function extractSpeedMetrics(results) {
  const s = results.getSummary();
  const toMbps = (v) => typeof v === 'number' && Number.isFinite(v) ? Number((v / 1e6).toFixed(2)) : null;
  const toMs = (v) => typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(1)) : null;
  const hasPL = typeof s.packetLoss === 'number' && Number.isFinite(s.packetLoss);
  return {
    downloadMbps: toMbps(s.download), uploadMbps: toMbps(s.upload),
    unloadedLatencyMs: toMs(s.latency), unloadedJitterMs: toMs(s.jitter),
    downLoadedLatencyMs: toMs(s.downLoadedLatency), downLoadedJitterMs: toMs(s.downLoadedJitter),
    upLoadedLatencyMs: toMs(s.upLoadedLatency), upLoadedJitterMs: toMs(s.upLoadedJitter),
    packetLossPercent: hasPL ? Number((s.packetLoss * 100).toFixed(2)) : null,
    packetLossSupported: hasPL, totalDurationMs: toMs(s.totalDurationMs),
  };
}

function startCloudflareSpeedTest() {
  cancelSpeedTest();
  if (navigator.onLine === false) {
    speedState.error = 'Your device appears offline. Reconnect to run a real speed test.';
    renderSpeedView();
    return;
  }
  speedState = {
    running: true, finished: false, stage: 'Connecting to Cloudflare Edge...', progress: 4, error: null,
    metrics: { downloadMbps: null, uploadMbps: null, unloadedLatencyMs: null, unloadedJitterMs: null, downLoadedLatencyMs: null, downLoadedJitterMs: null, upLoadedLatencyMs: null, upLoadedJitterMs: null, packetLossPercent: null, packetLossSupported: false, totalDurationMs: null },
  };
  renderSpeedView();
  const engine = new SpeedTest({ autoStart: false, measureDownloadLoadedLatency: true, measureUploadLoadedLatency: true, logAimApiUrl: null });
  let phase = 0;
  engine.onRunningChange = (r) => { speedState.running = r; if (getRoute(location.pathname) === '/speed-test') renderSpeedView(); };
  engine.onPhaseChange = ({ measurement }) => {
    phase += 1;
    speedState.progress = Math.min(95, Math.max(5, Math.round((phase / 14) * 92)));
    speedState.stage = measurement.type === 'latency' ? 'Measuring Latency & Jitter' : measurement.type === 'download' ? 'Measuring Download Throughput' : measurement.type === 'upload' ? 'Measuring Upload Throughput' : 'Running Phase';
    if (getRoute(location.pathname) === '/speed-test') renderSpeedView();
  };
  engine.onResultsChange = () => { speedState.metrics = extractSpeedMetrics(engine.results); if (getRoute(location.pathname) === '/speed-test') renderSpeedView(); };
  engine.onError = (msg) => { speedState.error = msg || 'Cloudflare speed test failed.'; speedState.running = false; if (getRoute(location.pathname) === '/speed-test') renderSpeedView(); };
  engine.onFinish = (res) => { speedState.metrics = extractSpeedMetrics(res); speedState.running = false; speedState.finished = true; speedState.progress = 100; speedState.stage = 'Complete'; if (getRoute(location.pathname) === '/speed-test') renderSpeedView(); };
  activeRunner = engine;
  engine.play();
}

function renderCurrentRoute() {
  const route = getRoute(location.pathname);
  if (route !== '/speed-test') cancelSpeedTest();
  updateActiveNav(route);
  const el = document.getElementById('route-root');
  if (!el) return;

  if (route === '/') {
    el.innerHTML = \`
      <div style="display:flex;flex-direction:column;gap:28px;">
        <section class="card">
          <div class="eyebrow mono">CrazyOpenPlace@domain \xB7 Open Utility Hub</div>
          <h1>Guild Glory Shop &amp; Live Web Diagnostics. No Login Required.</h1>
          <p class="muted" style="max-width:660px;margin-bottom:18px;">Browse external Guild Glory provider links, run a real Cloudflare browser speed test, check Free Fire UID profiles via GameSkinbo, or view Cloudflare Observatory site speed reports.</p>
          <div style="display:flex;flex-wrap:wrap;gap:12px;">
            <button type="button" class="btn-amber" onclick="copNavigate('/guild-glory')">Open Guild Glory Shop &rarr;</button>
            <button type="button" class="btn-secondary" onclick="copNavigate('/free-services')">View Free Services</button>
          </div>
        </section>
        <section class="grid-2">
          <div class="card accent-border"><h2>Guild Glory Shop</h2><p class="muted" style="margin-bottom:14px;">External BDT provider links. Checkout and delivery happen directly on the provider website.</p><button type="button" class="btn-amber" onclick="copNavigate('/guild-glory')">Browse Providers</button></div>
          <div class="card"><h2>Free Fire UID Checker</h2><p class="muted" style="margin-bottom:14px;">Public GameSkinbo player profile lookup using numeric UID only. Never share passwords.</p><button type="button" class="btn-secondary" onclick="copNavigate('/uid-checker')">Open UID Checker</button></div>
          <div class="card"><h2>Cloudflare Speed Test</h2><p class="muted" style="margin-bottom:14px;">Real browser download, upload, latency, and jitter against Cloudflare endpoints.</p><button type="button" class="btn-secondary" onclick="copNavigate('/speed-test')">Run Speed Test</button></div>
          <div class="card"><h2>Website Speed Analyzer</h2><p class="muted" style="margin-bottom:14px;">Read historical Cloudflare Observatory desktop &amp; mobile page speed tests.</p><button type="button" class="btn-secondary" onclick="copNavigate('/website-speed')">Open Analyzer</button></div>
        </section>
      </div>\`;
    return;
  }

  if (route === '/free-services') {
    el.innerHTML = \`<div style="display:flex;flex-direction:column;gap:20px;"><div><div class="eyebrow mono">Free Utilities Directory</div><h1>Free Services on CrazyOpenPlace</h1><p class="muted">Zero signup required. Live server configuration status loads below.</p></div><div id="cfg-status-box" class="card">Loading configuration status...</div></div>\`;
    fetch('/api/config-status').then((r) => r.json()).then((s) => {
      const box = document.getElementById('cfg-status-box');
      if (!box) return;
      box.innerHTML = \`
        <div class="grid-2">
          <div class="card"><h2>Cloudflare Speed Test</h2><p class="badge-ok">Ready (No Secret Required)</p><p class="muted" style="margin:8px 0 14px;">Browser measurements via @cloudflare/speedtest.</p><button type="button" class="btn-amber" onclick="copNavigate('/speed-test')">Open Speed Test</button></div>
          <div class="card"><h2>Free Fire UID Checker</h2><p class="\${s.gameskinboConfigured ? 'badge-ok' : 'badge-warn'}">\${s.gameskinboConfigured ? 'GAMESKINBO_API_KEY Configured' : 'GAMESKINBO_API_KEY Not Configured'}</p><p class="muted" style="margin:8px 0 14px;">Rate limit: \${s.rateLimits?.uidPerMinute || 5} req/min.</p><button type="button" class="btn-secondary" onclick="copNavigate('/uid-checker')">Open UID Checker</button></div>
          <div class="card"><h2>Website Speed Analyzer</h2><p class="\${s.observatoryConfigured ? 'badge-ok' : 'badge-warn'}">\${s.observatoryConfigured ? 'Observatory Configured' : 'Observatory Secrets Not Configured'}</p><p class="muted" style="margin:8px 0 14px;">Rate limit: \${s.rateLimits?.observatoryPerMinute || 10} req/min.</p><button type="button" class="btn-secondary" onclick="copNavigate('/website-speed')">Open Analyzer</button></div>
          <div class="card"><h2>Guild Glory Shop</h2><p class="badge-ok">5 Allowlisted Provider Links</p><p class="muted" style="margin:8px 0 14px;">Direct external product links in BDT.</p><button type="button" class="btn-secondary" onclick="copNavigate('/guild-glory')">Open Guild Glory</button></div>
        </div>\`;
    }).catch(() => {
      const box = document.getElementById('cfg-status-box');
      if (box) box.innerHTML = '<div class="err-box">Could not fetch /api/config-status.</div>';
    });
    return;
  }

  if (route === '/uid-checker') {
    el.innerHTML = \`
      <div style="display:flex;flex-direction:column;gap:20px;">
        <div><div class="eyebrow mono">Service 1 \xB7 GameSkinbo Proxy</div><h1>Free Fire UID Checker</h1><p class="muted">Live lookup via server-side GameSkinbo proxy. Not endorsed by Garena.</p></div>
        <div class="card accent-border"><p class="muted"><strong style="color:var(--text-primary)">Privacy Warning:</strong> Enter numeric UID only (5\u201320 digits). Never enter password, OTP, or login credentials.</p></div>
        <form id="uid-form" class="card" style="display:flex;flex-direction:column;gap:14px;">
          <div class="grid-2">
            <div><label class="small-muted mono" for="uid-in">FREE FIRE UID</label><input id="uid-in" class="field mono" inputmode="numeric" maxlength="20" placeholder="e.g. 1234567890" required /></div>
            <div><label class="small-muted mono" for="reg-in">REGION</label><select id="reg-in" class="field"><option value="AUTO">AUTO</option><option value="BD">BD</option><option value="IND">IND</option><option value="BR">BR</option><option value="US">US</option><option value="SAC">SAC</option><option value="NA">NA</option><option value="TH">TH</option><option value="ID">ID</option><option value="SG">SG</option><option value="PK">PK</option></select></div>
          </div>
          <div><button id="uid-btn" type="submit" class="btn-amber">Check UID</button></div>
        </form>
        <div id="uid-out"></div>
      </div>\`;
    document.getElementById('uid-form')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const uid = (document.getElementById('uid-in')?.value || '').replace(/\\D+/g, '');
      const reg = document.getElementById('reg-in')?.value || 'AUTO';
      const out = document.getElementById('uid-out');
      const btn = document.getElementById('uid-btn');
      if (!/^\\d{5,20}$/.test(uid)) { if (out) out.innerHTML = '<div class="err-box">UID must be 5 to 20 digits.</div>'; return; }
      if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }
      try {
        const res = await fetch('/api/uid-check?' + new URLSearchParams({ uid, region: reg }));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (out) out.innerHTML = \`<div class="err-box"><strong>\${data.configured === false ? 'API Key Not Configured' : 'Lookup Error'}:</strong> \${esc(data.error || ('HTTP ' + res.status))}</div>\`;
          return;
        }
        const p = data.profile;
        const val = (x) => (x === null || x === undefined || x === '' ? 'Not available' : esc(x));
        if (out) {
          out.innerHTML = \`
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div class="card accent-border" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;">
              <div>
                <div class="eyebrow mono">\${val(p.providerLabel)} \xB7 Not Garena Official</div>
                <h2 style="margin-top:4px;">\${val(p.accountInfo.nickname)}</h2>
                <div class="small-muted mono">UID: \${val(p.uid)} \xB7 Fetched: \${val(p.fetchedAt)}</div>
              </div>
              <button id="copy-uid-btn" type="button" class="btn-secondary">Copy UID</button>
            </div>
            <div class="grid-2">
              <div class="card"><h2>Account Info</h2><div class="small-muted">Level: \${val(p.accountInfo.level)} \xB7 Region: \${val(p.accountInfo.region)} \xB7 Likes: \${val(p.accountInfo.likes)} \xB7 EXP: \${val(p.accountInfo.exp)}<br/>Season: \${val(p.accountInfo.seasonId)} \xB7 BR: \${val(p.accountInfo.brRank)} (\${val(p.accountInfo.brRankPoints)}) \xB7 CS: \${val(p.accountInfo.csRank)} (\${val(p.accountInfo.csRankPoints)})<br/>Created: \${val(p.accountInfo.createdAt)} \xB7 Last Login: \${val(p.accountInfo.lastLoginAt)}</div></div>
              <div class="card"><h2>Profile, Social &amp; Credit</h2><div class="small-muted">Avatar: \${val(p.profileDetails.avatarId)} \xB7 Banner: \${val(p.profileDetails.bannerId)} \xB7 Badge: \${val(p.profileDetails.badgeId)} \xB7 Prime: \${val(p.profileDetails.primeLevel)}<br/>Language: \${val(p.socialProfile.language)} \xB7 Credit Score: \${val(p.creditScoreDetails.creditScore)} (\${val(p.creditScoreDetails.summaryStatus)})<br/>Signature: \${val(p.socialProfile.signature)}</div></div>
              <div class="card" style="grid-column:1/-1;"><h2>Guild Info</h2><div class="small-muted">\${p.guildInfo ? 'Name: ' + val(p.guildInfo.name) + ' \xB7 ID: ' + val(p.guildInfo.id) + ' \xB7 Level: ' + val(p.guildInfo.level) + ' \xB7 Members: ' + val(p.guildInfo.members) + '/' + val(p.guildInfo.capacity) + ' \xB7 Leader: ' + val(p.guildInfo.leaderName) : 'Not available'}</div></div>
            </div>
          </div>\`;
          document.getElementById('copy-uid-btn')?.addEventListener('click', () => {
            navigator.clipboard?.writeText(String(p.uid || '')).then(() => {
              const b = document.getElementById('copy-uid-btn');
              if (b) b.textContent = 'Copied!';
            }).catch(() => {});
          });
        }
      } catch {
        if (out) out.innerHTML = '<div class="err-box">Network error contacting /api/uid-check.</div>';
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Check UID'; }
      }
    });
    return;
  }

  if (route === '/speed-test') {
    renderSpeedView();
    return;
  }

  if (route === '/website-speed') {
    el.innerHTML = \`
      <div style="display:flex;flex-direction:column;gap:20px;">
        <div><div class="eyebrow mono">Service 3 \xB7 Cloudflare Observatory API</div><h1>Website Speed Analyzer</h1><p class="muted">Reads historical Cloudflare Observatory desktop &amp; mobile speed scores for your configured Zone (SSRF protected).</p></div>
        <form id="obs-form" class="card" style="display:flex;flex-direction:column;gap:14px;">
          <div><label class="small-muted mono" for="obs-url">PAGE URL (MUST MATCH CONFIGURED ZONE)</label><input id="obs-url" type="url" class="field mono" placeholder="https://example.com/" required /></div>
          <div><button id="obs-btn" type="submit" class="btn-amber">Fetch Test History</button></div>
        </form>
        <div id="obs-out"></div>
      </div>\`;
    document.getElementById('obs-form')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const target = document.getElementById('obs-url')?.value?.trim() || '';
      const out = document.getElementById('obs-out');
      const btn = document.getElementById('obs-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }
      try {
        const res = await fetch('/api/website-speed/tests?' + new URLSearchParams({ url: target }));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (out) out.innerHTML = \`<div class="err-box"><strong>\${data.configured === false ? 'Observatory Not Configured' : 'Observatory Error'}:</strong> \${esc(data.error || ('HTTP ' + res.status))}</div>\`;
          return;
        }
        const tests = Array.isArray(data.tests) ? data.tests : [];
        if (tests.length === 0) {
          if (out) out.innerHTML = \`<div class="card muted">\${esc(data.message || 'No Observatory tests found for this URL.')}</div>\`;
          return;
        }
        const fmtScore = (s) => (typeof s === 'number' && Number.isFinite(s) ? (Number.isInteger(s) ? s : Number(s.toFixed(2))) : 'N/A');
        if (out) out.innerHTML = tests.map((t) => \`<div class="card" style="margin-bottom:12px;"><div class="small-muted mono">\${esc(t.createdAt)} \xB7 \${esc(t.region)} \xB7 \${esc(t.scheduleFrequency)}</div><div style="font-weight:600;word-break:break-all;margin:4px 0;">\${esc(t.url)}</div><div class="mono">Desktop: \${fmtScore(t.desktopPerformanceScore)} \xB7 Mobile: \${fmtScore(t.mobilePerformanceScore)}</div></div>\`).join('');
      } catch {
        if (out) out.innerHTML = '<div class="err-box">Network error contacting /api/website-speed/tests.</div>';
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Fetch Test History'; }
      }
    });
    return;
  }

  if (route === '/guild-glory') {
    const cards = CFG.providers.map((p) => {
      const check = validateAllowlist(p.url, p.domain);
      const destLabel = p.destinationType === 'service_website' ? 'External Site' : 'Product Link';
      return \`<div class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px;">
        <div>
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><h2>\${esc(p.name)}</h2><span class="eyebrow mono">\${destLabel} \xB7 \${esc(p.currency)}</span></div>
          <div class="subcard mono" style="font-size:12px;word-break:break-all;margin:8px 0;">\${esc(p.url)}</div>
          <p class="muted" style="font-size:13px;margin-bottom:6px;"><strong style="color:var(--text-primary)">Packages:</strong> \${esc(p.packagesSummary)}</p>
          <p class="muted" style="font-size:13px;margin-bottom:6px;"><strong style="color:var(--text-primary)">Payment Methods:</strong> \${esc(p.paymentMethodsLabel)}</p>
          <p class="small-muted">\${esc(p.checkoutNote)} (Checked: \${esc(p.lastCheckedDate)})</p>
        </div>
        \${check.valid ? \`<a class="btn-amber" href="\${esc(p.url)}" target="_blank" rel="noopener noreferrer">\${esc(p.ctaLabel)} &nearr;</a>\` : \`<div class="err-box">Link disabled: \${esc(check.reason)}</div>\`}
      </div>\`;
    }).join('');
    el.innerHTML = \`
      <div style="display:flex;flex-direction:column;gap:20px;">
        <div><div class="eyebrow mono">Service 4 \xB7 External Provider Directory (BDT)</div><h1>Guild Glory Shop</h1><p class="muted">External Guild Glory links only. CrazyOpenPlace does not collect payments or track orders.</p></div>
        <div class="card accent-border"><p>\${esc(CFG.externalNotice)}</p><p class="small-muted" style="margin-top:8px;">When done, visit <button type="button" style="background:none;border:none;color:var(--accent-secondary);text-decoration:underline;cursor:pointer;padding:0;" onclick="copNavigate('/thank-you')">External Return Notice</button>.</p></div>
        <div class="grid-2">\${cards}</div>
      </div>\`;
    return;
  }

  if (route === '/thank-you') {
    el.innerHTML = \`<div class="card accent-border" style="max-width:680px;display:flex;flex-direction:column;gap:16px;"><div class="eyebrow mono">External Provider Return Notice</div><h1>Thank You for Visiting CrazyOpenPlace</h1><p>\${esc(CFG.thankYouNotice)}</p><div style="display:flex;flex-wrap:wrap;gap:12px;"><button type="button" class="btn-amber" onclick="copNavigate('/guild-glory')">Back to Guild Glory Shop</button><button type="button" class="btn-secondary" onclick="copNavigate('/')">Return Home</button></div></div>\`;
    return;
  }

  if (route === '/about') {
    el.innerHTML = \`<div class="card" style="max-width:740px;display:flex;flex-direction:column;gap:14px;"><div class="eyebrow mono">About CrazyOpenPlace@domain</div><h1>What CrazyOpenPlace Provides</h1><p class="muted">CrazyOpenPlace brings together a Free Fire UID Checker (via GameSkinbo), Cloudflare Public Speed Test, Cloudflare Observatory Website Speed Analyzer, and curated external Guild Glory shop links \u2014 without requiring user login.</p><p class="small-muted">CrazyOpenPlace is independent and not endorsed by Garena, GameSkinbo, FFGlory, or KakuTopup.</p></div>\`;
    return;
  }

  if (route === '/safety') {
    el.innerHTML = \`<div class="card accent-border" style="max-width:740px;display:flex;flex-direction:column;gap:12px;"><div class="eyebrow mono">Safety &amp; Disclaimers</div><h1>Safety Rules &amp; Privacy Notice</h1><p class="muted">\u2022 Never enter Free Fire passwords, OTPs, or logins. UID Checker uses UID only and has no official Garena endorsement.</p><p class="muted">\u2022 All API secrets stay strictly server-side in Cloudflare Worker secrets.</p><p class="muted">\u2022 Guild Glory payments happen directly on external provider sites; always verify URL, price, fees, and save your receipt.</p><p class="muted">\u2022 Returning to CrazyOpenPlace never confirms payment or fulfilment.</p></div>\`;
    return;
  }

  if (route === '/contact') {
    el.innerHTML = \`<div class="card accent-border" style="max-width:640px;display:flex;flex-direction:column;gap:16px;"><div class="eyebrow mono">Contact CrazyOpenPlace</div><h1>Direct Contact</h1><p class="muted">Message CrazyOpenPlace directly on our official Facebook page:</p><div class="subcard mono" style="font-size:13px;word-break:break-all;">\${esc(CFG.facebookUrl)}</div><div style="display:flex;flex-wrap:wrap;gap:12px;"><a class="btn-amber" href="\${esc(CFG.facebookUrl)}" target="_blank" rel="noopener noreferrer">Open Facebook Contact &nearr;</a><button id="copy-fb-btn" type="button" class="btn-secondary">Copy Link</button></div></div>\`;
    document.getElementById('copy-fb-btn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(CFG.facebookUrl).then(() => {
        const b = document.getElementById('copy-fb-btn');
        if (b) b.textContent = 'Copied!';
      }).catch(() => {});
    });
    return;
  }

  el.innerHTML = \`<div class="card" style="max-width:560px;text-align:center;margin:20px auto;display:flex;flex-direction:column;gap:14px;align-items:center;"><div class="eyebrow mono">404 \xB7 Not Found</div><h1>Route Does Not Exist</h1><p class="muted">Check the address or return home.</p><button type="button" class="btn-amber" onclick="copNavigate('/')">Go Home</button></div>\`;
}

window.addEventListener('popstate', renderCurrentRoute);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
try {
  const saved = localStorage.getItem('cop_theme');
  if (saved === 'light' || saved === 'charcoal-amber') document.documentElement.setAttribute('data-theme', saved);
} catch {}
updateThemeLabels();
renderCurrentRoute();
`;

// cloudflare/src/htmlShell.js
var ROUTE_META = {
  "/": {
    title: "CrazyOpenPlace \u2014 Guild Glory Shop & Live Web Diagnostics",
    description: "CrazyOpenPlace@domain: external Guild Glory provider shop, Free Fire UID Checker, Cloudflare public Speed Test, and Observatory Website Speed Analyzer."
  },
  "/free-services": {
    title: "Free Services \u2014 CrazyOpenPlace",
    description: "Browse free online utilities and live API readiness on CrazyOpenPlace."
  },
  "/uid-checker": {
    title: "Free Fire UID Checker \u2014 CrazyOpenPlace",
    description: "Check public Free Fire player stats by UID using GameSkinbo API proxy."
  },
  "/speed-test": {
    title: "Cloudflare Speed Test \u2014 CrazyOpenPlace",
    description: "Measure download, upload, latency, loaded latency, and jitter via Cloudflare."
  },
  "/website-speed": {
    title: "Website Speed Analyzer \u2014 CrazyOpenPlace",
    description: "Read Cloudflare Observatory historical performance reports for your Zone."
  },
  "/guild-glory": {
    title: "Guild Glory Shop \u2014 CrazyOpenPlace",
    description: "Compare curated external Guild Glory provider checkout links in BDT."
  },
  "/thank-you": {
    title: "External Return Notice \u2014 CrazyOpenPlace",
    description: "External Guild Glory provider notice and receipt reminder."
  },
  "/about": {
    title: "About \u2014 CrazyOpenPlace",
    description: "What CrazyOpenPlace provides and third-party independence information."
  },
  "/safety": {
    title: "Safety & Disclaimers \u2014 CrazyOpenPlace",
    description: "Account safety, external provider rules, and privacy notices."
  },
  "/contact": {
    title: "Contact \u2014 CrazyOpenPlace",
    description: "Official Facebook contact link for CrazyOpenPlace."
  },
  "/not-found": {
    title: "404 Not Found \u2014 CrazyOpenPlace",
    description: "Requested route was not found on CrazyOpenPlace."
  }
};
var VALID_PATHS = Object.keys(ROUTE_META).filter((p) => p !== "/not-found");
function renderSidebarHtml(isDrawer) {
  const navItems = [
    { group: "CORE", items: [
      { label: "Home", path: "/" },
      { label: "Free Services", path: "/free-services" },
      { label: "Guild Glory Shop", path: "/guild-glory" }
    ] },
    { group: "UTILITIES", items: [
      { label: "Free Fire UID Checker", path: "/uid-checker" },
      { label: "Cloudflare Speed Test", path: "/speed-test" },
      { label: "Website Speed Analyzer", path: "/website-speed" }
    ] },
    { group: "TRUST & INFO", items: [
      { label: "About", path: "/about" },
      { label: "Safety & Disclaimers", path: "/safety" },
      { label: "Thank You Notice", path: "/thank-you" },
      { label: "Contact Us", path: "/contact" }
    ] }
  ];
  const groupsHtml = navItems.map(
    (g) => `
      <div class="nav-group-label">${g.group}</div>
      ${g.items.map(
      (i) => `<button type="button" class="nav-btn" data-route="${i.path}" onclick="copNavigate('${i.path}')">${i.label}</button>`
    ).join("")}
    `
  ).join("");
  return `
    <div style="height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--border-hairline);">
      <button type="button" class="brand-btn" onclick="copNavigate('/')">
        <svg width="24" height="24" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="42" height="42" rx="9" fill="#141418" stroke="#f59e0b" stroke-width="2.4"/>
          <path d="M18 15L11 24L18 33" stroke="#f4f4f5" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M30 15L37 24L30 33" stroke="#f4f4f5" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="24" cy="24" r="3.6" fill="#d97706"/>
        </svg>
        <span>CrazyOpenPlace</span>
      </button>
      ${isDrawer ? '<button type="button" class="hamburger" style="display:inline-flex" onclick="closeDrawer()" aria-label="Close menu">&times;</button>' : ""}
    </div>
    <nav class="nav-scroll" aria-label="Sidebar navigation">
      ${groupsHtml}
      <div class="nav-group-label">EXTERNAL</div>
      <a class="nav-btn" href="${CONTACT_FACEBOOK_URL}" target="_blank" rel="noopener noreferrer">Facebook Page &nearr;</a>
    </nav>
    <div style="padding:12px;border-top:1px solid var(--border-hairline);">
      <button type="button" class="nav-btn" onclick="copToggleTheme()" data-theme-label>Charcoal Amber</button>
    </div>
  `;
}
function renderAppHtml(pathname) {
  const cleaned = (pathname || "/").replace(/\/+$/, "") || "/";
  const isKnown = VALID_PATHS.includes(cleaned);
  const routeKey = isKnown ? cleaned : "/not-found";
  const meta = ROUTE_META[routeKey];
  const bootPayload = JSON.stringify({
    validPaths: VALID_PATHS,
    routeMeta: ROUTE_META,
    providers: GUILD_GLORY_PROVIDERS,
    facebookUrl: CONTACT_FACEBOOK_URL,
    externalNotice: EXTERNAL_PROVIDER_NOTICE,
    thankYouNotice: THANK_YOU_RETURN_NOTICE
  }).replace(/</g, "\\u003c");
  const html = `<!doctype html>
<html lang="en" data-theme="charcoal-amber">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}" />
  <meta name="theme-color" content="#0d0d10" />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' fill='none'%3E%3Crect x='3' y='3' width='42' height='42' rx='10' fill='%23141418' stroke='%23d97706' stroke-width='2.5'/%3E%3Ccircle cx='24' cy='24' r='4' fill='%23f59e0b'/%3E%3C/svg%3E" />
  <style>${WORKER_CSS}</style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">${renderSidebarHtml(false)}</aside>
    <div id="mobile-drawer" class="drawer-backdrop" onclick="if(event.target===this)closeDrawer()">
      <aside class="drawer-panel">${renderSidebarHtml(true)}</aside>
    </div>
    <div class="main-col">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:10px;">
          <button type="button" class="hamburger" onclick="openDrawer()" aria-label="Open menu">&#9776;</button>
          <button type="button" class="brand-btn" onclick="copNavigate('/')">CrazyOpenPlace</button>
        </div>
        <nav class="top-nav" aria-label="Primary navigation">
          <button type="button" class="top-link" data-route="/" onclick="copNavigate('/')">Home</button>
          <button type="button" class="top-link" data-route="/free-services" onclick="copNavigate('/free-services')">Free Services</button>
          <button type="button" class="top-link" data-route="/uid-checker" onclick="copNavigate('/uid-checker')">UID Checker</button>
          <button type="button" class="top-link" data-route="/speed-test" onclick="copNavigate('/speed-test')">Speed Test</button>
          <button type="button" class="top-link" data-route="/website-speed" onclick="copNavigate('/website-speed')">Website Speed</button>
        </nav>
        <button type="button" class="btn-amber" onclick="copNavigate('/guild-glory')">Guild Glory Shop</button>
      </header>
      <main id="route-root" class="viewport"></main>
      <footer class="footer">
        <div class="footer-inner">
          <div><strong style="color:var(--text-primary)">CrazyOpenPlace@domain</strong> \xB7 Free Utilities &amp; External Guild Glory Directory</div>
          <div style="display:flex;flex-wrap:wrap;gap:16px;">
            <button type="button" class="top-link" onclick="copNavigate('/about')">About</button>
            <button type="button" class="top-link" onclick="copNavigate('/safety')">Safety</button>
            <button type="button" class="top-link" onclick="copNavigate('/contact')">Contact</button>
            <a href="${CONTACT_FACEBOOK_URL}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-secondary);text-decoration:none;font-weight:600;">Facebook &nearr;</a>
          </div>
        </div>
      </footer>
    </div>
  </div>
  <script>window.__COP_DATA__ = ${bootPayload};<\/script>
  <script type="module">${WORKER_CLIENT_SCRIPT}<\/script>
</body>
</html>`;
  return { html, status: isKnown ? 200 : 404 };
}

// cloudflare/src/_entry.js
var SPEEDTEST_ESM_CODE = 'const C="https://speed.cloudflare.com",D={autoStart:!0,downloadApiUrl:`${C}/__down`,uploadApiUrl:`${C}/__up`,measurementTargets:[],measurementDownloadPath:"/__down",measurementUploadPath:"/__up",logMeasurementApiUrl:null,logAimApiUrl:`${C}/__results`,turnServerUri:null,turnServerCredsApiUrl:null,turnServerUser:null,turnServerPass:null,rpkiInvalidHost:"invalid.rpki.cloudflare.com",includeCredentials:!1,sessionId:void 0,authorizationToken:null,authorizationEnabled:void 0,allowInsecureAuthorizationToken:!1,measurements:[{type:"latency",numPackets:2},{type:"download",bytes:1e5,count:1,bypassMinDuration:!0},{type:"latency",numPackets:20},{type:"download",bytes:1e5,count:9},{type:"latency",numPackets:2},{type:"download",bytes:1e6,count:8},{type:"latency",numPackets:2},{type:"upload",bytes:1e5,count:8},{type:"latency",numPackets:2},{type:"upload",bytes:1e6,count:6},{type:"latency",numPackets:2},{type:"download",bytes:1e7,count:6},{type:"latency",numPackets:2},{type:"upload",bytes:1e7,count:4},{type:"latency",numPackets:2},{type:"download",bytes:25e6,count:4},{type:"latency",numPackets:2},{type:"upload",bytes:25e6,count:4},{type:"latency",numPackets:2},{type:"download",bytes:1e8,count:3},{type:"latency",numPackets:2},{type:"upload",bytes:5e7,count:3},{type:"latency",numPackets:2},{type:"download",bytes:25e7,count:2}],measureDownloadLoadedLatency:!0,measureUploadLoadedLatency:!0,loadedLatencyThrottle:400,bandwidthFinishRequestDuration:1e3,estimatedServerTime:0,abortRequestDuration:0,abortTestDuration:0,latencyPercentile:.5,bandwidthPercentile:.9,bandwidthMinRequestDuration:10,loadedRequestMinDuration:250,loadedLatencyMaxPoints:20},M=(t,e)=>s=>{let i=0;for(;i<t.length&&s>=t[i];)i++;return e[i]},Q={aimMeasurementScoring:{packetLoss:M([.01,.05,.25,.5],[10,5,0,-10,-20]),latency:M([10,20,50,100,500],[20,10,5,0,-10,-20]),loadedLatencyIncrease:M([10,20,50,100,500],[20,10,5,0,-10,-20]),jitter:M([10,20,100,500],[10,5,0,-10,-20]),download:M([1e6,1e7,5e7,1e8],[0,5,10,20,30]),upload:M([1e6,1e7,5e7,1e8],[0,5,10,20,30])},aimExperiencesDefs:{streaming:{input:["latency","packetLoss","download","loadedLatencyIncrease"],pointThresholds:[15,20,40,60]},gaming:{input:["latency","packetLoss","loadedLatencyIncrease"],pointThresholds:[5,15,25,30]},rtc:{input:["latency","jitter","packetLoss","loadedLatencyIncrease"],pointThresholds:[5,15,25,40]}}},K=t=>{try{return new URL(t).protocol==="https:"}catch{try{return new URL(t,window.location.origin).protocol==="https:"}catch{return!1}}},F=new WeakSet,tt=t=>{F.has(t)||(F.add(t),console.warn("Sending the authorization token to an endpoint that is not known to be secure, because allowInsecureAuthorizationToken is enabled. Do not enable this outside local development: the server treats a token seen over plaintext as compromised and revokes it."))},S=(t,e,s)=>{if(!e?.enabled||!s)return t;const i=e.token?.trim();if(!i)return t;if(!K(s)){if(!e.allowInsecure)return t;tt(e)}const n=new Headers(t.headers);return n.set("Authorization",`Bearer ${i}`),{...t,headers:Object.fromEntries(n)}},_=3;var U=class extends Error{status;retryAfter;constructor(t,e,s){super(e),this.status=t,this.retryAfter=s}};const et=t=>{if(!t)return 5e3;const e=Number(t);if(Number.isFinite(e)&&e>=0)return e*1e3;const s=Date.parse(t);return Number.isNaN(s)?5e3:Math.max(0,s-Date.now())},j=.01,st=15,nt=150,it=.75,rt=t=>{const e=t.headers.get("server-timing");if(!e)return;const s=e.match(/(?:^|,\\s*)cfReq(?:uest)?Dur(?:ation)?;\\s*dur=([0-9.]+)/i);if(s&&+s[1]>j)return+s[1];let i=0;for(const n of e.matchAll(/(?:^|,\\s*)cfSpeed[a-zA-Z]*;\\s*dur=([0-9.]+)/gi))i+=+n[1];if(i>j)return i},N=t=>t.finalResponseHeadersStart||t.responseStart,ot=3,at=(t,e)=>performance.getEntriesByName(t).filter(s=>s.startTime>=e),ht=t=>t.requestStart!==0||t.responseStart!==0,ct=t=>N(t)-t.requestStart,lt=({duration:t,transferSize:e},s)=>{const i=8*(e||+s*1.005),n=t/1e3;return n?i/n:void 0},ut=({duration:t},e)=>{const s=8*e*1.005,i=t/1e3;return i?s/i:void 0},dt=({bps:t},e)=>+e==0||typeof t=="number"&&Number.isFinite(t)&&t>0,pt=(()=>{const t=new Map;return e=>(t.has(e)||t.set(e,"0".repeat(e)),t.get(e))})(),mt=1024,gt=async t=>{if(!t.body)return"";const e=t.body.getReader();let s=new Uint8Array(0);for(;;){const{done:i,value:n}=await e.read();if(i)break;if(n.length>=mt)s=n.slice(-1024);else{const r=new Uint8Array(s.length+n.length);r.set(s),r.set(n,s.length),s=r.slice(-1024)}}return new TextDecoder().decode(s)},E=({parallel:t})=>typeof t=="number"&&Number.isFinite(t)&&t>=1?Math.floor(t):1,I=t=>t.bytes*E(t),ft=(t,{isDown:e,numBytes:s,estimatedServerTime:i=0,serverTimeDelta:n=0})=>{const r=t.map(({perf:c,serverTime:g})=>{const f=N(c),y=f-c.requestStart,v=g||i;let b=y-v-n;return b<=1&&(b=Math.max(0,y-v)),{ttfb:y,ping:b,serverAdjustment:y-b,finalStart:f}}),a=Math.min(...t.map(({perf:c})=>c.requestStart)),h=Math.max(...t.map(({perf:c})=>c.responseEnd)),o=Math.max(...r.map(c=>c.finalStart)),d=Math.min(...r.map(c=>c.ping)),l=e?h-a-Math.min(...r.map(c=>c.serverAdjustment)):o-a,p=t.every(({perf:c})=>c.transferSize)?t.reduce((c,{perf:g})=>c+g.transferSize,0):0,u=t.map(({serverTime:c})=>c).filter(c=>!!c),R=s*t.length;return{transferSize:p,ttfb:Math.min(...r.map(c=>c.ttfb)),payloadDownloadTime:e?Math.max(0,l-d):Math.max(0,h-o),serverTime:u.length?Math.min(...u):-1,measTime:new Date,ping:d,duration:l,bps:e?lt({duration:l,transferSize:p},R):ut({duration:l},R)}},z=t=>(Array.isArray(t)?t:[t]).filter(e=>!!e);var B=class{constructor(t,{downloadApiUrl:e,uploadApiUrl:s,throttleMs:i=0,estimatedServerTime:n=0,serverTimeDelta:r=0,authorization:a=null}={}){if(!t)throw new Error("Missing measurements argument");const h=z(e),o=z(s);if(!h.length)throw new Error("Missing downloadApiUrl argument");if(!o.length)throw new Error("Missing uploadApiUrl argument");this.#u=t,this.#S={down:h,up:o},this.#D={down:Math.floor(Math.random()*h.length),up:Math.floor(Math.random()*o.length)},this.#y=i,this.#M=Math.max(0,n),this.#L=Math.max(0,r),this.#E=a}get results(){return this.#b}get serverTimeDelta(){return this.#L}#t={};get qsParams(){return this.#t}set qsParams(t){this.#t=t}#n={};get fetchOptions(){return this.#n}set fetchOptions(t){this.#n=t}finishRequestDuration=1e3;#e=0;get abortRequestDuration(){return this.#e}set abortRequestDuration(t){this.#e=t}getServerTime=rt;#s=()=>{};set responseHook(t){this.#s=t}#i=()=>{};set onRunningChange(t){this.#i=t}#o=()=>{};set onNewMeasurementStarted(t){this.#o=t}#c=()=>{};set onMeasurementResult(t){this.#c=t}#r=()=>{};set onFinished(t){this.#r=t}#w=()=>{};set onConnectionError(t){this.#w=t}#P=()=>{};set onFatalError(t){this.#P=t}pause(){this.#g!==void 0&&(clearTimeout(this.#g),this.#g=void 0),clearTimeout(this.#v),clearTimeout(this.#T),this.#B("pause()"),this.#C(!1)}play(){this.#l||(this.#C(!0),this.#k())}#u;#S;#D;#l=!1;#d={down:!1,up:!1};#b={down:{},up:{}};#a=0;#p=0;#R=0;#m=0;#g;#v;#T;#f=-1/0;#y=0;#M=0;#L=0;#E=null;#h=void 0;#C(t){t!==this.#l&&(this.#l=t,setTimeout(()=>this.#i(this.#l))),t||this.#h?.abort("setRunning(false)")}#A(t,e){const s=this.#u[t],{dir:i}=s,n=I(s),r=this.#b,a=r[i].hasOwnProperty(n)?r[i][n]:{timings:[],numMeasurements:this.#u.filter(h=>I(h)===n&&h.dir===i).map(h=>h.count).reduce((h,o)=>h+o,0)};e&&a.timings.push(e),a.timings=a.timings.slice(-a.numMeasurements),r[i][n]=a,e?setTimeout(()=>{this.#c({type:i,bytes:n,...e},r,s)}):this.#o({...s,bytes:n},r)}#k(){const t=this.#u;let e=t[this.#a];if(this.#p>=e.count){const i=this.#d;if(this.#f>this.finishRequestDuration&&!e.bypassMinDuration){const n=e.dir;this.#d[n]=!0,Object.values(this.#d).every(r=>r)&&this.#r(this.#b)}this.#p=0,this.#m=0,this.#f=-1/0;do this.#a+=1;while(this.#a<t.length&&i[t[this.#a].dir]);if(this.#a>=t.length){this.#d={down:!0,up:!0},this.#C(!1),this.#r(this.#b);return}e=t[this.#a]}const s=this.#a;this.#p===0&&this.#A(s),this.#q(e,s)}#q(t,e){const{bytes:s,dir:i}=t,n=i==="down",r=E(t),a=Array.from({length:r},(u,R)=>this.#N(i,s,r>1?{req:`${R}`}:{})),{signal:h}=this.#z(r>1?`${n?"Download":"Upload"} batch of ${r}x${s} bytes`:`${n?"Download":"Upload"} request of ${s} bytes`),o=new AbortController,d=()=>o.abort(h.reason);h.aborted?d():h.addEventListener("abort",d,{once:!0});const l=o.signal,p=performance.now();Promise.all(a.map(({url:u,fetchOpt:R})=>fetch(u,{...R,signal:l}).then(c=>{if(c.ok)return c;throw new U(c.status,c.statusText,c.headers.get("retry-after"))}).then(async c=>{const g=this.getServerTime?.(c)??void 0;return this.#s({url:u,headers:c.headers,body:await gt(c)}),g}).catch(c=>{throw l.aborted||(o.abort("batch request failed"),this.#O(c,u)),c}))).then(async u=>{const R=()=>a.map(({url:m})=>at(m,p));let c=R();if(c.some(m=>!m.length)&&(await new Promise(m=>setTimeout(m)),c=R()),l.aborted)return;const g=c.findIndex(m=>!m.length);if(g>=0){this.#$(i,a[g].url);return}const f=c.map(([m])=>m),y=f.findIndex(m=>!ht(m));if(y>=0){const m=`No detailed resource timing for ${a[y].url}. A cross-origin target must send a Timing-Allow-Origin header.`;console.warn(m),this.#U(m);return}this.#m=0;const v=f.map((m,P)=>(this.#F(m,u[P]),n&&this.#_(m.transferSize,s),{perf:m,serverTime:u[P]})),b=this.#L,w=ft(v,{isDown:n,numBytes:s,estimatedServerTime:this.#M,serverTimeDelta:b}),T=w.serverTime>0?w.serverTime:this.#M;+s==0?console.log("latency",{phase:`during ${a[0].qsParams.during||"idle"}`,ttfb:w.ttfb,serverTime:T,...b&&{serverTimeDelta:b},ping:w.ping}):console.log(n?"download":"upload",{bytes:s*r,...r>1&&{parallel:r},bps:w.bps,ttfb:w.ttfb,serverTime:T,...b&&{serverTimeDelta:b},ping:w.ping});const[L]=f;this.#x(e,w,r>1?{parallel:r}:{perf:{startTime:L.startTime,requestStart:L.requestStart,responseStart:L.responseStart,firstInterimResponseStart:L.firstInterimResponseStart,finalResponseHeadersStart:L.finalResponseHeadersStart,responseEnd:L.responseEnd,nextHopProtocol:L.nextHopProtocol,entries:c[0].length}}),this.#I()}).catch(u=>{l.aborted||this.#O(u,a[0].url)}).finally(()=>h.removeEventListener("abort",d))}#x(t,e,s){const i=this.#u[t],n=I(i);return dt(e,n)?(this.#A(t,e),this.#f=this.#f<0?e.duration:Math.min(this.#f,e.duration),!0):(console.warn(`Discarding ${i.dir} sample without a speed`,{bytes:n,...e,...s}),!1)}#$(t,e){if(console.warn(`Discarding ${t} sample without a resource timing entry`,{url:e}),++this.#m>=ot){this.pause(),this.#P(`No resource timing entries for ${e}. The host page may be clearing or filling the buffer, or the runtime doesn\'t record resource timing.`);return}this.#I()}#F(t,e){const s=t.secureConnectionStart>t.connectStart?t.secureConnectionStart-t.connectStart:t.connectEnd-t.connectStart,i=t.nextHopProtocol.match(/([0-9.]+)/),n=i?+i[1]:0;if(!e||!s||n<=0||n>=2)return;const r=Math.max(0,ct(t)-s)-e;r>0&&r<=st&&r<=e&&e<=nt?(this.#L=this.#L*.25+r*it,console.log(`serverTimeDelta (estimated): ${this.#L.toFixed(2)}ms`)):r>0&&console.log(`serverTimeDelta (skipped): ${r.toFixed(2)}ms`)}#_(t,e){e&&t&&(t<e||t/e>1.05)&&console.warn(`Requested ${e}B but received ${t}B (${Math.round(t/e*1e4)/100}%).`)}#j(t){const e=this.#S[t],s=e[this.#D[t]%e.length];return this.#D[t]+=1,s}#N(t,e,s={}){const i={...this.#t,...s,bytes:`${e}`},n=new URL(this.#j(t),window.location.origin);Object.entries(i).forEach(([a,h])=>n.searchParams.set(a,h));const r=n.href;return{url:r,qsParams:i,fetchOpt:S(Object.assign({},t==="down"?{}:{method:"POST",body:pt(e)},this.#n),this.#E,r)}}#z(t){if(this.#R===0||!this.#h||this.#h.signal.aborted){this.#h?.abort("restarting engine"),clearTimeout(this.#v);const e=this.#h=new AbortController;this.abortRequestDuration&&(this.#v=setTimeout(()=>{const s=`${t} aborted. Request exceeded abortRequestDuration (${this.abortRequestDuration}ms)`;e.abort(s),this.#U(s)},this.abortRequestDuration))}return this.#h}#O(t,e){if(console.warn(`Error fetching ${e}: ${t}`),t instanceof U&&t.status===429&&this.#R++<_){this.#g=setTimeout(()=>{this.#g=void 0,this.#l&&this.#k()},et(t.retryAfter));return}const s=t instanceof U?t.status:void 0,i=s===429?`Connection failed to ${e}. Gave up after ${_} retries.`:s===void 0?`Connection failed to ${e}.`:`Request failed with ${s}: ${e}`;this.#U(i,s)}#U(t,e){clearTimeout(this.#g),this.#g=void 0,this.#R=0,this.#w(t,e),this.#l&&this.#I()}#I(){clearTimeout(this.#v),this.#p+=1,this.#R=0,this.#y?this.#T=setTimeout(()=>{this.#T=void 0,this.#l&&this.#k()},this.#y):this.#k()}#B(t){this.#h?.abort(t||"aborted with no reason provided")}},yt=class extends B{constructor(t,{measureParallelLatency:e=!1,parallelLatencyThrottleMs:s=100,downloadApiUrl:i,uploadApiUrl:n,estimatedServerTime:r=0,serverTimeDelta:a=0,authorization:h=null,...o}={}){super(t,{downloadApiUrl:i,uploadApiUrl:n,estimatedServerTime:r,serverTimeDelta:a,authorization:h,...o}),e&&(this.#t=new B([{dir:"down",bytes:0,count:1/0,bypassMinDuration:!0}],{downloadApiUrl:i,uploadApiUrl:n,estimatedServerTime:r,serverTimeDelta:a,authorization:h,throttleMs:s}),this.#t.qsParams={during:`${t[0].dir}load`},super.onRunningChange=this.#e)}get latencyResults(){return this.#t&&this.#t.results.down[0].timings}set onParallelLatencyResult(t){this.#t&&(this.#t.onMeasurementResult=e=>t(e))}set onParallelLatencyError(t){this.#t&&(this.#t.onConnectionError=t)}get fetchOptions(){return super.fetchOptions}set fetchOptions(t){super.fetchOptions=t,this.#t&&(this.#t.fetchOptions=t)}get abortRequestDuration(){return super.abortRequestDuration}set abortRequestDuration(t){super.abortRequestDuration=t,this.#t&&(this.#t.abortRequestDuration=t)}set onFatalError(t){super.onFatalError=t,this.#t&&(this.#t.onFatalError=e=>{this.pause(),t(e)})}set onRunningChange(t){super.onRunningChange=e=>{this.#e(e),t(e)}}#t;#n;#e=t=>{this.#t&&(t?this.#n=setTimeout(()=>this.#t.play(),20):(clearTimeout(this.#n),this.#t.pause()))}},H=class extends yt{constructor(t,{measurementId:e,logApiUrl:s,sessionId:i,authorization:n,...r}={}){super(t,{...r,authorization:n}),this.#t=e,this.#s=s,this.#i=i,this.#o=n??null,super.qsParams=s?{measId:this.#t}:{},super.responseHook=a=>this.#c(a),super.onMeasurementResult=(a,h,o)=>this.#r(a,o)}set qsParams(t){super.qsParams=this.#s?{measId:this.#t,...t}:t}set responseHook(t){super.responseHook=e=>{t(e),this.#c(e)}}set onMeasurementResult(t){super.onMeasurementResult=(e,s,i)=>{t(e,s),this.#r(e,i)}}#t;#n;#e;#s;#i;#o;#c(t){this.#s&&(this.#e=+t.headers.get("cf-meta-request-time"),this.#n=t.body.slice(-300).split("___").pop())}#r(t,e){if(!this.#s||E(e)>1)return;const s={type:t.type,bytes:t.bytes,ping:Math.round(t.ping),ttfb:Math.round(t.ttfb),payloadDownloadTime:Math.round(t.payloadDownloadTime),duration:Math.round(t.duration),transferSize:Math.round(t.transferSize),serverTime:Math.round(t.serverTime),token:this.#n,requestTime:this.#e,measId:this.#t,sessionId:this.#i};this.#n=null,this.#e=null,fetch(this.#s,S({method:"POST",body:JSON.stringify(s),...this.fetchOptions},this.#o,this.#s)).catch(()=>{})}},wt=class{constructor(t){if(!t)throw new Error("Missing operation to perform");this.#e=t,this.play()}pause(){this.#o(),this.#s(!1)}stop(){this.pause()}play(){this.#t||(this.#s(!0),this.#i())}#t=!1;#n=void 0;#e;#s(t){t!==this.#t&&(this.#t=t)}#i(){const t=this.#n=this.#e().then(()=>{!t._cancel&&this.#i()})}#o(){const t=this.#n;t&&(t._cancel=!0)}},bt=class{constructor({download:t,upload:e,authorization:s=null}={}){if(!t&&!e)throw new Error("Missing at least one of download/upload config");[[t,"download"],[e,"upload"]].filter(n=>n[0]!==null&&n[0]!==void 0).forEach(([n,r])=>{const{apiUrl:a,chunkSize:h}=n;if(!a)throw new Error(`Missing ${r} apiUrl argument`);if(!h)throw new Error(`Missing ${r} chunkSize argument`)});const i=({apiUrl:n,qsParams:r={},fetchOptions:a={}})=>new wt(()=>{const h=Object.assign({},r,this.qsParams),o=new URL(n,window.location.origin);Object.entries(h).forEach(([p,u])=>o.searchParams.set(p,u));const d=o.href,l=Object.assign({},a,this.fetchOptions);return fetch(d,S(l,s,d)).then(p=>{if(p.ok)return p;throw Error(p.statusText)}).then(p=>p.text())});t&&this.#t.push(i({apiUrl:t.apiUrl,qsParams:{bytes:`${t.chunkSize}`}})),e&&this.#t.push(i({apiUrl:e.apiUrl,fetchOptions:{method:"POST",body:"0".repeat(e.chunkSize)}}))}qsParams={};fetchOptions={};pause(){this.#t.forEach(t=>t.pause())}stop(){this.pause()}play(){this.#t.forEach(t=>t.play())}#t=[]},Rt=class{constructor({iceServers:t=[],acceptIceCandidate:e=n=>{let r=n.protocol||"";if(!r&&n.candidate){const a=n.candidate.split(" ");a.length>=3&&(r=a[2])}return r.toLowerCase()==="udp"},dataChannelCfg:s={ordered:!1,maxRetransmits:0},...i}={}){const n=new RTCPeerConnection({iceServers:t,...i}),r=new RTCPeerConnection({iceServers:t,...i}),a=n.createDataChannel("channel",s);a.onopen=()=>{this.#t=!0,this.onOpen()},a.onclose=()=>this.close(),r.ondatachannel=h=>{const o=h.channel;o.onclose=()=>this.close(),o.onmessage=d=>this.onMessageReceived(d.data),this.#i=o},n.onicecandidate=h=>{h.candidate&&e(h.candidate)&&r.addIceCandidate(h.candidate)},r.onicecandidate=h=>{h.candidate&&e(h.candidate)&&n.addIceCandidate(h.candidate)},n.createOffer().then(h=>n.setLocalDescription(h)).then(()=>r.setRemoteDescription(n.localDescription)).then(()=>r.createAnswer()).then(h=>r.setLocalDescription(h)).then(()=>n.setRemoteDescription(r.localDescription)),this.#n=n,this.#e=r,this.#s=a}onOpen=()=>{};onClose=()=>{};onMessageReceived=()=>{};send(t){this.#s.send(String(t))}close(){return this.#n&&this.#n.close(),this.#e&&this.#e.close(),this.#s&&this.#s.close(),this.#i&&this.#i.close(),this.#t&&this.onClose(),this.#t=!1,this}#t=!1;#n;#e;#s;#i},vt=class{constructor({turnServerUri:t,turnServerCredsApi:e,turnServerCredsApiParser:s=({username:u,credential:R,server:c})=>({turnServerUser:u,turnServerPass:R,turnServerUri:c}),turnServerCredsApiIncludeCredentials:i=!1,turnServerUser:n,turnServerPass:r,authorization:a=null,numMsgs:h=100,batchSize:o=10,batchWaitTime:d=10,responsesWaitTime:l=5e3,connectionTimeout:p=5e3}={}){if(!t&&!e)throw new Error("No TURN server configured: set turnServerCredsApiUrl or turnServerUri");if((!n||!r)&&!e)throw new Error("No TURN credentials configured: set turnServerCredsApiUrl, or turnServerUser and turnServerPass");this.#i=h,(!n||!r?fetch(e,S(i?{credentials:"include"}:{},a,e)).then(u=>u.json()).then(u=>{if(u.error)throw u.error;return u}).then(s):Promise.resolve({turnServerUser:n,turnServerPass:r})).catch(u=>this.#t(u)).then(u=>{if(!u)return;const{turnServerUser:R,turnServerPass:c,turnServerUri:g}=u,f=g||t;if(!f){this.#n("No TURN server URI: set turnServerUri or return server from the credentials API");return}const y=new Rt({iceServers:[{urls:`turn:${f}?transport=udp`,username:R,credential:c}],iceTransportPolicy:"relay"});let v=!1;setTimeout(()=>{v||(y.close(),this.#n("ICE connection timeout!"))},p);const b=this.#s;y.onOpen=()=>{v=!0;const w=this;(function T(L){if(L<=h){let m=L;for(;m<=Math.min(h,L+o-1);)b[m]=!1,y.send(m),w.onMsgSent(m),m++;setTimeout(()=>T(m),d)}else{w.onAllMsgsSent(Object.keys(b).length);const m=()=>{y.close(),w.#e(w.results)};let P=setTimeout(m,l),$=Object.values(w.#s).filter(k=>!k).length;y.onMessageReceived=k=>{clearTimeout(P),b[k]=!0,w.onMsgReceived(k),$--,$<=0&&Object.values(w.#s).every(Y=>Y)?m():P=setTimeout(m,l)}}})(1)},y.onMessageReceived=w=>{b[w]=!0,this.onMsgReceived(w)}}).catch(u=>this.#n(u.toString()))}#t=()=>{};set onCredentialsFailure(t){this.#t=t}#n=()=>{};set onConnectionError(t){this.#n=t}#e=()=>{};set onFinished(t){this.#e=t}onMsgSent=()=>{};onAllMsgsSent=()=>{};onMsgReceived=()=>{};get results(){const t=this.#i,e=Object.keys(this.#s).length,s=Object.entries(this.#s).filter(([,i])=>!i).map(([i])=>+i);return{totalMessages:t,numMessagesSent:e,packetLoss:s.length/e,lostMessages:s}}#s={};#i},Lt=class extends vt{constructor({downloadChunkSize:t,uploadChunkSize:e,downloadApiUrl:s,uploadApiUrl:i,authorization:n,...r}={}){super({...r,authorization:n}),(t||e)&&(this.#t=new bt({download:t?{apiUrl:s,chunkSize:t}:null,upload:e?{apiUrl:i,chunkSize:e}:null,authorization:n}),super.onCredentialsFailure=super.onConnectionError=super.onFinished=()=>this.#t.stop())}set qsParams(t){this.#t&&(this.#t.qsParams=t)}set fetchOptions(t){this.#t&&(this.#t.fetchOptions=t)}set onCredentialsFailure(t){super.onCredentialsFailure=(...e)=>{t(...e),this.#t&&this.#t.stop()}}set onConnectionError(t){super.onConnectionError=(...e)=>{t(...e),this.#t&&this.#t.stop()}}set onFinished(t){super.onFinished=(...e)=>{t(...e),this.#t&&this.#t.stop()}}#t},A=class{constructor(t,{timeout:e=-1,fetchOptions:s={}}={}){let i=!1;const n=({reachable:r,...a})=>{i||(i=!0,this.onFinished({targetUrl:t,reachable:r,...a}))};fetch(t,s).then(r=>{n({reachable:!0,response:r})}).catch(r=>{n({reachable:!1,error:r})}),e>0&&setTimeout(()=>n({reachable:!1,error:"Request timeout"}),e)}onFinished=()=>{}};const Tt=t=>t.reduce((e,s)=>e+s,0),J=(t,e=.5)=>{if(!t.length)return 0;const s=t.slice().sort((a,h)=>a-h),i=(t.length-1)*e,n=i%1;if(n===0)return s[Math.round(i)];const r=[Math.floor,Math.ceil].map(a=>s[a(i)]);return r[0]+(r[1]-r[0])*n};var Mt=class{constructor(t){this.#t=t}getLatencyPoints=t=>t.timings.map(e=>e.ping);getLatency=t=>J(this.getLatencyPoints(t),this.#t.latencyPercentile);getJitter(t){const e=this.getLatencyPoints(t);return e.length<2?null:e.reduce(({sumDeltas:s=0,prevLatency:i},n)=>({sumDeltas:s+(i!==void 0?Math.abs(i-n):0),prevLatency:n}),{}).sumDeltas/(e.length-1)}getBandwidthPoints=(t,e)=>this.#n(t,e).flatMap(({bytes:s,parallel:i,bucket:n})=>n.timings.map(({bps:r,duration:a,ping:h,measTime:o,serverTime:d,transferSize:l})=>({bytes:s,bps:r,duration:a,ping:h,measTime:o,serverTime:d,transferSize:l,...i&&{parallel:i}})));getBandwidth=(t,e)=>J(this.getBandwidthPoints(t,e).filter(s=>s.duration>=this.#t.bandwidthMinRequestDuration).map(s=>s.bps).filter(s=>s),this.#t.bandwidthPercentile);getLoadedLatency=(t,e)=>this.getLatency({timings:this.#e(t,e)});getLoadedJitter=(t,e)=>this.getJitter({timings:this.#e(t,e)});getLoadedLatencyPoints=(t,e)=>this.getLatencyPoints({timings:this.#e(t,e)});getPacketLoss=t=>t.packetLoss;getPacketLossDetails=t=>t;getReachability=t=>!!t.reachable;getReachabilityDetails=t=>({host:t.host,reachable:t.reachable});#t;#n=(t,e={})=>[...Object.entries(t).map(([s,i])=>({bytes:+s,parallel:void 0,bucket:i})),...Object.values(e).flatMap(s=>Object.values(s)).map(s=>({bytes:s.bytes,parallel:s.parallel,bucket:s}))].sort((s,i)=>s.bytes-i.bytes);#e=(t,e)=>this.#n(t,e).map(({bucket:s})=>s).filter(s=>s.timings.length&&Math.min(...s.timings.map(i=>i.duration))>=this.#t.loadedRequestMinDuration).map(s=>s.sideLatency||[]).flat().slice(-this.#t.loadedLatencyMaxPoints)};const Pt=["bad","poor","average","good","great"],V={loadedLatencyIncrease:t=>t.latency&&(t.downLoadedLatency||t.upLoadedLatency)?Math.max(t.downLoadedLatency,t.upLoadedLatency)-t.latency:void 0},G={packetLoss:0};var Dt=class{constructor(t){this.#t=t}getScores(t,e=[]){const s=Object.assign({},...Object.entries(this.#t.aimMeasurementScoring).map(([i,n])=>{const r=V.hasOwnProperty(i)?V[i](t):t[i];return r===void 0?G.hasOwnProperty(i)?{[i]:G[i]}:{}:{[i]:+n(r)}}));return Object.assign({},...Object.entries(this.#t.aimExperiencesDefs).map(([i,{input:n,pointThresholds:r}])=>[i,{input:n.filter(a=>!e.includes(a)),pointThresholds:r}]).filter(([,{input:i}])=>i.every(n=>s.hasOwnProperty(n))).map(([i,{input:n,pointThresholds:r}])=>{const a=Math.max(0,Tt(n.map(d=>s[d]))),h=M(r,[0,1,2,3,4])(a),o=Pt[h];return{[i]:{points:a,classificationIdx:h,classificationName:o}}}))}#t},St=class{constructor(t){this.#t=t,this.clear(),this.#n=new Mt(this.#t),this.#e=new Dt(this.#t)}raw;get isFinished(){return Object.values(this.raw).filter(t=>t!==null&&typeof t=="object").every(t=>t.finished)}clear(){this.raw=Object.assign({totalDurationMs:void 0},...[...new Set(this.#t.measurements.map(t=>t.type))].map(t=>({[t]:{started:!1,finished:!1,results:{}}})))}getUnloadedLatency=()=>this.#s("getLatency","latency");getUnloadedJitter=()=>this.#s("getJitter","latency");getUnloadedLatencyPoints=()=>this.#s("getLatencyPoints","latency",[]);getDownLoadedLatency=()=>this.#s("getLoadedLatency","download");getDownLoadedJitter=()=>this.#s("getLoadedJitter","download");getDownLoadedLatencyPoints=()=>this.#s("getLoadedLatencyPoints","download",[]);getUpLoadedLatency=()=>this.#s("getLoadedLatency","upload");getUpLoadedJitter=()=>this.#s("getLoadedJitter","upload");getUpLoadedLatencyPoints=()=>this.#s("getLoadedLatencyPoints","upload",[]);getDownloadBandwidth=()=>this.#s("getBandwidth","download");getDownloadBandwidthPoints=()=>this.#s("getBandwidthPoints","download",[]);getUploadBandwidth=()=>this.#s("getBandwidth","upload");getUploadBandwidthPoints=()=>this.#s("getBandwidthPoints","upload",[]);getPacketLoss=()=>this.#s("getPacketLoss","packetLoss");getPacketLossDetails=()=>this.#s("getPacketLossDetails","packetLoss",void 0,!0);getTotalDurationMs=()=>this.raw.totalDurationMs;getSummary(){const t={download:this.getDownloadBandwidth,upload:this.getUploadBandwidth,latency:this.getUnloadedLatency,jitter:this.getUnloadedJitter,downLoadedLatency:this.getDownLoadedLatency,downLoadedJitter:this.getDownLoadedJitter,upLoadedLatency:this.getUpLoadedLatency,upLoadedJitter:this.getUpLoadedJitter,packetLoss:this.getPacketLoss,v4Reachability:this.#i,v6Reachability:this.#c,totalDurationMs:this.getTotalDurationMs};return Object.assign({},...Object.entries(t).map(([e,s])=>{const i=s();return i===void 0?{}:{[e]:i}}))}getScores=()=>this.#e.getScores(this.getSummary(),this.raw.packetLoss?[]:["packetLoss"]);#t;#n;#e;#s=(t,e,s=void 0,i=!1)=>{const n=this.raw[e];if(!n||typeof n!="object"||!n.started)return s;const r=n;return i&&r.error?{error:r.error}:this.#n[t](r.results,r.parallelResults)};#i=()=>this.#s("getReachability","v4Reachability");#o=()=>this.#s("getReachabilityDetails","v4Reachability");#c=()=>this.#s("getReachability","v6Reachability");#r=()=>this.#s("getReachabilityDetails","v6Reachability")};const O=(t,e=0)=>t&&Math.round(t*10**e)/10**e,q=t=>t.map(e=>O(e,2)),W=t=>t.map(e=>({bytes:+e.bytes,bps:O(e.bps)})),Et=t=>{const e=t;return e.error?void 0:{numMessages:e.numMessagesSent,lossRatio:O(e.packetLoss,4)}},kt={latencyMs:["getUnloadedLatencyPoints",q],download:["getDownloadBandwidthPoints",W],upload:["getUploadBandwidthPoints",W],downLoadedLatencyMs:["getDownLoadedLatencyPoints",q],upLoadedLatencyMs:["getUpLoadedLatencyPoints",q],packetLoss:["getPacketLossDetails",Et],totalDurationMs:["getTotalDurationMs"]},Ct=t=>({points:t.points,classification:t.classificationName}),Ut=async(t,{apiUrl:e,includeCredentials:s,sessionId:i,authorization:n})=>{const r={sessionId:i};Object.entries(kt).forEach(([h,[o,d]])=>{const l=d??(u=>u),p=t[o]();p&&(r[h]=l(p))});const a=t.getScores();a&&(r.scores=Object.assign({},...Object.entries(a).map(([h,o])=>({[h]:Ct(o)})))),console.log("results",r);try{const h=await fetch(e,S({method:"POST",body:JSON.stringify(r),credentials:s?"include":"same-origin"},n,e));return h.ok?await h.json():{requestId:void 0}}catch{return{requestId:void 0}}},It=t=>{let e;try{e=typeof t=="string"?new URL(t):void 0}catch{}if(!e||!/^https?:$/.test(e.protocol)||e.pathname!=="/"||e.search||e.hash)throw new TypeError(`Invalid measurementTargets entry "${t}": expected an origin such as https://speed.cloudflare.com`);return e.origin},X=(t,{path:e,option:s},i)=>{if(!Array.isArray(t))throw new TypeError(`Invalid measurementTargets: expected an array of origins, got ${typeof t}`);if(typeof e!="string")throw new TypeError(`Invalid ${s}: expected a path starting with /, got ${typeof e}`);const n=r=>{let a;try{a=e.startsWith("/")?new URL(e,r):void 0}catch{}if(!a||a.origin!==r)throw new TypeError(`Invalid ${s} "${e}": expected a path starting with /`);return a.href};return n("https://placeholder.invalid"),t.length?t.map(r=>n(It(r))):[i]},At=1e6,Ot=1e6,qt=.5,x=["latency","latencyUnderLoad","download","upload"],Z=()=>`${Math.round(Math.random()*1e16)}`;var xt=class{constructor(t={}){const{bandwidthAbortRequestDuration:e,...s}=t;this.#e=Object.assign({},D,s,Q),this.#e.abortRequestDuration=s.abortRequestDuration??e??D.abortRequestDuration,this.#e.measurementTargets??=D.measurementTargets,this.#e.measurementDownloadPath??=D.measurementDownloadPath,this.#e.measurementUploadPath??=D.measurementUploadPath,this.#s={token:this.#e.authorizationToken,enabled:this.#e.authorizationEnabled,allowInsecure:this.#e.allowInsecureAuthorizationToken},this.#S=X(this.#e.measurementTargets,{path:this.#e.measurementDownloadPath,option:"measurementDownloadPath"},this.#e.downloadApiUrl),this.#D=X(this.#e.measurementTargets,{path:this.#e.measurementUploadPath,option:"measurementUploadPath"},this.#e.uploadApiUrl),this.#i=new St(this.#e),this.#e.autoStart&&this.play()}get results(){return this.#i}get config(){return this.#e}get authorization(){return this.#s}get isRunning(){return this.#a}get isFinished(){return this.#p}onRunningChange=()=>{};onResultsChange=()=>{};onPhaseChange=()=>{};#t=()=>{};set onFinish(t){this.#t=t}#n=()=>{};set onError(t){this.#n=t}pause(){const t=this.#y();t&&x.includes(t)&&this.#w?.pause?.(),this.#m(!1)}play(){this.#a||(performance.clearResourceTimings(),performance.setResourceTimingBufferSize(1e4),this.#m(!0),this.#h())}restart(){this.#L(),this.play()}#e;#s;#i;#o=Z();#c=0;#r=-1;#w;#P=At;#u=Ot;#S;#D;#l;#d=0;#b;#a=!1;#p=!1;#R=!1;#m(t){t!==this.#a&&(this.#a=t,this.onRunningChange(this.#a)),t?this.#l=performance.now():typeof this.#l<"u"&&(this.#d+=performance.now()-this.#l,this.#l=void 0),this.#g()}#g(){clearTimeout(this.#b),this.#b=void 0;const t=this.#e.abortTestDuration;!(t>0)||!this.#a||this.#p||(this.#b=setTimeout(()=>this.#T(`Test aborted. Test exceeded abortTestDuration (${this.#e.abortTestDuration}ms)`),Math.max(0,t-this.#d)))}#v(...t){const e=this.#o;this.#n(...t),e===this.#o&&this.#a&&this.#h()}#T(t,{skipLog:e=!1}={}){const s=this.#y(),i=this.#M();this.#E(),this.#r=this.#e.measurements.length,this.#i.raw.error=t,s&&i&&(i.error=t,this.onResultsChange({type:s})),this.#R=e;const n=this.#o;this.#n(t),n===this.#o&&(this.#m(!1),this.#f(!0))}#f(t){if(t!==this.#p&&(this.#p=t,t)){this.#i.raw.totalDurationMs=this.#d;const e=this.#R;setTimeout(()=>this.#t(this.results,{skipLog:e}))}}#y(){return this.#r<0||this.#r>=this.#e.measurements.length?null:this.#e.measurements[this.#r].type}#M(){const t=this.#y();if(t)return this.#i.raw[t]||void 0}#L(){this.#E(),this.#o=Z(),this.#r=-1,this.#w=void 0,this.#m(!1),this.#f(!1),this.#R=!1,this.#i.clear(),this.#d=0}#E(){const t=this.#w;if(!t)return;t.onFinished=t.onConnectionError=t.onMsgReceived=t.onCredentialsFailure=t.onMeasurementResult=t.onNewMeasurementStarted=t.onParallelLatencyResult=t.onParallelLatencyError=t.onFatalError=()=>{};const e=this.#y();e&&x.includes(e)&&t.pause?.()}#h(){const t=this.#y(),e=this.#M();if(t&&x.includes(t)&&e&&e.started&&!e.finished&&!e.finishedCurrentRound){this.#w?.play?.();return}if(this.#r++,this.#r>=this.#e.measurements.length){this.#m(!1),this.#f(!0);return}const{type:s,...i}=this.#e.measurements[this.#r],n=this.#M();this.onPhaseChange({measurementId:this.#r,measurement:{type:s,...i}});const{estimatedServerTime:r}=this.#e,a=this.#S,h=this.#D;let o;switch(s){case"v4Reachability":case"v6Reachability":o=new A(`https://${i.host}`,{fetchOptions:{method:"GET",mode:"no-cors"}}),o.onFinished=d=>{const l=d;n.finished=!0,n.results={host:i.host,...l},this.onResultsChange({type:s}),this.#h()};break;case"rpki":o=new A(`https://${this.#e.rpkiInvalidHost}`,{timeout:5e3}),o.onFinished=d=>{const l=d;(l.response?l.response.json():Promise.resolve()).then(p=>{n.finished=!0,n.results={host:this.#e.rpkiInvalidHost,filteringInvalids:!l.reachable,...p?{asn:p.asn,name:p.name}:{}},this.onResultsChange({type:s}),this.#h()})};break;case"nxdomain":o=new A(`https://${i.nxhost}`,{fetchOptions:{mode:"no-cors"}}),o.onFinished=d=>{const l=d;n.finished=!0,n.results={host:i.nxhost,reachable:l.reachable},this.onResultsChange({type:s}),this.#h()};break;case"packetLoss":case"packetLossUnderLoad":{n.finished=!1;const{numPackets:d,...l}=i,{turnServerUri:p,turnServerCredsApiUrl:u,turnServerUser:R,turnServerPass:c,includeCredentials:g}=this.#e;try{o=new Lt({turnServerUri:p??void 0,turnServerCredsApi:u??void 0,turnServerCredsApiIncludeCredentials:g,turnServerUser:R??void 0,turnServerPass:c??void 0,authorization:this.authorization,numMsgs:d,downloadChunkSize:i.loadDown?this.#P:void 0,uploadChunkSize:i.loadUp?this.#u:void 0,downloadApiUrl:a[0],uploadApiUrl:h[0],...l})}catch(f){const y=f instanceof Error?f.message:String(f),v=this.#o;queueMicrotask(()=>{v===this.#o&&(n.started=!0,n.finished=!0,n.error=y,this.onResultsChange({type:s}),this.#v(`Error while measuring packet loss: ${y}`))});return}}o.onMsgReceived=()=>{n.results=Object.assign({},o.results),this.onResultsChange({type:s})},o.onFinished=()=>{n.finished=!0,this.onResultsChange({type:s}),this.#a&&this.#h()},o.onConnectionError=d=>{n.finished=!0,n.error=d,this.onResultsChange({type:s}),this.#v(`Connection error while measuring packet loss: ${d}`)},o.onCredentialsFailure=()=>{n.finished=!0,n.error="unable to get turn server credentials",this.onResultsChange({type:s}),this.#v("Error while measuring packet loss: unable to get turn server credentials.")};break;case"latency":case"latencyUnderLoad":{if(n.finished=!1,o=new H([{dir:"down",bytes:0,count:i.numPackets,bypassMinDuration:!0}],{downloadApiUrl:a,uploadApiUrl:h,estimatedServerTime:r,serverTimeDelta:this.#c,logApiUrl:this.#e.logMeasurementApiUrl??void 0,measurementId:this.#o,sessionId:this.#e.sessionId,authorization:this.authorization,downloadChunkSize:i.loadDown?this.#P:void 0,uploadChunkSize:i.loadUp?this.#u:void 0}),o.fetchOptions=this.#e.includeCredentials?{credentials:"include"}:{},o.abortRequestDuration=this.#e.abortRequestDuration,!i.loadDown&&!i.loadUp){const l=o;l.qsParams={...l.qsParams,during:"idle"}}const d=(n.results?.timings||[]).slice();o.onMeasurementResult=o.onNewMeasurementStarted=(l,p)=>{n.results=Object.assign({},p.down[0]),n.results.timings=d.concat(n.results.timings),this.onResultsChange({type:s})},o.onFinished=()=>{this.#c=o.serverTimeDelta,n.finished=!0,this.onResultsChange({type:s}),this.#a&&this.#h()},o.onConnectionError=(l,p)=>this.#n(`Connection error while measuring latency: ${l}`,p),o.onFatalError=l=>this.#T(`Connection error while measuring latency: ${l}`,{skipLog:!0}),o.play();break}case"download":case"upload":if(n.finished){this.#h();return}else{delete n.finishedCurrentRound;const d=this.#e[`measure${s==="download"?"Down":"Up"}loadLoadedLatency`];o=new H([{dir:s==="download"?"down":"up",...i}],{downloadApiUrl:a,uploadApiUrl:h,estimatedServerTime:r,serverTimeDelta:this.#c,logApiUrl:this.#e.logMeasurementApiUrl??void 0,measurementId:this.#o,measureParallelLatency:d,parallelLatencyThrottleMs:this.#e.loadedLatencyThrottle,sessionId:this.#e.sessionId,authorization:this.authorization}),o.fetchOptions=this.#e.includeCredentials?{credentials:"include"}:{},o.finishRequestDuration=this.#e.bandwidthFinishRequestDuration,o.abortRequestDuration=this.#e.abortRequestDuration;const l=i.bytes,p=E({parallel:i.parallel}),u=()=>{const g={timings:[],numMeasurements:0,sideLatency:d?[]:void 0};if(p===1){const v=n.results={...n.results};return v[l]??=g}const f=n.parallelResults={...n.parallelResults},y=f[p]={...f[p]};return y[l]??={bytes:l*p,parallel:p,...g}};o.onNewMeasurementStarted=(...g)=>{const{count:f}=g[0],y=u();y.numMeasurements-y.timings.length!==f&&(y.numMeasurements+=f,this.onResultsChange({type:s}))},o.onMeasurementResult=(...g)=>{const f={...g[0]};delete f.bytes,u().timings.push(f),this.onResultsChange({type:s})},o.onParallelLatencyResult=g=>{u().sideLatency.push(g),this.onResultsChange({type:s})},o.onFinished=g=>{this.#c=o.serverTimeDelta;const f=g,y=!this.#e.measurements.slice(this.#r+1).map(b=>b.type).includes(s),v=Object.values(s==="download"?f.down:f.up).slice(-1)[0].timings.map(b=>b.duration);if(!(y||!i.bypassMinDuration&&v.length>0&&Math.min(...v)>this.#e.bandwidthFinishRequestDuration))n.finishedCurrentRound=!0;else{n.finished=!0,this.onResultsChange({type:s});const b=({bytes:T,parallel:L})=>{const m=E({parallel:L});return Object.hasOwn((m===1?n.results:n.parallelResults?.[m])??{},T)},w=Math.max(...this.#e.measurements.slice(0,this.#r+1).filter(T=>T.type===s&&b(T)).map(T=>T.bytes))*qt;s==="download"&&(this.#P=w),s==="upload"&&(this.#u=w)}this.#a&&this.#h()},o.onConnectionError=(g,f)=>this.#n(`Connection error while measuring ${s}: ${g}`,f),o.onFatalError=g=>this.#T(`Connection error while measuring ${s}: ${g}`,{skipLog:!0});const R=this.#o,c=this.#r;o.onParallelLatencyError=(g,f)=>{R!==this.#o||c!==this.#r||this.#n(`Connection error while measuring loaded latency: ${g}`,f)},o.play()}}this.#w=o,n.started=!0,this.onResultsChange({type:s})}},$t=class extends xt{constructor(t={}){super(t),super.onFinish=this.#t}set onFinish(t){super.onFinish=(e,s)=>{t(e),this.#t(e,s)}}onResultsLogged=()=>{};#t=(t,e)=>{const s=this.config.logAimApiUrl;!s||e?.skipLog||Ut(t,{apiUrl:s,includeCredentials:this.config.includeCredentials,sessionId:this.config.sessionId,authorization:this.authorization}).then(i=>{this.onResultsLogged(i)})}};export{$t as default};\n';
var entry_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildHeaders(request, "text/plain") });
    }
    if (url.pathname === "/vendor/speedtest.js") {
      return new Response(SPEEDTEST_ESM_CODE, {
        status: 200,
        headers: buildHeaders(request, "application/javascript; charset=utf-8", {
          "Cache-Control": "public, max-age=3600"
        })
      });
    }
    if (url.pathname === "/healthz" || url.pathname.startsWith("/api/")) {
      return handleApiRequest(request, env, url);
    }
    const { html, status } = renderAppHtml(url.pathname);
    return new Response(html, {
      status,
      headers: buildHeaders(request, "text/html; charset=utf-8", {
        "Cache-Control": "no-store"
      })
    });
  }
};
export {
  entry_default as default
};
