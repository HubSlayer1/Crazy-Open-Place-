import { type DispatchAction, type Env, WorkerAppError } from './types';

const OFFICIAL_PROVIDER_URL = 'https://www.ffglory.pro/';

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
}

function str(value: unknown, fallback = '', max = 2000): string {
  if (value === null || value === undefined) return fallback;
  return String(value).slice(0, max);
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function int(value: unknown, fallback = 0): number {
  return Math.round(num(value, fallback));
}

function parseJsonArray(raw: unknown, fallback: string[]): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x));
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function mapPackageRow(row: Record<string, unknown>) {
  const sellingPriceMinor = int(row.selling_price_minor, 0);
  return {
    id: str(row.id),
    productId: str(row.product_id, 'prod-ff-guild-glory'),
    slug: str(row.slug),
    name: str(row.name),
    botQuantity: int(row.bot_count, 1),
    sellingPriceMinor,
    priceAmount: Number((sellingPriceMinor / 100).toFixed(2)),
    currency: str(row.currency, 'USD', 8),
    durationLabel: str(row.duration_label),
    supportedRegions: parseJsonArray(row.supported_regions_json, ['BD', 'IND', 'SG']),
    description: str(row.description),
    instructions: str(row.instructions),
    warnings: str(row.warnings),
    refundNote: str(row.refund_note),
    providerPriceNote: str(row.provider_price_note),
    estimatedDelivery: str(row.estimated_delivery),
    enabled: int(row.active, 1) === 1,
    sortOrder: int(row.sort_order, 1),
    updatedAt: str(row.updated_at),
  };
}

function mapSettingsRow(row: Record<string, unknown> | null) {
  if (!row) {
    return {
      providerName: 'FFGlory',
      providerHomepage: OFFICIAL_PROVIDER_URL,
      providerTrackingUrl: OFFICIAL_PROVIDER_URL,
      currency: 'USD',
      supportedHandoffMethod: 'Second browser tab handoff + manual transaction & Group ID verification',
      providerTransactionFieldsNote:
        'Fields submitted on FFGlory: Transaction ID, Credits requested, Amount to pay, Binance Pay ID, optional Binance Order ID.',
      serviceInstructions: '',
      paymentInstructions: '',
      importantWarnings: '',
      refundConditions: '',
      supportWhatsapp: '',
      supportEmail: '',
      supportHours: 'Daily 10:00 – 23:00 UTC',
      updatedAt: nowIso(),
    };
  }
  return {
    providerName: str(row.provider_name, 'FFGlory', 60),
    providerHomepage: OFFICIAL_PROVIDER_URL,
    providerTrackingUrl: OFFICIAL_PROVIDER_URL,
    currency: str(row.currency, 'USD', 8),
    supportedHandoffMethod: str(row.supported_handoff_method),
    providerTransactionFieldsNote: str(row.provider_transaction_fields_note),
    serviceInstructions: str(row.service_instructions),
    paymentInstructions: str(row.payment_instructions),
    importantWarnings: str(row.important_warnings),
    refundConditions: str(row.refund_conditions),
    supportWhatsapp: str(row.support_whatsapp),
    supportEmail: str(row.support_email),
    supportHours: str(row.support_hours),
    updatedAt: str(row.updated_at),
  };
}

