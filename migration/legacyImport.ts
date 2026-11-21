import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  assertWithinD1FreeTierQuota,
  type LegacyBackupBundle,
  toMinorUnits,
  validateBackupIntegrity,
} from './migrationValidation.ts';

export interface RecoveryCsvRow {
  orderReference: string;
  guildId: string;
  trackingCode: string;
  legacyCustomerRef: string;
}

export interface BatchMigrationResult {
  checksumSha256: string;
  imported: Record<string, number>;
  skipped: Record<string, number>;
  failed: Array<{ entity: string; id: string; reason: string }>;
  targetCounts: Record<string, number>;
  recoveryRows: RecoveryCsvRow[];
}

function makeOpaqueTrackingToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function hashTrackingToken(pepper: string, orderId: string, token: string): string {
  return crypto.createHmac('sha256', pepper).update(`${orderId}:${token}`, 'utf8').digest('hex');
}

async function callD1Bridge(
  workerUrl: string,
  bridgeSecret: string,
  action: string,
  payload: unknown
): Promise<Record<string, unknown>> {
  const endpoint = `${workerUrl.replace(/\/+$/, '')}/internal/v1/dispatch`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString('hex');
  const rawBody = JSON.stringify({ action, payload });
  const bodyHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');
  const canonical = `POST\n/internal/v1/dispatch\n${timestamp}\n${nonce}\n${bodyHash}`;
  const signature = crypto.createHmac('sha256', bridgeSecret).update(canonical, 'utf8').digest('hex');

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bridge-timestamp': timestamp,
      'x-bridge-nonce': nonce,
      'x-bridge-signature': signature,
    },
    body: rawBody,
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new Error(String(data.error || `D1 bridge request failed (${res.status})`));
  }
  return data;
}

