/**
 * Setup global test configuration
 */

// Mock environment variables for tests
process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://btxhuqtirylvkgvoutoc.supabase.co';
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0eGh1cXRpcnlsdmtndm91dG9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1ODA0MDcsImV4cCI6MjA3NTE1NjQwN30.yjG6Xp3y6ZiJLRM1AInfP84U1AAL333u80iRXGnSnc4';

// Global test timeout (30 seconds for network operations)
import { beforeAll } from 'vitest';

beforeAll(() => {
  // Configuration globale si nécessaire
});
