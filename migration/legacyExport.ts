import fs from 'node:fs';
import path from 'node:path';
import {
  computeBundleChecksum,
  type LegacyBackupBundle,
  type LegacyBackupCollectionCounts,
  validateBackupIntegrity,
} from './migrationValidation.ts';

function decodeFirestoreValue(val: Record<string, unknown>): unknown {
  if ('stringValue' in val) return String(val.stringValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    const arr = (val.arrayValue as { values?: Array<Record<string, unknown>> })?.values || [];
    return arr.map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields =
      (val.mapValue as { fields?: Record<string, Record<string, unknown>> })?.fields || {};
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(fields)) {
      obj[k] = decodeFirestoreValue(v);
    }
    return obj;
  }
  return val;
}

function sanitizeRecord(raw: Record<string, unknown>, id?: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (['password', 'passwordHash', 'salt', 'idToken', 'refreshToken', 'accessToken'].includes(k)) {
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeRecord(item as Record<string, unknown>)
          : item
      );
    } else if (v && typeof v === 'object') {
      out[k] = sanitizeRecord(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  if (id && !out.id) {
    out.id = id;
  }
  return out;
}

function decodeFirestoreDoc(docObj: {
  name?: string;
  fields?: Record<string, Record<string, unknown>>;
}): Record<string, unknown> {
  const segments = String(docObj.name || '').split('/');
  const docId = segments[segments.length - 1] || '';
  const raw: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(docObj.fields || {})) {
    raw[k] = decodeFirestoreValue(v);
  }
  return sanitizeRecord(raw, docId);
}

function mergeById(
  primary: Array<Record<string, unknown>>,
  secondary: Array<Record<string, unknown>>,
  idField = 'id'
): Array<Record<string, unknown>> {
  const seen = new Map<string, Record<string, unknown>>();
  for (const row of secondary) {
    const key = String(row[idField] || '');
    if (key) seen.set(key, row);
  }
  for (const row of primary) {
    const key = String(row[idField] || '');
    if (key) seen.set(key, row);
  }
  return Array.from(seen.values());
}

