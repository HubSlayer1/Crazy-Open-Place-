import crypto from 'node:crypto';
import { D1BridgeError, dispatchToD1 } from './d1Bridge.ts';
import { isValidProofUrl } from './providerService.ts';

const VALID_ORDER_REGIONS = new Set([
  'BD',
  'IND',
  'SG',
  'ID',
  'BR',
  'TH',
  'VN',
  'ME',
  'PK',
  'EU',
  'NA',
]);

const VALID_ACTIVATION_STATES = new Set([
  'LAUNCHED_ACTIVE',
  'WAITING_15_MIN',
  'GLORY_CHECKING',
  'ISSUE_REPORTED',
]);

export function resolveTrackingPepper(): string {
  const pepper = (process.env.TRACKING_CODE_PEPPER || '').trim();
  if (!pepper || pepper.length < 16) {
    throw new D1BridgeError(
      'Server secret TRACKING_CODE_PEPPER is missing or too short (minimum 16 characters required).',
      503,
      'SERVER_SECRET_MISSING'
    );
  }
  return pepper;
}

export function generateOrderReference(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(4);
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(bytes[i] % chars.length);
  }
  return `SER-${y}${m}${d}-${suffix}`;
}

export function generateTrackingToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function computeTrackingTokenHash(pepper: string, orderId: string, token: string): string {
  return crypto
    .createHmac('sha256', pepper)
    .update(`${orderId}:${token.trim()}`, 'utf8')
    .digest('hex');
}

