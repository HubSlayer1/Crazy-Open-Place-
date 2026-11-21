import express from 'express';
import { D1BridgeError, dispatchToD1, isD1Configured } from '../services/d1Bridge.ts';

function resolveClientRef(req: express.Request): string {
  const raw = String(req.headers['x-client-ref'] || req.query.clientRef || '').trim();
  if (/^[a-zA-Z0-9_-]{8,80}$/.test(raw)) {
    return raw;
  }
  return 'guest-browser';
}

export function createUtilitiesRouter(
  rateLimiter: (bucket: string, max: number, windowMs: number) => express.RequestHandler
) {
  const router = express.Router();

  router.get('/api/speed-tests', async (req, res) => {
    if (!isD1Configured()) {
      res.json({ records: [], persisted: false });
      return;
    }
    try {
      const clientRef = resolveClientRef(req);
      const data = await dispatchToD1<{ records: unknown[] }>('speedTests.list', { clientRef });
      res.json({ records: data.records || [], persisted: true });
    } catch {
      res.json({ records: [], persisted: false });
    }
  });

  router.post('/api/speed-tests', rateLimiter('speed_save', 40, 60_000), async (req, res) => {
    if (!isD1Configured()) {
      res.json({ ok: true, persisted: false });
      return;
    }
    try {
      const clientRef = resolveClientRef(req);
      const data = await dispatchToD1('speedTests.create', {
        ...req.body,
        clientRef,
      });
      res.status(201).json({ ...data, persisted: true });
    } catch (err) {
      const status = err instanceof D1BridgeError ? err.status : 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Save failed.' });
    }
  });

  router.delete('/api/speed-tests/:id', async (req, res) => {
    if (!isD1Configured()) {
      res.json({ deleted: true, persisted: false });
      return;
    }
    try {
      const clientRef = resolveClientRef(req);
      await dispatchToD1('speedTests.delete', { id: req.params.id, clientRef });
      res.json({ deleted: true, persisted: true });
    } catch {
      res.json({ deleted: false });
    }
  });

  router.delete('/api/speed-tests', async (req, res) => {
    if (!isD1Configured()) {
      res.json({ cleared: true, persisted: false });
      return;
    }
    try {
      const clientRef = resolveClientRef(req);
      await dispatchToD1('speedTests.clear', { clientRef });
      res.json({ cleared: true, persisted: true });
    } catch {
      res.json({ cleared: false });
    }
  });

  router.get('/api/uid-lookups', async (req, res) => {
    if (!isD1Configured()) {
      res.json({ records: [], persisted: false });
      return;
    }
    try {
      const clientRef = resolveClientRef(req);
      const data = await dispatchToD1<{ records: unknown[] }>('uidLookups.list', { clientRef });
      res.json({ records: data.records || [], persisted: true });
    } catch {
      res.json({ records: [], persisted: false });
    }
  });

  router.post('/api/uid-lookups', rateLimiter('uid_save', 40, 60_000), async (req, res) => {
    if (!isD1Configured()) {
      res.json({ ok: true, persisted: false });
      return;
    }
    try {
      const clientRef = resolveClientRef(req);
      const data = await dispatchToD1('uidLookups.create', {
        ...req.body,
        clientRef,
      });
      res.status(201).json({ ...data, persisted: true });
    } catch (err) {
      const status = err instanceof D1BridgeError ? err.status : 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Save failed.' });
    }
  });

  router.delete('/api/uid-lookups/:id', async (req, res) => {
    if (!isD1Configured()) {
      res.json({ deleted: true, persisted: false });
      return;
    }
    try {
      const clientRef = resolveClientRef(req);
      await dispatchToD1('uidLookups.delete', { id: req.params.id, clientRef });
      res.json({ deleted: true, persisted: true });
    } catch {
      res.json({ deleted: false });
    }
  });

  router.delete('/api/uid-lookups', async (req, res) => {
    if (!isD1Configured()) {
      res.json({ cleared: true, persisted: false });
      return;
    }
    try {
      const clientRef = resolveClientRef(req);
      await dispatchToD1('uidLookups.clear', { clientRef });
      res.json({ cleared: true, persisted: true });
    } catch {
      res.json({ cleared: false });
    }
  });

  router.post('/api/contact', rateLimiter('contact_create', 10, 60_000), async (req, res) => {
    if (!isD1Configured()) {
      res.status(503).json({
        error: 'Cloudflare D1 database bridge is not configured on this server yet.',
      });
      return;
    }
    try {
      const data = await dispatchToD1('contact.create', {
        name: req.body?.name,
        contact: req.body?.contact,
        subject: req.body?.subject,
        message: req.body?.message,
      });
      res.status(201).json(data);
    } catch (err) {
      const status = err instanceof D1BridgeError ? err.status : 500;
      res.status(status).json({ error: err instanceof Error ? err.message : 'Submission failed.' });
    }
  });

  return router;
}
