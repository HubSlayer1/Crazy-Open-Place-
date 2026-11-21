import crypto from 'node:crypto';

export interface LegacyBackupCollectionCounts {
  guildPackages: number;
  guildSettings: number;
  orders: number;
  orderTimeline: number;
  providerTxLocks: number;
  refunds: number;
  refundHistory: number;
  redeemCodes: number;
  supportTickets: number;
  contactMessages: number;
  users: number;
  admins: number;
  adminActionLogs: number;
  speedTests: number;
  uidLookups: number;
}

export interface LegacyBackupBundle {
  version: '1.0';
  exportedAt: string;
  firebaseProjectId: string;
  firestoreDatabaseId: string;
  sources: {
    firestoreLiveAttempted: boolean;
    firestoreAccessibleCollections: string[];
    firestoreDeniedCollections: string[];
    localCrazyDbLoaded: boolean;
    localVesperDbLoaded: boolean;
  };
  checksumSha256: string;
  counts: LegacyBackupCollectionCounts;
  collections: {
    guildPackages: Array<Record<string, unknown>>;
    guildSettings: Record<string, unknown> | null;
    orders: Array<Record<string, unknown>>;
    orderTimeline: Array<Record<string, unknown>>;
    providerTxLocks: Array<Record<string, unknown>>;
    refunds: Array<Record<string, unknown>>;
    refundHistory: Array<Record<string, unknown>>;
    redeemCodes: Array<Record<string, unknown>>;
    supportTickets: Array<Record<string, unknown>>;
    contactMessages: Array<Record<string, unknown>>;
    users: Array<Record<string, unknown>>;
    admins: Array<Record<string, unknown>>;
    adminActionLogs: Array<Record<string, unknown>>;
    speedTests: Array<Record<string, unknown>>;
    uidLookups: Array<Record<string, unknown>>;
  };
}

export function toMinorUnits(amount: unknown, fallback = 0): number {
  const num = Number(amount);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Math.round(num * 100);
}

export function computeBundleChecksum(collections: LegacyBackupBundle['collections']): string {
  const canonical = JSON.stringify(collections);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function estimatePayloadBytes(bundle: LegacyBackupBundle): number {
  return Buffer.byteLength(JSON.stringify(bundle.collections), 'utf8');
}

export function assertWithinD1FreeTierQuota(bundle: LegacyBackupBundle): {
  bytes: number;
  megabytes: number;
  withinQuota: boolean;
} {
  const bytes = estimatePayloadBytes(bundle);
  const megabytes = Number((bytes / (1024 * 1024)).toFixed(4));
  const limitBytes = 450 * 1024 * 1024;
  return {
    bytes,
    megabytes,
    withinQuota: bytes <= limitBytes,
  };
}

export function validateBackupIntegrity(bundle: LegacyBackupBundle): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!bundle || typeof bundle !== 'object' || bundle.version !== '1.0') {
    errors.push('Invalid backup bundle schema or missing version 1.0.');
    return { valid: false, errors, warnings };
  }

  const expectedChecksum = computeBundleChecksum(bundle.collections);
  if (bundle.checksumSha256 !== expectedChecksum) {
    errors.push(
      `SHA-256 checksum mismatch (expected ${expectedChecksum}, found ${bundle.checksumSha256}).`
    );
  }

  const quota = assertWithinD1FreeTierQuota(bundle);
  if (!quota.withinQuota) {
    errors.push(`Backup payload (${quota.megabytes} MB) approaches Cloudflare D1 500 MB cap.`);
  }

  const orderIds = new Set(bundle.collections.orders.map((o) => String(o.id || '')));
  for (const evt of bundle.collections.orderTimeline) {
    const oid = String(evt.orderId || '');
    if (oid && !orderIds.has(oid)) {
      warnings.push(`Orphan timeline entry ${String(evt.id || 'unknown')} references missing order ${oid}.`);
    }
  }

  const refundIds = new Set(bundle.collections.refunds.map((r) => String(r.id || '')));
  for (const hist of bundle.collections.refundHistory) {
    const rid = String(hist.refundId || '');
    if (rid && !refundIds.has(rid)) {
      warnings.push(`Orphan refund history ${String(hist.id || 'unknown')} references missing refund ${rid}.`);
    }
  }

  if (bundle.sources.firestoreDeniedCollections.length > 0) {
    warnings.push(
      `Firestore security rules blocked unauthenticated CLI read on: ${bundle.sources.firestoreDeniedCollections.join(', ')}. ` +
        `Run legacyExport with a Firebase ID token or export from Firestore console if historical private documents exist there.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