export function buildNormalizedMigrationPayloads(
  bundle: LegacyBackupBundle,
  trackingPepper: string
): {
  packages: Array<Record<string, unknown>>;
  settings: Record<string, unknown> | null;
  orders: Array<Record<string, unknown>>;
  orderTimeline: Array<Record<string, unknown>>;
  providerTxLocks: Array<Record<string, unknown>>;
  refunds: Array<Record<string, unknown>>;
  refundHistory: Array<Record<string, unknown>>;
  redeemCodes: Array<Record<string, unknown>>;
  supportTickets: Array<Record<string, unknown>>;
  contactMessages: Array<Record<string, unknown>>;
  adminActionLogs: Array<Record<string, unknown>>;
  speedTests: Array<Record<string, unknown>>;
  uidLookups: Array<Record<string, unknown>>;
  legacyRecords: Array<Record<string, unknown>>;
  recoveryRows: RecoveryCsvRow[];
} {
  const recoveryRows: RecoveryCsvRow[] = [];

  const packages = bundle.collections.guildPackages.map((raw) => {
    const currency = String(raw.currency || 'USD').slice(0, 8);
    return {
      id: String(raw.id || ''),
      productId: 'prod-ff-guild-glory',
      slug: String(raw.slug || ''),
      name: String(raw.name || ''),
      botCount: Number(raw.botQuantity || 1),
      sellingPriceMinor: toMinorUnits(raw.priceAmount, 0),
      currency,
      durationLabel: String(raw.durationLabel || 'Standard Session'),
      supportedRegionsJson: JSON.stringify(
        Array.isArray(raw.supportedRegions) ? raw.supportedRegions : ['BD', 'IND', 'SG']
      ),
      description: String(raw.description || ''),
      instructions: String(raw.instructions || ''),
      warnings: String(raw.warnings || ''),
      refundNote: String(raw.refundNote || ''),
      providerPriceNote: String(raw.providerPriceNote || ''),
      estimatedDelivery: String(raw.estimatedDelivery || ''),
      active: raw.enabled === false ? 0 : 1,
      sortOrder: Number(raw.sortOrder ?? 99),
      updatedAt: String(raw.updatedAt || new Date().toISOString()),
    };
  });

  const settings = bundle.collections.guildSettings
    ? {
        id: 'main',
        providerName: String(bundle.collections.guildSettings.providerName || 'FFGlory'),
        providerHomepage: 'https://www.ffglory.pro/',
        providerTrackingUrl: 'https://www.ffglory.pro/',
        currency: String(bundle.collections.guildSettings.currency || 'USD'),
        supportedHandoffMethod: String(
          bundle.collections.guildSettings.supportedHandoffMethod ||
            'Second browser tab handoff + manual transaction & Group ID verification'
        ),
        providerTransactionFieldsNote: String(
          bundle.collections.guildSettings.providerTransactionFieldsNote || ''
        ),
        serviceInstructions: String(bundle.collections.guildSettings.serviceInstructions || ''),
        paymentInstructions: String(bundle.collections.guildSettings.paymentInstructions || ''),
        importantWarnings: String(bundle.collections.guildSettings.importantWarnings || ''),
        refundConditions: String(bundle.collections.guildSettings.refundConditions || ''),
        supportWhatsapp: String(bundle.collections.guildSettings.supportWhatsapp || ''),
        supportEmail: String(bundle.collections.guildSettings.supportEmail || ''),
        supportHours: String(bundle.collections.guildSettings.supportHours || 'Daily 10:00 – 23:00 UTC'),
        updatedAt: String(bundle.collections.guildSettings.updatedAt || new Date().toISOString()),
      }
    : null;

  const orders: Array<Record<string, unknown>> = [];
  const providerTransactions: Array<Record<string, unknown>> = [];
  const activations: Array<Record<string, unknown>> = [];

  for (const raw of bundle.collections.orders) {
    const id = String(raw.id || '');
    if (!id) continue;
    const trackingToken = makeOpaqueTrackingToken();
    const trackingTokenHash = hashTrackingToken(trackingPepper, id, trackingToken);
    const legacyCustomerRef = String(raw.customerEmail || raw.customerId || 'legacy-guest');
    const guildId = String(raw.guildId || '');
    const orderReference = String(raw.orderReference || id);

    recoveryRows.push({
      orderReference,
      guildId,
      trackingCode: trackingToken,
      legacyCustomerRef,
    });

    const status = String(raw.status || 'AWAITING_PROVIDER_PAYMENT');
    orders.push({
      id,
      orderReference,
      idempotencyKey: String(raw.idempotencyKey || `legacy-${id}`),
      trackingTokenHash,
      packageId: String(raw.packageId || ''),
      packageName: String(raw.packageName || ''),
      guildUid: guildId,
      guildName: String(raw.guildName || ''),
      region: String(raw.region || 'BD'),
      whatsappContact: String(raw.whatsapp || ''),
      quantityMultiplier: Number(raw.quantityMultiplier || 1),
      botCount: Number(raw.botQuantity || 1),
      totalBots: Number(raw.totalBots || 1),
      unitPriceMinor: toMinorUnits(raw.unitPrice, 0),
      totalPriceMinor: toMinorUnits(raw.totalAmount, 0),
      currency: String(raw.currency || 'USD'),
      paymentStatus: raw.paymentVerifiedAt
        ? 'CONFIRMED'
        : raw.providerTransactionId
          ? 'SUBMITTED'
          : 'AWAITING_PAYMENT',
      serviceStatus: status,
      providerName: String(raw.providerName || 'FFGlory'),
      providerUrl: 'https://www.ffglory.pro/',
      redeemCodeAssigned: raw.redeemCode ? String(raw.redeemCode) : null,
      legacyCustomerRef,
      createdAt: String(raw.createdAt || new Date().toISOString()),
      updatedAt: String(raw.updatedAt || new Date().toISOString()),
      providerTx: raw.providerTransactionId
        ? {
            id: `ptx-${id}`,
            orderId: id,
            providerTransactionId: String(raw.providerTransactionId),
            binanceOrderId: String(raw.binanceOrderId || ''),
            providerAccountUsername: String(raw.providerAccountUsername || ''),
            paymentProofUrl: String(raw.paymentProofUrl || ''),
            submittedAt: String(raw.paymentSubmittedAt || raw.updatedAt || new Date().toISOString()),
            verifiedAt: raw.paymentVerifiedAt ? String(raw.paymentVerifiedAt) : null,
            verifiedBy: String(raw.paymentVerifiedBy || ''),
            adminNote: String(raw.paymentAdminNote || ''),
          }
        : null,
      activation: raw.providerGroupId
        ? {
            id: `act-${id}`,
            orderId: id,
            providerGroupId: String(raw.providerGroupId),
            activationTxRef: String(raw.activationTransactionRef || ''),
            customerStatus: String(raw.customerActivationStatus || 'WAITING_15_MIN'),
            redeemCode: String(raw.redeemCode || ''),
            proofUrl: String(raw.activationProofUrl || ''),
            submittedAt: String(raw.activationSubmittedAt || raw.updatedAt || new Date().toISOString()),
            verifiedAt: raw.activationVerifiedAt ? String(raw.activationVerifiedAt) : null,
            verifiedBy: String(raw.activationVerifiedBy || ''),
            adminNote: String(raw.activationAdminNote || ''),
          }
        : null,
    });
    void providerTransactions;
    void activations;
  }

  const orderTimeline = bundle.collections.orderTimeline.map((raw) => ({
    id: String(raw.id || ''),
    orderId: String(raw.orderId || ''),
    previousStatus: raw.previousStatus ? String(raw.previousStatus) : null,
    status: String(raw.status || 'ORDER_CREATED'),
    actorRole: String(raw.actorRole || 'system'),
    actorLabel: String(raw.actorLabel || 'Legacy Migration'),
    title: String(raw.title || 'Status Event'),
    note: String(raw.note || ''),
    createdAt: String(raw.timestamp || new Date().toISOString()),
  }));

  const providerTxLocks = bundle.collections.providerTxLocks.map((raw) => ({
    txKey: String(raw.txKey || ''),
    rawTxId: String(raw.rawTxId || ''),
    orderId: String(raw.orderId || ''),
    createdAt: String(raw.createdAt || new Date().toISOString()),
  }));

  const refunds = bundle.collections.refunds.map((raw) => ({
    id: String(raw.id || ''),
    orderId: String(raw.orderId || ''),
    providerTxRef: String(raw.providerTransactionRef || ''),
    providerGroupRef: String(raw.providerGroupRef || ''),
    ranOver30MinZeroGlory: raw.ranOver30MinZeroGlory ? 1 : 0,
    runningMinutesObserved: Number(raw.runningMinutesObserved || 0),
    explanation: String(raw.failureExplanation || ''),
    status: String(raw.status || 'PENDING_REVIEW'),
    providerRefundResult: String(raw.providerRefundResult || 'PENDING'),
    customerRefundResult: String(raw.customerRefundResult || 'PENDING'),
    refundAmountMinor: 0,
    refundCurrency: 'USD',
    refundAmountLabel: String(raw.refundAmountLabel || ''),
    adminNote: String(raw.adminResolutionNote || ''),
    reviewedBy: String(raw.reviewedBy || ''),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  }));

  const refundHistory = bundle.collections.refundHistory.map((raw) => ({
    id: String(raw.id || ''),
    refundId: String(raw.refundId || ''),
    status: String(raw.status || 'PENDING_REVIEW'),
    actor: String(raw.actor || 'System'),
    note: String(raw.note || ''),
    createdAt: String(raw.timestamp || new Date().toISOString()),
  }));

  const redeemCodes = bundle.collections.redeemCodes.map((raw) => ({
    id: String(raw.id || ''),
    code: String(raw.code || ''),
    normalizedCode: String(raw.normalizedCode || String(raw.code || '').toUpperCase()),
    packageName: String(raw.packageName || ''),
    assignedOrderId: raw.assignedOrderId ? String(raw.assignedOrderId) : null,
    status: String(raw.status || 'AVAILABLE'),
    note: String(raw.note || ''),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    assignedAt: raw.assignedAt ? String(raw.assignedAt) : null,
  }));

  const supportTickets = bundle.collections.supportTickets.map((raw) => ({
    id: String(raw.id || ''),
    orderId: raw.orderId ? String(raw.orderId) : null,
    category: String(raw.category || 'SUPPORT'),
    subject: String(raw.subject || ''),
    message: String(raw.message || ''),
    status: String(raw.status || 'OPEN'),
    adminReply: String(raw.adminReply || ''),
    reviewedBy: String(raw.reviewedBy || ''),
    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
  }));

  const contactMessages = bundle.collections.contactMessages.map((raw) => ({
    id: String(raw.id || ''),
    name: String(raw.name || 'Guest'),
    contact: String(raw.senderEmail || raw.contact || ''),
    subject: String(raw.subject || 'Inquiry'),
    message: String(raw.message || ''),
    status: 'NEW',
    createdAt: String(raw.createdAt || new Date().toISOString()),
  }));

  const adminActionLogs = bundle.collections.adminActionLogs.map((raw) => ({
    id: String(raw.id || ''),
    adminUsername: String(raw.adminEmail || 'legacy-admin'),
    action: String(raw.action || 'LEGACY_ACTION'),
    targetId: String(raw.targetId || ''),
    details: String(raw.details || ''),
    createdAt: String(raw.timestamp || new Date().toISOString()),
  }));

  const speedTests = bundle.collections.speedTests.map((raw) => ({
    id: String(raw.id || ''),
    clientRef: String(raw.ownerUid || 'legacy'),
    mode: String(raw.mode || 'standard'),
    downloadBps: raw.downloadBps == null ? null : Number(raw.downloadBps),
    uploadBps: raw.uploadBps == null ? null : Number(raw.uploadBps),
    latencyMs: raw.latencyMs == null ? null : Number(raw.latencyMs),
    jitterMs: raw.jitterMs == null ? null : Number(raw.jitterMs),
    downLoadedLatencyMs: raw.downLoadedLatencyMs == null ? null : Number(raw.downLoadedLatencyMs),
    upLoadedLatencyMs: raw.upLoadedLatencyMs == null ? null : Number(raw.upLoadedLatencyMs),
    packetLossSupported: raw.packetLossSupported ? 1 : 0,
    totalDurationMs: raw.totalDurationMs == null ? null : Number(raw.totalDurationMs),
    ispOrColo: String(raw.ispOrColo || ''),
    scoresJson: raw.scores ? JSON.stringify(raw.scores) : null,
    createdAt: String(raw.createdAt || new Date().toISOString()),
  }));

  const uidLookups = bundle.collections.uidLookups.map((raw) => ({
    id: String(raw.id || ''),
    clientRef: String(raw.ownerUid || 'legacy'),
    uid: String(raw.uid || ''),
    region: String(raw.region || 'BD'),
    status: String(raw.status || 'success'),
    nickname: String(raw.nickname || ''),
    level: raw.level == null ? null : Number(raw.level),
    likes: raw.likes == null ? null : Number(raw.likes),
    resolvedRegion: String(raw.resolvedRegion || ''),
    providerName: String(raw.providerName || 'Free Fire Public Telemetry'),
    errorMessage: String(raw.errorMessage || ''),
    profileJson: raw.profile ? JSON.stringify(raw.profile) : null,
    queriedAt: String(raw.queriedAt || new Date().toISOString()),
  }));

  const legacyRecords = [
    ...bundle.collections.users.map((u) => ({
      id: `user-${String(u.uid || u.id || crypto.randomUUID())}`,
      sourceCollection: 'users',
      sourceId: String(u.uid || u.id || ''),
      payloadJson: JSON.stringify(u),
      importedAt: new Date().toISOString(),
    })),
    ...bundle.collections.admins.map((a) => ({
      id: `admin-${String(a.uid || a.id || crypto.randomUUID())}`,
      sourceCollection: 'admins',
      sourceId: String(a.uid || a.id || ''),
      payloadJson: JSON.stringify(a),
      importedAt: new Date().toISOString(),
    })),
  ];

  return {
    packages,
    settings,
    orders,
    orderTimeline,
    providerTxLocks,
    refunds,
    refundHistory,
    redeemCodes,
    supportTickets,
    contactMessages,
    adminActionLogs,
    speedTests,
    uidLookups,
    legacyRecords,
    recoveryRows,
  };
}

