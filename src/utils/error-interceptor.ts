/**
 * Global error interceptor for handling JWT and authentication errors
 * Uses Supabase's built-in auth methods instead of direct localStorage access
 */

import { supabase } from '@/integrations/supabase/client';

// Store original console methods
const originalConsoleError = console.error;

// Intercept all console errors
console.error = function (...args) {
  const errorMessage = args.join(' ').toString();

  // Check for JWT-related errors
  if (
    errorMessage.includes('Expected 3 parts in JWT') ||
    errorMessage.includes('JWT') ||
    errorMessage.includes('Invalid token')
  ) {
    // Use Supabase's signOut method to properly clean up auth
    try {
      supabase.auth.signOut({ scope: 'global' })
        .then(() => {
          if (import.meta.env.DEV) {
            console.warn('🔐 JWT Error intercepted - user signed out via Supabase');
          }
        })
        .catch((err) => {
          originalConsoleError('[error-interceptor] Error during Supabase signOut:', err);
        });

      // Show user-friendly notification
      showAuthErrorNotification();
    } catch (error) {
      originalConsoleError('[error-interceptor] Error during JWT cleanup:', error);
    }

    // Don't log the original JWT error to avoid noise
    return;
  }

  // For non-JWT errors, use the original console.error
  originalConsoleError.apply(console, args);
};

// Function to show notification to user
function showAuthErrorNotification() {
  // Only show if we're in a browser environment
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      max-width: 300px;
    `;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Session expirée. <a href="#" onclick="location.reload()" style="text-decoration: underline;">Recharger</a></span>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }
}

// Also intercept unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'object') {
    const errorMessage = event.reason.message || '';
    if (
      errorMessage.includes('Expected 3 parts in JWT') ||
      errorMessage.includes('JWT') ||
      errorMessage.includes('Invalid token')
    ) {
      // Prevent default error handling
      event.preventDefault();

      // Use Supabase's signOut method
      supabase.auth.signOut({ scope: 'global' })
        .then(showAuthErrorNotification)
        .catch((error) => {
          originalConsoleError('[error-interceptor] Error during JWT cleanup in unhandledrejection:', error);
        });
    }
  }
});

// Export cleanup function that uses Supabase's signOut
export function cleanupAuthData() {
  supabase.auth.signOut({ scope: 'global' })
    .then(() => {
      console.log('Manually cleaned up auth data via Supabase signOut');
    })
    .catch((error) => {
      console.warn('Could not clean auth data:', error);
    });
}
