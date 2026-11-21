import dotenv from 'dotenv';
import express from 'express';
import path from 'node:path';
import {
  GAMESKINBO_ENDPOINT,
  normalizeGameSkinboResponse,
  SUPPORTED_UID_REGIONS,
} from './src/services/gameskinbo';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

const rateBuckets = new Map<string, number[]>();
const pruneInterval = setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [key, timestamps] of rateBuckets.entries()) {
    const active = timestamps.filter((t) => t > cutoff);
    if (active.length === 0) {
      rateBuckets.delete(key);
    } else {
      rateBuckets.set(key, active);
    }
  }
}, 2 * 60_000);
pruneInterval.unref();

function createRateLimiter(bucketName: string, maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientIp =
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown';
    const key = `${bucketName}:${clientIp}`;
    const now = Date.now();
    const timestamps = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
    if (timestamps.length >= maxRequests) {
      res.status(429).json({
        code: 'RATE_LIMITED',
        error: `Rate limit exceeded (${maxRequests} requests/minute). Please wait before retrying.`,
        retryAfterSeconds: Math.ceil(windowMs / 1000),
      });
      return;
    }
    timestamps.push(now);
    rateBuckets.set(key, timestamps);
    next();
  };
}

function getGameSkinboApiKey(): string {
  return (process.env.GAMESKINBO_API_KEY || process.env.FREEFIRE_API_KEY || '').trim();
}

function getObservatoryConfig(): { token: string; zoneId: string } {
  return {
    token: (process.env.CLOUDFLARE_API_TOKEN || '').trim(),
    zoneId: (process.env.CLOUDFLARE_ZONE_ID || '').trim(),
  };
}

function isPrivateOrBlockedHostname(hostname: string): boolean {
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
  if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)) {
    return true;
  }
  return false;
}

