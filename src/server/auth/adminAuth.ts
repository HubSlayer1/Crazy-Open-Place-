import crypto from 'node:crypto';
import type express from 'express';
import { D1BridgeError, dispatchToD1 } from '../services/d1Bridge.ts';

export const ADMIN_COOKIE_NAME = 'crazy_admin_sid';
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

export interface AuthenticatedAdminSession {
  id: string;
  tokenHash: string;
  csrfHash: string;
  adminUsername: string;
  expiresAt: string;
}

export interface AdminRequest extends express.Request {
  adminSession?: AuthenticatedAdminSession;
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function resolveAdminCredentials(): {
  username: string;
  password: string;
  sessionSecret: string;
} {
  const username = (process.env.ADMIN_USERNAME || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  const sessionSecret = (process.env.SESSION_SECRET || '').trim();

  if (!username || !password || !sessionSecret || sessionSecret.length < 16) {
    throw new D1BridgeError(
      'Administrator authentication secrets (ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET) are not configured on this server.',
      503,
      'ADMIN_SECRETS_MISSING'
    );
  }

  return { username, password, sessionSecret };
}

function timingSafeTextEqual(a: string, b: string): boolean {
  const bufA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const bufB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

export function verifyScryptPassword(candidate: string, configuredPassword: string): boolean {
  if (!candidate || !configuredPassword) return false;

  if (configuredPassword.startsWith('scrypt$')) {
    const parts = configuredPassword.split('$');
    if (parts.length !== 3) return false;
    const [, saltHex, hashHex] = parts;
    if (!saltHex || !hashHex) return false;
    const derived = crypto.scryptSync(candidate, Buffer.from(saltHex, 'hex'), 64);
    const expected = Buffer.from(hashHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  }

  const runtimeSalt = crypto.randomBytes(16);
  const derivedCandidate = crypto.scryptSync(candidate, runtimeSalt, 64);
  const derivedExpected = crypto.scryptSync(configuredPassword, runtimeSalt, 64);
  return crypto.timingSafeEqual(derivedCandidate, derivedExpected);
}

export function getClientIp(req: express.Request): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0];
  return (first || req.socket.remoteAddress || 'unknown').trim().slice(0, 64);
}

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

export function buildAdminCookieHeader(req: express.Request, value: string, maxAgeSec: number): string {
  const isHttps =
    req.secure || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https';
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAgeSec}`,
  ];
  if (isHttps || process.env.NODE_ENV === 'production') {
    parts.push('Secure');
    parts.push('SameSite=None');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts.join('; ');
}

export async function loginAdmin(req: express.Request, usernameInput: string, passwordInput: string) {
  const { username, password, sessionSecret } = resolveAdminCredentials();
  const ipAddress = getClientIp(req);
  const sinceIso = new Date(Date.now() - LOGIN_WINDOW_MS).toISOString();

  const recent = await dispatchToD1<{ failCount: number }>('admin.login.attempts.recent', {
    ipAddress,
    sinceIso,
  });

  if (Number(recent.failCount || 0) >= MAX_FAILED_ATTEMPTS) {
    throw new D1BridgeError(
      'Too many failed administrator login attempts. Wait 15 minutes before retrying.',
      429,
      'ADMIN_RATE_LIMITED'
    );
  }

  const cleanUser = String(usernameInput || '').trim();
  const usernameOk = timingSafeTextEqual(cleanUser.toLowerCase(), username.toLowerCase());
  const passwordOk = verifyScryptPassword(String(passwordInput || ''), password);

  if (!usernameOk || !passwordOk) {
    await dispatchToD1('admin.login.attempt.record', {
      username: cleanUser.slice(0, 120),
      ipAddress,
      success: false,
    }).catch(() => {});
    throw new D1BridgeError('Invalid administrator username or password.', 401, 'INVALID_CREDENTIALS');
  }

  await dispatchToD1('admin.login.attempt.record', {
    username: username.slice(0, 120),
    ipAddress,
    success: true,
  }).catch(() => {});

  const sessionId = `adm-${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
  const sessionToken = crypto.randomBytes(32).toString('base64url');
  const csrfToken = crypto
    .createHmac('sha256', sessionSecret)
    .update(`csrf:${sessionId}`, 'utf8')
    .digest('base64url');
  const tokenHash = sha256Hex(`${sessionSecret}:${sessionToken}`);
  const csrfHash = sha256Hex(`${sessionSecret}:${csrfToken}`);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();

  await dispatchToD1('admin.session.create', {
    id: sessionId,
    tokenHash,
    csrfHash,
    adminUsername: username,
    expiresAt,
    ipAddress,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
  });

  return {
    sessionToken,
    csrfToken,
    adminUsername: username,
    expiresAt,
    maxAgeSec: SESSION_TTL_SECONDS,
  };
}

export async function validateAdminCookie(req: express.Request): Promise<{
  session: AuthenticatedAdminSession | null;
  sessionSecret: string | null;
}> {
  const sessionSecret = (process.env.SESSION_SECRET || '').trim();
  if (!sessionSecret) return { session: null, sessionSecret: null };

  const cookies = parseCookieHeader(req.headers.cookie);
  const rawToken = cookies[ADMIN_COOKIE_NAME];
  if (!rawToken) return { session: null, sessionSecret };

  const tokenHash = sha256Hex(`${sessionSecret}:${rawToken}`);
  const res = await dispatchToD1<{ session: AuthenticatedAdminSession | null }>(
    'admin.session.validate',
    { tokenHash }
  );
  return { session: res.session || null, sessionSecret };
}

export async function revokeAdminSession(req: express.Request): Promise<void> {
  const sessionSecret = (process.env.SESSION_SECRET || '').trim();
  if (!sessionSecret) return;
  const cookies = parseCookieHeader(req.headers.cookie);
  const rawToken = cookies[ADMIN_COOKIE_NAME];
  if (!rawToken) return;
  const tokenHash = sha256Hex(`${sessionSecret}:${rawToken}`);
  await dispatchToD1('admin.session.revoke', { tokenHash }).catch(() => {});
}

export async function requireAdminSession(
  req: AdminRequest,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const { session } = await validateAdminCookie(req);
    if (!session) {
      res.status(401).json({
        code: 'ADMIN_AUTH_REQUIRED',
        error: 'Administrator authentication is required.',
      });
      return;
    }
    req.adminSession = session;
    next();
  } catch (err) {
    const status = err instanceof D1BridgeError ? err.status : 500;
    const message = err instanceof Error ? err.message : 'Session validation failed.';
    res.status(status).json({ error: message });
  }
}
