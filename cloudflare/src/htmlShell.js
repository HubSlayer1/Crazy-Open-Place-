import { WORKER_CSS } from './styles.js';
import { WORKER_CLIENT_SCRIPT } from './clientScript.js';
import {
  CONTACT_FACEBOOK_URL,
  EXTERNAL_PROVIDER_NOTICE,
  GUILD_GLORY_PROVIDERS,
  THANK_YOU_RETURN_NOTICE,
} from './api.js';

export const ROUTE_META = {
  '/': {
    title: 'CrazyOpenPlace — Guild Glory Shop & Live Web Diagnostics',
    description:
      'CrazyOpenPlace@domain: external Guild Glory provider shop, Free Fire UID Checker, Cloudflare public Speed Test, and Observatory Website Speed Analyzer.',
  },
  '/free-services': {
    title: 'Free Services — CrazyOpenPlace',
    description: 'Browse free online utilities and live API readiness on CrazyOpenPlace.',
  },
  '/uid-checker': {
    title: 'Free Fire UID Checker — CrazyOpenPlace',
    description: 'Check public Free Fire player stats by UID using GameSkinbo API proxy.',
  },
  '/speed-test': {
    title: 'Cloudflare Speed Test — CrazyOpenPlace',
    description: 'Measure download, upload, latency, loaded latency, and jitter via Cloudflare.',
  },
  '/website-speed': {
    title: 'Website Speed Analyzer — CrazyOpenPlace',
    description: 'Read Cloudflare Observatory historical performance reports for your Zone.',
  },
  '/guild-glory': {
    title: 'Guild Glory Shop — CrazyOpenPlace',
    description: 'Compare curated external Guild Glory provider checkout links in BDT.',
  },
  '/thank-you': {
    title: 'External Return Notice — CrazyOpenPlace',
    description: 'External Guild Glory provider notice and receipt reminder.',
  },
  '/about': {
    title: 'About — CrazyOpenPlace',
    description: 'What CrazyOpenPlace provides and third-party independence information.',
  },
  '/safety': {
    title: 'Safety & Disclaimers — CrazyOpenPlace',
    description: 'Account safety, external provider rules, and privacy notices.',
  },
  '/contact': {
    title: 'Contact — CrazyOpenPlace',
    description: 'Official Facebook contact link for CrazyOpenPlace.',
  },
  '/not-found': {
    title: '404 Not Found — CrazyOpenPlace',
    description: 'Requested route was not found on CrazyOpenPlace.',
  },
};

export const VALID_PATHS = Object.keys(ROUTE_META).filter((p) => p !== '/not-found');

function renderSidebarHtml(isDrawer) {
  const navItems = [
    { group: 'CORE', items: [
      { label: 'Home', path: '/' },
      { label: 'Free Services', path: '/free-services' },
      { label: 'Guild Glory Shop', path: '/guild-glory' },
    ]},
    { group: 'UTILITIES', items: [
      { label: 'Free Fire UID Checker', path: '/uid-checker' },
      { label: 'Cloudflare Speed Test', path: '/speed-test' },
      { label: 'Website Speed Analyzer', path: '/website-speed' },
    ]},
    { group: 'TRUST & INFO', items: [
      { label: 'About', path: '/about' },
      { label: 'Safety & Disclaimers', path: '/safety' },
      { label: 'Thank You Notice', path: '/thank-you' },
      { label: 'Contact Us', path: '/contact' },
    ]},
  ];

  const groupsHtml = navItems
    .map(
      (g) => `
      <div class="nav-group-label">${g.group}</div>
      ${g.items
        .map(
          (i) =>
            `<button type="button" class="nav-btn" data-route="${i.path}" onclick="copNavigate('${i.path}')">${i.label}</button>`
        )
        .join('')}
    `
    )
    .join('');

  return `
    <div style="height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--border-hairline);">
      <button type="button" class="brand-btn" onclick="copNavigate('/')">
        <svg width="24" height="24" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="3" y="3" width="42" height="42" rx="9" fill="#141418" stroke="#f59e0b" stroke-width="2.4"/>
          <path d="M18 15L11 24L18 33" stroke="#f4f4f5" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M30 15L37 24L30 33" stroke="#f4f4f5" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
          <circle cx="24" cy="24" r="3.6" fill="#d97706"/>
        </svg>
        <span>CrazyOpenPlace</span>
      </button>
      ${
        isDrawer
          ? '<button type="button" class="hamburger" style="display:inline-flex" onclick="closeDrawer()" aria-label="Close menu">&times;</button>'
          : ''
      }
    </div>
    <nav class="nav-scroll" aria-label="Sidebar navigation">
      ${groupsHtml}
      <div class="nav-group-label">EXTERNAL</div>
      <a class="nav-btn" href="${CONTACT_FACEBOOK_URL}" target="_blank" rel="noopener noreferrer">Facebook Page &nearr;</a>
    </nav>
    <div style="padding:12px;border-top:1px solid var(--border-hairline);">
      <button type="button" class="nav-btn" onclick="copToggleTheme()" data-theme-label>Charcoal Amber</button>
    </div>
  `;
}

