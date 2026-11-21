import type { Env } from './types';

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyBridgeRequest(
  request: Request,
  env: Env,
  rawBodyBytes: Uint8Array
): Promise<{ valid: true } | { valid: false; status: number; error: string }> {
  const secret = env.APP_BRIDGE_SECRET;
  if (!secret || secret.length < 16) {
    return { valid: false, status: 503, error: 'Bridge secret is not configured.' };
  }

  const timestampHeader = request.headers.get('x-bridge-timestamp') || '';
  const nonce = request.headers.get('x-bridge-nonce') || '';
  const signature = (request.headers.get('x-bridge-signature') || '').toLowerCase();

  if (!/^\d{10,12}$/.test(timestampHeader)) {
    return { valid: false, status: 401, error: 'Invalid or missing bridge timestamp.' };
  }
  if (!/^[a-fA-F0-9]{16,128}$/.test(nonce)) {
    return { valid: false, status: 401, error: 'Invalid or missing bridge nonce.' };
  }
  if (!/^[a-f0-9]{64}$/.test(signature)) {
    return { valid: false, status: 401, error: 'Invalid or missing bridge signature.' };
  }

  const tsSeconds = Number.parseInt(timestampHeader, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > 60) {
    return { valid: false, status: 401, error: 'Bridge request timestamp expired.' };
  }

  const url = new URL(request.url);
  const bodyHash = toHex(await crypto.subtle.digest('SHA-256', rawBodyBytes));
  const canonical = `${request.method.toUpperCase()}\n${url.pathname}\n${timestampHeader}\n${nonce}\n${bodyHash}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(canonical));
  const expectedSig = toHex(sigBuffer);

  if (!timingSafeEqualString(signature, expectedSig)) {
    return { valid: false, status: 401, error: 'Bridge signature verification failed.' };
  }

  return { valid: true };
}
