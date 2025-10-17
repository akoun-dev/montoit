import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { secureStorage } from '@/lib/secureStorage';
import { getRequiredEnvVar } from '@/lib/env-validation';

// Get validated environment variables
const SUPABASE_URL = getRequiredEnvVar('VITE_SUPABASE_URL');
const SUPABASE_PUBLISHABLE_KEY = getRequiredEnvVar('VITE_SUPABASE_PUBLISHABLE_KEY');

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: {
      getItem: (key: string) => secureStorage.getItem(key, true),
      setItem: (key: string, value: string) => secureStorage.setItem(key, value, true),
      removeItem: (key: string) => secureStorage.removeItem(key),
    },
    persistSession: true,
    autoRefreshToken: true,
  }
});
