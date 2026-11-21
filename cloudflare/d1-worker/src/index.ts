import { verifyBridgeRequest } from './auth';
import { handleDispatch } from './handlers';
import { type DispatchRequest, type Env, WorkerAppError } from './types';

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      try {
        await env.DB.prepare('SELECT 1 as ok').first();
        return json({
          ok: true,
          service: 'crazy-org-d1-bridge',
          database: 'connected',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        return json(
          {
            ok: false,
            service: 'crazy-org-d1-bridge',
            database: 'error',
            error: err instanceof Error ? err.message : 'Database check failed',
          },
          503
        );
      }
    }

    if (request.method === 'POST' && url.pathname === '/internal/v1/dispatch') {
      const rawBuffer = new Uint8Array(await request.arrayBuffer());
      const authResult = await verifyBridgeRequest(request, env, rawBuffer);
      if (!authResult.valid) {
        return json({ ok: false, error: authResult.error }, authResult.status);
      }

      let body: DispatchRequest;
      try {
        body = JSON.parse(new TextDecoder().decode(rawBuffer)) as DispatchRequest;
      } catch {
        return json({ ok: false, error: 'Malformed JSON body.' }, 400);
      }

      if (!body || typeof body.action !== 'string') {
        return json({ ok: false, error: 'Missing dispatch action.' }, 400);
      }

      try {
        const result = await handleDispatch(body.action, body.payload || {}, env);
        return json({ ok: true, ...result }, 200);
      } catch (err) {
        if (err instanceof WorkerAppError) {
          return json({ ok: false, code: err.code, error: err.message }, err.status);
        }
        const message = err instanceof Error ? err.message : 'Unexpected D1 execution error';
        const lower = message.toLowerCase();
        if (lower.includes('quota') || lower.includes('limit') || lower.includes('too many requests')) {
          return json({ ok: false, code: 'D1_QUOTA_EXCEEDED', error: message }, 429);
        }
        return json({ ok: false, code: 'D1_EXECUTION_ERROR', error: message }, 500);
      }
    }

    return json({ ok: false, error: 'Not found.' }, 404);
  },
};
