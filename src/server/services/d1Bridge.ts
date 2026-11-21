import crypto from 'node:crypto';

export class D1BridgeError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 500, code = 'D1_BRIDGE_ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getD1BridgeConfig(): {
  workerUrl: string;
  bridgeSecret: string;
  configured: boolean;
} {
  const workerUrl = (process.env.D1_WORKER_URL || '').trim().replace(/\/+$/, '');
  const bridgeSecret = (process.env.D1_BRIDGE_SECRET || '').trim();
  return {
    workerUrl,
    bridgeSecret,
    configured: Boolean(workerUrl && bridgeSecret.length >= 16),
  };
}

export function isD1Configured(): boolean {
  return getD1BridgeConfig().configured;
}

export async function dispatchToD1<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const { workerUrl, bridgeSecret, configured } = getD1BridgeConfig();
  if (!configured) {
    throw new D1BridgeError(
      'Cloudflare D1 bridge is not configured on this server (missing D1_WORKER_URL or D1_BRIDGE_SECRET).',
      503,
      'D1_NOT_CONFIGURED'
    );
  }

  const endpoint = `${workerUrl}/internal/v1/dispatch`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = crypto.randomBytes(16).toString('hex');
  const rawBody = JSON.stringify({ action, payload });
  const bodyHash = crypto.createHash('sha256').update(rawBody, 'utf8').digest('hex');
  const canonical = `POST\n/internal/v1/dispatch\n${timestamp}\n${nonce}\n${bodyHash}`;
  const signature = crypto
    .createHmac('sha256', bridgeSecret)
    .update(canonical, 'utf8')
    .digest('hex');

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-bridge-timestamp': timestamp,
        'x-bridge-nonce': nonce,
        'x-bridge-signature': signature,
      },
      body: rawBody,
      signal: AbortSignal.timeout(12000),
    });
  } catch (err) {
    throw new D1BridgeError(
      `Unable to reach Cloudflare D1 bridge: ${err instanceof Error ? err.message : 'Network error'}`,
      502,
      'D1_UNREACHABLE'
    );
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    const errMsg = typeof data.error === 'string' ? data.error : `D1 worker error (${res.status})`;
    const errCode = typeof data.code === 'string' ? data.code : 'D1_REQUEST_FAILED';
    throw new D1BridgeError(errMsg, res.status >= 400 ? res.status : 502, errCode);
  }

  return data as T;
}

export async function checkD1BridgeHealth(): Promise<{
  configured: boolean;
  reachable: boolean;
  database: 'connected' | 'unconfigured' | 'unreachable' | 'error';
}> {
  const { workerUrl, configured } = getD1BridgeConfig();
  if (!configured) {
    return { configured: false, reachable: false, database: 'unconfigured' };
  }
  try {
    const res = await fetch(`${workerUrl}/health`, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) {
      return { configured: true, reachable: true, database: 'error' };
    }
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return {
      configured: true,
      reachable: true,
      database: body.ok ? 'connected' : 'error',
    };
  } catch {
    return { configured: true, reachable: false, database: 'unreachable' };
  }
}