async function hydrateOrder(
  db: D1Database,
  orderRow: Record<string, unknown>,
  includeTrackingHash = false
) {
  const orderId = str(orderRow.id);
  const [timelineRes, txRow, actRow, refundsRes, ticketsRes] = await Promise.all([
    db
      .prepare('SELECT * FROM order_timeline WHERE order_id = ? ORDER BY created_at ASC')
      .bind(orderId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM provider_transactions WHERE order_id = ? LIMIT 1')
      .bind(orderId)
      .first<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM activations WHERE order_id = ? LIMIT 1')
      .bind(orderId)
      .first<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM refunds WHERE order_id = ? ORDER BY created_at DESC')
      .bind(orderId)
      .all<Record<string, unknown>>(),
    db
      .prepare('SELECT * FROM support_tickets WHERE order_id = ? ORDER BY created_at DESC')
      .bind(orderId)
      .all<Record<string, unknown>>(),
  ]);

  const history = (timelineRes.results || []).map((t) => ({
    id: str(t.id),
    timestamp: str(t.created_at),
    previousStatus: t.previous_status ? str(t.previous_status) : null,
    status: str(t.status),
    actorRole: str(t.actor_role, 'system'),
    actorLabel: str(t.actor_label, 'System'),
    title: str(t.title),
    note: str(t.note),
  }));

  const refunds = await Promise.all(
    (refundsRes.results || []).map(async (r) => {
      const histRes = await db
        .prepare('SELECT * FROM refund_history WHERE refund_id = ? ORDER BY created_at ASC')
        .bind(str(r.id))
        .all<Record<string, unknown>>();
      return {
        id: str(r.id),
        orderId: str(r.order_id),
        providerTransactionRef: str(r.provider_tx_ref),
        providerGroupRef: str(r.provider_group_ref),
        ranOver30MinZeroGlory: int(r.ran_over_30_min_zero_glory, 0) === 1,
        runningMinutesObserved: int(r.running_minutes_observed, 0),
        failureExplanation: str(r.explanation),
        status: str(r.status),
        providerRefundResult: str(r.provider_refund_result),
        customerRefundResult: str(r.customer_refund_result),
        refundAmountLabel: str(r.refund_amount_label),
        refundAmountMinor: int(r.refund_amount_minor, 0),
        refundCurrency: str(r.refund_currency, 'USD'),
        adminResolutionNote: str(r.admin_note),
        reviewedBy: str(r.reviewed_by) || undefined,
        createdAt: str(r.created_at),
        updatedAt: str(r.updated_at),
        history: (histRes.results || []).map((h) => ({
          id: str(h.id),
          timestamp: str(h.created_at),
          status: str(h.status),
          actor: str(h.actor),
          note: str(h.note),
        })),
      };
    })
  );

  const tickets = (ticketsRes.results || []).map((tk) => ({
    id: str(tk.id),
    orderId: tk.order_id ? str(tk.order_id) : '',
    category: str(tk.category),
    subject: str(tk.subject),
    message: str(tk.message),
    status: str(tk.status),
    adminReply: str(tk.admin_reply) || undefined,
    reviewedBy: str(tk.reviewed_by) || undefined,
    createdAt: str(tk.created_at),
    updatedAt: str(tk.updated_at),
  }));

  const unitPriceMinor = int(orderRow.unit_price_minor, 0);
  const totalPriceMinor = int(orderRow.total_price_minor, 0);

  const order: Record<string, unknown> = {
    id: orderId,
    orderReference: str(orderRow.order_reference, orderId),
    idempotencyKey: str(orderRow.idempotency_key),
    guildId: str(orderRow.guild_uid),
    guildName: str(orderRow.guild_name),
    region: str(orderRow.region),
    whatsapp: str(orderRow.whatsapp_contact),
    packageId: str(orderRow.package_id),
    packageName: str(orderRow.package_name),
    botQuantity: int(orderRow.bot_count, 1),
    quantityMultiplier: int(orderRow.quantity_multiplier, 1),
    totalBots: int(orderRow.total_bots, 1),
    unitPriceMinor,
    totalPriceMinor,
    unitPrice: Number((unitPriceMinor / 100).toFixed(2)),
    totalAmount: Number((totalPriceMinor / 100).toFixed(2)),
    currency: str(orderRow.currency, 'USD'),
    paymentStatus: str(orderRow.payment_status, 'AWAITING_PAYMENT'),
    status: str(orderRow.service_status, 'AWAITING_PROVIDER_PAYMENT'),
    providerName: str(orderRow.provider_name, 'FFGlory'),
    providerUrl: OFFICIAL_PROVIDER_URL,
    legacyCustomerRef: orderRow.legacy_customer_ref ? str(orderRow.legacy_customer_ref) : undefined,
    createdAt: str(orderRow.created_at),
    updatedAt: str(orderRow.updated_at),
    providerTransactionId: txRow ? str(txRow.provider_transaction_id) : undefined,
    binanceOrderId: txRow ? str(txRow.binance_order_id) : undefined,
    providerAccountUsername: txRow ? str(txRow.provider_account_username) : undefined,
    paymentProofUrl: txRow ? str(txRow.payment_proof_url) : undefined,
    paymentSubmittedAt: txRow ? str(txRow.submitted_at) : undefined,
    paymentVerifiedAt: txRow?.verified_at ? str(txRow.verified_at) : undefined,
    paymentVerifiedBy: txRow ? str(txRow.verified_by) : undefined,
    paymentAdminNote: txRow ? str(txRow.admin_note) : undefined,
    providerGroupId: actRow ? str(actRow.provider_group_id) : undefined,
    activationTransactionRef: actRow ? str(actRow.activation_tx_ref) : undefined,
    customerActivationStatus: actRow ? str(actRow.customer_status) : undefined,
    redeemCode:
      (orderRow.redeem_code_assigned ? str(orderRow.redeem_code_assigned) : '') ||
      (actRow ? str(actRow.redeem_code) : '') ||
      undefined,
    activationProofUrl: actRow ? str(actRow.proof_url) : undefined,
    activationSubmittedAt: actRow ? str(actRow.submitted_at) : undefined,
    activationVerifiedAt: actRow?.verified_at ? str(actRow.verified_at) : undefined,
    activationVerifiedBy: actRow ? str(actRow.verified_by) : undefined,
    activationAdminNote: actRow ? str(actRow.admin_note) : undefined,
    history,
  };

  if (includeTrackingHash) {
    order.trackingTokenHash = str(orderRow.tracking_token_hash);
  }

  return { order, refunds, tickets };
}

export async function handleDispatch(
  action: DispatchAction,
  payload: Record<string, unknown>,
  env: Env
): Promise<Record<string, unknown>> {
  const db = env.DB;

  switch (action) {
    case 'storefront.get': {
      const [pkgRes, settingsRow] = await Promise.all([
        db
          .prepare('SELECT * FROM packages WHERE active = 1 ORDER BY sort_order ASC, updated_at DESC')
          .all<Record<string, unknown>>(),
        db.prepare('SELECT * FROM storefront_settings WHERE id = ?').bind('main').first<Record<string, unknown>>(),
      ]);
      return {
        packages: (pkgRes.results || []).map(mapPackageRow),
        settings: mapSettingsRow(settingsRow || null),
      };
    }

    case 'packages.list': {
      const activeOnly = payload.activeOnly !== false;
      const sql = activeOnly
        ? 'SELECT * FROM packages WHERE active = 1 ORDER BY sort_order ASC'
        : 'SELECT * FROM packages ORDER BY sort_order ASC, updated_at DESC';
      const res = await db.prepare(sql).all<Record<string, unknown>>();
      return {
        packages: (res.results || []).map(mapPackageRow),
      };
    }

    case 'order.create': {
      const idempotencyKey = str(payload.idempotencyKey, '', 120).trim();
      if (!idempotencyKey) throw new WorkerAppError('Missing idempotencyKey.');

      const existingKeyRow = await db
        .prepare('SELECT resource_id FROM idempotency_keys WHERE key = ? AND scope = ? LIMIT 1')
        .bind(idempotencyKey, 'order.create')
        .first<{ resource_id: string }>();

      if (existingKeyRow) {
        const existingOrder = await db
          .prepare('SELECT * FROM orders WHERE id = ? LIMIT 1')
          .bind(existingKeyRow.resource_id)
          .first<Record<string, unknown>>();
        if (existingOrder) {
          const hydrated = await hydrateOrder(db, existingOrder);
          return { ...hydrated, deduplicated: true };
        }
      }

      const packageId = str(payload.packageId, '', 120);
      const pkgRow = await db
        .prepare('SELECT * FROM packages WHERE id = ? LIMIT 1')
        .bind(packageId)
        .first<Record<string, unknown>>();
      if (!pkgRow) throw new WorkerAppError('Selected package was not found.', 404, 'PACKAGE_NOT_FOUND');
      if (int(pkgRow.active, 0) !== 1) {
        throw new WorkerAppError('Selected package is currently inactive.', 400, 'PACKAGE_INACTIVE');
      }

      const qty = Math.max(1, Math.min(10, int(payload.quantityMultiplier, 1)));
      const botCount = int(pkgRow.bot_count, 1);
      const totalBots = botCount * qty;
      const unitPriceMinor = int(pkgRow.selling_price_minor, 0);
      const totalPriceMinor = unitPriceMinor * qty;
      const currency = str(pkgRow.currency, 'USD', 8);

      const orderId = str(payload.orderId, '', 80);
      const orderReference = str(payload.orderReference, orderId, 80);
      const trackingTokenHash = str(payload.trackingTokenHash, '', 128);
      const guildUid = str(payload.guildId, '', 32).trim();
      const guildName = str(payload.guildName, '', 80).trim();
      const region = str(payload.region, 'BD', 12).trim().toUpperCase();
      const whatsapp = str(payload.whatsapp, '', 32).trim();
      if (!orderId || !trackingTokenHash) {
        throw new WorkerAppError('Invalid server order parameters.');
      }

      const ts = nowIso();
      const evt1 = makeId('evt');
      const evt2 = makeId('evt');

      await db.batch([
        db
          .prepare(
            `INSERT INTO orders (
              id, order_reference, idempotency_key, tracking_token_hash,
              package_id, package_name, guild_uid, guild_name, region, whatsapp_contact,
              quantity_multiplier, bot_count, total_bots, unit_price_minor, total_price_minor, currency,
              payment_status, service_status, provider_name, provider_url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            orderId,
            orderReference,
            idempotencyKey,
            trackingTokenHash,
            packageId,
            str(pkgRow.name),
            guildUid,
            guildName,
            region,
            whatsapp,
            qty,
            botCount,
            totalBots,
            unitPriceMinor,
            totalPriceMinor,
            currency,
            'AWAITING_PAYMENT',
            'AWAITING_PROVIDER_PAYMENT',
            'FFGlory',
            OFFICIAL_PROVIDER_URL,
            ts,
            ts
          ),
        db
          .prepare('INSERT INTO idempotency_keys (key, scope, resource_id, created_at) VALUES (?, ?, ?, ?)')
          .bind(idempotencyKey, 'order.create', orderId, ts),
        db
          .prepare(
            `INSERT INTO order_timeline (
              id, order_id, previous_status, status, actor_role, actor_label, title, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            evt1,
            orderId,
            null,
            'ORDER_CREATED',
            'customer',
            `Guest (${region})`,
            'Order Created',
            `Created guest order for ${str(pkgRow.name)} (${totalBots} bots) targeting Guild ${guildUid} (${region}).`,
            ts
          ),
        db
          .prepare(
            `INSERT INTO order_timeline (
              id, order_id, previous_status, status, actor_role, actor_label, title, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            evt2,
            orderId,
            'ORDER_CREATED',
            'AWAITING_PROVIDER_PAYMENT',
            'system',
            'Crazy.Org Gateway',
            'Awaiting FFGlory Payment Handoff',
            `Order queued for external provider handoff at ${OFFICIAL_PROVIDER_URL}.`,
            ts
          ),
      ]);

      const createdRow = await db
        .prepare('SELECT * FROM orders WHERE id = ? LIMIT 1')
        .bind(orderId)
        .first<Record<string, unknown>>();
      if (!createdRow) throw new WorkerAppError('Failed to load created order.', 500);
      const hydrated = await hydrateOrder(db, createdRow);
      return { ...hydrated, deduplicated: false };
    }

    case 'order.get':
    case 'track.lookup': {
      const ref = str(payload.orderReference || payload.orderId, '', 80).trim();
      if (!ref) throw new WorkerAppError('Order reference is required.');

      const orderRow = await db
        .prepare('SELECT * FROM orders WHERE id = ? OR order_reference = ? LIMIT 1')
        .bind(ref, ref)
        .first<Record<string, unknown>>();

      if (!orderRow) {
        return { order: null, refunds: [], tickets: [], settings: null };
      }

      const [hydrated, settingsRow] = await Promise.all([
        hydrateOrder(db, orderRow, action === 'track.lookup'),
        db.prepare('SELECT * FROM storefront_settings WHERE id = ?').bind('main').first<Record<string, unknown>>(),
      ]);

      return {
        ...hydrated,
        settings: mapSettingsRow(settingsRow || null),
      };
    }

    case 'order.cancel': {
      const orderId = str(payload.orderId, '', 80);
      const reason = str(payload.reason, 'Cancelled by customer before payment.', 500);
      const orderRow = await db
        .prepare('SELECT * FROM orders WHERE id = ? LIMIT 1')
        .bind(orderId)
        .first<Record<string, unknown>>();
      if (!orderRow) throw new WorkerAppError('Order not found.', 404);
      const currentStatus = str(orderRow.service_status);
      if (!['ORDER_CREATED', 'AWAITING_PROVIDER_PAYMENT'].includes(currentStatus)) {
        throw new WorkerAppError('Only unpaid orders awaiting provider payment can be cancelled.', 409);
      }

      const ts = nowIso();
      await db.batch([
        db
          .prepare('UPDATE orders SET service_status = ?, updated_at = ? WHERE id = ?')
          .bind('CANCELLED', ts, orderId),
        db
          .prepare(
            `INSERT INTO order_timeline (
              id, order_id, previous_status, status, actor_role, actor_label, title, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(makeId('evt'), orderId, currentStatus, 'CANCELLED', 'customer', 'Guest Customer', 'Order Cancelled', reason, ts),
      ]);
      const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first<Record<string, unknown>>();
      return await hydrateOrder(db, updated!);
    }

    case 'order.timeline.list': {
      const orderId = str(payload.orderId, '', 80);
      const res = await db
        .prepare('SELECT * FROM order_timeline WHERE order_id = ? ORDER BY created_at ASC')
        .bind(orderId)
        .all<Record<string, unknown>>();
      return {
        timeline: (res.results || []).map((t) => ({
          id: str(t.id),
          timestamp: str(t.created_at),
          previousStatus: t.previous_status ? str(t.previous_status) : null,
          status: str(t.status),
          actorRole: str(t.actor_role),
          actorLabel: str(t.actor_label),
          title: str(t.title),
          note: str(t.note),
        })),
      };
    }

    case 'order.payment.submit': {
      const orderId = str(payload.orderId, '', 80);
      const txId = str(payload.providerTransactionId, '', 80).trim();
      const txKey = str(payload.txKey, '', 120).trim();
      const binanceOrderId = str(payload.binanceOrderId, '', 80).trim();
      const providerAccountUsername = str(payload.providerAccountUsername, '', 80).trim();
      const paymentProofUrl = str(payload.paymentProofUrl, '', 400).trim();

      if (!txId || !txKey) throw new WorkerAppError('Provider Transaction ID is required.');

      const orderRow = await db
        .prepare('SELECT * FROM orders WHERE id = ? LIMIT 1')
        .bind(orderId)
        .first<Record<string, unknown>>();
      if (!orderRow) throw new WorkerAppError('Order not found.', 404);

      const currentStatus = str(orderRow.service_status);
      if (['COMPLETED', 'REFUNDED', 'CANCELLED'].includes(currentStatus)) {
        throw new WorkerAppError('Order is already finalized and cannot accept payment updates.', 409);
      }

      const existingLock = await db
        .prepare('SELECT order_id FROM provider_tx_locks WHERE tx_key = ? LIMIT 1')
        .bind(txKey)
        .first<{ order_id: string }>();

      if (existingLock && existingLock.order_id !== orderId) {
        throw new WorkerAppError(
          `Duplicate Provider Transaction ID: "${txId}" is already linked to another order.`,
          409,
          'DUPLICATE_TX'
        );
      }

      const ts = nowIso();
      const statements: D1PreparedStatement[] = [
        db
          .prepare(
            `INSERT INTO provider_transactions (
              id, order_id, provider_transaction_id, binance_order_id,
              provider_account_username, payment_proof_url, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(order_id) DO UPDATE SET
              provider_transaction_id = excluded.provider_transaction_id,
              binance_order_id = excluded.binance_order_id,
              provider_account_username = excluded.provider_account_username,
              payment_proof_url = excluded.payment_proof_url,
              submitted_at = excluded.submitted_at`
          )
          .bind(
            `ptx-${orderId}`,
            orderId,
            txId,
            binanceOrderId,
            providerAccountUsername,
            paymentProofUrl,
            ts
          ),
        db
          .prepare(
            `UPDATE orders SET payment_status = ?, service_status = ?, updated_at = ? WHERE id = ?`
          )
          .bind('SUBMITTED', 'PROVIDER_PAYMENT_REVIEW', ts, orderId),
        db
          .prepare(
            `INSERT INTO order_timeline (
              id, order_id, previous_status, status, actor_role, actor_label, title, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            makeId('evt'),
            orderId,
            currentStatus,
            'PROVIDER_PAYMENT_REVIEW',
            'customer',
            'Guest Customer',
            'Provider Payment Reference Submitted',
            `Submitted FFGlory TX "${txId}"${binanceOrderId ? ` (Binance: ${binanceOrderId})` : ''} for manual verification.`,
            ts
          ),
      ];

      if (!existingLock) {
        statements.push(
          db
            .prepare('INSERT INTO provider_tx_locks (tx_key, raw_tx_id, order_id, created_at) VALUES (?, ?, ?, ?)')
            .bind(txKey, txId, orderId, ts)
        );
      }

      await db.batch(statements);
      const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first<Record<string, unknown>>();
      return await hydrateOrder(db, updated!);
    }

    case 'order.activation.submit': {
      const orderId = str(payload.orderId, '', 80);
      const groupId = str(payload.providerGroupId, '', 80).trim();
      const activationTxRef = str(payload.activationTransactionRef, '', 80).trim();
      const customerStatus = str(payload.customerActivationStatus, 'WAITING_15_MIN', 40);
      const redeemCode = str(payload.redeemCode, '', 80).trim();
      const proofUrl = str(payload.activationProofUrl, '', 400).trim();

      if (!groupId || groupId.length < 2) {
        throw new WorkerAppError('Provider Group ID is required.');
      }

      const orderRow = await db
        .prepare('SELECT * FROM orders WHERE id = ? LIMIT 1')
        .bind(orderId)
        .first<Record<string, unknown>>();
      if (!orderRow) throw new WorkerAppError('Order not found.', 404);
      const currentStatus = str(orderRow.service_status);
      if (['COMPLETED', 'REFUNDED', 'CANCELLED'].includes(currentStatus)) {
        throw new WorkerAppError('Order cannot accept activation updates in its current status.', 409);
      }

      const ts = nowIso();
      await db.batch([
        db
          .prepare(
            `INSERT INTO activations (
              id, order_id, provider_group_id, activation_tx_ref,
              customer_status, redeem_code, proof_url, submitted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(order_id) DO UPDATE SET
              provider_group_id = excluded.provider_group_id,
              activation_tx_ref = excluded.activation_tx_ref,
              customer_status = excluded.customer_status,
              redeem_code = excluded.redeem_code,
              proof_url = excluded.proof_url,
              submitted_at = excluded.submitted_at`
          )
          .bind(`act-${orderId}`, orderId, groupId, activationTxRef, customerStatus, redeemCode, proofUrl, ts),
        db
          .prepare('UPDATE orders SET service_status = ?, updated_at = ? WHERE id = ?')
          .bind('PROVIDER_ACTIVATION_SUBMITTED', ts, orderId),
        db
          .prepare(
            `INSERT INTO order_timeline (
              id, order_id, previous_status, status, actor_role, actor_label, title, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            makeId('evt'),
            orderId,
            currentStatus,
            'PROVIDER_ACTIVATION_SUBMITTED',
            'customer',
            'Guest Customer',
            'Provider Group ID Submitted',
            `Submitted Group ID "${groupId}" (status: ${customerStatus}) for activation review.`,
            ts
          ),
      ]);

      const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first<Record<string, unknown>>();
      return await hydrateOrder(db, updated!);
    }

    case 'order.refund.create': {
      const orderId = str(payload.orderId, '', 80);
      const explanation = str(payload.failureExplanation, '', 2000).trim();
      if (explanation.length < 10) {
        throw new WorkerAppError('Please provide at least 10 characters explaining the issue.');
      }

      const orderRow = await db
        .prepare('SELECT * FROM orders WHERE id = ? LIMIT 1')
        .bind(orderId)
        .first<Record<string, unknown>>();
      if (!orderRow) throw new WorkerAppError('Order not found.', 404);
      const currentStatus = str(orderRow.service_status);
      if (['REFUNDED', 'CANCELLED'].includes(currentStatus)) {
        throw new WorkerAppError('Cannot submit a refund on a refunded or cancelled order.', 409);
      }

      const refundId = makeId('RF');
      const txRef = str(payload.providerTransactionRef, 'N/A', 80).trim() || 'N/A';
      const groupRef = str(payload.providerGroupRef, 'N/A', 80).trim() || 'N/A';
      const ranOver30 = payload.ranOver30MinZeroGlory ? 1 : 0;
      const mins = Math.max(0, Math.min(1440, int(payload.runningMinutesObserved, 0)));
      const currency = str(orderRow.currency, 'USD', 8);
      const totalMinor = int(orderRow.total_price_minor, 0);
      const amountLabel = `${currency} ${(totalMinor / 100).toFixed(2)}`;
      const ts = nowIso();

      await db.batch([
        db
          .prepare(
            `INSERT INTO refunds (
              id, order_id, provider_tx_ref, provider_group_ref,
              ran_over_30_min_zero_glory, running_minutes_observed, explanation,
              status, provider_refund_result, customer_refund_result,
              refund_amount_minor, refund_currency, refund_amount_label, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            refundId,
            orderId,
            txRef,
            groupRef,
            ranOver30,
            mins,
            explanation,
            'PENDING_REVIEW',
            'PENDING',
            'PENDING',
            totalMinor,
            currency,
            amountLabel,
            ts,
            ts
          ),
        db
          .prepare(
            'INSERT INTO refund_history (id, refund_id, status, actor, note, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(
            makeId('rfh'),
            refundId,
            'PENDING_REVIEW',
            'Guest Customer',
            `Refund claim filed (${ranOver30 ? `>30m zero Glory (${mins}m observed)` : `${mins}m observed`}).`,
            ts
          ),
        db
          .prepare('UPDATE orders SET service_status = ?, updated_at = ? WHERE id = ?')
          .bind('REFUND_REVIEW', ts, orderId),
        db
          .prepare(
            `INSERT INTO order_timeline (
              id, order_id, previous_status, status, actor_role, actor_label, title, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            makeId('evt'),
            orderId,
            currentStatus,
            'REFUND_REVIEW',
            'customer',
            'Guest Customer',
            'Refund Review Requested',
            `Refund claim ${refundId} opened (TX: ${txRef}, Group: ${groupRef}).`,
            ts
          ),
      ]);

      const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first<Record<string, unknown>>();
      return await hydrateOrder(db, updated!);
    }

    case 'order.support.create': {
      const orderId = str(payload.orderId, '', 80);
      const category = str(payload.category, 'SUPPORT', 40);
      const subject = str(payload.subject, '', 140).trim();
      const message = str(payload.message, '', 2000).trim();
      if (subject.length < 3 || message.length < 10) {
        throw new WorkerAppError('Subject (>=3 chars) and message (>=10 chars) are required.');
      }

      const orderRow = await db
        .prepare('SELECT * FROM orders WHERE id = ? LIMIT 1')
        .bind(orderId)
        .first<Record<string, unknown>>();
      if (!orderRow) throw new WorkerAppError('Order not found.', 404);

      const ticketId = makeId('TKT');
      const ts = nowIso();
      await db
        .prepare(
          `INSERT INTO support_tickets (
            id, order_id, category, subject, message, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(ticketId, orderId, category, subject, message, 'OPEN', ts, ts)
        .run();

      return {
        ticket: {
          id: ticketId,
          orderId,
          category,
          subject,
          message,
          status: 'OPEN',
          createdAt: ts,
          updatedAt: ts,
        },
      };
    }

    case 'admin.session.create': {
      const id = str(payload.id, '', 80);
      const tokenHash = str(payload.tokenHash, '', 128);
      const csrfHash = str(payload.csrfHash, '', 128);
      const adminUsername = str(payload.adminUsername, '', 120);
      const expiresAt = str(payload.expiresAt, '', 60);
      const ipAddress = str(payload.ipAddress, '', 64);
      const userAgent = str(payload.userAgent, '', 300);
      const ts = nowIso();

      await db
        .prepare(
          `INSERT INTO admin_sessions (
            id, token_hash, csrf_hash, admin_username, expires_at, ip_address, user_agent, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(id, tokenHash, csrfHash, adminUsername, expiresAt, ipAddress, userAgent, ts)
        .run();

      return { id, adminUsername, expiresAt };
    }

    case 'admin.session.validate': {
      const tokenHash = str(payload.tokenHash, '', 128);
      const row = await db
        .prepare('SELECT * FROM admin_sessions WHERE token_hash = ? AND revoked_at IS NULL LIMIT 1')
        .bind(tokenHash)
        .first<Record<string, unknown>>();
      if (!row) return { session: null };
      if (new Date(str(row.expires_at)).getTime() <= Date.now()) {
        return { session: null };
      }
      return {
        session: {
          id: str(row.id),
          tokenHash: str(row.token_hash),
          csrfHash: str(row.csrf_hash),
          adminUsername: str(row.admin_username),
          expiresAt: str(row.expires_at),
          createdAt: str(row.created_at),
        },
      };
    }

    case 'admin.session.revoke': {
      const tokenHash = str(payload.tokenHash, '', 128);
      await db
        .prepare('UPDATE admin_sessions SET revoked_at = ? WHERE token_hash = ?')
        .bind(nowIso(), tokenHash)
        .run();
      return { revoked: true };
    }

    case 'admin.login.attempt.record': {
      await db
        .prepare(
          'INSERT INTO admin_login_attempts (id, username, ip_address, success, attempted_at) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(
          makeId('att'),
          str(payload.username, '', 120),
          str(payload.ipAddress, '', 64),
          payload.success ? 1 : 0,
          nowIso()
        )
        .run();
      return { recorded: true };
    }

    case 'admin.login.attempts.recent': {
      const ipAddress = str(payload.ipAddress, '', 64);
      const sinceIso = str(payload.sinceIso, '', 60);
      const res = await db
        .prepare(
          'SELECT COUNT(*) as fail_count FROM admin_login_attempts WHERE ip_address = ? AND success = 0 AND attempted_at >= ?'
        )
        .bind(ipAddress, sinceIso)
        .first<{ fail_count: number }>();
      return { failCount: int(res?.fail_count, 0) };
    }

    case 'admin.dashboard': {
      const [
        ordersRes,
        packagesRes,
        settingsRow,
        refundsRes,
        ticketsRes,
        redeemRes,
        contactsRes,
        logsRes,
      ] = await Promise.all([
        db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200').all<Record<string, unknown>>(),
        db.prepare('SELECT * FROM packages ORDER BY sort_order ASC, updated_at DESC').all<Record<string, unknown>>(),
        db.prepare('SELECT * FROM storefront_settings WHERE id = ?').bind('main').first<Record<string, unknown>>(),
        db.prepare('SELECT * FROM refunds ORDER BY created_at DESC LIMIT 150').all<Record<string, unknown>>(),
        db.prepare('SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 150').all<Record<string, unknown>>(),
        db.prepare('SELECT * FROM redeem_codes ORDER BY created_at DESC LIMIT 200').all<Record<string, unknown>>(),
        db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 150').all<Record<string, unknown>>(),
        db.prepare('SELECT * FROM admin_action_logs ORDER BY created_at DESC LIMIT 200').all<Record<string, unknown>>(),
      ]);

      const orders = await Promise.all(
        (ordersRes.results || []).map(async (r) => (await hydrateOrder(db, r)).order)
      );

      const refunds = await Promise.all(
        (refundsRes.results || []).map(async (r) => {
          const histRes = await db
            .prepare('SELECT * FROM refund_history WHERE refund_id = ? ORDER BY created_at ASC')
            .bind(str(r.id))
            .all<Record<string, unknown>>();
          return {
            id: str(r.id),
            orderId: str(r.order_id),
            providerTransactionRef: str(r.provider_tx_ref),
            providerGroupRef: str(r.provider_group_ref),
            ranOver30MinZeroGlory: int(r.ran_over_30_min_zero_glory, 0) === 1,
            runningMinutesObserved: int(r.running_minutes_observed, 0),
            failureExplanation: str(r.explanation),
            status: str(r.status),
            providerRefundResult: str(r.provider_refund_result),
            customerRefundResult: str(r.customer_refund_result),
            refundAmountLabel: str(r.refund_amount_label),
            adminResolutionNote: str(r.admin_note),
            reviewedBy: str(r.reviewed_by) || undefined,
            createdAt: str(r.created_at),
            updatedAt: str(r.updated_at),
            history: (histRes.results || []).map((h) => ({
              id: str(h.id),
              timestamp: str(h.created_at),
              status: str(h.status),
              actor: str(h.actor),
              note: str(h.note),
            })),
          };
        })
      );

      return {
        orders,
        packages: (packagesRes.results || []).map(mapPackageRow),
        settings: mapSettingsRow(settingsRow || null),
        refunds,
        supportTickets: (ticketsRes.results || []).map((t) => ({
          id: str(t.id),
          orderId: t.order_id ? str(t.order_id) : '',
          category: str(t.category),
          subject: str(t.subject),
          message: str(t.message),
          status: str(t.status),
          adminReply: str(t.admin_reply) || undefined,
          reviewedBy: str(t.reviewed_by) || undefined,
          createdAt: str(t.created_at),
          updatedAt: str(t.updated_at),
        })),
        redeemCodes: (redeemRes.results || []).map((c) => ({
          id: str(c.id),
          code: str(c.code),
          normalizedCode: str(c.normalized_code),
          packageName: str(c.package_name),
          assignedOrderId: c.assigned_order_id ? str(c.assigned_order_id) : undefined,
          status: str(c.status),
          note: str(c.note),
          createdAt: str(c.created_at),
          assignedAt: c.assigned_at ? str(c.assigned_at) : undefined,
        })),
        contactMessages: (contactsRes.results || []).map((m) => ({
          id: str(m.id),
          name: str(m.name),
          contact: str(m.contact),
          subject: str(m.subject),
          message: str(m.message),
          status: str(m.status),
          createdAt: str(m.created_at),
        })),
        actionLogs: (logsRes.results || []).map((l) => ({
          id: str(l.id),
          timestamp: str(l.created_at),
          adminEmail: str(l.admin_username),
          action: str(l.action),
          targetId: str(l.target_id),
          details: str(l.details),
        })),
      };
    }

    case 'admin.orders.list': {
      const status = str(payload.status, '', 60).trim();
      const sql = status
        ? 'SELECT * FROM orders WHERE service_status = ? ORDER BY created_at DESC LIMIT 200'
        : 'SELECT * FROM orders ORDER BY created_at DESC LIMIT 200';
      const stmt = status ? db.prepare(sql).bind(status) : db.prepare(sql);
      const res = await stmt.all<Record<string, unknown>>();
      const orders = await Promise.all(
        (res.results || []).map(async (r) => (await hydrateOrder(db, r)).order)
      );
      return { orders };
    }

    case 'admin.payment.verify': {
      const orderId = str(payload.orderId, '', 80);
      const approve = Boolean(payload.approve);
      const adminUsername = str(payload.adminUsername, 'admin', 120);
      const adminNote = str(payload.adminNote, '', 500);

      const orderRow = await db
        .prepare('SELECT * FROM orders WHERE id = ? LIMIT 1')
        .bind(orderId)
        .first<Record<string, unknown>>();
      if (!orderRow) throw new WorkerAppError('Order not found.', 404);

      const currentStatus = str(orderRow.service_status);
      const nextServiceStatus = approve ? 'PAYMENT_CONFIRMED' : 'FAILED';
      const nextPaymentStatus = approve ? 'CONFIRMED' : 'REJECTED';
      const ts = nowIso();

      await db.batch([
        db
          .prepare('UPDATE orders SET payment_status = ?, service_status = ?, updated_at = ? WHERE id = ?')
          .bind(nextPaymentStatus, nextServiceStatus, ts, orderId),
        db
          .prepare(
            `UPDATE provider_transactions SET verified_at = ?, verified_by = ?, admin_note = ? WHERE order_id = ?`
          )
          .bind(ts, adminUsername, adminNote, orderId),
        db
          .prepare(
            `INSERT INTO order_timeline (
              id, order_id, previous_status, status, actor_role, actor_label, title, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            makeId('evt'),
            orderId,
            currentStatus,
            nextServiceStatus,
            'admin',
            adminUsername,
            approve ? 'Payment Confirmed by Admin' : 'Payment Verification Rejected',
            adminNote || (approve ? 'Provider transaction confirmed.' : 'Transaction could not be verified.'),
            ts
          ),
        db
          .prepare(
            'INSERT INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(
            makeId('log'),
            adminUsername,
            approve ? 'VERIFY_PAYMENT' : 'REJECT_PAYMENT',
            orderId,
            `${approve ? 'Approved' : 'Rejected'} provider payment. ${adminNote}`.trim(),
            ts
          ),
      ]);

      const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first<Record<string, unknown>>();
      return await hydrateOrder(db, updated!);
    }

    case 'admin.order.update': {
      const orderId = str(payload.orderId, '', 80);
      const nextStatus = str(payload.status, '', 60);
      const adminUsername = str(payload.adminUsername, 'admin', 120);
      const note = str(payload.note, '', 500);
      const providerGroupId = payload.providerGroupId ? str(payload.providerGroupId, '', 80).trim() : null;
      const redeemCode = payload.redeemCode ? str(payload.redeemCode, '', 80).trim() : null;

      const orderRow = await db
        .prepare('SELECT * FROM orders WHERE id = ? LIMIT 1')
        .bind(orderId)
        .first<Record<string, unknown>>();
      if (!orderRow) throw new WorkerAppError('Order not found.', 404);
      const currentStatus = str(orderRow.service_status);
      const ts = nowIso();

      const statements: D1PreparedStatement[] = [
        db
          .prepare(
            `UPDATE orders SET
              service_status = ?,
              redeem_code_assigned = COALESCE(?, redeem_code_assigned),
              updated_at = ?
             WHERE id = ?`
          )
          .bind(nextStatus || currentStatus, redeemCode, ts, orderId),
        db
          .prepare(
            `INSERT INTO order_timeline (
              id, order_id, previous_status, status, actor_role, actor_label, title, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            makeId('evt'),
            orderId,
            currentStatus,
            nextStatus || currentStatus,
            'admin',
            adminUsername,
            `Admin Status Update: ${nextStatus || currentStatus}`,
            note || `Updated status to ${nextStatus}.`,
            ts
          ),
        db
          .prepare(
            'INSERT INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(
            makeId('log'),
            adminUsername,
            'UPDATE_ORDER_STATUS',
            orderId,
            `Changed status ${currentStatus} -> ${nextStatus}. ${note}`.trim(),
            ts
          ),
      ];

      if (providerGroupId) {
        statements.push(
          db
            .prepare(
              `INSERT INTO activations (
                id, order_id, provider_group_id, verified_at, verified_by, admin_note, submitted_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(order_id) DO UPDATE SET
                provider_group_id = excluded.provider_group_id,
                verified_at = excluded.verified_at,
                verified_by = excluded.verified_by,
                admin_note = excluded.admin_note`
            )
            .bind(`act-${orderId}`, orderId, providerGroupId, ts, adminUsername, note, ts)
        );
      } else if (nextStatus === 'ACTIVATION_VERIFIED' || nextStatus === 'COMPLETED') {
        statements.push(
          db
            .prepare('UPDATE activations SET verified_at = ?, verified_by = ?, admin_note = ? WHERE order_id = ?')
            .bind(ts, adminUsername, note, orderId)
        );
      }

      await db.batch(statements);
      const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first<Record<string, unknown>>();
      return await hydrateOrder(db, updated!);
    }

    case 'admin.packages.create': {
      const id = str(payload.id, makeId('pkg'), 80);
      const slug = str(payload.slug, id, 120);
      const name = str(payload.name, '', 120).trim();
      if (name.length < 3) throw new WorkerAppError('Package name must be at least 3 characters.');
      const botCount = Math.max(1, Math.min(100, int(payload.botQuantity, 2)));
      const priceMinor = Math.max(1, int(payload.sellingPriceMinor, 0));
      const ts = nowIso();
      const adminUsername = str(payload.adminUsername, 'admin', 120);

      await db.batch([
        db
          .prepare(
            `INSERT INTO packages (
              id, product_id, slug, name, bot_count, selling_price_minor, currency,
              duration_label, supported_regions_json, description, instructions,
              warnings, refund_note, provider_price_note, estimated_delivery,
              active, sort_order, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            id,
            'prod-ff-guild-glory',
            slug,
            name,
            botCount,
            priceMinor,
            str(payload.currency, 'USD', 8),
            str(payload.durationLabel, `${botCount} Bots Session`, 100),
            JSON.stringify(parseJsonArray(payload.supportedRegions, ['BD', 'IND', 'SG'])),
            str(payload.description, ''),
            str(payload.instructions, ''),
            str(payload.warnings, ''),
            str(payload.refundNote, ''),
            str(payload.providerPriceNote, ''),
            str(payload.estimatedDelivery, ''),
            payload.enabled === false ? 0 : 1,
            int(payload.sortOrder, 10),
            ts
          ),
        db
          .prepare(
            'INSERT INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(makeId('log'), adminUsername, 'CREATE_PACKAGE', id, `Created package "${name}".`, ts),
      ]);

      const row = await db.prepare('SELECT * FROM packages WHERE id = ?').bind(id).first<Record<string, unknown>>();
      return { package: mapPackageRow(row!) };
    }

    case 'admin.packages.update': {
      const id = str(payload.id, '', 80);
      const existing = await db.prepare('SELECT * FROM packages WHERE id = ?').bind(id).first<Record<string, unknown>>();
      if (!existing) throw new WorkerAppError('Package not found.', 404);
      const name = str(payload.name, str(existing.name), 120).trim();
      const botCount = Math.max(1, Math.min(100, int(payload.botQuantity, int(existing.bot_count))));
      const priceMinor = Math.max(1, int(payload.sellingPriceMinor, int(existing.selling_price_minor)));
      const ts = nowIso();
      const adminUsername = str(payload.adminUsername, 'admin', 120);

      await db.batch([
        db
          .prepare(
            `UPDATE packages SET
              name = ?, bot_count = ?, selling_price_minor = ?, currency = ?,
              duration_label = ?, supported_regions_json = ?, description = ?,
              instructions = ?, warnings = ?, refund_note = ?, provider_price_note = ?,
              estimated_delivery = ?, active = ?, sort_order = ?, updated_at = ?
             WHERE id = ?`
          )
          .bind(
            name,
            botCount,
            priceMinor,
            str(payload.currency, str(existing.currency), 8),
            str(payload.durationLabel, str(existing.duration_label), 100),
            JSON.stringify(
              parseJsonArray(
                payload.supportedRegions,
                parseJsonArray(existing.supported_regions_json, ['BD', 'IND', 'SG'])
              )
            ),
            str(payload.description, str(existing.description)),
            str(payload.instructions, str(existing.instructions)),
            str(payload.warnings, str(existing.warnings)),
            str(payload.refundNote, str(existing.refund_note)),
            str(payload.providerPriceNote, str(existing.provider_price_note)),
            str(payload.estimatedDelivery, str(existing.estimated_delivery)),
            payload.enabled === false ? 0 : 1,
            int(payload.sortOrder, int(existing.sort_order)),
            ts,
            id
          ),
        db
          .prepare(
            'INSERT INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(makeId('log'), adminUsername, 'UPDATE_PACKAGE', id, `Updated package "${name}".`, ts),
      ]);

      const row = await db.prepare('SELECT * FROM packages WHERE id = ?').bind(id).first<Record<string, unknown>>();
      return { package: mapPackageRow(row!) };
    }

    case 'admin.packages.delete': {
      const id = str(payload.id, '', 80);
      const adminUsername = str(payload.adminUsername, 'admin', 120);
      const ts = nowIso();
      await db.batch([
        db.prepare('DELETE FROM packages WHERE id = ?').bind(id),
        db
          .prepare(
            'INSERT INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(makeId('log'), adminUsername, 'DELETE_PACKAGE', id, `Deleted package ${id}.`, ts),
      ]);
      return { deleted: true, id };
    }

    case 'admin.settings.update': {
      const ts = nowIso();
      const adminUsername = str(payload.adminUsername, 'admin', 120);
      await db.batch([
        db
          .prepare(
            `INSERT INTO storefront_settings (
              id, provider_name, provider_homepage, provider_tracking_url, currency,
              supported_handoff_method, provider_transaction_fields_note,
              service_instructions, payment_instructions, important_warnings,
              refund_conditions, support_whatsapp, support_email, support_hours, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              provider_name = excluded.provider_name,
              provider_homepage = excluded.provider_homepage,
              provider_tracking_url = excluded.provider_tracking_url,
              currency = excluded.currency,
              supported_handoff_method = excluded.supported_handoff_method,
              provider_transaction_fields_note = excluded.provider_transaction_fields_note,
              service_instructions = excluded.service_instructions,
              payment_instructions = excluded.payment_instructions,
              important_warnings = excluded.important_warnings,
              refund_conditions = excluded.refund_conditions,
              support_whatsapp = excluded.support_whatsapp,
              support_email = excluded.support_email,
              support_hours = excluded.support_hours,
              updated_at = excluded.updated_at`
          )
          .bind(
            'main',
            str(payload.providerName, 'FFGlory', 60),
            OFFICIAL_PROVIDER_URL,
            OFFICIAL_PROVIDER_URL,
            str(payload.currency, 'USD', 8),
            str(payload.supportedHandoffMethod, ''),
            str(payload.providerTransactionFieldsNote, ''),
            str(payload.serviceInstructions, ''),
            str(payload.paymentInstructions, ''),
            str(payload.importantWarnings, ''),
            str(payload.refundConditions, ''),
            str(payload.supportWhatsapp, ''),
            str(payload.supportEmail, ''),
            str(payload.supportHours, ''),
            ts
          ),
        db
          .prepare(
            'INSERT INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(makeId('log'), adminUsername, 'UPDATE_SETTINGS', 'main', 'Updated storefront & FFGlory instructions.', ts),
      ]);
      const row = await db.prepare('SELECT * FROM storefront_settings WHERE id = ?').bind('main').first<Record<string, unknown>>();
      return { settings: mapSettingsRow(row || null) };
    }

    case 'admin.refunds.update': {
      const refundId = str(payload.refundId, '', 80);
      const existing = await db.prepare('SELECT * FROM refunds WHERE id = ?').bind(refundId).first<Record<string, unknown>>();
      if (!existing) throw new WorkerAppError('Refund request not found.', 404);

      const status = str(payload.status, str(existing.status), 40);
      const providerResult = str(payload.providerRefundResult, str(existing.provider_refund_result), 60);
      const customerResult = str(payload.customerRefundResult, str(existing.customer_refund_result), 60);
      const adminNote = str(payload.adminResolutionNote, '', 1000);
      const refundAmountLabel = str(payload.refundAmountLabel, str(existing.refund_amount_label), 120);
      const adminUsername = str(payload.adminUsername, 'admin', 120);
      const ts = nowIso();
      const orderId = str(existing.order_id);

      const statements: D1PreparedStatement[] = [
        db
          .prepare(
            `UPDATE refunds SET
              status = ?, provider_refund_result = ?, customer_refund_result = ?,
              refund_amount_label = ?, admin_note = ?, reviewed_by = ?, updated_at = ?
             WHERE id = ?`
          )
          .bind(status, providerResult, customerResult, refundAmountLabel, adminNote, adminUsername, ts, refundId),
        db
          .prepare('INSERT INTO refund_history (id, refund_id, status, actor, note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(
            makeId('rfh'),
            refundId,
            status,
            adminUsername,
            `${adminNote || 'Refund updated'} [Provider: ${providerResult}, Store: ${customerResult}]`.trim(),
            ts
          ),
        db
          .prepare(
            'INSERT INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(
            makeId('log'),
            adminUsername,
            'UPDATE_REFUND',
            refundId,
            `Refund ${status} | Provider=${providerResult} | Customer=${customerResult}`,
            ts
          ),
      ];

      if (status === 'APPROVED' || status === 'RESOLVED') {
        statements.push(
          db.prepare('UPDATE orders SET service_status = ?, updated_at = ? WHERE id = ?').bind('REFUNDED', ts, orderId)
        );
      } else if (status === 'REJECTED') {
        statements.push(
          db.prepare('UPDATE orders SET service_status = ?, updated_at = ? WHERE id = ?').bind('COMPLETED', ts, orderId)
        );
      }

      await db.batch(statements);
      return { updated: true, refundId, status };
    }

    case 'admin.redeem.create': {
      const code = str(payload.code, '', 80).trim();
      if (code.length < 4) throw new WorkerAppError('Redeem code must be at least 4 characters.');
      const id = makeId('RDM');
      const ts = nowIso();
      const adminUsername = str(payload.adminUsername, 'admin', 120);
      await db.batch([
        db
          .prepare(
            `INSERT INTO redeem_codes (id, code, normalized_code, package_name, status, note, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            id,
            code,
            code.toUpperCase(),
            str(payload.packageName, 'Guild Glory Package', 100),
            'AVAILABLE',
            str(payload.note, '', 300),
            ts
          ),
        db
          .prepare(
            'INSERT INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(makeId('log'), adminUsername, 'ADD_REDEEM_CODE', id, `Added redeem code ${code}.`, ts),
      ]);
      return { id, code };
    }

    case 'admin.redeem.assign': {
      const redeemId = str(payload.redeemId, '', 80);
      const orderId = str(payload.orderId, '', 80);
      const adminUsername = str(payload.adminUsername, 'admin', 120);
      const codeRow = await db.prepare('SELECT * FROM redeem_codes WHERE id = ?').bind(redeemId).first<Record<string, unknown>>();
      if (!codeRow) throw new WorkerAppError('Redeem code not found.', 404);
      const orderRow = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(orderId).first<Record<string, unknown>>();
      if (!orderRow) throw new WorkerAppError('Target order not found.', 404);

      const ts = nowIso();
      const codeStr = str(codeRow.code);
      await db.batch([
        db
          .prepare('UPDATE redeem_codes SET status = ?, assigned_order_id = ?, assigned_at = ? WHERE id = ?')
          .bind('ASSIGNED', orderId, ts, redeemId),
        db
          .prepare('UPDATE orders SET redeem_code_assigned = ?, updated_at = ? WHERE id = ?')
          .bind(codeStr, ts, orderId),
        db
          .prepare(
            `INSERT INTO order_timeline (
              id, order_id, previous_status, status, actor_role, actor_label, title, note, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            makeId('evt'),
            orderId,
            str(orderRow.service_status),
            str(orderRow.service_status),
            'admin',
            adminUsername,
            'Redeem Code Assigned',
            `Assigned redeem code "${codeStr}" to order.`,
            ts
          ),
        db
          .prepare(
            'INSERT INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(makeId('log'), adminUsername, 'ASSIGN_REDEEM_CODE', orderId, `Assigned redeem code ${codeStr}.`, ts),
      ]);
      return { assigned: true, redeemId, orderId, code: codeStr };
    }

    case 'admin.redeem.delete': {
      const redeemId = str(payload.redeemId, '', 80);
      const existing = await db.prepare('SELECT * FROM redeem_codes WHERE id = ?').bind(redeemId).first<Record<string, unknown>>();
      if (!existing) throw new WorkerAppError('Redeem code not found.', 404);
      if (str(existing.status) !== 'AVAILABLE') {
        throw new WorkerAppError('Assigned redeem codes cannot be deleted.', 409);
      }
      await db.prepare('DELETE FROM redeem_codes WHERE id = ?').bind(redeemId).run();
      return { deleted: true };
    }

    case 'admin.support.reply': {
      const ticketId = str(payload.ticketId, '', 80);
      const status = str(payload.status, 'IN_PROGRESS', 40);
      const adminReply = str(payload.adminReply, '', 2000).trim();
      const adminUsername = str(payload.adminUsername, 'admin', 120);
      const existing = await db.prepare('SELECT * FROM support_tickets WHERE id = ?').bind(ticketId).first<Record<string, unknown>>();
      if (!existing) throw new WorkerAppError('Ticket not found.', 404);
      const ts = nowIso();
      const statements: D1PreparedStatement[] = [
        db
          .prepare('UPDATE support_tickets SET status = ?, admin_reply = ?, reviewed_by = ?, updated_at = ? WHERE id = ?')
          .bind(status, adminReply, adminUsername, ts, ticketId),
        db
          .prepare(
            'INSERT INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(makeId('log'), adminUsername, 'REPLY_SUPPORT_TICKET', ticketId, `Set ${status}: ${adminReply.slice(0, 120)}`, ts),
      ];
      if (adminReply) {
        statements.push(
          db
            .prepare(
              'INSERT INTO support_replies (id, ticket_id, author_role, author_label, message, created_at) VALUES (?, ?, ?, ?, ?, ?)'
            )
            .bind(makeId('rep'), ticketId, 'admin', adminUsername, adminReply, ts)
        );
      }
      await db.batch(statements);
      return { updated: true, ticketId, status };
    }

    case 'admin.contacts.update': {
      const id = str(payload.id, '', 80);
      const status = str(payload.status, 'RESOLVED', 40);
      const adminUsername = str(payload.adminUsername, 'admin', 120);
      await db.batch([
        db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').bind(status, id),
        db
          .prepare(
            'INSERT INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .bind(makeId('log'), adminUsername, 'UPDATE_CONTACT', id, `Marked contact message as ${status}.`, nowIso()),
      ]);
      return { updated: true };
    }

    case 'admin.audit.list': {
      const res = await db
        .prepare('SELECT * FROM admin_action_logs ORDER BY created_at DESC LIMIT 200')
        .all<Record<string, unknown>>();
      return {
        logs: (res.results || []).map((l) => ({
          id: str(l.id),
          timestamp: str(l.created_at),
          adminEmail: str(l.admin_username),
          action: str(l.action),
          targetId: str(l.target_id),
          details: str(l.details),
        })),
      };
    }

    case 'speedTests.list': {
      const clientRef = str(payload.clientRef, '', 100);
      const res = clientRef
        ? await db
            .prepare('SELECT * FROM speed_tests WHERE client_ref = ? ORDER BY created_at DESC LIMIT 60')
            .bind(clientRef)
            .all<Record<string, unknown>>()
        : await db
            .prepare('SELECT * FROM speed_tests ORDER BY created_at DESC LIMIT 60')
            .all<Record<string, unknown>>();
      return {
        records: (res.results || []).map((r) => ({
          id: str(r.id),
          timestamp: str(r.created_at),
          mode: str(r.mode),
          downloadBps: r.download_bps == null ? null : num(r.download_bps),
          uploadBps: r.upload_bps == null ? null : num(r.upload_bps),
          latencyMs: r.latency_ms == null ? null : num(r.latency_ms),
          jitterMs: r.jitter_ms == null ? null : num(r.jitter_ms),
          downLoadedLatencyMs: r.down_loaded_latency_ms == null ? null : num(r.down_loaded_latency_ms),
          upLoadedLatencyMs: r.up_loaded_latency_ms == null ? null : num(r.up_loaded_latency_ms),
          packetLossSupported: int(r.packet_loss_supported, 0) === 1,
          totalDurationMs: r.total_duration_ms == null ? null : num(r.total_duration_ms),
          ispOrColo: str(r.isp_or_colo),
          scores: r.scores_json ? JSON.parse(str(r.scores_json)) : undefined,
        })),
      };
    }

    case 'speedTests.create': {
      const id = str(payload.id, makeId('spd'), 80);
      const clientRef = str(payload.clientRef, 'guest', 100);
      const ts = str(payload.timestamp, nowIso(), 60);
      await db
        .prepare(
          `INSERT OR IGNORE INTO speed_tests (
            id, client_ref, mode, download_bps, upload_bps, latency_ms, jitter_ms,
            down_loaded_latency_ms, up_loaded_latency_ms, packet_loss_supported,
            total_duration_ms, isp_or_colo, scores_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          clientRef,
          str(payload.mode, 'standard', 20),
          payload.downloadBps == null ? null : num(payload.downloadBps),
          payload.uploadBps == null ? null : num(payload.uploadBps),
          payload.latencyMs == null ? null : num(payload.latencyMs),
          payload.jitterMs == null ? null : num(payload.jitterMs),
          payload.downLoadedLatencyMs == null ? null : num(payload.downLoadedLatencyMs),
          payload.upLoadedLatencyMs == null ? null : num(payload.upLoadedLatencyMs),
          payload.packetLossSupported ? 1 : 0,
          payload.totalDurationMs == null ? null : num(payload.totalDurationMs),
          str(payload.ispOrColo, '', 80),
          payload.scores ? JSON.stringify(payload.scores) : null,
          ts
        )
        .run();
      return { id };
    }

    case 'speedTests.delete': {
      const id = str(payload.id, '', 80);
      const clientRef = str(payload.clientRef, '', 100);
      await db.prepare('DELETE FROM speed_tests WHERE id = ? AND client_ref = ?').bind(id, clientRef).run();
      return { deleted: true };
    }

    case 'speedTests.clear': {
      const clientRef = str(payload.clientRef, '', 100);
      await db.prepare('DELETE FROM speed_tests WHERE client_ref = ?').bind(clientRef).run();
      return { cleared: true };
    }

    case 'uidLookups.list': {
      const clientRef = str(payload.clientRef, '', 100);
      const res = clientRef
        ? await db
            .prepare('SELECT * FROM uid_lookups WHERE client_ref = ? ORDER BY queried_at DESC LIMIT 60')
            .bind(clientRef)
            .all<Record<string, unknown>>()
        : await db
            .prepare('SELECT * FROM uid_lookups ORDER BY queried_at DESC LIMIT 60')
            .all<Record<string, unknown>>();
      return {
        records: (res.results || []).map((r) => ({
          id: str(r.id),
          uid: str(r.uid),
          region: str(r.region),
          timestamp: str(r.queried_at),
          status: str(r.status),
          nickname: str(r.nickname) || undefined,
          level: r.level == null ? undefined : int(r.level),
          likes: r.likes == null ? undefined : int(r.likes),
          resolvedRegion: str(r.resolved_region) || undefined,
          providerName: str(r.provider_name),
          errorMessage: str(r.error_message) || undefined,
          profile: r.profile_json ? JSON.parse(str(r.profile_json)) : undefined,
        })),
      };
    }

    case 'uidLookups.create': {
      const id = str(payload.id, makeId('uid'), 80);
      const clientRef = str(payload.clientRef, 'guest', 100);
      const ts = str(payload.timestamp, nowIso(), 60);
      await db
        .prepare(
          `INSERT OR IGNORE INTO uid_lookups (
            id, client_ref, uid, region, status, nickname, level, likes,
            resolved_region, provider_name, error_message, profile_json, queried_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          clientRef,
          str(payload.uid, '', 32),
          str(payload.region, 'BD', 16),
          str(payload.status, 'success', 20),
          str(payload.nickname, '', 100),
          payload.level == null ? null : int(payload.level),
          payload.likes == null ? null : int(payload.likes),
          str(payload.resolvedRegion, '', 16),
          str(payload.providerName, 'Free Fire Public Telemetry', 100),
          str(payload.errorMessage, '', 500),
          payload.profile ? JSON.stringify(payload.profile) : null,
          ts
        )
        .run();
      return { id };
    }

    case 'uidLookups.delete': {
      const id = str(payload.id, '', 80);
      const clientRef = str(payload.clientRef, '', 100);
      await db.prepare('DELETE FROM uid_lookups WHERE id = ? AND client_ref = ?').bind(id, clientRef).run();
      return { deleted: true };
    }

    case 'uidLookups.clear': {
      const clientRef = str(payload.clientRef, '', 100);
      await db.prepare('DELETE FROM uid_lookups WHERE client_ref = ?').bind(clientRef).run();
      return { cleared: true };
    }

    case 'contact.create': {
      const id = makeId('msg');
      const name = str(payload.name, 'Guest', 80).trim();
      const contact = str(payload.contact, '', 120).trim();
      const subject = str(payload.subject, '', 140).trim();
      const message = str(payload.message, '', 2000).trim();
      if (name.length < 2 || subject.length < 3 || message.length < 10) {
        throw new WorkerAppError('Name (>=2), subject (>=3), and message (>=10) are required.');
      }
      const ts = nowIso();
      await db
        .prepare(
          'INSERT INTO contact_messages (id, name, contact, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .bind(id, name, contact, subject, message, 'NEW', ts)
        .run();
      return { id, createdAt: ts };
    }

    case 'migration.import.batch': {
      const entity = str(payload.entity, '', 60);
      const rows = Array.isArray(payload.rows) ? (payload.rows as Array<Record<string, unknown>>) : [];
      let imported = 0;
      let skipped = 0;
      const failed: Array<{ id: string; reason: string }> = [];

      for (const row of rows) {
        const rowId = str(row.id || row.txKey, 'unknown');
        try {
          let metaChanges = 0;
          if (entity === 'packages') {
            const res = await db
              .prepare(
                `INSERT OR IGNORE INTO packages (
                  id, product_id, slug, name, bot_count, selling_price_minor, currency,
                  duration_label, supported_regions_json, description, instructions,
                  warnings, refund_note, provider_price_note, estimated_delivery,
                  active, sort_order, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                str(row.id),
                str(row.productId, 'prod-ff-guild-glory'),
                str(row.slug),
                str(row.name),
                int(row.botCount, 1),
                int(row.sellingPriceMinor, 100),
                str(row.currency, 'USD'),
                str(row.durationLabel),
                str(row.supportedRegionsJson, '["BD"]'),
                str(row.description),
                str(row.instructions),
                str(row.warnings),
                str(row.refundNote),
                str(row.providerPriceNote),
                str(row.estimatedDelivery),
                int(row.active, 1),
                int(row.sortOrder, 1),
                str(row.updatedAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'settings') {
            const res = await db
              .prepare(
                `INSERT OR IGNORE INTO storefront_settings (
                  id, provider_name, provider_homepage, provider_tracking_url, currency,
                  supported_handoff_method, provider_transaction_fields_note,
                  service_instructions, payment_instructions, important_warnings,
                  refund_conditions, support_whatsapp, support_email, support_hours, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                'main',
                str(row.providerName, 'FFGlory'),
                OFFICIAL_PROVIDER_URL,
                OFFICIAL_PROVIDER_URL,
                str(row.currency, 'USD'),
                str(row.supportedHandoffMethod),
                str(row.providerTransactionFieldsNote),
                str(row.serviceInstructions),
                str(row.paymentInstructions),
                str(row.importantWarnings),
                str(row.refundConditions),
                str(row.supportWhatsapp),
                str(row.supportEmail),
                str(row.supportHours),
                str(row.updatedAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'orders') {
            const res = await db
              .prepare(
                `INSERT OR IGNORE INTO orders (
                  id, order_reference, idempotency_key, tracking_token_hash,
                  package_id, package_name, guild_uid, guild_name, region, whatsapp_contact,
                  quantity_multiplier, bot_count, total_bots, unit_price_minor, total_price_minor,
                  currency, payment_status, service_status, provider_name, provider_url,
                  redeem_code_assigned, legacy_customer_ref, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                str(row.id),
                str(row.orderReference),
                str(row.idempotencyKey),
                str(row.trackingTokenHash),
                str(row.packageId),
                str(row.packageName),
                str(row.guildUid),
                str(row.guildName),
                str(row.region),
                str(row.whatsappContact),
                int(row.quantityMultiplier, 1),
                int(row.botCount, 1),
                int(row.totalBots, 1),
                int(row.unitPriceMinor, 0),
                int(row.totalPriceMinor, 0),
                str(row.currency, 'USD'),
                str(row.paymentStatus, 'AWAITING_PAYMENT'),
                str(row.serviceStatus, 'AWAITING_PROVIDER_PAYMENT'),
                str(row.providerName, 'FFGlory'),
                OFFICIAL_PROVIDER_URL,
                row.redeemCodeAssigned ? str(row.redeemCodeAssigned) : null,
                row.legacyCustomerRef ? str(row.legacyCustomerRef) : null,
                str(row.createdAt, nowIso()),
                str(row.updatedAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
            if (metaChanges > 0 && row.providerTx && typeof row.providerTx === 'object') {
              const ptx = row.providerTx as Record<string, unknown>;
              await db
                .prepare(
                  `INSERT OR IGNORE INTO provider_transactions (
                    id, order_id, provider_transaction_id, binance_order_id,
                    provider_account_username, payment_proof_url, submitted_at, verified_at, verified_by, admin_note
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                )
                .bind(
                  str(ptx.id),
                  str(ptx.orderId),
                  str(ptx.providerTransactionId),
                  str(ptx.binanceOrderId),
                  str(ptx.providerAccountUsername),
                  str(ptx.paymentProofUrl),
                  str(ptx.submittedAt),
                  ptx.verifiedAt ? str(ptx.verifiedAt) : null,
                  str(ptx.verifiedBy),
                  str(ptx.adminNote)
                )
                .run();
            }
            if (metaChanges > 0 && row.activation && typeof row.activation === 'object') {
              const act = row.activation as Record<string, unknown>;
              await db
                .prepare(
                  `INSERT OR IGNORE INTO activations (
                    id, order_id, provider_group_id, activation_tx_ref,
                    customer_status, redeem_code, proof_url, submitted_at, verified_at, verified_by, admin_note
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                )
                .bind(
                  str(act.id),
                  str(act.orderId),
                  str(act.providerGroupId),
                  str(act.activationTxRef),
                  str(act.customerStatus),
                  str(act.redeemCode),
                  str(act.proofUrl),
                  str(act.submittedAt),
                  act.verifiedAt ? str(act.verifiedAt) : null,
                  str(act.verifiedBy),
                  str(act.adminNote)
                )
                .run();
            }
          } else if (entity === 'orderTimeline') {
            const res = await db
              .prepare(
                `INSERT OR IGNORE INTO order_timeline (
                  id, order_id, previous_status, status, actor_role, actor_label, title, note, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                str(row.id),
                str(row.orderId),
                row.previousStatus ? str(row.previousStatus) : null,
                str(row.status),
                str(row.actorRole),
                str(row.actorLabel),
                str(row.title),
                str(row.note),
                str(row.createdAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'providerTxLocks') {
            const res = await db
              .prepare(
                'INSERT OR IGNORE INTO provider_tx_locks (tx_key, raw_tx_id, order_id, created_at) VALUES (?, ?, ?, ?)'
              )
              .bind(str(row.txKey), str(row.rawTxId), str(row.orderId), str(row.createdAt, nowIso()))
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'refunds') {
            const res = await db
              .prepare(
                `INSERT OR IGNORE INTO refunds (
                  id, order_id, provider_tx_ref, provider_group_ref,
                  ran_over_30_min_zero_glory, running_minutes_observed, explanation,
                  status, provider_refund_result, customer_refund_result,
                  refund_amount_minor, refund_currency, refund_amount_label,
                  admin_note, reviewed_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                str(row.id),
                str(row.orderId),
                str(row.providerTxRef),
                str(row.providerGroupRef),
                int(row.ranOver30MinZeroGlory, 0),
                int(row.runningMinutesObserved, 0),
                str(row.explanation),
                str(row.status),
                str(row.providerRefundResult),
                str(row.customerRefundResult),
                int(row.refundAmountMinor, 0),
                str(row.refundCurrency, 'USD'),
                str(row.refundAmountLabel),
                str(row.adminNote),
                str(row.reviewedBy),
                str(row.createdAt, nowIso()),
                str(row.updatedAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'refundHistory') {
            const res = await db
              .prepare(
                'INSERT OR IGNORE INTO refund_history (id, refund_id, status, actor, note, created_at) VALUES (?, ?, ?, ?, ?, ?)'
              )
              .bind(
                str(row.id),
                str(row.refundId),
                str(row.status),
                str(row.actor),
                str(row.note),
                str(row.createdAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'redeemCodes') {
            const res = await db
              .prepare(
                `INSERT OR IGNORE INTO redeem_codes (
                  id, code, normalized_code, package_name, assigned_order_id, status, note, created_at, assigned_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                str(row.id),
                str(row.code),
                str(row.normalizedCode),
                str(row.packageName),
                row.assignedOrderId ? str(row.assignedOrderId) : null,
                str(row.status, 'AVAILABLE'),
                str(row.note),
                str(row.createdAt, nowIso()),
                row.assignedAt ? str(row.assignedAt) : null
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'supportTickets') {
            const res = await db
              .prepare(
                `INSERT OR IGNORE INTO support_tickets (
                  id, order_id, category, subject, message, status, admin_reply, reviewed_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                str(row.id),
                row.orderId ? str(row.orderId) : null,
                str(row.category, 'SUPPORT'),
                str(row.subject),
                str(row.message),
                str(row.status, 'OPEN'),
                str(row.adminReply),
                str(row.reviewedBy),
                str(row.createdAt, nowIso()),
                str(row.updatedAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'contactMessages') {
            const res = await db
              .prepare(
                'INSERT OR IGNORE INTO contact_messages (id, name, contact, subject, message, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
              )
              .bind(
                str(row.id),
                str(row.name),
                str(row.contact),
                str(row.subject),
                str(row.message),
                str(row.status, 'NEW'),
                str(row.createdAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'adminActionLogs') {
            const res = await db
              .prepare(
                'INSERT OR IGNORE INTO admin_action_logs (id, admin_username, action, target_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?)'
              )
              .bind(
                str(row.id),
                str(row.adminUsername),
                str(row.action),
                str(row.targetId),
                str(row.details),
                str(row.createdAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'speedTests') {
            const res = await db
              .prepare(
                `INSERT OR IGNORE INTO speed_tests (
                  id, client_ref, mode, download_bps, upload_bps, latency_ms, jitter_ms,
                  down_loaded_latency_ms, up_loaded_latency_ms, packet_loss_supported,
                  total_duration_ms, isp_or_colo, scores_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                str(row.id),
                str(row.clientRef),
                str(row.mode),
                row.downloadBps == null ? null : num(row.downloadBps),
                row.uploadBps == null ? null : num(row.uploadBps),
                row.latencyMs == null ? null : num(row.latencyMs),
                row.jitterMs == null ? null : num(row.jitterMs),
                row.downLoadedLatencyMs == null ? null : num(row.downLoadedLatencyMs),
                row.upLoadedLatencyMs == null ? null : num(row.upLoadedLatencyMs),
                int(row.packetLossSupported, 0),
                row.totalDurationMs == null ? null : num(row.totalDurationMs),
                str(row.ispOrColo),
                row.scoresJson ? str(row.scoresJson) : null,
                str(row.createdAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'uidLookups') {
            const res = await db
              .prepare(
                `INSERT OR IGNORE INTO uid_lookups (
                  id, client_ref, uid, region, status, nickname, level, likes,
                  resolved_region, provider_name, error_message, profile_json, queried_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              )
              .bind(
                str(row.id),
                str(row.clientRef),
                str(row.uid),
                str(row.region),
                str(row.status),
                str(row.nickname),
                row.level == null ? null : int(row.level),
                row.likes == null ? null : int(row.likes),
                str(row.resolvedRegion),
                str(row.providerName),
                str(row.errorMessage),
                row.profileJson ? str(row.profileJson) : null,
                str(row.queriedAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else if (entity === 'legacyRecords') {
            const res = await db
              .prepare(
                'INSERT OR IGNORE INTO legacy_records (id, source_collection, source_id, payload_json, imported_at) VALUES (?, ?, ?, ?, ?)'
              )
              .bind(
                str(row.id),
                str(row.sourceCollection),
                str(row.sourceId),
                str(row.payloadJson),
                str(row.importedAt, nowIso())
              )
              .run();
            metaChanges = res.meta?.changes ?? 0;
          } else {
            throw new WorkerAppError(`Unsupported migration entity "${entity}".`);
          }

          if (metaChanges > 0) imported++;
          else skipped++;
        } catch (err) {
          failed.push({ id: rowId, reason: err instanceof Error ? err.message : String(err) });
        }
      }

      return { entity, imported, skipped, failed };
    }

    case 'migration.verify.counts': {
      const queries = await Promise.all([
        db.prepare('SELECT COUNT(*) as c FROM packages').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM storefront_settings').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM orders').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM order_timeline').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM provider_tx_locks').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM refunds').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM refund_history').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM redeem_codes').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM support_tickets').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM contact_messages').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM admin_action_logs').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM speed_tests').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM uid_lookups').first<{ c: number }>(),
        db.prepare('SELECT COUNT(*) as c FROM legacy_records').first<{ c: number }>(),
      ]);

      return {
        counts: {
          packages: int(queries[0]?.c, 0),
          storefrontSettings: int(queries[1]?.c, 0),
          orders: int(queries[2]?.c, 0),
          orderTimeline: int(queries[3]?.c, 0),
          providerTxLocks: int(queries[4]?.c, 0),
          refunds: int(queries[5]?.c, 0),
          refundHistory: int(queries[6]?.c, 0),
          redeemCodes: int(queries[7]?.c, 0),
          supportTickets: int(queries[8]?.c, 0),
          contactMessages: int(queries[9]?.c, 0),
          adminActionLogs: int(queries[10]?.c, 0),
          speedTests: int(queries[11]?.c, 0),
          uidLookups: int(queries[12]?.c, 0),
          legacyRecords: int(queries[13]?.c, 0),
        },
      };
    }

    default:
      throw new WorkerAppError(`Unknown dispatch action "${String(action)}".`, 400, 'UNKNOWN_ACTION');
  }
}
