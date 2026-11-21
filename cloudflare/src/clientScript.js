export const WORKER_CLIENT_SCRIPT = `
import SpeedTest from '/vendor/speedtest.js';

const CFG = window.__COP_DATA__;
const validSet = new Set(CFG.validPaths);
let activeRunner = null;
let speedState = {
  running: false,
  finished: false,
  stage: 'Ready to measure',
  progress: 0,
  error: null,
  metrics: {
    downloadMbps: null, uploadMbps: null, unloadedLatencyMs: null, unloadedJitterMs: null,
    downLoadedLatencyMs: null, downLoadedJitterMs: null, upLoadedLatencyMs: null, upLoadedJitterMs: null,
    packetLossPercent: null, packetLossSupported: false, totalDurationMs: null,
  },
};

function esc(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getRoute(pathname) {
  const cleaned = (pathname || '/').replace(/\\/+$/, '') || '/';
  return validSet.has(cleaned) ? cleaned : '/not-found';
}

function validateAllowlist(url, expectedDomain) {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return { valid: false, reason: 'HTTPS required.' };
    const matched = CFG.providers.find((p) => p.url === url);
    if (!matched || !matched.enabled) return { valid: false, reason: 'Not in allowlist.' };
    if (u.hostname !== matched.domain || u.hostname !== expectedDomain) {
      return { valid: false, reason: 'Hostname mismatch.' };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL.' };
  }
}

function cancelSpeedTest() {
  if (activeRunner) {
    try { activeRunner.pause(); } catch {}
    activeRunner = null;
  }
  speedState.running = false;
}

window.copNavigate = function copNavigate(path) {
  const target = path === '/not-found' ? '/not-found' : getRoute(path);
  if (location.pathname !== target) history.pushState({}, '', target);
  closeDrawer();
  renderCurrentRoute();
  window.scrollTo(0, 0);
};

window.copToggleTheme = function copToggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'charcoal-amber';
  const next = cur === 'charcoal-amber' ? 'light' : 'charcoal-amber';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('cop_theme', next); } catch {}
  updateThemeLabels();
};

function updateThemeLabels() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  document.querySelectorAll('[data-theme-label]').forEach((el) => {
    el.textContent = isLight ? 'Clean Light' : 'Charcoal Amber';
  });
}

window.openDrawer = function openDrawer() {
  document.getElementById('mobile-drawer')?.classList.add('open');
};
window.closeDrawer = function closeDrawer() {
  document.getElementById('mobile-drawer')?.classList.remove('open');
};

function updateActiveNav(route) {
  document.querySelectorAll('[data-route]').forEach((el) => {
    el.classList.toggle('active', el.getAttribute('data-route') === route);
  });
  const meta = CFG.routeMeta[route] || CFG.routeMeta['/not-found'];
  document.title = meta.title;
}

function fmtMetric(val, unit) {
  return val === null || val === undefined || !Number.isFinite(val) ? '—' : val + ' ' + unit;
}

function renderSpeedView() {
  const m = speedState.metrics;
  const primary = m.downloadMbps !== null ? m.downloadMbps : (m.uploadMbps !== null ? m.uploadMbps : 0);
  const el = document.getElementById('route-root');
  if (!el) return;
  el.innerHTML = \`
    <div style="display:flex;flex-direction:column;gap:24px;">
      <div>
        <div class="eyebrow mono">Service 2 · @cloudflare/speedtest</div>
        <h1>Cloudflare Public Speed Test</h1>
        <p class="muted">Real browser connection measurements against Cloudflare edge endpoints. Zero API token needed; no values are simulated.</p>
      </div>
      <div class="card">
        <p class="small-muted" style="font-size:13px;">Tests your visitor connection to Cloudflare. For hosted page history reports, open the separate <strong style="color:var(--text-primary)">Website Speed Analyzer</strong>.</p>
      </div>
      \${speedState.error ? \`<div class="err-box"><strong>Speed Test Error:</strong> \${esc(speedState.error)}</div>\` : ''}
      <div class="card" style="display:flex;flex-direction:column;align-items:center;gap:18px;text-align:center;">
        <div class="mono" style="font-size:44px;font-weight:700;color:var(--text-primary);">\${primary.toFixed(2)} <span style="font-size:16px;color:var(--accent-secondary);">Mbps</span></div>
        <div class="small-muted mono">Unloaded Latency: \${fmtMetric(m.unloadedLatencyMs, 'ms')}</div>
        <div class="progress-track"><div class="progress-fill" style="width:\${speedState.progress}%"></div></div>
        <div class="small-muted mono">\${esc(speedState.stage)} · \${speedState.progress}%</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">
          \${!speedState.running
            ? \`<button id="speed-start-btn" type="button" class="btn-amber">\${speedState.finished ? 'Retest Connection' : 'Start Speed Test'}</button>\`
            : \`<button id="speed-cancel-btn" type="button" class="btn-secondary" style="border-color:rgba(239,68,68,0.5);color:#fca5a5;">Cancel Test</button>\`}
        </div>
      </div>
      <div class="metrics-grid">
        <div class="card"><div class="small-muted">DOWNLOAD</div><div class="mono" style="font-size:18px;font-weight:700;margin-top:4px;">\${fmtMetric(m.downloadMbps, 'Mbps')}</div></div>
        <div class="card"><div class="small-muted">UPLOAD</div><div class="mono" style="font-size:18px;font-weight:700;margin-top:4px;">\${fmtMetric(m.uploadMbps, 'Mbps')}</div></div>
        <div class="card"><div class="small-muted">UNLOADED LATENCY</div><div class="mono" style="font-size:18px;font-weight:700;margin-top:4px;">\${fmtMetric(m.unloadedLatencyMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">UNLOADED JITTER</div><div class="mono" style="font-size:18px;font-weight:700;margin-top:4px;">\${fmtMetric(m.unloadedJitterMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">DURATION</div><div class="mono" style="font-size:18px;font-weight:700;margin-top:4px;">\${m.totalDurationMs !== null ? (m.totalDurationMs / 1000).toFixed(1) + ' s' : '—'}</div></div>
        <div class="card"><div class="small-muted">DL LATENCY</div><div class="mono" style="font-size:16px;font-weight:700;margin-top:4px;">\${fmtMetric(m.downLoadedLatencyMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">DL JITTER</div><div class="mono" style="font-size:16px;font-weight:700;margin-top:4px;">\${fmtMetric(m.downLoadedJitterMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">UL LATENCY</div><div class="mono" style="font-size:16px;font-weight:700;margin-top:4px;">\${fmtMetric(m.upLoadedLatencyMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">UL JITTER</div><div class="mono" style="font-size:16px;font-weight:700;margin-top:4px;">\${fmtMetric(m.upLoadedJitterMs, 'ms')}</div></div>
        <div class="card"><div class="small-muted">PACKET LOSS</div><div class="mono" style="font-size:14px;font-weight:700;margin-top:4px;">\${m.packetLossSupported && m.packetLossPercent !== null ? m.packetLossPercent + '%' : (speedState.finished ? 'N/A (No TURN)' : '—')}</div></div>
      </div>
    </div>\`;
  document.getElementById('speed-start-btn')?.addEventListener('click', startCloudflareSpeedTest);
  document.getElementById('speed-cancel-btn')?.addEventListener('click', () => {
    cancelSpeedTest();
    speedState.stage = 'Cancelled by user';
    renderSpeedView();
  });
}

function extractSpeedMetrics(results) {
  const s = results.getSummary();
  const toMbps = (v) => typeof v === 'number' && Number.isFinite(v) ? Number((v / 1e6).toFixed(2)) : null;
  const toMs = (v) => typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(1)) : null;
  const hasPL = typeof s.packetLoss === 'number' && Number.isFinite(s.packetLoss);
  return {
    downloadMbps: toMbps(s.download), uploadMbps: toMbps(s.upload),
    unloadedLatencyMs: toMs(s.latency), unloadedJitterMs: toMs(s.jitter),
    downLoadedLatencyMs: toMs(s.downLoadedLatency), downLoadedJitterMs: toMs(s.downLoadedJitter),
    upLoadedLatencyMs: toMs(s.upLoadedLatency), upLoadedJitterMs: toMs(s.upLoadedJitter),
    packetLossPercent: hasPL ? Number((s.packetLoss * 100).toFixed(2)) : null,
    packetLossSupported: hasPL, totalDurationMs: toMs(s.totalDurationMs),
  };
}

function startCloudflareSpeedTest() {
  cancelSpeedTest();
  if (navigator.onLine === false) {
    speedState.error = 'Your device appears offline. Reconnect to run a real speed test.';
    renderSpeedView();
    return;
  }
  speedState = {
    running: true, finished: false, stage: 'Connecting to Cloudflare Edge...', progress: 4, error: null,
    metrics: { downloadMbps: null, uploadMbps: null, unloadedLatencyMs: null, unloadedJitterMs: null, downLoadedLatencyMs: null, downLoadedJitterMs: null, upLoadedLatencyMs: null, upLoadedJitterMs: null, packetLossPercent: null, packetLossSupported: false, totalDurationMs: null },
  };
  renderSpeedView();
  const engine = new SpeedTest({ autoStart: false, measureDownloadLoadedLatency: true, measureUploadLoadedLatency: true, logAimApiUrl: null });
  let phase = 0;
  engine.onRunningChange = (r) => { speedState.running = r; if (getRoute(location.pathname) === '/speed-test') renderSpeedView(); };
  engine.onPhaseChange = ({ measurement }) => {
    phase += 1;
    speedState.progress = Math.min(95, Math.max(5, Math.round((phase / 14) * 92)));
    speedState.stage = measurement.type === 'latency' ? 'Measuring Latency & Jitter' : measurement.type === 'download' ? 'Measuring Download Throughput' : measurement.type === 'upload' ? 'Measuring Upload Throughput' : 'Running Phase';
    if (getRoute(location.pathname) === '/speed-test') renderSpeedView();
  };
  engine.onResultsChange = () => { speedState.metrics = extractSpeedMetrics(engine.results); if (getRoute(location.pathname) === '/speed-test') renderSpeedView(); };
  engine.onError = (msg) => { speedState.error = msg || 'Cloudflare speed test failed.'; speedState.running = false; if (getRoute(location.pathname) === '/speed-test') renderSpeedView(); };
  engine.onFinish = (res) => { speedState.metrics = extractSpeedMetrics(res); speedState.running = false; speedState.finished = true; speedState.progress = 100; speedState.stage = 'Complete'; if (getRoute(location.pathname) === '/speed-test') renderSpeedView(); };
  activeRunner = engine;
  engine.play();
}

function renderCurrentRoute() {
  const route = getRoute(location.pathname);
  if (route !== '/speed-test') cancelSpeedTest();
  updateActiveNav(route);
  const el = document.getElementById('route-root');
  if (!el) return;

  if (route === '/') {
    el.innerHTML = \`
      <div style="display:flex;flex-direction:column;gap:28px;">
        <section class="card">
          <div class="eyebrow mono">CrazyOpenPlace@domain · Open Utility Hub</div>
          <h1>Guild Glory Shop &amp; Live Web Diagnostics. No Login Required.</h1>
          <p class="muted" style="max-width:660px;margin-bottom:18px;">Browse external Guild Glory provider links, run a real Cloudflare browser speed test, check Free Fire UID profiles via GameSkinbo, or view Cloudflare Observatory site speed reports.</p>
          <div style="display:flex;flex-wrap:wrap;gap:12px;">
            <button type="button" class="btn-amber" onclick="copNavigate('/guild-glory')">Open Guild Glory Shop &rarr;</button>
            <button type="button" class="btn-secondary" onclick="copNavigate('/free-services')">View Free Services</button>
          </div>
        </section>
        <section class="grid-2">
          <div class="card accent-border"><h2>Guild Glory Shop</h2><p class="muted" style="margin-bottom:14px;">External BDT provider links. Checkout and delivery happen directly on the provider website.</p><button type="button" class="btn-amber" onclick="copNavigate('/guild-glory')">Browse Providers</button></div>
          <div class="card"><h2>Free Fire UID Checker</h2><p class="muted" style="margin-bottom:14px;">Public GameSkinbo player profile lookup using numeric UID only. Never share passwords.</p><button type="button" class="btn-secondary" onclick="copNavigate('/uid-checker')">Open UID Checker</button></div>
          <div class="card"><h2>Cloudflare Speed Test</h2><p class="muted" style="margin-bottom:14px;">Real browser download, upload, latency, and jitter against Cloudflare endpoints.</p><button type="button" class="btn-secondary" onclick="copNavigate('/speed-test')">Run Speed Test</button></div>
          <div class="card"><h2>Website Speed Analyzer</h2><p class="muted" style="margin-bottom:14px;">Read historical Cloudflare Observatory desktop &amp; mobile page speed tests.</p><button type="button" class="btn-secondary" onclick="copNavigate('/website-speed')">Open Analyzer</button></div>
        </section>
      </div>\`;
    return;
  }

  if (route === '/free-services') {
    el.innerHTML = \`<div style="display:flex;flex-direction:column;gap:20px;"><div><div class="eyebrow mono">Free Utilities Directory</div><h1>Free Services on CrazyOpenPlace</h1><p class="muted">Zero signup required. Live server configuration status loads below.</p></div><div id="cfg-status-box" class="card">Loading configuration status...</div></div>\`;
    fetch('/api/config-status').then((r) => r.json()).then((s) => {
      const box = document.getElementById('cfg-status-box');
      if (!box) return;
      box.innerHTML = \`
        <div class="grid-2">
          <div class="card"><h2>Cloudflare Speed Test</h2><p class="badge-ok">Ready (No Secret Required)</p><p class="muted" style="margin:8px 0 14px;">Browser measurements via @cloudflare/speedtest.</p><button type="button" class="btn-amber" onclick="copNavigate('/speed-test')">Open Speed Test</button></div>
          <div class="card"><h2>Free Fire UID Checker</h2><p class="\${s.gameskinboConfigured ? 'badge-ok' : 'badge-warn'}">\${s.gameskinboConfigured ? 'GAMESKINBO_API_KEY Configured' : 'GAMESKINBO_API_KEY Not Configured'}</p><p class="muted" style="margin:8px 0 14px;">Rate limit: \${s.rateLimits?.uidPerMinute || 5} req/min.</p><button type="button" class="btn-secondary" onclick="copNavigate('/uid-checker')">Open UID Checker</button></div>
          <div class="card"><h2>Website Speed Analyzer</h2><p class="\${s.observatoryConfigured ? 'badge-ok' : 'badge-warn'}">\${s.observatoryConfigured ? 'Observatory Configured' : 'Observatory Secrets Not Configured'}</p><p class="muted" style="margin:8px 0 14px;">Rate limit: \${s.rateLimits?.observatoryPerMinute || 10} req/min.</p><button type="button" class="btn-secondary" onclick="copNavigate('/website-speed')">Open Analyzer</button></div>
          <div class="card"><h2>Guild Glory Shop</h2><p class="badge-ok">5 Allowlisted Provider Links</p><p class="muted" style="margin:8px 0 14px;">Direct external product links in BDT.</p><button type="button" class="btn-secondary" onclick="copNavigate('/guild-glory')">Open Guild Glory</button></div>
        </div>\`;
    }).catch(() => {
      const box = document.getElementById('cfg-status-box');
      if (box) box.innerHTML = '<div class="err-box">Could not fetch /api/config-status.</div>';
    });
    return;
  }

  if (route === '/uid-checker') {
    el.innerHTML = \`
      <div style="display:flex;flex-direction:column;gap:20px;">
        <div><div class="eyebrow mono">Service 1 · GameSkinbo Proxy</div><h1>Free Fire UID Checker</h1><p class="muted">Live lookup via server-side GameSkinbo proxy. Not endorsed by Garena.</p></div>
        <div class="card accent-border"><p class="muted"><strong style="color:var(--text-primary)">Privacy Warning:</strong> Enter numeric UID only (5–20 digits). Never enter password, OTP, or login credentials.</p></div>
        <form id="uid-form" class="card" style="display:flex;flex-direction:column;gap:14px;">
          <div class="grid-2">
            <div><label class="small-muted mono" for="uid-in">FREE FIRE UID</label><input id="uid-in" class="field mono" inputmode="numeric" maxlength="20" placeholder="e.g. 1234567890" required /></div>
            <div><label class="small-muted mono" for="reg-in">REGION</label><select id="reg-in" class="field"><option value="AUTO">AUTO</option><option value="BD">BD</option><option value="IND">IND</option><option value="BR">BR</option><option value="US">US</option><option value="SAC">SAC</option><option value="NA">NA</option><option value="TH">TH</option><option value="ID">ID</option><option value="SG">SG</option><option value="PK">PK</option></select></div>
          </div>
          <div><button id="uid-btn" type="submit" class="btn-amber">Check UID</button></div>
        </form>
        <div id="uid-out"></div>
      </div>\`;
    document.getElementById('uid-form')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const uid = (document.getElementById('uid-in')?.value || '').replace(/\\D+/g, '');
      const reg = document.getElementById('reg-in')?.value || 'AUTO';
      const out = document.getElementById('uid-out');
      const btn = document.getElementById('uid-btn');
      if (!/^\\d{5,20}$/.test(uid)) { if (out) out.innerHTML = '<div class="err-box">UID must be 5 to 20 digits.</div>'; return; }
      if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }
      try {
        const res = await fetch('/api/uid-check?' + new URLSearchParams({ uid, region: reg }));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (out) out.innerHTML = \`<div class="err-box"><strong>\${data.configured === false ? 'API Key Not Configured' : 'Lookup Error'}:</strong> \${esc(data.error || ('HTTP ' + res.status))}</div>\`;
          return;
        }
        const p = data.profile;
        const val = (x) => (x === null || x === undefined || x === '' ? 'Not available' : esc(x));
        if (out) {
          out.innerHTML = \`
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div class="card accent-border" style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;">
              <div>
                <div class="eyebrow mono">\${val(p.providerLabel)} · Not Garena Official</div>
                <h2 style="margin-top:4px;">\${val(p.accountInfo.nickname)}</h2>
                <div class="small-muted mono">UID: \${val(p.uid)} · Fetched: \${val(p.fetchedAt)}</div>
              </div>
              <button id="copy-uid-btn" type="button" class="btn-secondary">Copy UID</button>
            </div>
            <div class="grid-2">
              <div class="card"><h2>Account Info</h2><div class="small-muted">Level: \${val(p.accountInfo.level)} · Region: \${val(p.accountInfo.region)} · Likes: \${val(p.accountInfo.likes)} · EXP: \${val(p.accountInfo.exp)}<br/>Season: \${val(p.accountInfo.seasonId)} · BR: \${val(p.accountInfo.brRank)} (\${val(p.accountInfo.brRankPoints)}) · CS: \${val(p.accountInfo.csRank)} (\${val(p.accountInfo.csRankPoints)})<br/>Created: \${val(p.accountInfo.createdAt)} · Last Login: \${val(p.accountInfo.lastLoginAt)}</div></div>
              <div class="card"><h2>Profile, Social &amp; Credit</h2><div class="small-muted">Avatar: \${val(p.profileDetails.avatarId)} · Banner: \${val(p.profileDetails.bannerId)} · Badge: \${val(p.profileDetails.badgeId)} · Prime: \${val(p.profileDetails.primeLevel)}<br/>Language: \${val(p.socialProfile.language)} · Credit Score: \${val(p.creditScoreDetails.creditScore)} (\${val(p.creditScoreDetails.summaryStatus)})<br/>Signature: \${val(p.socialProfile.signature)}</div></div>
              <div class="card" style="grid-column:1/-1;"><h2>Guild Info</h2><div class="small-muted">\${p.guildInfo ? 'Name: ' + val(p.guildInfo.name) + ' · ID: ' + val(p.guildInfo.id) + ' · Level: ' + val(p.guildInfo.level) + ' · Members: ' + val(p.guildInfo.members) + '/' + val(p.guildInfo.capacity) + ' · Leader: ' + val(p.guildInfo.leaderName) : 'Not available'}</div></div>
            </div>
          </div>\`;
          document.getElementById('copy-uid-btn')?.addEventListener('click', () => {
            navigator.clipboard?.writeText(String(p.uid || '')).then(() => {
              const b = document.getElementById('copy-uid-btn');
              if (b) b.textContent = 'Copied!';
            }).catch(() => {});
          });
        }
      } catch {
        if (out) out.innerHTML = '<div class="err-box">Network error contacting /api/uid-check.</div>';
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Check UID'; }
      }
    });
    return;
  }

  if (route === '/speed-test') {
    renderSpeedView();
    return;
  }

  if (route === '/website-speed') {
    el.innerHTML = \`
      <div style="display:flex;flex-direction:column;gap:20px;">
        <div><div class="eyebrow mono">Service 3 · Cloudflare Observatory API</div><h1>Website Speed Analyzer</h1><p class="muted">Reads historical Cloudflare Observatory desktop &amp; mobile speed scores for your configured Zone (SSRF protected).</p></div>
        <form id="obs-form" class="card" style="display:flex;flex-direction:column;gap:14px;">
          <div><label class="small-muted mono" for="obs-url">PAGE URL (MUST MATCH CONFIGURED ZONE)</label><input id="obs-url" type="url" class="field mono" placeholder="https://example.com/" required /></div>
          <div><button id="obs-btn" type="submit" class="btn-amber">Fetch Test History</button></div>
        </form>
        <div id="obs-out"></div>
      </div>\`;
    document.getElementById('obs-form')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const target = document.getElementById('obs-url')?.value?.trim() || '';
      const out = document.getElementById('obs-out');
      const btn = document.getElementById('obs-btn');
      if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }
      try {
        const res = await fetch('/api/website-speed/tests?' + new URLSearchParams({ url: target }));
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (out) out.innerHTML = \`<div class="err-box"><strong>\${data.configured === false ? 'Observatory Not Configured' : 'Observatory Error'}:</strong> \${esc(data.error || ('HTTP ' + res.status))}</div>\`;
          return;
        }
        const tests = Array.isArray(data.tests) ? data.tests : [];
        if (tests.length === 0) {
          if (out) out.innerHTML = \`<div class="card muted">\${esc(data.message || 'No Observatory tests found for this URL.')}</div>\`;
          return;
        }
        const fmtScore = (s) => (typeof s === 'number' && Number.isFinite(s) ? (Number.isInteger(s) ? s : Number(s.toFixed(2))) : 'N/A');
        if (out) out.innerHTML = tests.map((t) => \`<div class="card" style="margin-bottom:12px;"><div class="small-muted mono">\${esc(t.createdAt)} · \${esc(t.region)} · \${esc(t.scheduleFrequency)}</div><div style="font-weight:600;word-break:break-all;margin:4px 0;">\${esc(t.url)}</div><div class="mono">Desktop: \${fmtScore(t.desktopPerformanceScore)} · Mobile: \${fmtScore(t.mobilePerformanceScore)}</div></div>\`).join('');
      } catch {
        if (out) out.innerHTML = '<div class="err-box">Network error contacting /api/website-speed/tests.</div>';
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Fetch Test History'; }
      }
    });
    return;
  }

  if (route === '/guild-glory') {
    const cards = CFG.providers.map((p) => {
      const check = validateAllowlist(p.url, p.domain);
      const destLabel = p.destinationType === 'service_website' ? 'External Site' : 'Product Link';
      return \`<div class="card" style="display:flex;flex-direction:column;justify-content:space-between;gap:14px;">
        <div>
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><h2>\${esc(p.name)}</h2><span class="eyebrow mono">\${destLabel} · \${esc(p.currency)}</span></div>
          <div class="subcard mono" style="font-size:12px;word-break:break-all;margin:8px 0;">\${esc(p.url)}</div>
          <p class="muted" style="font-size:13px;margin-bottom:6px;"><strong style="color:var(--text-primary)">Packages:</strong> \${esc(p.packagesSummary)}</p>
          <p class="muted" style="font-size:13px;margin-bottom:6px;"><strong style="color:var(--text-primary)">Payment Methods:</strong> \${esc(p.paymentMethodsLabel)}</p>
          <p class="small-muted">\${esc(p.checkoutNote)} (Checked: \${esc(p.lastCheckedDate)})</p>
        </div>
        \${check.valid ? \`<a class="btn-amber" href="\${esc(p.url)}" target="_blank" rel="noopener noreferrer">\${esc(p.ctaLabel)} &nearr;</a>\` : \`<div class="err-box">Link disabled: \${esc(check.reason)}</div>\`}
      </div>\`;
    }).join('');
    el.innerHTML = \`
      <div style="display:flex;flex-direction:column;gap:20px;">
        <div><div class="eyebrow mono">Service 4 · External Provider Directory (BDT)</div><h1>Guild Glory Shop</h1><p class="muted">External Guild Glory links only. CrazyOpenPlace does not collect payments or track orders.</p></div>
        <div class="card accent-border"><p>\${esc(CFG.externalNotice)}</p><p class="small-muted" style="margin-top:8px;">When done, visit <button type="button" style="background:none;border:none;color:var(--accent-secondary);text-decoration:underline;cursor:pointer;padding:0;" onclick="copNavigate('/thank-you')">External Return Notice</button>.</p></div>
        <div class="grid-2">\${cards}</div>
      </div>\`;
    return;
  }

  if (route === '/thank-you') {
    el.innerHTML = \`<div class="card accent-border" style="max-width:680px;display:flex;flex-direction:column;gap:16px;"><div class="eyebrow mono">External Provider Return Notice</div><h1>Thank You for Visiting CrazyOpenPlace</h1><p>\${esc(CFG.thankYouNotice)}</p><div style="display:flex;flex-wrap:wrap;gap:12px;"><button type="button" class="btn-amber" onclick="copNavigate('/guild-glory')">Back to Guild Glory Shop</button><button type="button" class="btn-secondary" onclick="copNavigate('/')">Return Home</button></div></div>\`;
    return;
  }

  if (route === '/about') {
    el.innerHTML = \`<div class="card" style="max-width:740px;display:flex;flex-direction:column;gap:14px;"><div class="eyebrow mono">About CrazyOpenPlace@domain</div><h1>What CrazyOpenPlace Provides</h1><p class="muted">CrazyOpenPlace brings together a Free Fire UID Checker (via GameSkinbo), Cloudflare Public Speed Test, Cloudflare Observatory Website Speed Analyzer, and curated external Guild Glory shop links — without requiring user login.</p><p class="small-muted">CrazyOpenPlace is independent and not endorsed by Garena, GameSkinbo, FFGlory, or KakuTopup.</p></div>\`;
    return;
  }

  if (route === '/safety') {
    el.innerHTML = \`<div class="card accent-border" style="max-width:740px;display:flex;flex-direction:column;gap:12px;"><div class="eyebrow mono">Safety &amp; Disclaimers</div><h1>Safety Rules &amp; Privacy Notice</h1><p class="muted">• Never enter Free Fire passwords, OTPs, or logins. UID Checker uses UID only and has no official Garena endorsement.</p><p class="muted">• All API secrets stay strictly server-side in Cloudflare Worker secrets.</p><p class="muted">• Guild Glory payments happen directly on external provider sites; always verify URL, price, fees, and save your receipt.</p><p class="muted">• Returning to CrazyOpenPlace never confirms payment or fulfilment.</p></div>\`;
    return;
  }

  if (route === '/contact') {
    el.innerHTML = \`<div class="card accent-border" style="max-width:640px;display:flex;flex-direction:column;gap:16px;"><div class="eyebrow mono">Contact CrazyOpenPlace</div><h1>Direct Contact</h1><p class="muted">Message CrazyOpenPlace directly on our official Facebook page:</p><div class="subcard mono" style="font-size:13px;word-break:break-all;">\${esc(CFG.facebookUrl)}</div><div style="display:flex;flex-wrap:wrap;gap:12px;"><a class="btn-amber" href="\${esc(CFG.facebookUrl)}" target="_blank" rel="noopener noreferrer">Open Facebook Contact &nearr;</a><button id="copy-fb-btn" type="button" class="btn-secondary">Copy Link</button></div></div>\`;
    document.getElementById('copy-fb-btn')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(CFG.facebookUrl).then(() => {
        const b = document.getElementById('copy-fb-btn');
        if (b) b.textContent = 'Copied!';
      }).catch(() => {});
    });
    return;
  }

  el.innerHTML = \`<div class="card" style="max-width:560px;text-align:center;margin:20px auto;display:flex;flex-direction:column;gap:14px;align-items:center;"><div class="eyebrow mono">404 · Not Found</div><h1>Route Does Not Exist</h1><p class="muted">Check the address or return home.</p><button type="button" class="btn-amber" onclick="copNavigate('/')">Go Home</button></div>\`;
}

window.addEventListener('popstate', renderCurrentRoute);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
try {
  const saved = localStorage.getItem('cop_theme');
  if (saved === 'light' || saved === 'charcoal-amber') document.documentElement.setAttribute('data-theme', saved);
} catch {}
updateThemeLabels();
renderCurrentRoute();
`;
