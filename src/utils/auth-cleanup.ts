/**
 * Manual auth cleanup utilities
 * Import this in console or add to window for manual cleanup
 */

export const cleanupAllAuth = () => {
  console.log('🧹 Starting comprehensive auth cleanup...');

  const removedItems: string[] = [];

  try {
    // Clean localStorage
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        removedItems.push(`localStorage: ${key}`);
        localStorage.removeItem(key);
      }
    }

    // Clean sessionStorage
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        removedItems.push(`sessionStorage: ${key}`);
        sessionStorage.removeItem(key);
      }
    }

    // Clear any cookies related to auth
    document.cookie.split(';').forEach((c) => {
      if (c.trim().startsWith('supabase') || c.trim().startsWith('auth')) {
        const eqPos = c.indexOf('=');
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        removedItems.push(`cookie: ${name}`);
      }
    });

    console.log('✅ Auth cleanup completed. Removed items:', removedItems);
    console.log('🔄 Please refresh the page to continue.');

    return {
      success: true,
      removedItems,
      message: 'Auth data cleaned up successfully. Please refresh the page.',
    };
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return {
      success: false,
      error,
      message: 'Failed to clean up auth data. Try refreshing the page.',
    };
  }
};

// Make function available globally for manual use
if (typeof window !== 'undefined') {
  (window as any).cleanupAuth = cleanupAllAuth;
  (window as any).debugAuth = () => {
    console.log('🔍 Current auth items in storage:');

    console.log('localStorage:');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        const value = localStorage.getItem(key);
        console.log(
          `  ${key}:`,
          value?.substring(0, 50) + (value && value.length > 50 ? '...' : '')
        );
      }
    }

    console.log('sessionStorage:');
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('supabase') || key.includes('auth'))) {
        const value = sessionStorage.getItem(key);
        console.log(
          `  ${key}:`,
          value?.substring(0, 50) + (value && value.length > 50 ? '...' : '')
        );
      }
    }
  };
}

// Export for programmatic use
export default cleanupAllAuth;
