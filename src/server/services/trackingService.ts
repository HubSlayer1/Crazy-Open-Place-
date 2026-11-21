import { D1BridgeError, dispatchToD1 } from './d1Bridge.ts';
import { resolveTrackingPepper, verifyTrackingTokenHash } from './orderService.ts';
import { DEFAULT_STOREFRONT_SETTINGS } from './providerService.ts';

export async function lookupPrivateOrder(input: {
  orderReference: string;
  trackingToken: string;
}) {
  const pepper = resolveTrackingPepper();
  const orderReference = String(input.orderReference || '').trim();
  const trackingToken = String(input.trackingToken || '').trim();

  if (!orderReference || !trackingToken) {
    throw new D1BridgeError(
      'Enter both your Order Number and Private Tracking Code.',
      400,
      'VALIDATION_ERROR'
    );
  }

  const res = await dispatchToD1<{
    order: (Record<string, unknown> & { trackingTokenHash?: string }) | null;
    refunds: Array<Record<string, unknown>>;
    tickets: Array<Record<string, unknown>>;
    settings: Record<string, unknown> | null;
  }>('track.lookup', { orderReference });

  if (!res.order || !res.order.trackingTokenHash) {
    throw new D1BridgeError(
      'Order not found or tracking code does not match.',
      404,
      'TRACKING_NOT_FOUND'
    );
  }

  const orderId = String(res.order.id || '');
  const valid = verifyTrackingTokenHash(pepper, orderId, trackingToken, String(res.order.trackingTokenHash));
  if (!valid) {
    throw new D1BridgeError(
      'Order not found or tracking code does not match.',
      404,
      'TRACKING_NOT_FOUND'
    );
  }

  const sanitizedOrder = { ...res.order };
  delete sanitizedOrder.trackingTokenHash;
  delete sanitizedOrder.idempotencyKey;

  return {
    order: sanitizedOrder,
    refunds: res.refunds || [],
    tickets: res.tickets || [],
    settings: res.settings || DEFAULT_STOREFRONT_SETTINGS,
  };
}
