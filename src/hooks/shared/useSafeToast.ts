/**
 * Safe toast wrapper with automatic fallback
 * Uses sonner if available, otherwise falls back to console.log
 */

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  description?: string;
  duration?: number;
}

// Lazy import sonner to prevent blocking if it fails to load
let sonnerToast: typeof import('sonner').toast | null = null;
let sonnerLoadAttempted = false;

const loadSonner = async () => {
  if (sonnerLoadAttempted) return;
  sonnerLoadAttempted = true;

  try {
    const sonnerModule = await import('sonner');
    sonnerToast = sonnerModule.toast;
  } catch (error) {
    console.warn('[useSafeToast] Sonner failed to load, using fallback:', error);
    sonnerToast = null;
  }
};

// Start loading sonner immediately
loadSonner();

const fallbackToast = (message: string, type: ToastType, options?: ToastOptions) => {
  const prefix = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
  }[type];

  const fullMessage = options?.description
    ? `${prefix} ${message}: ${options.description}`
    : `${prefix} ${message}`;

  console.log(`[Toast ${type}]`, fullMessage);
};

const showToast = (message: string, type: ToastType = 'info', options?: ToastOptions) => {
  if (sonnerToast) {
    try {
      sonnerToast[type](message, options);
      return;
    } catch (error) {
      console.warn('[useSafeToast] Sonner call failed:', error);
    }
  }
  fallbackToast(message, type, options);
};

export const toast = {
  success: (message: string, options?: ToastOptions) => showToast(message, 'success', options),
  error: (message: string, options?: ToastOptions) => showToast(message, 'error', options),
  info: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
  warning: (message: string, options?: ToastOptions) => showToast(message, 'warning', options),
  message: (message: string, options?: ToastOptions) => showToast(message, 'info', options),
};

export default toast;
