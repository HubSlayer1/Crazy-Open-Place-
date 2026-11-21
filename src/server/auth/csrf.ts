import crypto from 'node:crypto';
import type express from 'express';
import { type AdminRequest, sha256Hex } from './adminAuth.ts';

function getAllowedOrigins(req: express.Request): Set<string> {
  const origins = new Set<string>();
  const host = req.headers.host;
  if (host) {
    origins.add(`http://${host}`);
    origins.add(`https://${host}`);
  }
  const appUrl = (process.env.APP_URL || '').trim();
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      // Ignore malformed APP_URL
    }
  }
  return origins;
}

export function requireSameOriginAndCsrf(
  req: AdminRequest,
  res: express.Response,
  next: express.NextFunction
) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }

  const allowedOrigins = getAllowedOrigins(req);
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  if (originHeader) {
    if (!allowedOrigins.has(originHeader)) {
      res.status(403).json({
        code: 'CSRF_ORIGIN_BLOCKED',
        error: 'Cross-origin state-changing request rejected.',
      });
      return;
    }
  } else if (refererHeader) {
    try {
      const refOrigin = new URL(refererHeader).origin;
      if (!allowedOrigins.has(refOrigin)) {
        res.status(403).json({
          code: 'CSRF_REFERER_BLOCKED',
          error: 'Invalid request referer origin.',
        });
        return;
      }
    } catch {
      res.status(403).json({ code: 'CSRF_REFERER_INVALID', error: 'Invalid referer header.' });
      return;
    }
  }

  const session = req.adminSession;
  const sessionSecret = (process.env.SESSION_SECRET || '').trim();
  if (!session || !sessionSecret) {
    res.status(401).json({ code: 'ADMIN_AUTH_REQUIRED', error: 'Administrator session required.' });
    return;
  }

  const csrfToken = String(req.headers['x-csrf-token'] || '').trim();
  if (!csrfToken) {
    res.status(403).json({ code: 'CSRF_TOKEN_MISSING', error: 'Missing X-CSRF-Token header.' });
    return;
  }

  const candidateHash = sha256Hex(`${sessionSecret}:${csrfToken}`);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(session.csrfHash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(403).json({ code: 'CSRF_TOKEN_INVALID', error: 'CSRF token mismatch.' });
    return;
  }

  next();
}
