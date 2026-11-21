import crypto from 'node:crypto';
import express from 'express';
import {
  type AdminRequest,
  buildAdminCookieHeader,
  loginAdmin,
  requireAdminSession,
  revokeAdminSession,
  validateAdminCookie,
} from '../auth/adminAuth.ts';
import { requireSameOriginAndCsrf } from '../auth/csrf.ts';
import {
  adminAddRedeemCode,
  adminAssignRedeemCode,
  adminDeletePackage,
  adminDeleteRedeemCode,
  adminListAuditLogs,
  adminReplyTicket,
  adminSavePackage,
  adminUpdateContact,
  adminUpdateOrder,
  adminUpdateRefund,
  adminUpdateSettings,
  adminVerifyOrderPayment,
  executeMigrationFromBackup,
  getAdminDashboardData,
  getMigrationCenterStatus,
  getRecoveryCsvDownload,
  listAdminOrders,
} from '../services/adminService.ts';
import { D1BridgeError } from '../services/d1Bridge.ts';
import type { LegacyBackupBundle } from '../../../migration/migrationValidation.ts';

function handleAdminError(res: express.Response, err: unknown) {
  if (err instanceof D1BridgeError) {
    res.status(err.status).json({ code: err.code, error: err.message });
    return;
  }
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    error: err instanceof Error ? err.message : 'Admin request failed.',
  });
}

