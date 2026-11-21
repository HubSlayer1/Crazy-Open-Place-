import express from 'express';
import { D1BridgeError } from '../services/d1Bridge.ts';
import {
  cancelGuestOrder,
  createGuestOrder,
  submitOrderActivation,
  submitOrderPayment,
  submitOrderRefund,
  submitOrderSupport,
} from '../services/orderService.ts';

function handleRouteError(res: express.Response, err: unknown) {
  if (err instanceof D1BridgeError) {
    res.status(err.status).json({ code: err.code, error: err.message });
    return;
  }
  res.status(500).json({
    code: 'INTERNAL_ERROR',
    error: err instanceof Error ? err.message : 'Order request failed.',
  });
}

export function createOrdersRouter(
  rateLimiter: (bucket: string, max: number, windowMs: number) => express.RequestHandler
) {
  const router = express.Router();

  router.post('/api/orders', rateLimiter('order_create', 20, 60_000), async (req, res) => {
    try {
      const result = await createGuestOrder({
        packageId: req.body?.packageId,
        quantityMultiplier: req.body?.quantityMultiplier,
        guildId: req.body?.guildId,
        guildName: req.body?.guildName,
        region: req.body?.region,
        whatsapp: req.body?.whatsapp,
        idempotencyKey: req.body?.idempotencyKey,
      });
      res.status(result.deduplicated ? 200 : 201).json(result);
    } catch (err) {
      handleRouteError(res, err);
    }
  });

  router.post(
    '/api/orders/:orderRef/cancel',
    rateLimiter('order_mutate', 30, 60_000),
    async (req, res) => {
      try {
        const result = await cancelGuestOrder({
          orderReference: req.params.orderRef,
          trackingToken: req.body?.trackingToken || String(req.headers['x-tracking-token'] || ''),
          reason: req.body?.reason,
        });
        res.json(result);
      } catch (err) {
        handleRouteError(res, err);
      }
    }
  );

  router.post(
    '/api/orders/:orderRef/payment',
    rateLimiter('order_mutate', 30, 60_000),
    async (req, res) => {
      try {
        const result = await submitOrderPayment({
          orderReference: req.params.orderRef,
          trackingToken: req.body?.trackingToken || String(req.headers['x-tracking-token'] || ''),
          providerTransactionId: req.body?.providerTransactionId,
          binanceOrderId: req.body?.binanceOrderId,
          providerAccountUsername: req.body?.providerAccountUsername,
          paymentProofUrl: req.body?.paymentProofUrl,
        });
        res.json(result);
      } catch (err) {
        handleRouteError(res, err);
      }
    }
  );

  router.post(
    '/api/orders/:orderRef/activation',
    rateLimiter('order_mutate', 30, 60_000),
    async (req, res) => {
      try {
        const result = await submitOrderActivation({
          orderReference: req.params.orderRef,
          trackingToken: req.body?.trackingToken || String(req.headers['x-tracking-token'] || ''),
          providerGroupId: req.body?.providerGroupId,
          activationTransactionRef: req.body?.activationTransactionRef,
          customerActivationStatus: req.body?.customerActivationStatus,
          redeemCode: req.body?.redeemCode,
          activationProofUrl: req.body?.activationProofUrl,
        });
        res.json(result);
      } catch (err) {
        handleRouteError(res, err);
      }
    }
  );

  router.post(
    '/api/orders/:orderRef/refund',
    rateLimiter('order_mutate', 15, 60_000),
    async (req, res) => {
      try {
        const result = await submitOrderRefund({
          orderReference: req.params.orderRef,
          trackingToken: req.body?.trackingToken || String(req.headers['x-tracking-token'] || ''),
          providerTransactionRef: req.body?.providerTransactionRef,
          providerGroupRef: req.body?.providerGroupRef,
          ranOver30MinZeroGlory: Boolean(req.body?.ranOver30MinZeroGlory),
          runningMinutesObserved: Number(req.body?.runningMinutesObserved || 0),
          failureExplanation: req.body?.failureExplanation,
        });
        res.status(201).json(result);
      } catch (err) {
        handleRouteError(res, err);
      }
    }
  );

  router.post(
    '/api/orders/:orderRef/support',
    rateLimiter('order_mutate', 15, 60_000),
    async (req, res) => {
      try {
        const result = await submitOrderSupport({
          orderReference: req.params.orderRef,
          trackingToken: req.body?.trackingToken || String(req.headers['x-tracking-token'] || ''),
          category: req.body?.category,
          subject: req.body?.subject,
          message: req.body?.message,
        });
        res.status(201).json(result);
      } catch (err) {
        handleRouteError(res, err);
      }
    }
  );

  return router;
}
