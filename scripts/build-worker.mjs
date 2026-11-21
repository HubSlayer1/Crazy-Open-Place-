import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const root = process.cwd();
const speedtestSrc = path.join(root, 'node_modules/@cloudflare/speedtest/dist/speedtest.js');
const workerOutDir = path.join(root, 'cloudflare');
const workerEntrySrc = path.join(workerOutDir, 'src/_entry.js');
const workerFinalPath = path.join(workerOutDir, 'crazyopenplace-worker.js');

const speedtestBuild = await esbuild.build({
  entryPoints: [speedtestSrc],
  bundle: false,
  minify: true,
  format: 'esm',
  write: false,
});

const minifiedSpeedtest = speedtestBuild.outputFiles[0].text;

const entrySource = `
import { handleApiRequest, buildHeaders } from './api.js';
import { renderAppHtml } from './htmlShell.js';

const SPEEDTEST_ESM_CODE = ${JSON.stringify(minifiedSpeedtest)};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: buildHeaders(request, 'text/plain') });
    }

    if (url.pathname === '/vendor/speedtest.js') {
      return new Response(SPEEDTEST_ESM_CODE, {
        status: 200,
        headers: buildHeaders(request, 'application/javascript; charset=utf-8', {
          'Cache-Control': 'public, max-age=3600',
        }),
      });
    }

    if (url.pathname === '/healthz' || url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env, url);
    }

    const { html, status } = renderAppHtml(url.pathname);
    return new Response(html, {
      status,
      headers: buildHeaders(request, 'text/html; charset=utf-8', {
        'Cache-Control': 'no-store',
      }),
    });
  },
};
`;

fs.writeFileSync(workerEntrySrc, entrySource, 'utf8');

await esbuild.build({
  entryPoints: [workerEntrySrc],
  bundle: true,
  minify: false,
  format: 'esm',
  target: 'es2022',
  outfile: workerFinalPath,
});

fs.unlinkSync(workerEntrySrc);

const sizeBytes = fs.statSync(workerFinalPath).size;
console.log(`Built ${workerFinalPath} (${sizeBytes} bytes, embedded speedtest ${minifiedSpeedtest.length} bytes)`);