export async function runMigrationImport(options: {
  bundle: LegacyBackupBundle;
  workerUrl: string;
  bridgeSecret: string;
  trackingPepper: string;
  batchSize?: number;
}): Promise<BatchMigrationResult> {
  const { bundle, workerUrl, bridgeSecret, trackingPepper, batchSize = 25 } = options;

  const check = validateBackupIntegrity(bundle);
  if (!check.valid) {
    throw new Error(`Migration aborted: ${check.errors.join('; ')}`);
  }

  const quota = assertWithinD1FreeTierQuota(bundle);
  if (!quota.withinQuota) {
    throw new Error(`Migration aborted: Payload exceeds Cloudflare D1 Free Tier safe threshold.`);
  }

  const normalized = buildNormalizedMigrationPayloads(bundle, trackingPepper);
  const imported: Record<string, number> = {};
  const skipped: Record<string, number> = {};
  const failed: Array<{ entity: string; id: string; reason: string }> = [];

  const sendChunks = async (entity: string, rows: Array<Record<string, unknown>>) => {
    imported[entity] = 0;
    skipped[entity] = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const res = await callD1Bridge(workerUrl, bridgeSecret, 'migration.import.batch', {
        entity,
        rows: chunk,
        checksumSha256: bundle.checksumSha256,
      });
      imported[entity] += Number(res.imported || 0);
      skipped[entity] += Number(res.skipped || 0);
      if (Array.isArray(res.failed)) {
        for (const f of res.failed as Array<{ id: string; reason: string }>) {
          failed.push({ entity, id: f.id, reason: f.reason });
        }
      }
    }
  };

  await sendChunks('packages', normalized.packages);
  if (normalized.settings) {
    await sendChunks('settings', [normalized.settings]);
  }
  await sendChunks('orders', normalized.orders);
  await sendChunks('orderTimeline', normalized.orderTimeline);
  await sendChunks('providerTxLocks', normalized.providerTxLocks);
  await sendChunks('refunds', normalized.refunds);
  await sendChunks('refundHistory', normalized.refundHistory);
  await sendChunks('redeemCodes', normalized.redeemCodes);
  await sendChunks('supportTickets', normalized.supportTickets);
  await sendChunks('contactMessages', normalized.contactMessages);
  await sendChunks('adminActionLogs', normalized.adminActionLogs);
  await sendChunks('speedTests', normalized.speedTests);
  await sendChunks('uidLookups', normalized.uidLookups);
  await sendChunks('legacyRecords', normalized.legacyRecords);

  const verify = await callD1Bridge(workerUrl, bridgeSecret, 'migration.verify.counts', {});
  return {
    checksumSha256: bundle.checksumSha256,
    imported,
    skipped,
    failed,
    targetCounts: (verify.counts || {}) as Record<string, number>,
    recoveryRows: normalized.recoveryRows,
  };
}

