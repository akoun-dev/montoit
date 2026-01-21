/**
 * Global error interceptor for handling JWT and authentication errors
 */

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
    // Clean up auth data immediately
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('supabase') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          // Ignore individual removal errors
        }
      });

      // Show user-friendly message in development
      if (process.env['NODE_ENV'] === 'development') {
        console.warn('🔐 JWT Error intercepted and auth data cleaned up. Please refresh the page.');
      }

      // Optionally show notification to user
      showAuthErrorNotification();
    } catch (error) {
      // Fallback - at least log it
    }

    // Don't log the original JWT error to avoid noise
    return;
  }

  // For non-JWT errors, use original console.error
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
      // Prevent the default error handling
      event.preventDefault();

      // Clean up auth data
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        showAuthErrorNotification();
      } catch (error) {
        // Fallback
      }
    }
  }
});

export function cleanupAuthData() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore individual removal errors
      }
    });
    console.log('Manually cleaned up auth data');
  } catch (error) {
    console.warn('Could not clean auth data:', error);
  }
}