export function renderAppHtml(pathname) {
  const cleaned = (pathname || '/').replace(/\/+$/, '') || '/';
  const isKnown = VALID_PATHS.includes(cleaned);
  const routeKey = isKnown ? cleaned : '/not-found';
  const meta = ROUTE_META[routeKey];

  const bootPayload = JSON.stringify({
    validPaths: VALID_PATHS,
    routeMeta: ROUTE_META,
    providers: GUILD_GLORY_PROVIDERS,
    facebookUrl: CONTACT_FACEBOOK_URL,
    externalNotice: EXTERNAL_PROVIDER_NOTICE,
    thankYouNotice: THANK_YOU_RETURN_NOTICE,
  }).replace(/</g, '\\u003c');

  const html = `<!doctype html>
<html lang="en" data-theme="charcoal-amber">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${meta.title}</title>
  <meta name="description" content="${meta.description}" />
  <meta name="theme-color" content="#0d0d10" />
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' fill='none'%3E%3Crect x='3' y='3' width='42' height='42' rx='10' fill='%23141418' stroke='%23d97706' stroke-width='2.5'/%3E%3Ccircle cx='24' cy='24' r='4' fill='%23f59e0b'/%3E%3C/svg%3E" />
  <style>${WORKER_CSS}</style>
</head>
<body>
  <div class="shell">
    <aside class="sidebar">${renderSidebarHtml(false)}</aside>
    <div id="mobile-drawer" class="drawer-backdrop" onclick="if(event.target===this)closeDrawer()">
      <aside class="drawer-panel">${renderSidebarHtml(true)}</aside>
    </div>
    <div class="main-col">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:10px;">
          <button type="button" class="hamburger" onclick="openDrawer()" aria-label="Open menu">&#9776;</button>
          <button type="button" class="brand-btn" onclick="copNavigate('/')">CrazyOpenPlace</button>
        </div>
        <nav class="top-nav" aria-label="Primary navigation">
          <button type="button" class="top-link" data-route="/" onclick="copNavigate('/')">Home</button>
          <button type="button" class="top-link" data-route="/free-services" onclick="copNavigate('/free-services')">Free Services</button>
          <button type="button" class="top-link" data-route="/uid-checker" onclick="copNavigate('/uid-checker')">UID Checker</button>
          <button type="button" class="top-link" data-route="/speed-test" onclick="copNavigate('/speed-test')">Speed Test</button>
          <button type="button" class="top-link" data-route="/website-speed" onclick="copNavigate('/website-speed')">Website Speed</button>
        </nav>
        <button type="button" class="btn-amber" onclick="copNavigate('/guild-glory')">Guild Glory Shop</button>
      </header>
      <main id="route-root" class="viewport"></main>
      <footer class="footer">
        <div class="footer-inner">
          <div><strong style="color:var(--text-primary)">CrazyOpenPlace@domain</strong> · Free Utilities &amp; External Guild Glory Directory</div>
          <div style="display:flex;flex-wrap:wrap;gap:16px;">
            <button type="button" class="top-link" onclick="copNavigate('/about')">About</button>
            <button type="button" class="top-link" onclick="copNavigate('/safety')">Safety</button>
            <button type="button" class="top-link" onclick="copNavigate('/contact')">Contact</button>
            <a href="${CONTACT_FACEBOOK_URL}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-secondary);text-decoration:none;font-weight:600;">Facebook &nearr;</a>
          </div>
        </div>
      </footer>
    </div>
  </div>
  <script>window.__COP_DATA__ = ${bootPayload};</script>
  <script type="module">${WORKER_CLIENT_SCRIPT}</script>
</body>
</html>`;

  return { html, status: isKnown ? 200 : 404 };
}
