import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { D1BridgeError, dispatchToD1, getD1BridgeConfig } from './d1Bridge.ts';
import { resolveTrackingPepper } from './orderService.ts';
import { OFFICIAL_PROVIDER_URL } from './providerService.ts';
import { runMigrationImport, type RecoveryCsvRow } from '../../../migration/legacyImport.ts';
import type { LegacyBackupBundle } from '../../../migration/migrationValidation.ts';

interface CachedRecoveryBundle {
  createdAt: number;
  checksumSha256: string;
  rows: RecoveryCsvRow[];
}

const recoveryCache = new Map<string, CachedRecoveryBundle>();

function pruneRecoveryCache() {
  const cutoff = Date.now() - 30 * 60_000;
  for (const [k, v] of recoveryCache.entries()) {
    if (v.createdAt < cutoff) recoveryCache.delete(k);
  }
}

export async function getAdminDashboardData() {
  return dispatchToD1('admin.dashboard', {});
}

export async function listAdminOrders(status?: string) {
  return dispatchToD1('admin.orders.list', { status: status || '' });
}

export async function adminVerifyOrderPayment(input: {
  orderId: string;
  approve: boolean;
  adminUsername: string;
  adminNote: string;
}) {
  return dispatchToD1('admin.payment.verify', input);
}

export async function adminUpdateOrder(input: {
  orderId: string;
  status: string;
  adminUsername: string;
  note: string;
  providerGroupId?: string;
  redeemCode?: string;
}) {
  return dispatchToD1('admin.order.update', input);
}

export async function adminSavePackage(input: {
  id?: string;
  slug?: string;
  name: string;
  botQuantity: number;
  priceAmount: number;
  currency: string;
  durationLabel: string;
  supportedRegions: string[];
  description: string;
  instructions: string;
  warnings: string;
  refundNote: string;
  providerPriceNote?: string;
  estimatedDelivery?: string;
  enabled: boolean;
  sortOrder: number;
  adminUsername: string;
}) {
  const sellingPriceMinor = Math.round(Number(input.priceAmount || 0) * 100);
  if (sellingPriceMinor <= 0) {
    throw new D1BridgeError('Package price must be greater than 0.', 400, 'VALIDATION_ERROR');
  }
  const action = input.id ? 'admin.packages.update' : 'admin.packages.create';
  const slug =
    input.slug ||
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90);
  return dispatchToD1(action, {
    ...input,
    slug,
    sellingPriceMinor,
  });
}

export async function adminDeletePackage(id: string, adminUsername: string) {
  return dispatchToD1('admin.packages.delete', { id, adminUsername });
}

export async function adminUpdateSettings(input: Record<string, unknown>, adminUsername: string) {
  return dispatchToD1('admin.settings.update', {
    ...input,
    providerHomepage: OFFICIAL_PROVIDER_URL,
    providerTrackingUrl: OFFICIAL_PROVIDER_URL,
    adminUsername,
  });
}

export async function adminUpdateRefund(input: {
  refundId: string;
  status: string;
  providerRefundResult: string;
  customerRefundResult: string;
  refundAmountLabel: string;
  adminResolutionNote: string;
  adminUsername: string;
}) {
  return dispatchToD1('admin.refunds.update', input);
}

export async function adminAddRedeemCode(input: {
  code: string;
  packageName: string;
  note: string;
  adminUsername: string;
}) {
  return dispatchToD1('admin.redeem.create', input);
}

export async function adminAssignRedeemCode(input: {
  redeemId: string;
  orderId: string;
  adminUsername: string;
}) {
  return dispatchToD1('admin.redeem.assign', input);
}

export async function adminDeleteRedeemCode(redeemId: string) {
  return dispatchToD1('admin.redeem.delete', { redeemId });
}

export async function adminReplyTicket(input: {
  ticketId: string;
  status: string;
  adminReply: string;
  adminUsername: string;
}) {
  return dispatchToD1('admin.support.reply', input);
}

export async function adminUpdateContact(input: {
  id: string;
  status: string;
  adminUsername: string;
}) {
  return dispatchToD1('admin.contacts.update', input);
}

export async function adminListAuditLogs() {
  return dispatchToD1('admin.audit.list', {});
}

export async function getMigrationCenterStatus() {
  const latestPath = path.resolve(process.cwd(), 'migration', 'backup', 'latest-export.json');
  let sourceSummary: Record<string, unknown> | null = null;
  if (fs.existsSync(latestPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(latestPath, 'utf8')) as LegacyBackupBundle;
      sourceSummary = {
        found: true,
        exportedAt: parsed.exportedAt,
        firebaseProjectId: parsed.firebaseProjectId,
        firestoreDatabaseId: parsed.firestoreDatabaseId,
        checksumSha256: parsed.checksumSha256,
        counts: parsed.counts,
        sources: parsed.sources,
      };
    } catch {
      sourceSummary = { found: false };
    }
  } else {
    sourceSummary = { found: false };
  }

  let targetCounts: Record<string, number> = {};
  let d1Ready = false;
  try {
    const verify = await dispatchToD1<{ counts: Record<string, number> }>('migration.verify.counts', {});
    targetCounts = verify.counts || {};
    d1Ready = true;
  } catch {
    d1Ready = false;
  }

  return {
    d1Ready,
    sourceBackup: sourceSummary,
    targetCounts,
  };
}

export async function executeMigrationFromBackup(
  adminUsername: string,
  customBundle?: LegacyBackupBundle
) {
  pruneRecoveryCache();
  const { workerUrl, bridgeSecret, configured } = getD1BridgeConfig();
  if (!configured) {
    throw new D1BridgeError('D1 Worker bridge is not configured.', 503, 'D1_NOT_CONFIGURED');
  }
  const trackingPepper = resolveTrackingPepper();

  let bundle = customBundle;
  if (!bundle) {
    const latestPath = path.resolve(process.cwd(), 'migration', 'backup', 'latest-export.json');
    if (!fs.existsSync(latestPath)) {
      throw new D1BridgeError(
        'No backup export found at migration/backup/latest-export.json.',
        404,
        'BACKUP_NOT_FOUND'
      );
    }
    bundle = JSON.parse(fs.readFileSync(latestPath, 'utf8')) as LegacyBackupBundle;
  }

  const result = await runMigrationImport({
    bundle,
    workerUrl,
    bridgeSecret,
    trackingPepper,
  });

  const runId = `mig-${crypto.randomBytes(10).toString('hex')}`;
  recoveryCache.set(runId, {
    createdAt: Date.now(),
    checksumSha256: result.checksumSha256,
    rows: result.recoveryRows,
  });

  return {
    runId,
    executedBy: adminUsername,
    executedAt: new Date().toISOString(),
    checksumSha256: result.checksumSha256,
    imported: result.imported,
    skipped: result.skipped,
    failed: result.failed,
    targetCounts: result.targetCounts,
    recoveryRowCount: result.recoveryRows.length,
  };
}

export function getRecoveryCsvDownload(runId: string): string | null {
  pruneRecoveryCache();
  const entry = recoveryCache.get(runId);
  if (!entry) return null;
  const header = 'order_reference,guild_id,tracking_code,legacy_customer_ref';
  const lines = entry.rows.map((r) =>
    [r.orderReference, r.guildId, r.trackingCode, r.legacyCustomerRef]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(',')
  );
  return [header, ...lines].join('\n');
}