async function cli() {
  const args = process.argv.slice(2);
  const isCliDirect = process.argv[1]?.endsWith('legacyImport.ts');
  if (!isCliDirect) return;

  const fileArgIdx = args.indexOf('--file');
  const exportPath =
    fileArgIdx !== -1 && args[fileArgIdx + 1]
      ? path.resolve(args[fileArgIdx + 1])
      : path.join(process.cwd(), 'migration', 'backup', 'latest-export.json');

  if (!fs.existsSync(exportPath)) {
    throw new Error(`Export file not found at ${exportPath}. Run legacyExport.ts first.`);
  }

  const workerUrl = process.env.D1_WORKER_URL || '';
  const bridgeSecret = process.env.D1_BRIDGE_SECRET || '';
  const trackingPepper = process.env.TRACKING_CODE_PEPPER || '';

  if (!workerUrl || !bridgeSecret || !trackingPepper) {
    throw new Error(
      'Missing required environment variables: D1_WORKER_URL, D1_BRIDGE_SECRET, TRACKING_CODE_PEPPER.'
    );
  }

  const bundle = JSON.parse(fs.readFileSync(exportPath, 'utf8')) as LegacyBackupBundle;
  const result = await runMigrationImport({
    bundle,
    workerUrl,
    bridgeSecret,
    trackingPepper,
  });

  console.log('=== Cloudflare D1 Migration Complete ===');
  console.log(`Checksum: ${result.checksumSha256}`);
  console.log('Imported counts:', JSON.stringify(result.imported, null, 2));
  console.log('Skipped counts:', JSON.stringify(result.skipped, null, 2));
  console.log('Failed count:', result.failed.length);
  console.log('Target D1 counts:', JSON.stringify(result.targetCounts, null, 2));
  console.log(
    `Generated ${result.recoveryRows.length} historical tracking recovery rows (distribute via Admin Console).`
  );
}

void cli();
