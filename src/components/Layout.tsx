import React, { useEffect } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Gauge,
  Globe,
  Home,
  Info,
  Layers,
  Mail,
  Menu,
  Moon,
  Search,
  ShieldAlert,
  ShoppingBag,
  Sun,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CONTACT_FACEBOOK_URL } from '../config/providers';
import type { RoutePath } from '../types';
import { BrandLogo, FacebookIcon } from './BrandMark';

interface NavItem {
  label: string;
  path?: RoutePath;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const SIDEBAR_GROUPS: NavGroup[] = [
  {
    title: 'CORE',
    items: [
      { label: 'Home', path: '/', icon: Home },
      { label: 'Free Services', path: '/free-services', icon: Layers },
      { label: 'Guild Glory Shop', path: '/guild-glory', icon: ShoppingBag },
    ],
  },
  {
    title: 'UTILITIES',
    items: [
      { label: 'Free Fire UID Checker', path: '/uid-checker', icon: Search },
      { label: 'Cloudflare Speed Test', path: '/speed-test', icon: Gauge },
      { label: 'Website Speed Analyzer', path: '/website-speed', icon: Globe },
    ],
  },
  {
    title: 'TRUST & INFO',
    items: [
      { label: 'About', path: '/about', icon: Info },
      { label: 'Safety & Disclaimers', path: '/safety', icon: ShieldAlert },
      { label: 'Thank You Notice', path: '/thank-you', icon: Activity },
    ],
  },
  {
    title: 'CONTACT',
    items: [
      { label: 'Contact Us', path: '/contact', icon: Mail },
      { label: 'Facebook Page', href: CONTACT_FACEBOOK_URL, icon: FacebookIcon },
    ],
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const {
    currentPath,
    navigate,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    theme,
    toggleTheme,
    toast,
  } = useApp();

  const isLightTheme = theme === 'light';

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen, setMobileMenuOpen]);

