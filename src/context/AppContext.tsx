import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { RoutePath, ThemeMode } from '../types';

const VALID_ROUTES = new Set<RoutePath>([
  '/',
  '/free-services',
  '/uid-checker',
  '/speed-test',
  '/website-speed',
  '/guild-glory',
  '/thank-you',
  '/about',
  '/safety',
  '/contact',
]);

function resolveRoute(pathname: string): RoutePath {
  const cleaned = pathname.replace(/\/+$/, '') || '/';
  if (VALID_ROUTES.has(cleaned as RoutePath)) {
    return cleaned as RoutePath;
  }
  return '/not-found';
}

interface ToastMessage {
  id: string;
  text: string;
  tone: 'info' | 'error';
}

interface AppContextValue {
  currentPath: RoutePath;
  navigate: (path: RoutePath) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  theme: ThemeMode;
  toggleTheme: () => void;
  toast: ToastMessage | null;
  showToast: (text: string, tone?: 'info' | 'error') => void;
  copyToClipboard: (text: string, label?: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentPath, setCurrentPath] = useState<RoutePath>(() =>
    resolveRoute(window.location.pathname)
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cop_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('cop_theme');
      if (saved === 'light' || saved === 'charcoal-amber') return saved;
    } catch {
      // ignore storage failure
    }
    return 'charcoal-amber';
  });
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = useCallback((text: string, tone: 'info' | 'error' = 'info') => {
    const id = String(Date.now());
    setToast({ id, text, tone });
    window.setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 3200);
  }, []);

  const navigate = useCallback((path: RoutePath) => {
    const target = path === '/not-found' ? '/not-found' : resolveRoute(path);
    if (window.location.pathname !== target) {
      window.history.pushState({}, '', target);
    }
    setCurrentPath(target);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(resolveRoute(window.location.pathname));
      setMobileMenuOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('cop_sidebar_collapsed', String(sidebarCollapsed));
    } catch {
      // ignore
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    try {
      localStorage.setItem('cop_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'charcoal-amber' ? 'light' : 'charcoal-amber'));
  }, []);

  const copyToClipboard = useCallback(
    async (text: string, label = 'value') => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.setAttribute('readonly', '');
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(textarea);
          if (!ok) throw new Error('Copy failed');
        }
        showToast(`Copied ${label}.`);
      } catch {
        showToast('Clipboard copy failed in this browser.', 'error');
      }
    },
    [showToast]
  );

  return (
    <AppContext.Provider
      value={{
        currentPath,
        navigate,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileMenuOpen,
        setMobileMenuOpen,
        theme,
        toggleTheme,
        toast,
        showToast,
        copyToClipboard,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