async function readJsonFileIfExists(filePath: string): Promise<Record<string, unknown> | null> {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function fetchFirestoreRestCollection(
  projectId: string,
  databaseId: string,
  apiKey: string,
  collectionPath: string,
  accessible: string[],
  denied: string[],
  bearerToken?: string
): Promise<Array<Record<string, unknown>>> {
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/${encodeURIComponent(databaseId)}/documents/${collectionPath}?pageSize=300&key=${encodeURIComponent(
    apiKey
  )}`;
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (res.status === 401 || res.status === 403) {
      denied.push(collectionPath);
      return [];
    }
    if (!res.ok) {
      denied.push(`${collectionPath} (HTTP ${res.status})`);
      return [];
    }
    const body = (await res.json()) as {
      documents?: Array<{ name?: string; fields?: Record<string, Record<string, unknown>> }>;
    };
    accessible.push(collectionPath);
    return (body.documents || []).map(decodeFirestoreDoc);
  } catch (err) {
    denied.push(`${collectionPath} (${err instanceof Error ? err.message : 'fetch error'})`);
    return [];
  }
}

async function main() {
  const rootDir = process.cwd();
  const firebaseCfgPath = path.join(rootDir, 'firebase-applet-config.json');
  const crazyDbPath = path.join(rootDir, 'data', 'crazy-org-db.json');
  const vesperDbPath = path.join(rootDir, 'data', 'vesper-db.json');

  const firebaseCfg = await readJsonFileIfExists(firebaseCfgPath);
  const crazyDb = await readJsonFileIfExists(crazyDbPath);
  const vesperDb = await readJsonFileIfExists(vesperDbPath);

  const projectId = String(
    process.env.LEGACY_FIREBASE_PROJECT_ID || firebaseCfg?.projectId || 'utopian-robot-8c70r'
  );
  const databaseId = String(
    process.env.LEGACY_FIRESTORE_DB_ID ||
      firebaseCfg?.firestoreDatabaseId ||
      'ai-studio-vespermonochrome-78076f70-ef38-4705-8de9-32670d1a65e9'
  );
  const apiKey = String(process.env.LEGACY_FIREBASE_API_KEY || firebaseCfg?.apiKey || '');
  const bearerToken = process.env.FIREBASE_ID_TOKEN?.trim() || undefined;

  const accessibleCollections: string[] = [];
  const deniedCollections: string[] = [];

  let fsPackages: Array<Record<string, unknown>> = [];
  let fsSettings: Record<string, unknown> | null = null;
  let fsOrders: Array<Record<string, unknown>> = [];
  const fsTimeline: Array<Record<string, unknown>> = [];
  let fsTxLocks: Array<Record<string, unknown>> = [];
  let fsRefunds: Array<Record<string, unknown>> = [];
  const fsRefundHistory: Array<Record<string, unknown>> = [];
  let fsRedeemCodes: Array<Record<string, unknown>> = [];
  let fsSupportTickets: Array<Record<string, unknown>> = [];
  let fsContactMessages: Array<Record<string, unknown>> = [];
  let fsUsers: Array<Record<string, unknown>> = [];
  let fsAdmins: Array<Record<string, unknown>> = [];
  let fsAdminLogs: Array<Record<string, unknown>> = [];
  let fsSpeedTests: Array<Record<string, unknown>> = [];
  let fsUidLookups: Array<Record<string, unknown>> = [];

  let firestoreLiveAttempted = false;

  if (apiKey) {
    firestoreLiveAttempted = true;
    fsPackages = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'guildPackages',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );

    const settingsList = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'guildSettings',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
    fsSettings = settingsList.find((d) => d.id === 'main') || settingsList[0] || null;

    fsOrders = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'orders',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
    for (const ord of fsOrders) {
      const sub = await fetchFirestoreRestCollection(
        projectId,
        databaseId,
        apiKey,
        `orders/${String(ord.id)}/timeline`,
        accessibleCollections,
        deniedCollections,
        bearerToken
      );
      for (const t of sub) fsTimeline.push({ ...t, orderId: ord.id });
    }

    fsTxLocks = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'providerTxLocks',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
    fsRefunds = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'refunds',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
    for (const rf of fsRefunds) {
      const sub = await fetchFirestoreRestCollection(
        projectId,
        databaseId,
        apiKey,
        `refunds/${String(rf.id)}/history`,
        accessibleCollections,
        deniedCollections,
        bearerToken
      );
      for (const h of sub) fsRefundHistory.push({ ...h, refundId: rf.id });
    }

    fsRedeemCodes = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'redeemCodes',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
    fsSupportTickets = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'supportTickets',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
    fsContactMessages = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'contactMessages',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
    fsUsers = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'users',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
    fsAdmins = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'admins',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
    fsAdminLogs = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'adminActionLogs',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
    fsSpeedTests = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'speedTests',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
    fsUidLookups = await fetchFirestoreRestCollection(
      projectId,
      databaseId,
      apiKey,
      'uidLookups',
      accessibleCollections,
      deniedCollections,
      bearerToken
    );
  }

  const localPackages = Array.isArray(crazyDb?.guildPackages)
    ? (crazyDb.guildPackages as Array<Record<string, unknown>>).map((r) => sanitizeRecord(r))
    : [];
  const localSettings =
    crazyDb?.guildSettings && typeof crazyDb.guildSettings === 'object'
      ? sanitizeRecord(crazyDb.guildSettings as Record<string, unknown>, 'main')
      : null;
  const localOrders = Array.isArray(crazyDb?.guildOrders)
    ? (crazyDb.guildOrders as Array<Record<string, unknown>>).map((r) => sanitizeRecord(r))
    : [];
  const localRefunds = Array.isArray(crazyDb?.guildRefunds)
    ? (crazyDb.guildRefunds as Array<Record<string, unknown>>).map((r) => sanitizeRecord(r))
    : [];
  const localSpeedTests = [
    ...(Array.isArray(crazyDb?.speedTests)
      ? (crazyDb.speedTests as Array<Record<string, unknown>>).map((r) => sanitizeRecord(r))
      : []),
    ...(Array.isArray(vesperDb?.speedTests)
      ? (vesperDb.speedTests as Array<Record<string, unknown>>).map((r) => sanitizeRecord(r))
      : []),
  ];
  const localUidLookups = [
    ...(Array.isArray(crazyDb?.uidLookups)
      ? (crazyDb.uidLookups as Array<Record<string, unknown>>).map((r) => sanitizeRecord(r))
      : []),
    ...(Array.isArray(vesperDb?.uidLookups)
      ? (vesperDb.uidLookups as Array<Record<string, unknown>>).map((r) => sanitizeRecord(r))
      : []),
  ];
  const localContacts = [
    ...(Array.isArray(crazyDb?.contactMessages)
      ? (crazyDb.contactMessages as Array<Record<string, unknown>>).map((r) => sanitizeRecord(r))
      : []),
    ...(Array.isArray(vesperDb?.contactMessages)
      ? (vesperDb.contactMessages as Array<Record<string, unknown>>).map((r) => sanitizeRecord(r))
      : []),
  ];
  const localUsers = Array.isArray(crazyDb?.users)
    ? (crazyDb.users as Array<Record<string, unknown>>).map((r) => sanitizeRecord(r))
    : [];

  const collections: LegacyBackupBundle['collections'] = {
    guildPackages: mergeById(fsPackages, localPackages),
    guildSettings: fsSettings || localSettings,
    orders: mergeById(fsOrders, localOrders),
    orderTimeline: fsTimeline,
    providerTxLocks: fsTxLocks,
    refunds: mergeById(fsRefunds, localRefunds),
    refundHistory: fsRefundHistory,
    redeemCodes: fsRedeemCodes,
    supportTickets: fsSupportTickets,
    contactMessages: mergeById(fsContactMessages, localContacts),
    users: mergeById(fsUsers, localUsers),
    admins: fsAdmins,
    adminActionLogs: fsAdminLogs,
    speedTests: mergeById(fsSpeedTests, localSpeedTests),
    uidLookups: mergeById(fsUidLookups, localUidLookups),
  };

  const counts: LegacyBackupCollectionCounts = {
    guildPackages: collections.guildPackages.length,
    guildSettings: collections.guildSettings ? 1 : 0,
    orders: collections.orders.length,
    orderTimeline: collections.orderTimeline.length,
    providerTxLocks: collections.providerTxLocks.length,
    refunds: collections.refunds.length,
    refundHistory: collections.refundHistory.length,
    redeemCodes: collections.redeemCodes.length,
    supportTickets: collections.supportTickets.length,
    contactMessages: collections.contactMessages.length,
    users: collections.users.length,
    admins: collections.admins.length,
    adminActionLogs: collections.adminActionLogs.length,
    speedTests: collections.speedTests.length,
    uidLookups: collections.uidLookups.length,
  };

  const bundle: LegacyBackupBundle = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    firebaseProjectId: projectId,
    firestoreDatabaseId: databaseId,
    sources: {
      firestoreLiveAttempted,
      firestoreAccessibleCollections: accessibleCollections,
      firestoreDeniedCollections: deniedCollections,
      localCrazyDbLoaded: Boolean(crazyDb),
      localVesperDbLoaded: Boolean(vesperDb),
    },
    checksumSha256: computeBundleChecksum(collections),
    counts,
    collections,
  };

  const backupDir = path.join(rootDir, 'migration', 'backup');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = bundle.exportedAt.replace(/[:.]/g, '-');
  const datedFile = path.join(backupDir, `firebase-export-${stamp}.json`);
  const latestFile = path.join(backupDir, 'latest-export.json');

  const payload = JSON.stringify(bundle, null, 2);
  fs.writeFileSync(datedFile, payload, 'utf8');
  fs.writeFileSync(latestFile, payload, 'utf8');

  const check = validateBackupIntegrity(bundle);
  console.log('=== Legacy Data Export Summary ===');
  console.log(`Checksum SHA256: ${bundle.checksumSha256}`);
  console.log('Collection counts:', JSON.stringify(counts, null, 2));
  console.log(`Latest pointer: ${latestFile}`);
  if (!check.valid) {
    console.error('Validation errors:', check.errors);
    process.exitCode = 1;
  }
}

void main();
