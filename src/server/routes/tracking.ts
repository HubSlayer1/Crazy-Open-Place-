import express from 'express';
import { D1BridgeError } from '../services/d1Bridge.ts';
import { lookupPrivateOrder } from '../services/trackingService.ts';

export function createTrackingRouter(
  rateLimiter: (bucket: string, max: number, windowMs: number) => express.RequestHandler
) {
  const router = express.Router();

  router.post('/api/track', rateLimiter('track_lookup', 20, 60_000), async (req, res) => {
    try {
      const result = await lookupPrivateOrder({
        orderReference: req.body?.orderReference,
        trackingToken: req.body?.trackingToken,
      });
      res.json(result);
    } catch (err) {
      if (err instanceof D1BridgeError) {
        res.status(err.status).json({ code: err.code, error: err.message });
        return;
      }
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        error: err instanceof Error ? err.message : 'Unable to look up order.',
      });
    }
  });

  return router;
}