export function createAdminRouter() {
  const router = express.Router();

  router.post('/api/admin/login', async (req, res) => {
    try {
      const result = await loginAdmin(
        req,
        String(req.body?.username || ''),
        String(req.body?.password || '')
      );
      res.setHeader(
        'Set-Cookie',
        buildAdminCookieHeader(req, result.sessionToken, result.maxAgeSec)
      );
      res.json({
        authenticated: true,
        adminUsername: result.adminUsername,
        csrfToken: result.csrfToken,
        expiresAt: result.expiresAt,
      });
    } catch (err) {
      handleAdminError(res, err);
    }
  });

  router.get('/api/admin/session', async (req, res) => {
    try {
      const { session, sessionSecret } = await validateAdminCookie(req);
      if (!session || !sessionSecret) {
        res.json({ authenticated: false });
        return;
      }
      // Re-issue a fresh CSRF token only if client doesn't have it? No — issue fresh csrf only on login or store csrf per session.
      //Wait: if admin reloads browser page, return { authenticated: true, adminUsername } and issue a new CSRF token rotated or verified.
      res.json({
        authenticated: true,
        adminUsername: session.adminUsername,
        expiresAt: session.expiresAt,
      });
    } catch {
      res.json({ authenticated: false });
    }
  });

  router.post('/api/admin/logout', requireAdminSession, requireSameOriginAndCsrf, async (req, res) => {
    await revokeAdminSession(req);
    res.setHeader('Set-Cookie', buildAdminCookieHeader(req, '', 0));
    res.json({ ok: true });
  });

  // Note: allow GET /api/admin/csrf only for already authenticated cookie sessions so page reloads preserve CSRF token safely!
  router.get('/api/admin/csrf', requireAdminSession, async (req: AdminRequest, res) => {
    // We derive a stable per-session CSRF token using HMAC(sessionSecret, session.id) OR wait:
    // Better yet, rotate or check! Wait: if session.csrfHash = sha256(sessionSecret + ":" + csrfToken),
    // we can generate csrfToken deterministically from HMAC(sessionSecret, session.id) or issue a new session?
    // Even simpler: compute expected CSRF deterministically at login from HMAC(sessionSecret, session.id) so GET /api/admin/csrf can safely return it only to an authenticated same-origin HttpOnly cookie holder!
    res.json({ csrfToken: req.adminSession?.id ? deriveSessionCsrfToken(req.adminSession.id) : '' });
  });

  router.get('/api/admin/dashboard', requireAdminSession, async (_req, res) => {
    try {
      const data = await getAdminDashboardData();
      res.json(data);
    } catch (err) {
      handleAdminError(res, err);
    }
  });

  router.get('/api/admin/orders', requireAdminSession, async (req, res) => {
    try {
      const status = typeof req.query.status === 'string' ? req.query.status : '';
      const data = await listAdminOrders(status);
      res.json(data);
    } catch (err) {
      handleAdminError(res, err);
    }
  });

  router.patch(
    '/api/admin/orders/:id/verify-payment',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const data = await adminVerifyOrderPayment({
          orderId: req.params.id,
          approve: Boolean(req.body?.approve),
          adminUsername: req.adminSession!.adminUsername,
          adminNote: String(req.body?.adminNote || ''),
        });
        res.json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.patch(
    '/api/admin/orders/:id/status',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const data = await adminUpdateOrder({
          orderId: req.params.id,
          status: String(req.body?.status || ''),
          adminUsername: req.adminSession!.adminUsername,
          note: String(req.body?.note || ''),
          providerGroupId:
            typeof req.body?.providerGroupId === 'string' ? req.body.providerGroupId : undefined,
          redeemCode: typeof req.body?.redeemCode === 'string' ? req.body.redeemCode : undefined,
        });
        res.json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.post(
    '/api/admin/packages',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const data = await adminSavePackage({
          ...req.body,
          id: undefined,
          adminUsername: req.adminSession!.adminUsername,
        });
        res.status(201).json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.patch(
    '/api/admin/packages/:id',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const data = await adminSavePackage({
          ...req.body,
          id: req.params.id,
          adminUsername: req.adminSession!.adminUsername,
        });
        res.json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.delete(
    '/api/admin/packages/:id',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const data = await adminDeletePackage(req.params.id, req.adminSession!.adminUsername);
        res.json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.patch(
    '/api/admin/settings',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const data = await adminUpdateSettings(req.body || {}, req.adminSession!.adminUsername);
        res.json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.patch(
    '/api/admin/refunds/:id',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const data = await adminUpdateRefund({
          refundId: req.params.id,
          status: String(req.body?.status || 'PENDING_REVIEW'),
          providerRefundResult: String(req.body?.providerRefundResult || 'PENDING'),
          customerRefundResult: String(req.body?.customerRefundResult || 'PENDING'),
          refundAmountLabel: String(req.body?.refundAmountLabel || ''),
          adminResolutionNote: String(req.body?.adminResolutionNote || ''),
          adminUsername: req.adminSession!.adminUsername,
        });
        res.json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.post(
    '/api/admin/redeem-codes',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const data = await adminAddRedeemCode({
          code: String(req.body?.code || ''),
          packageName: String(req.body?.packageName || 'Guild Glory Package'),
          note: String(req.body?.note || ''),
          adminUsername: req.adminSession!.adminUsername,
        });
        res.status(201).json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.post(
    '/api/admin/redeem-codes/:id/assign',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const data = await adminAssignRedeemCode({
          redeemId: req.params.id,
          orderId: String(req.body?.orderId || ''),
          adminUsername: req.adminSession!.adminUsername,
        });
        res.json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.delete(
    '/api/admin/redeem-codes/:id',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req, res) => {
      try {
        const data = await adminDeleteRedeemCode(req.params.id);
        res.json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.patch(
    '/api/admin/support-tickets/:id',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const data = await adminReplyTicket({
          ticketId: req.params.id,
          status: String(req.body?.status || 'IN_PROGRESS'),
          adminReply: String(req.body?.adminReply || ''),
          adminUsername: req.adminSession!.adminUsername,
        });
        res.json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.patch(
    '/api/admin/contact-messages/:id',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const data = await adminUpdateContact({
          id: req.params.id,
          status: String(req.body?.status || 'RESOLVED'),
          adminUsername: req.adminSession!.adminUsername,
        });
        res.json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.get('/api/admin/audit-logs', requireAdminSession, async (_req, res) => {
    try {
      const data = await adminListAuditLogs();
      res.json(data);
    } catch (err) {
      handleAdminError(res, err);
    }
  });

  router.get('/api/admin/migration/status', requireAdminSession, async (_req, res) => {
    try {
      const data = await getMigrationCenterStatus();
      res.json(data);
    } catch (err) {
      handleAdminError(res, err);
    }
  });

  router.post(
    '/api/admin/migration/import',
    requireAdminSession,
    requireSameOriginAndCsrf,
    async (req: AdminRequest, res) => {
      try {
        const customBundle =
          req.body?.bundle && typeof req.body.bundle === 'object'
            ? (req.body.bundle as LegacyBackupBundle)
            : undefined;
        const data = await executeMigrationFromBackup(
          req.adminSession!.adminUsername,
          customBundle
        );
        res.json(data);
      } catch (err) {
        handleAdminError(res, err);
      }
    }
  );

  router.get('/api/admin/migration/recovery-csv/:runId', requireAdminSession, (req, res) => {
    const csv = getRecoveryCsvDownload(req.params.runId);
    if (!csv) {
      res.status(404).json({ error: 'Recovery CSV run not found or expired.' });
      return;
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="crazy-org-recovery-${req.params.runId}.csv"`
    );
    res.setHeader('Cache-Control', 'no-store');
    res.send(csv);
  });

  return router;
}

function deriveSessionCsrfToken(sessionId: string): string {
  const secret = (process.env.SESSION_SECRET || '').trim();
  return crypto.createHmac('sha256', secret).update(`csrf:${sessionId}`, 'utf8').digest('base64url');
}
