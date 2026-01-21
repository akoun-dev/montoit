/**
 * Configuration Vitest pour les tests de sécurité
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Configurer l'environnement de test
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,

    // Augmenter le timeout pour les tests de sécurité
    testTimeout: 10000,
    hookTimeout: 10000,

    // Isoler les tests de sécurité pour éviter les interférences
    include: [
      'src/tests/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      'src/tests/e2e/**/*',
    ],

    // Configurer les rapports
    reporter: [
      'default',
      'html',
      'json',
      // Note: Le reporter JUnit nécessite le package 'vitest-reporter-junit'
      // Décommenter la ligne suivante après installation:
      // ['junit', { outputFile: './test-results/security-results.xml' }],
    ],

    // Couverture de code pour les modules de sécurité
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: [
        'src/shared/services/**/*.{ts,tsx}',
        'src/features/*/services/**/*.{ts,tsx}',
        'src/shared/middleware/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/tests/**/*',
        '**/*.d.ts',
        '**/*.config.*',
        '**/index.ts',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },

    // Variables d'environnement pour les tests
    env: {
      NODE_ENV: 'test',
      SUPABASE_URL: process.env.VITE_SUPABASE_URL_TEST || 'http://localhost:54321',
      SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY_TEST || 'test-key',
    },

    // Mocks pour les dépendances externes
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
      '@services': path.resolve(__dirname, './src/services'),
    },

    // Configuration des séquences de test
    sequence: {
      shuffle: false, // Important pour les tests de sécurité
      concurrent: false, // Éviter les interférences
    },
  },

  // Définitions pour les globals de test
  define: {
    'process.env.NODE_ENV': '"test"',
  },

  // Optimisations pour les tests de sécurité
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
    ],
  },
});