export function verifyTrackingTokenHash(
  pepper: string,
  orderId: string,
  candidateToken: string,
  storedHash: string
): boolean {
  if (!candidateToken || !storedHash || !/^[a-f0-9]{64}$/i.test(storedHash)) {
    return false;
  }
  const expected = computeTrackingTokenHash(pepper, orderId, candidateToken);
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(storedHash.toLowerCase(), 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function normalizeTxKey(txId: string): string {
  const cleaned = txId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '_');
  return `tx_${cleaned.slice(0, 100)}`;
}

export async function createGuestOrder(input: {
  packageId: string;
  quantityMultiplier: number;
  guildId: string;
  guildName?: string;
  region: string;
  whatsapp?: string;
  idempotencyKey?: string;
}) {
  const pepper = resolveTrackingPepper();

  const packageId = String(input.packageId || '').trim();
  const guildId = String(input.guildId || '').trim();
  const guildName = String(input.guildName || '').trim().slice(0, 64);
  const region = String(input.region || '').trim().toUpperCase();
  const whatsapp = String(input.whatsapp || '').trim().slice(0, 24);
  const qty = Math.max(1, Math.min(10, Math.round(Number(input.quantityMultiplier) || 1)));
  const idempotencyKey =
    String(input.idempotencyKey || '').trim().slice(0, 80) ||
    `idem-${crypto.randomBytes(12).toString('hex')}`;

  if (!packageId) {
    throw new D1BridgeError('Package ID is required.', 400, 'VALIDATION_ERROR');
  }
  if (!/^\d{6,15}$/.test(guildId)) {
    throw new D1BridgeError('Guild ID must be a valid 6–15 digit numeric ID.', 400, 'VALIDATION_ERROR');
  }
  if (!VALID_ORDER_REGIONS.has(region)) {
    throw new D1BridgeError('Unsupported game server region selected.', 400, 'VALIDATION_ERROR');
  }
  if (whatsapp && !/^[0-9+\-\s()]{7,24}$/.test(whatsapp)) {
    throw new D1BridgeError('WhatsApp number format is invalid.', 400, 'VALIDATION_ERROR');
  }

  const orderId = generateOrderReference();
  const trackingToken = generateTrackingToken();
  const trackingTokenHash = computeTrackingTokenHash(pepper, orderId, trackingToken);

  const res = await dispatchToD1<{
    order: Record<string, unknown>;
    refunds: Array<Record<string, unknown>>;
    tickets: Array<Record<string, unknown>>;
    deduplicated?: boolean;
  }>('order.create', {
    orderId,
    orderReference: orderId,
    idempotencyKey,
    trackingTokenHash,
    packageId,
    quantityMultiplier: qty,
    guildId,
    guildName,
    region,
    whatsapp,
  });

  return {
    order: res.order,
    refunds: res.refunds || [],
    tickets: res.tickets || [],
    trackingToken: res.deduplicated ? null : trackingToken,
    deduplicated: Boolean(res.deduplicated),
  };
}

export async function authorizeOrderMutation(orderReference: string, trackingToken: string) {
  const pepper = resolveTrackingPepper();
  const cleanRef = String(orderReference || '').trim();
  const cleanToken = String(trackingToken || '').trim();
  if (!cleanRef || !cleanToken) {
    throw new D1BridgeError(
      'Both Order Number and Private Tracking Code are required.',
      401,
      'TRACKING_AUTH_REQUIRED'
    );
  }

  const lookup = await dispatchToD1<{
    order: (Record<string, unknown> & { trackingTokenHash?: string }) | null;
    refunds: Array<Record<string, unknown>>;
    tickets: Array<Record<string, unknown>>;
    settings: Record<string, unknown> | null;
  }>('track.lookup', { orderReference: cleanRef });

  if (!lookup.order || !lookup.order.trackingTokenHash) {
    throw new D1BridgeError(
      'Invalid Order Number or Private Tracking Code.',
      403,
      'TRACKING_AUTH_INVALID'
    );
  }

  const orderId = String(lookup.order.id || '');
  const ok = verifyTrackingTokenHash(pepper, orderId, cleanToken, String(lookup.order.trackingTokenHash));
  if (!ok) {
    throw new D1BridgeError(
      'Invalid Order Number or Private Tracking Code.',
      403,
      'TRACKING_AUTH_INVALID'
    );
  }

  return orderId;
}

export async function submitOrderPayment(input: {
  orderReference: string;
  trackingToken: string;
  providerTransactionId: string;
  binanceOrderId?: string;
  providerAccountUsername?: string;
  paymentProofUrl?: string;
}) {
  const orderId = await authorizeOrderMutation(input.orderReference, input.trackingToken);
  const txId = String(input.providerTransactionId || '').trim();
  if (txId.length < 3 || txId.length > 80) {
    throw new D1BridgeError('Provider Transaction ID must be 3–80 characters.', 400, 'VALIDATION_ERROR');
  }
  const proofUrl = String(input.paymentProofUrl || '').trim();
  if (!isValidProofUrl(proofUrl)) {
    throw new D1BridgeError('Payment proof URL must start with https:// or be blank.', 400, 'VALIDATION_ERROR');
  }

  return dispatchToD1('order.payment.submit', {
    orderId,
    providerTransactionId: txId,
    txKey: normalizeTxKey(txId),
    binanceOrderId: String(input.binanceOrderId || '').trim().slice(0, 80),
    providerAccountUsername: String(input.providerAccountUsername || '').trim().slice(0, 80),
    paymentProofUrl: proofUrl.slice(0, 400),
  });
}

export async function submitOrderActivation(input: {
  orderReference: string;
  trackingToken: string;
  providerGroupId: string;
  activationTransactionRef?: string;
  customerActivationStatus: string;
  redeemCode?: string;
  activationProofUrl?: string;
}) {
  const orderId = await authorizeOrderMutation(input.orderReference, input.trackingToken);
  const groupId = String(input.providerGroupId || '').trim();
  if (groupId.length < 2 || groupId.length > 80) {
    throw new D1BridgeError('Provider Group ID must be 2–80 characters.', 400, 'VALIDATION_ERROR');
  }
  const proofUrl = String(input.activationProofUrl || '').trim();
  if (!isValidProofUrl(proofUrl)) {
    throw new D1BridgeError('Activation proof URL must start with https:// or be blank.', 400, 'VALIDATION_ERROR');
  }
  const actStatus = VALID_ACTIVATION_STATES.has(input.customerActivationStatus)
    ? input.customerActivationStatus
    : 'WAITING_15_MIN';

  return dispatchToD1('order.activation.submit', {
    orderId,
    providerGroupId: groupId,
    activationTransactionRef: String(input.activationTransactionRef || '').trim().slice(0, 80),
    customerActivationStatus: actStatus,
    redeemCode: String(input.redeemCode || '').trim().slice(0, 80),
    activationProofUrl: proofUrl.slice(0, 400),
  });
}

export async function cancelGuestOrder(input: {
  orderReference: string;
  trackingToken: string;
  reason?: string;
}) {
  const orderId = await authorizeOrderMutation(input.orderReference, input.trackingToken);
  return dispatchToD1('order.cancel', {
    orderId,
    reason: String(input.reason || 'Cancelled by customer prior to provider payment.').trim().slice(0, 500),
  });
}

export async function submitOrderRefund(input: {
  orderReference: string;
  trackingToken: string;
  providerTransactionRef?: string;
  providerGroupRef?: string;
  ranOver30MinZeroGlory: boolean;
  runningMinutesObserved: number;
  failureExplanation: string;
}) {
  const orderId = await authorizeOrderMutation(input.orderReference, input.trackingToken);
  const explanation = String(input.failureExplanation || '').trim();
  if (explanation.length < 10) {
    throw new D1BridgeError('Failure explanation must be at least 10 characters.', 400, 'VALIDATION_ERROR');
  }

  return dispatchToD1('order.refund.create', {
    orderId,
    providerTransactionRef: String(input.providerTransactionRef || '').trim().slice(0, 80),
    providerGroupRef: String(input.providerGroupRef || '').trim().slice(0, 80),
    ranOver30MinZeroGlory: Boolean(input.ranOver30MinZeroGlory),
    runningMinutesObserved: Math.max(0, Math.min(1440, Math.round(Number(input.runningMinutesObserved) || 0))),
    failureExplanation: explanation.slice(0, 2000),
  });
}

export async function submitOrderSupport(input: {
  orderReference: string;
  trackingToken: string;
  category: string;
  subject: string;
  message: string;
}) {
  const orderId = await authorizeOrderMutation(input.orderReference, input.trackingToken);
  const subject = String(input.subject || '').trim();
  const message = String(input.message || '').trim();
  if (subject.length < 3 || message.length < 10) {
    throw new D1BridgeError('Subject (>=3 chars) and message (>=10 chars) are required.', 400, 'VALIDATION_ERROR');
  }
  const category = ['SUPPORT', 'PAYMENT_ISSUE', 'SERVICE_ISSUE'].includes(input.category)
    ? input.category
    : 'SUPPORT';

  return dispatchToD1('order.support.create', {
    orderId,
    category,
    subject: subject.slice(0, 140),
    message: message.slice(0, 2000),
  });
}
