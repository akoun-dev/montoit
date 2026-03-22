// Force complete rebuild - 2025-12-07T18:55:00Z
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      'localhost',
      '.localhost',
      '127.0.0.1',
      'mon-toit.ansut.ci',
      '.mon-toit.ansut.ci',
      'montoit.ansut.ci',
      '.montoit.ansut.ci',
      'app.montoit.ci',
      '.app.montoit.ci',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './src/config'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@services': path.resolve(__dirname, './src/services'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@types': path.resolve(__dirname, './src/types'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['mapbox-gl'],
  },
    // Expose environment variables to the app
    // Use VITE_ prefix for client-side access
    define: {
      ...Object.keys(env).reduce((acc, key) => {
        if (key.startsWith('VITE_')) {
          acc[key] = JSON.stringify(env[key]);
        }
        return acc;
      }, {} as Record<string, string>),
    },
  };
});
