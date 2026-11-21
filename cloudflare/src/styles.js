export const WORKER_CSS = `
:root, [data-theme="charcoal-amber"] {
  color-scheme: dark;
  --bg-canvas: #0d0d10;
  --bg-surface: #141418;
  --bg-elevated: #1c1c22;
  --bg-input: #101014;
  --bg-hover: #23232b;
  --text-primary: #f4f4f5;
  --text-secondary: #b4b4be;
  --text-muted: #787885;
  --border-hairline: rgba(255, 255, 255, 0.1);
  --border-strong: rgba(245, 158, 11, 0.36);
  --accent-primary: #d97706;
  --accent-hover: #b45309;
  --accent-ink: #0b0b0d;
  --accent-secondary: #f59e0b;
  --ok: #22c55e;
  --warn: #f59e0b;
  --err: #ef4444;
}
[data-theme="light"] {
  color-scheme: light;
  --bg-canvas: #f5f5f4;
  --bg-surface: #ffffff;
  --bg-elevated: #ecebe8;
  --bg-input: #ffffff;
  --bg-hover: #e7e5e4;
  --text-primary: #18181b;
  --text-secondary: #3f3f46;
  --text-muted: #71717a;
  --border-hairline: rgba(24, 24, 27, 0.12);
  --border-strong: rgba(180, 83, 9, 0.34);
  --accent-primary: #b45309;
  --accent-hover: #92400e;
  --accent-ink: #ffffff;
  --accent-secondary: #b45309;
  --ok: #16a34a;
  --warn: #d97706;
  --err: #dc2626;
}
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-variant-numeric: tabular-nums; }
.shell {
  min-height: 100dvh;
  display: flex;
  background-image:
    radial-gradient(circle at 18% 12%, rgba(217, 119, 6, 0.06), transparent 42%),
    linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: auto, 44px 44px, 44px 44px;
}
.sidebar {
  display: none;
  flex-direction: column;
  width: 264px;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  height: 100dvh;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-hairline);
}
.sidebar.collapsed { width: 68px; }
@media (min-width: 1024px) { .sidebar { display: flex; } }
.drawer-backdrop {
  position: fixed; inset: 0; z-index: 50; display: none;
  background: rgba(0,0,0,0.75);
}
.drawer-backdrop.open { display: flex; }
.drawer-panel {
  width: 280px; max-width: 85vw; height: 100%;
  background: var(--bg-surface);
  border-right: 1px solid var(--border-strong);
  display: flex; flex-direction: column;
}
.main-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar {
  position: sticky; top: 0; z-index: 30;
  height: 64px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-hairline);
  padding: 0 16px;
  display: flex; align-items: center; justify-content: space-between; gap: 24px;
}
@media (min-width: 768px) { .topbar { padding: 0 28px; } }
.top-nav { display: none; align-items: center; gap: 20px; font-size: 14px; }
@media (min-width: 768px) { .top-nav { display: flex; } }
.top-link {
  background: none; border: none; border-bottom: 2px solid transparent;
  color: var(--text-secondary); cursor: pointer; font-size: 14px;
  padding: 6px 0; white-space: nowrap;
}
.top-link:hover, .top-link.active { color: var(--text-primary); }
.top-link.active { border-bottom-color: var(--accent-secondary); font-weight: 600; }
.hamburger {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 44px; min-height: 44px; background: none; border: none;
  color: var(--text-primary); cursor: pointer; font-size: 20px; border-radius: 8px;
}
@media (min-width: 1024px) { .hamburger { display: none; } }
.brand-btn {
  display: inline-flex; align-items: center; gap: 10px; background: none;
  border: none; color: var(--text-primary); cursor: pointer; padding: 4px;
  font-weight: 700; font-size: 15px; white-space: nowrap;
}
.btn-amber {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--accent-primary); color: var(--accent-ink);
  border: none; border-radius: 8px; padding: 10px 16px; min-height: 44px;
  font-size: 14px; font-weight: 600; cursor: pointer; text-decoration: none;
}
.btn-amber:hover:not(:disabled) { background: var(--accent-hover); }
.btn-amber:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--bg-elevated); color: var(--text-primary);
  border: 1px solid var(--border-hairline); border-radius: 8px;
  padding: 10px 16px; min-height: 44px; font-size: 14px; font-weight: 500;
  cursor: pointer; text-decoration: none;
}
.btn-secondary:hover { border-color: var(--border-strong); }
.viewport {
  flex: 1; width: 100%; max-width: 1120px; margin: 0 auto;
  padding: 28px 16px 48px;
}
@media (min-width: 768px) { .viewport { padding: 36px 28px 56px; } }
.card {
  background: var(--bg-surface);
  border: 1px solid var(--border-hairline);
  border-radius: 12px;
  padding: 22px;
}
.card.accent-border { border-color: var(--border-strong); }
.subcard {
  background: var(--bg-elevated);
  border: 1px solid var(--border-hairline);
  border-radius: 8px;
  padding: 14px;
}
.grid-2 { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 768px) { .grid-2 { grid-template-columns: repeat(2, 1fr); } }
.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 768px) { .metrics-grid { grid-template-columns: repeat(5, 1fr); } }
.nav-scroll { flex: 1; overflow-y: auto; padding: 14px 10px; }
.nav-group-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
  color: var(--text-muted); padding: 0 10px 6px; margin-top: 12px;
}
.nav-btn {
  width: 100%; display: flex; align-items: center; gap: 10px;
  min-height: 44px; padding: 8px 12px; border-radius: 8px;
  background: transparent; border: 1px solid transparent;
  color: var(--text-secondary); font-size: 14px; text-align: left;
  cursor: pointer; text-decoration: none;
}
.nav-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
.nav-btn.active {
  background: var(--bg-elevated); color: var(--text-primary);
  border-color: var(--border-strong); font-weight: 600;
}
.field {
  width: 100%; min-height: 44px; padding: 10px 14px;
  background: var(--bg-input); color: var(--text-primary);
  border: 1px solid var(--border-hairline); border-radius: 8px;
  font-size: 14px;
}
.field:focus { outline: none; border-color: var(--accent-secondary); }
.footer {
  background: var(--bg-surface);
  border-top: 1px solid var(--border-hairline);
  padding: 24px 16px;
}
.footer-inner {
  max-width: 1120px; margin: 0 auto;
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
  gap: 16px; font-size: 12px; color: var(--text-muted);
}
.progress-track { width: 100%; max-width: 440px; height: 8px; border-radius: 999px; background: var(--bg-elevated); overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent-primary); transition: width 180ms ease; }
.err-box { background: var(--bg-surface); border: 1px solid rgba(239,68,68,0.45); border-radius: 12px; padding: 18px; color: #fca5a5; }
.eyebrow { font-size: 12px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-secondary); }
h1 { font-size: clamp(24px, 4vw, 38px); line-height: 1.15; margin: 8px 0 10px; }
h2 { font-size: 18px; margin: 0 0 10px; }
p { margin: 0; }
.muted { color: var(--text-secondary); }
.small-muted { color: var(--text-muted); font-size: 12px; }
.badge-ok { color: var(--ok); font-size: 12px; font-weight: 600; }
.badge-warn { color: var(--warn); font-size: 12px; font-weight: 600; }
`;
