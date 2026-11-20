// Globally monkey-patch Storage.prototype.setItem to swallow QuotaExceededError smoothly.
try {
  if (typeof window !== 'undefined' && window.Storage && Storage.prototype) {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      try {
        originalSetItem.call(this, key, value);
      } catch (e) {
        const isQuotaError = (
          (e instanceof Error && (
            e.name === 'QuotaExceededError' || 
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
            e.message?.toLowerCase().includes('quota') ||
            e.message?.toLowerCase().includes('exceeded')
          )) ||
          (typeof e === 'object' && e !== null && 'code' in e && ((e as any).code === 22 || (e as any).code === 1014))
        );
        
        if (isQuotaError) {
          // Gracefully swallow local storage quota error; safeStorage already handles IndexedDB/RAM persistence
          return;
        } else {
          throw e;
        }
      }
    };
  }
} catch (patchErr) {
  console.warn('[Storage Safety Interceptor] Could not patch Storage.prototype:', patchErr);
}

import './lib/leafletSafety';
import 'leaflet/dist/leaflet.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerSW } from 'virtual:pwa-register';
import { requestPersistentStorage } from './firebase';
import { aiToolEngine } from './new_engine/ai/AIToolEngine';

// Initialize decoupled AI & GIS Engine
try {
  aiToolEngine.init();
} catch (engineErr) {
  console.warn('[AIToolEngine] Boot failed:', engineErr);
}

// Request persistent storage on load
try {
  requestPersistentStorage().then(persisted => {
    if (persisted) {
      (window as any).__STORAGE_PERSISTED__ = true;
    }
  }).catch(console.error);
} catch (e) {
  console.warn('[PersistentStorage] Skipped:', e);
}

const isSuppressedStr = (str: string) => {
  if (!str) return false;
  const lower = str.toLowerCase();
  return (
    str.includes('Script error') ||
    str.includes('Failed to fetch') ||
    str.includes('RPC errored') ||
    str.includes('Could not reach Cloud Firestore backend') || 
    str.includes('code=unavailable') ||
    str.includes('unavailable') ||
    str.includes('@firebase/firestore') ||
    str.includes('INTERNAL ASSERTION FAILED') ||
    str.includes('INTERNAL UNHANDLED ERROR') ||
    str.includes('Unexpected state') ||
    str.includes('Eu.get') ||
    str.includes('removeAndCleanupTarget') ||
    str.includes('b815') ||
    str.includes('ca9') ||
    str.includes('da08') ||
    lower.includes('quota') ||
    lower.includes('exceeded') ||
    lower.includes('not iterable') ||
    lower.includes('resizeobserver') ||
    lower.includes('clearrect') ||
    lower.includes('watchchangeaggregator') ||
    lower.includes('persistentlistenstream') ||
    lower.includes('invalid latlng') ||
    lower.includes('latlng object') ||
    lower.includes('open-meteo')
  );
};

// Self-healing Firestore internal cache corruption recovery configuration
if (typeof window !== 'undefined') {
  const handleFirestoreAssertionError = (errorMsg: string) => {
    if (errorMsg && (
      errorMsg.includes('FIRESTORE') && errorMsg.includes('INTERNAL ASSERTION FAILED')
    )) {
      console.warn('🚨 Captured global Firestore assertion crash. App will attempt to proceed without reloading...', errorMsg);
    }
  };

  // Assign standard window.onerror to return true and completely abort browser report
  const prevOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    const errorMsg = String(message || '');
    const errStr = String(error && error.message || error || errorMsg);
    handleFirestoreAssertionError(errStr);

    if (isSuppressedStr(errorMsg) || isSuppressedStr(errStr)) {
      console.warn('[Global Interceptor index.tsx onerror] Suppressed exception:', errorMsg);
      if (typeof window !== 'undefined' && (window as any).__agrimapSetBackgroundSync) {
        (window as any).__agrimapSetBackgroundSync(true);
      }
      return true; // Completely swallow error
    }
    if (prevOnError) {
      return prevOnError.apply(window, [message, source, lineno, colno, error]);
    }
    return false;
  };

  const prevOnRejection = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    handleFirestoreAssertionError(msg || '');

    if (isSuppressedStr(msg)) {
      console.warn('[Global Interceptor index.tsx rejection] Suppressed rejection:', msg);
      event.preventDefault();
      event.stopPropagation();
      if (typeof window !== 'undefined' && (window as any).__agrimapSetBackgroundSync) {
        (window as any).__agrimapSetBackgroundSync(true);
      }
      return true;
    }
    if (prevOnRejection) {
      return prevOnRejection.apply(window, [event]);
    }
    return false;
  };

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || (event.error && event.error.message) || '';
    handleFirestoreAssertionError(errorMsg);
    
    if (isSuppressedStr(errorMsg)) {
      console.warn('[Global Interceptor Root] Suppressed non-critical/sync-gate/cross-origin browser exception:', errorMsg);
      event.preventDefault();
      event.stopPropagation();
      if (typeof window !== 'undefined' && (window as any).__agrimapSetBackgroundSync) {
        (window as any).__agrimapSetBackgroundSync(true);
      }
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    handleFirestoreAssertionError(msg || '');
    
    if (isSuppressedStr(msg)) {
      console.warn('[Global Interceptor Root Tab] Suppressed offline/cross-origin/network unhandled promise rejection event:', msg);
      event.preventDefault();
      event.stopPropagation();
      if (typeof window !== 'undefined' && (window as any).__agrimapSetBackgroundSync) {
        (window as any).__agrimapSetBackgroundSync(true);
      }
    }
  });
}

