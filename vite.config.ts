import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from "@sentry/vite-plugin";
import viteImagemin from 'vite-plugin-imagemin';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // ✅ FIX: Base URL différente pour Vercel (/) et Capacitor (./)
  // Utilise la variable d'environnement CAPACITOR pour détecter un build Capacitor
  base: process.env.CAPACITOR === 'true' ? './' : '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png', 'robots.txt'],
      manifest: {
        name: 'Mon Toit - Plateforme Immobilière ANSUT',
        short_name: 'Mon Toit',
        description: 'Le logement, en toute confiance. Location sécurisée en Côte d\'Ivoire',
        theme_color: '#FF8F00',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2,webp}'],
        // Augmenter la limite pour les gros fichiers (10 MB au lieu de 2 MB par défaut)
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/btxhuqtirylvkgvoutoc\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/btxhuqtirylvkgvoutoc\.supabase\.co\/storage\/v1\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
      },
    }),
    // Image optimization (WebP conversion + compression)
    viteImagemin({
      gifsicle: {
        optimizationLevel: 7,
        interlaced: false,
      },
      optipng: {
        optimizationLevel: 7,
      },
      mozjpeg: {
        quality: 85,
      },
      pngquant: {
        quality: [0.8, 0.9],
        speed: 4,
      },
      svgo: {
        plugins: [
          { name: 'removeViewBox' },
          { name: 'removeEmptyAttrs', active: false },
        ],
      },
      webp: {
        quality: 85,
      },
    }),
    // Sentry plugin (only in production builds)
    mode === "production" && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true, // Required for Sentry error tracking
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks for better caching
          if (id.includes('node_modules')) {
            // Core React ecosystem - rarely changes
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }

            // Router - separate for better caching
            if (id.includes('react-router')) {
              return 'router-vendor';
            }

            // Supabase - isolated for security updates
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }

            // Maps - Large, lazy loaded
            if (id.includes('mapbox')) {
              return 'maps-vendor';
            }

            // Charts - Large, lazy loaded
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }

            // UI Components - Medium size
            if (id.includes('@radix-ui')) {
              return 'ui-vendor';
            }

            // Forms libraries
            if (id.includes('react-hook-form') || id.includes('zod')) {
              return 'forms-vendor';
            }

            // Animation libraries
            if (id.includes('framer-motion') || id.includes('canvas-confetti')) {
              return 'animation-vendor';
            }

            // Media players
            if (id.includes('react-player') || id.includes('lightbox')) {
              return 'media-vendor';
            }

            // Query and state management
            if (id.includes('tanstack') || id.includes('react-query')) {
              return 'query-vendor';
            }

            // Sentry monitoring
            if (id.includes('@sentry')) {
              return 'monitoring-vendor';
            }

            // Everything else in common vendor chunk
            return 'common-vendor';
          }

          // App code chunking by route
          if (id.includes('/src/pages/Admin')) {
            return 'route-admin';
          }
          if (id.includes('/src/pages/Owner') || id.includes('/src/pages/MyProperties')) {
            return 'route-owner';
          }
          if (id.includes('/src/pages/Tenant') || id.includes('/src/pages/Dashboard')) {
            return 'route-tenant';
          }
          if (id.includes('/src/pages/Agency')) {
            return 'route-agency';
          }
          if (id.includes('/src/pages/Property')) {
            return 'route-property';
          }
        },
        // ✅ SÉCURITÉ : Noms de chunks obfusqués
        chunkFileNames: (chunkInfo) => {
          return `assets/[name]-[hash].js`;
        },
        // ✅ SÉCURITÉ : Séparation des assets par type
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/styles-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
}));