  const renderNavContent = (collapsed: boolean, isMobile = false) => (
    <div className="flex flex-col h-full">
      <div
        className={`flex items-center ${
          collapsed && !isMobile ? 'justify-center px-2' : 'justify-between px-4'
        } h-16 border-b border-[var(--border-hairline)] shrink-0`}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 text-[var(--text-primary)] hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-secondary)] rounded-md px-1 py-1 min-h-[44px]"
          aria-label="CrazyOpenPlace Home"
        >
          <BrandLogo className="w-6 h-6 shrink-0" />
          {(!collapsed || isMobile) && (
            <div className="flex flex-col text-left leading-tight">
              <span className="font-display text-sm font-semibold tracking-[0.04em] whitespace-nowrap">
                CrazyOpenPlace
              </span>
              <span className="font-mono-tabular text-[10px] text-[var(--text-muted)]">
                CrazyOpenPlace@domain
              </span>
            </div>
          )}
        </button>

        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          !collapsed && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(true)}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )
        )}
      </div>

      {collapsed && !isMobile && (
        <div className="flex justify-center py-2.5 border-b border-[var(--border-hairline)]">
          <button
            type="button"
            onClick={() => setSidebarCollapsed(false)}
            className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <nav
        aria-label="Primary sidebar navigation"
        className="flex-1 overflow-y-auto px-2.5 py-4 space-y-5"
      >
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.title}>
            {(!collapsed || isMobile) && (
              <div className="px-2.5 mb-1.5 text-[11px] font-semibold tracking-[0.12em] text-[var(--text-muted)] select-none">
                {group.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.path ? currentPath === item.path : false;

                if (item.href) {
                  return (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={collapsed && !isMobile ? item.label : undefined}
                        className={`group flex items-center ${
                          collapsed && !isMobile ? 'justify-center px-2' : 'justify-between px-2.5'
                        } py-2.5 min-h-[44px] rounded-md text-sm transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]`}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent-secondary)]" />
                          {(!collapsed || isMobile) && (
                            <span className="truncate whitespace-nowrap">{item.label}</span>
                          )}
                        </span>
                        {(!collapsed || isMobile) && (
                          <ExternalLink className="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" />
                        )}
                      </a>
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => item.path && navigate(item.path)}
                      title={collapsed && !isMobile ? item.label : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center ${
                        collapsed && !isMobile ? 'justify-center px-2' : 'gap-3 px-2.5'
                      } py-2.5 min-h-[44px] rounded-md text-sm transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-secondary)] ${
                        isActive
                          ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-medium border border-[var(--border-strong)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[var(--accent-secondary)]' : 'text-[var(--text-muted)]'
                        }`}
                      />
                      {(!collapsed || isMobile) && (
                        <span className="truncate whitespace-nowrap">{item.label}</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--border-hairline)]">
        <button
          type="button"
          onClick={toggleTheme}
          className={`w-full flex items-center ${
            !collapsed || isMobile ? 'justify-start gap-2.5 px-3' : 'justify-center p-2'
          } min-h-[44px] rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border-hairline)] transition-colors`}
          aria-label="Toggle Charcoal Amber or Clean Light theme"
          title={isLightTheme ? 'Switch to Charcoal Amber' : 'Switch to Clean Light'}
        >
          {isLightTheme ? (
            <Sun className="w-4 h-4 text-[var(--accent-secondary)] shrink-0" />
          ) : (
            <Moon className="w-4 h-4 text-[var(--accent-secondary)] shrink-0" />
          )}
          {(!collapsed || isMobile) && (
            <span className="truncate whitespace-nowrap">
              {isLightTheme ? 'Clean Light' : 'Charcoal Amber'}
            </span>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen min-h-dvh flex bg-[var(--bg-canvas)] text-[var(--text-primary)] relative grunge-backdrop">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 sticky top-0 h-screen h-dvh bg-[var(--bg-surface)] border-r border-[var(--border-hairline)] transition-[width] duration-200 z-20 ${
          sidebarCollapsed ? 'w-[68px]' : 'w-[264px]'
        }`}
      >
        {renderNavContent(sidebarCollapsed, false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="relative w-[280px] max-w-[85vw] h-full bg-[var(--bg-surface)] border-r border-[var(--border-strong)] z-10 shadow-2xl"
            aria-label="Mobile navigation drawer"
          >
            {renderNavContent(false, true)}
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: 3 clean zones separated by gap-8 */}
        <header className="sticky top-0 z-30 h-16 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-hairline)] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          {/* Zone 1: Hamburger + Brand wordmark */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-md text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="lg:hidden flex items-center gap-2 text-[var(--text-primary)] whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <BrandLogo className="w-5 h-5" />
              <span className="font-display text-sm font-semibold tracking-[0.04em]">
                CrazyOpenPlace
              </span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="hidden lg:inline-flex items-center font-display text-sm font-semibold tracking-[0.04em] text-[var(--text-primary)] whitespace-nowrap shrink-0"
            >
              CrazyOpenPlace
            </button>
          </div>

          {/* Zone 2: 5 concise single-line text links */}
          <nav
            aria-label="Top utility navigation"
            className="hidden md:flex items-center gap-6 text-sm text-[var(--text-secondary)]"
          >
            {(
              [
                ['Home', '/'],
                ['Free Services', '/free-services'],
                ['UID Checker', '/uid-checker'],
                ['Speed Test', '/speed-test'],
                ['Website Speed', '/website-speed'],
              ] as Array<[string, RoutePath]>
            ).map(([label, path]) => {
              const active = currentPath === path;
              return (
                <button
                  key={path}
                  type="button"
                  onClick={() => navigate(path)}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    active
                      ? 'text-[var(--text-primary)] border-[var(--accent-secondary)] font-medium'
                      : 'border-transparent hover:text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action CTA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => navigate('/guild-glory')}
              className="px-4 py-2 min-h-[44px] sm:min-h-[40px] rounded-md text-xs sm:text-sm font-semibold btn-amber-primary whitespace-nowrap shrink-0"
            >
              Guild Glory Shop
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 w-full max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
          {children}
        </main>

        {/* Clean Platform Footer (no builder watermark) */}
        <footer className="border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] mt-auto">
          <div className="max-w-[1160px] mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-[var(--text-muted)]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
              <span className="font-display tracking-[0.04em] text-[var(--text-primary)] font-semibold">
                CrazyOpenPlace@domain
              </span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span>Free Utilities &amp; External Guild Glory Provider Directory</span>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-[var(--text-secondary)]">
              <button
                type="button"
                onClick={() => navigate('/free-services')}
                className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap min-h-[36px]"
              >
                Free Services
              </button>
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap min-h-[36px]"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => navigate('/safety')}
                className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap min-h-[36px]"
              >
                Safety
              </button>
              <button
                type="button"
                onClick={() => navigate('/contact')}
                className="hover:text-[var(--text-primary)] transition-colors whitespace-nowrap min-h-[36px]"
              >
                Contact
              </button>
              <a
                href={CONTACT_FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--text-primary)] hover:underline whitespace-nowrap min-h-[36px]"
              >
                <FacebookIcon className="w-3.5 h-3.5 text-[var(--accent-secondary)]" />
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-md border text-sm shadow-xl max-w-sm ${
            toast.tone === 'error'
              ? 'bg-[#1c1113] border-red-400/60 text-red-100'
              : 'bg-[var(--bg-elevated)] border-[var(--border-strong)] text-[var(--text-primary)]'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