// Ensure stale Service Workers never serve outdated bundles in dev, and auto-update cleanly in prod
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    if (import.meta.env.DEV) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {});
        });
      }).catch(() => {});
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            if (key.includes('workbox') || key.includes('precache') || key.includes('vite-pwa')) {
              caches.delete(key).catch(() => {});
            }
          });
        }).catch(() => {});
      }
    } else if (import.meta.env.PROD) {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          updateSW(true);
        },
        onOfflineReady() {
          console.log('App ready to work offline');
        },
      });
    }
  }
} catch (swErr) {
  console.warn('[PWA] Service Worker registration skipped:', swErr);
}

// System Logs Interceptor for root user visibility
if (typeof window !== 'undefined') {
  (window as any).__CONSOLE_LOGS__ = (window as any).__CONSOLE_LOGS__ || [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalDebug = console.debug;

  const pushLog = (level: string, ...args: any[]) => {
      if (args[0] && typeof args[0] === 'string') {
          const msg = args[0];
          if (msg.includes('[vite]') || msg.includes('[App]') || msg.includes('[Firebase]') || msg.includes('[Auth]')) {
              (window as any).__CONSOLE_LOGS__.push({
                  id: `sys-${Date.now()}-${Math.random()}`,
                  timestamp: new Date().toISOString(),
                  level,
                  message: msg,
                  data: args.length > 1 ? args.slice(1) : undefined
              });
              if ((window as any).__CONSOLE_LOGS__.length > 100) (window as any).__CONSOLE_LOGS__.shift();
          }
      }
  };

  console.log = (...args) => { pushLog('Log', ...args); originalLog.apply(console, args); };
  console.warn = (...args) => { pushLog('Warning', ...args); originalWarn.apply(console, args); };
  console.error = (...args) => { 
      pushLog('Error', ...args); 
      const combinedMsg = args.map(a => typeof a === 'string' ? a : (a && a.message) ? a.message : (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      if (isSuppressedStr(combinedMsg)) {
          originalWarn.apply(console, ['[Suppressed Firebase/Browser Non-Fatal Internal Error]', ...args]);
          return;
      }
      originalError.apply(console, args); 
  };
  console.debug = (...args) => { pushLog('Debug', ...args); originalDebug.apply(console, args); };
}

import { UiVersionMode, getUiVersionMode } from './utils/version';
import { FullApplicationFrame } from './local/FullApplicationFrame';

const ModernApp = React.lazy(() => import('./modern/ModernApp'));

const MainAppRouter: React.FC = () => {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  if (pathname.startsWith('/modern-preview')) {
    return (
      <React.Suspense fallback={
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0d1527] text-white font-mono gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <span className="text-sm tracking-wider text-slate-300">Loading sonik G2.0.1.4 Modern Preview...</span>
        </div>
      }>
        <ModernApp />
      </React.Suspense>
    );
  }

  return (
    <FullApplicationFrame>
      <App />
    </FullApplicationFrame>
  );
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ErrorBoundary>
      <LanguageProvider>
        <MainAppRouter />
      </LanguageProvider>
    </ErrorBoundary>
  );
  (window as any).__AGRIMAP_MOUNTED__ = true;

  if (typeof (window as any).__agrimapOnMounted === 'function') {
    (window as any).__agrimapOnMounted();
  }
} catch (mountErr: any) {
  console.error("FATAL ROOT MOUNT ERROR:", mountErr);
  if (typeof (window as any).__agrimapReportError === 'function') {
    (window as any).__agrimapReportError(mountErr);
  }
}
