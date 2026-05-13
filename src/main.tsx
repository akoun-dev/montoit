// ============================================
// DIAGNOSTIC - Affiche immédiatement au chargement du module
// ============================================
import { logger } from '@/shared/utils';
logger.log('🟢 main.tsx: Module evaluation started at', new Date().toISOString());

// Fallback immédiat - s'exécute même si les imports suivants échouent
const LOADER_TIMEOUT = 5000;
const loaderFallbackTimer = setTimeout(() => {
  const loader = document.getElementById('initial-loader');
  if (loader && loader.parentNode) {
    logger.warn('⚠️ main.tsx fallback: Removing loader after timeout');
    loader.style.transition = 'opacity 0.4s ease';
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 400);
  }
}, LOADER_TIMEOUT);

logger.log('🟢 main.tsx: Fallback timer set, starting imports...');

// ============================================
// IMPORTS - Un par un avec logs pour identifier le problème
// ============================================
try {
  logger.log('🟢 main.tsx: Importing React...');
} catch (e) {
  logger.error('❌ main.tsx: Pre-import error', e);
}

// Import error interceptor FIRST to catch all JWT errors
import '@/utils/error-interceptor';
logger.log('🟢 main.tsx: Error interceptor imported');

// Import auth cleanup utilities for global access
import '@/utils/auth-cleanup';
logger.log('🟢 main.tsx: Auth cleanup utilities imported');

import { StrictMode } from 'react';
logger.log('🟢 main.tsx: React imported');

import { createRoot } from 'react-dom/client';
logger.log('🟢 main.tsx: ReactDOM imported');

import { QueryClientProvider } from '@tanstack/react-query';
logger.log('🟢 main.tsx: React Query imported');

import { createQueryClient } from '@/shared/lib/query-config';
logger.log('🟢 main.tsx: Query config imported');

import { AuthProvider } from '@/app/providers/AuthProvider';
logger.log('🟢 main.tsx: AuthProvider imported');

import { NotificationProvider } from '@/app/providers/NotificationProvider';
logger.log('🟢 main.tsx: NotificationProvider imported');

import { RoleProvider } from '@/contexts/RoleContext';
logger.log('🟢 main.tsx: RoleProvider imported');

import { ThemeProvider } from '@/contexts/ThemeContext';
logger.log('🟢 main.tsx: ThemeProvider imported');

import App from './App';
logger.log('🟢 main.tsx: App imported');

import { Toaster } from 'sonner';
logger.log('🟢 main.tsx: Sonner Toaster imported');

import './index.css';
logger.log('✅ main.tsx: All imports successful');

// ============================================
// FONCTIONS UTILITAIRES
// ============================================
const removeInitialLoader = () => {
  clearTimeout(loaderFallbackTimer);
  const loader = document.getElementById('initial-loader');
  if (loader && loader.parentNode) {
    loader.style.transition = 'opacity 0.4s ease';
    loader.style.opacity = '0';
    setTimeout(() => {
      if (loader.parentNode) loader.remove();
    }, 400);
  }
};

const showErrorInLoader = (error: unknown) => {
  clearTimeout(loaderFallbackTimer);
  const loader = document.getElementById('initial-loader');
  if (loader) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    loader.innerHTML = `
      <div style="text-align:center;padding:20px;font-family:Inter,sans-serif;">
        <img src="/logo.png" alt="Mon Toit" style="width:60px;height:60px;margin-bottom:12px;opacity:0.5;" />
        <div style="color:#dc2626;font-size:16px;margin-bottom:8px;">
          Erreur de chargement
        </div>
        <div style="color:#666;font-size:12px;margin-bottom:16px;max-width:300px;">
          ${errorMessage}
        </div>
        <button onclick="window.location.reload()" style="background:#ea580c;color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;">
          Rafraîchir la page
        </button>
      </div>
    `;
  }
  logger.error('❌ Erreur de démarrage React:', error);
};

// ============================================
// DÉMARRAGE DE L'APPLICATION
// ============================================
try {
  logger.log('🚀 main.tsx: Starting React application...');

  const queryClient = createQueryClient();
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('Élément #root introuvable dans le DOM');
  }

  logger.log('📦 main.tsx: Creating React root...');

  const root = createRoot(rootElement);

  logger.log('🎨 main.tsx: Rendering application...');

  root.render(
    <StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NotificationProvider>
              <RoleProvider>
                <App />
              </RoleProvider>
            </NotificationProvider>
          </AuthProvider>
        </QueryClientProvider>
        <Toaster
          position="top-right"
          expand={false}
          richColors
          closeButton
          toastOptions={{
            duration: 5000,
          }}
        />
      </ThemeProvider>
    </StrictMode>
  );

  logger.log('✅ main.tsx: React render called successfully');

  // Supprimer le loader une fois React monté
  if ('requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(
      () => {
        logger.log('✅ main.tsx: Removing loader via requestIdleCallback');
        removeInitialLoader();
      }
    );
  } else {
    setTimeout(() => {
      logger.log('✅ main.tsx: Removing loader via setTimeout');
      removeInitialLoader();
    }, 100);
  }
} catch (error) {
  logger.error('❌ main.tsx: Critical error during startup:', error);
  showErrorInLoader(error);
}