export async function createConfiguredApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost === host) {
          res.setHeader('Access-Control-Allow-Origin', origin);
          res.setHeader('Vary', 'Origin');
        }
      } catch {
        // ignore malformed origin
      }
    }
    next();
  });

  app.get(['/healthz', '/api/health'], (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'CrazyOpenPlace',
      runtime: 'Express + Vite',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/config-status', (_req, res) => {
    const gameskinboConfigured = Boolean(getGameSkinboApiKey());
    const { token, zoneId } = getObservatoryConfig();
    const observatoryConfigured = Boolean(token && zoneId);
    res.json({
      status: 'operational',
      gameskinboConfigured,
      observatoryConfigured,
      rateLimits: {
        uidPerMinute: 5,
        observatoryPerMinute: 10,
      },
      checkedAt: new Date().toISOString(),
    });
  });

  app.get('/api/network-info', createRateLimiter('netinfo', 40, 60_000), async (req, res) => {
    const ip =
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      null;

    let cloudflareTrace: Record<string, string> | null = null;
    try {
      const traceRes = await fetch('https://speed.cloudflare.com/cdn-cgi/trace', {
        signal: AbortSignal.timeout(4000),
      });
      if (traceRes.ok) {
        const text = await traceRes.text();
        const parsed: Record<string, string> = {};
        for (const line of text.split('\n')) {
          const idx = line.indexOf('=');
          if (idx > 0) {
            parsed[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
          }
        }
        cloudflareTrace = {
          ip: parsed.ip,
          colo: parsed.colo,
          loc: parsed.loc,
          tls: parsed.tls,
          http: parsed.http,
          warp: parsed.warp,
          visitScheme: parsed.visit_scheme,
        };
      }
    } catch {
      cloudflareTrace = null;
    }

    res.json({
      ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      acceptLanguage: req.headers['accept-language'] || 'Unknown',
      protocol: req.protocol,
      host: req.headers.host || 'localhost',
      serverTimeIso: new Date().toISOString(),
      cloudflareTrace,
    });
  });

  app.get('/api/uid-check', createRateLimiter('uidcheck', 5, 60_000), async (req, res) => {
    const rawUid = typeof req.query.uid === 'string' ? req.query.uid.trim() : '';
    const rawRegion =
      typeof req.query.region === 'string' && req.query.region.trim()
        ? req.query.region.trim().toUpperCase()
        : 'AUTO';

    if (!/^\d{5,20}$/.test(rawUid)) {
      res.status(400).json({
        code: 'INVALID_UID',
        error: 'UID must contain digits only and be 5 to 20 digits long.',
      });
      return;
    }

    if (!SUPPORTED_UID_REGIONS.has(rawRegion)) {
      res.status(400).json({
        code: 'UNSUPPORTED_REGION',
        error: `Unsupported region "${rawRegion}". Allowed: AUTO, BD, IND, BR, US, SAC, NA, TH, ID, SG, PK.`,
      });
      return;
    }

    const apiKey = getGameSkinboApiKey();
    if (!apiKey) {
      res.status(503).json({
        configured: false,
        code: 'API_KEY_MISSING',
        error:
          'GAMESKINBO_API_KEY is not configured in server secrets. Configure GAMESKINBO_API_KEY to enable live Free Fire UID lookups.',
      });
      return;
    }

    try {
      const params = new URLSearchParams({ uid: rawUid });
      if (rawRegion !== 'AUTO') {
        params.set('region', rawRegion);
      }

      const upstreamRes = await fetch(`${GAMESKINBO_ENDPOINT}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(12_000),
      });

      const bodyText = await upstreamRes.text();
      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(bodyText) as Record<string, unknown>;
      } catch {
        parsed = {};
      }

      if (!upstreamRes.ok) {
        if (upstreamRes.status === 401 || upstreamRes.status === 403) {
          res.status(upstreamRes.status).json({
            code: 'PROVIDER_UNAUTHORIZED',
            error: 'Upstream provider rejected the configured API key (Unauthorized/Forbidden).',
          });
          return;
        }
        if (upstreamRes.status === 402) {
          res.status(402).json({
            code: 'PROVIDER_CREDITS_REQUIRED',
            error: 'GameSkinbo API returned HTTP 402 (API credits exhausted or plan quota reached).',
          });
          return;
        }
        if (upstreamRes.status === 429) {
          res.status(429).json({
            code: 'PROVIDER_QUOTA_EXCEEDED',
            error: 'GameSkinbo API quota or upstream rate limit exceeded. Please try again later.',
          });
          return;
        }
        if (upstreamRes.status === 404) {
          res.status(404).json({
            code: 'PLAYER_NOT_FOUND',
            error: `No player profile found for UID ${rawUid}.`,
          });
          return;
        }
        res.status(502).json({
          code: 'PROVIDER_FAILURE',
          error: `GameSkinbo API returned HTTP ${upstreamRes.status}.`,
        });
        return;
      }

      const profile = normalizeGameSkinboResponse(parsed, rawUid, rawRegion);
      if (!profile.accountInfo.nickname && profile.accountInfo.level === null) {
        res.status(404).json({
          code: 'PLAYER_NOT_FOUND',
          error: `No player details returned for UID ${rawUid}.`,
        });
        return;
      }

      res.json({
        configured: true,
        profile,
      });
    } catch (err) {
      const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
      res.status(isTimeout ? 504 : 502).json({
        code: isTimeout ? 'PROVIDER_TIMEOUT' : 'PROVIDER_NETWORK_ERROR',
        error: isTimeout
          ? 'GameSkinbo lookup timed out after 12 seconds.'
          : 'Unable to reach GameSkinbo API right now.',
      });
    }
  });

  app.get(
    '/api/website-speed/tests',
    createRateLimiter('observatory', 10, 60_000),
    async (req, res) => {
      const { token, zoneId } = getObservatoryConfig();
      if (!token || !zoneId) {
        res.status(503).json({
          configured: false,
          code: 'OBSERVATORY_NOT_CONFIGURED',
          error:
            'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID are not configured in server secrets.',
        });
        return;
      }

      const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(rawUrl);
        if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
          throw new Error('Protocol required');
        }
        if (isPrivateOrBlockedHostname(parsedUrl.hostname)) {
          res.status(400).json({
            code: 'BLOCKED_URL',
            error: 'Local or private network URLs are not permitted.',
          });
          return;
        }
      } catch {
        res.status(400).json({
          code: 'INVALID_URL',
          error: 'Provide a valid public URL starting with https:// or http://.',
        });
        return;
      }

      try {
        // SSRF protection: ensure URL belongs strictly to the configured Cloudflare Zone
        const zoneRes = await fetch(
          `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
            signal: AbortSignal.timeout(12_000),
          }
        );

        if (!zoneRes.ok) {
          res.status(zoneRes.status === 401 || zoneRes.status === 403 ? zoneRes.status : 502).json({
            code: 'ZONE_VERIFY_FAILED',
            error:
              zoneRes.status === 401 || zoneRes.status === 403
                ? 'Cloudflare API token lacks permission to read the configured Zone.'
                : `Cloudflare Zone lookup failed with HTTP ${zoneRes.status}.`,
          });
          return;
        }

        const zoneJson = (await zoneRes.json()) as {
          success?: boolean;
          result?: { name?: string };
        };
        const zoneDomain = (zoneJson?.result?.name || '').toLowerCase();
        const targetHost = parsedUrl.hostname.toLowerCase();

        if (!zoneDomain || (targetHost !== zoneDomain && !targetHost.endsWith(`.${zoneDomain}`))) {
          res.status(403).json({
            code: 'URL_OUTSIDE_ZONE',
            error: `URL hostname "${targetHost}" does not belong to the configured Cloudflare Zone (${zoneDomain || 'unknown'}).`,
          });
          return;
        }

        const normalizedPageUrl = parsedUrl.toString();
        const cfUrl = `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(
          zoneId
        )}/speed_api/pages/${encodeURIComponent(normalizedPageUrl)}/tests`;

        const cfRes = await fetch(cfUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(12_000),
        });

        const cfJson = (await cfRes.json().catch(() => ({}))) as {
          success?: boolean;
          errors?: Array<{ message?: string }>;
          result?: Array<Record<string, unknown>>;
        };

        if (!cfRes.ok || cfJson.success === false) {
          if (cfRes.status === 404) {
            res.json({
              configured: true,
              url: normalizedPageUrl,
              tests: [],
              message: 'No Cloudflare Observatory test history found for this URL yet.',
            });
            return;
          }
          res.status(cfRes.status === 401 || cfRes.status === 403 ? cfRes.status : 502).json({
            code: 'OBSERVATORY_API_ERROR',
            error:
              cfJson.errors?.[0]?.message ||
              `Cloudflare Observatory API returned HTTP ${cfRes.status}.`,
          });
          return;
        }

        const rawTests = Array.isArray(cfJson.result) ? cfJson.result.slice(0, 10) : [];
        const tests = rawTests.map((t) => {
          const regionObj = (t.region && typeof t.region === 'object' ? t.region : null) as Record<
            string,
            unknown
          > | null;
          const desktopReport = (t.desktopReport && typeof t.desktopReport === 'object'
            ? t.desktopReport
            : null) as Record<string, unknown> | null;
          const mobileReport = (t.mobileReport && typeof t.mobileReport === 'object'
            ? t.mobileReport
            : null) as Record<string, unknown> | null;

          const deskScore =
            typeof desktopReport?.performanceScore === 'number'
              ? desktopReport.performanceScore
              : null;
          const mobScore =
            typeof mobileReport?.performanceScore === 'number'
              ? mobileReport.performanceScore
              : null;

          return {
            id: String(t.id || ''),
            url: String(t.url || normalizedPageUrl),
            createdAt: String(t.date || t.createdAt || ''),
            region: String(regionObj?.label || regionObj?.value || t.region || 'Not available'),
            scheduleFrequency: String(t.scheduleFrequency || 'On-demand'),
            desktopPerformanceScore: deskScore,
            mobilePerformanceScore: mobScore,
          };
        });

        res.json({
          configured: true,
          url: normalizedPageUrl,
          tests,
        });
      } catch (err) {
        const isTimeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
        res.status(isTimeout ? 504 : 502).json({
          code: isTimeout ? 'OBSERVATORY_TIMEOUT' : 'OBSERVATORY_NETWORK_ERROR',
          error: isTimeout
            ? 'Cloudflare Observatory request timed out after 12 seconds.'
            : 'Unable to reach Cloudflare Observatory API.',
        });
      }
    }
  );

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ code: 'API_NOT_FOUND', error: 'API endpoint not found.' });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  return app;
}

const invokedDirectly =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  process.argv[1].endsWith('server.ts');

if (invokedDirectly) {
  createConfiguredApp()
    .then((app) => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[CrazyOpenPlace] Express server listening on http://0.0.0.0:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('[CrazyOpenPlace] Fatal startup error:', err);
      process.exit(1);
    });
}
