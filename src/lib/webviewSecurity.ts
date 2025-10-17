/**
 * WebView Security Configuration for Mon Toit Mobile App
 *
 * This file contains security configurations to harden the WebView
 * against JavaScript injection attacks and other mobile-specific threats.
 */

import { Capacitor } from '@capacitor/core';

export interface WebViewSecurityConfig {
  allowFileAccess: boolean;
  allowContentAccess: boolean;
  allowFileAccessFromFileURLs: boolean;
  allowUniversalAccessFromFileURLs: boolean;
  javaScriptEnabled: boolean;
  domStorageEnabled: boolean;
  databaseEnabled: boolean;
  mediaPlaybackRequiresUserGesture: boolean;
  mixedContentMode: 'compatibility' | 'never' | 'always';
  allowInlineMediaPlayback: boolean;
  allowAirPlayForMediaPlayback: boolean;
  allowBackForwardNavigationGestures: boolean;
  limitNavigationsToAppBoundDomains: boolean;
}

export const defaultWebViewSecurityConfig: WebViewSecurityConfig = {
  // File access restrictions
  allowFileAccess: false, // Prevent access to local files
  allowContentAccess: false, // Prevent access to content providers
  allowFileAccessFromFileURLs: false, // Prevent file URL access
  allowUniversalAccessFromFileURLs: false, // Prevent universal file access

  // JavaScript and storage controls
  javaScriptEnabled: true, // Required for React app, but will be sandboxed
  domStorageEnabled: true, // Required for app functionality
  databaseEnabled: true, // Required for local storage

  // Media playback restrictions
  mediaPlaybackRequiresUserGesture: true, // Prevent auto-play attacks
  allowInlineMediaPlayback: false, // Restrict inline media
  allowAirPlayForMediaPlayback: false, // Prevent AirPlay hijacking

  // Navigation restrictions
  allowBackForwardNavigationGestures: true, // Allow standard gestures
  mixedContentMode: 'never', // Block mixed content
  limitNavigationsToAppBoundDomains: true, // Restrict to app domains
};

/**
 * Allowed domains for the application
 */
export const ALLOWED_DOMAINS = [
  'montoit.ci',
  'supabase.co',
  'mapbox.com',
  'api.mapbox.com',
  'tiles.mapbox.com',
  'github.com',
  'vercel.app',
];

/**
 * Content Security Policy for the application
 */
export const CSP_POLICY = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.mapbox.com https://tiles.mapbox.com;
  style-src 'self' 'unsafe-inline' https://api.mapbox.com;
  img-src 'self' data: blob: https: *.tile.openstreetmap.org *.tiles.mapbox.com https://api.mapbox.com;
  connect-src 'self' https: *.supabase.co https://api.mapbox.com https://tiles.mapbox.com;
  font-src 'self' data:;
  media-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
  block-all-mixed-content;
`.trim().replace(/\s+/g, ' ');

/**
 * Initialize WebView security settings
 */
export function initializeWebViewSecurity(): void {
  if (!Capacitor.isNativePlatform()) {
    console.log('WebView security: Not running on native platform, skipping initialization');
    return;
  }

  // Set CSP meta tag
  setCSPMetaTag();

  // Initialize navigation security
  initializeNavigationSecurity();

  // Initialize content security
  initializeContentSecurity();
}

/**
 * Set Content Security Policy meta tag
 */
function setCSPMetaTag(): void {
  // Remove existing CSP meta tags
  const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existingCSP) {
    existingCSP.remove();
  }

  // Add new CSP meta tag
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = CSP_POLICY;
  document.head.appendChild(meta);
}

/**
 * Initialize navigation security
 */
function initializeNavigationSecurity(): void {
  // Prevent opening external links in WebView
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a') as HTMLAnchorElement;

    if (link && link.href) {
      const url = new URL(link.href);
      const isAllowedDomain = ALLOWED_DOMAINS.some(domain =>
        url.hostname === domain || url.hostname.endsWith(`.${domain}`)
      );

      if (!isAllowedDomain) {
        event.preventDefault();
        // Open in external browser
        window.open(link.href, '_system');
      }
    }
  });
}

/**
 * Initialize content security
 */
function initializeContentSecurity(): void {
  // Prevent iframe injection
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;

          // Remove iframes from unknown sources
          if (element.tagName === 'IFRAME') {
            const iframe = element as HTMLIFrameElement;
            if (iframe.src) {
              try {
                const url = new URL(iframe.src);
                const isAllowedDomain = ALLOWED_DOMAINS.some(domain =>
                  url.hostname === domain || url.hostname.endsWith(`.${domain}`)
                );

                if (!isAllowedDomain) {
                  iframe.remove();
                  console.warn('Blocked iframe from unauthorized domain:', iframe.src);
                }
              } catch (error) {
                iframe.remove();
                console.warn('Blocked iframe with invalid URL:', iframe.src);
              }
            }
          }

          // Remove suspicious scripts
          if (element.tagName === 'SCRIPT') {
            const script = element as HTMLScriptElement;
            if (script.src && !script.src.includes('localhost') && !script.src.includes('chunk')) {
              const url = new URL(script.src);
              const isAllowedDomain = ALLOWED_DOMAINS.some(domain =>
                url.hostname === domain || url.hostname.endsWith(`.${domain}`)
              );

              if (!isAllowedDomain) {
                script.remove();
                console.warn('Blocked script from unauthorized domain:', script.src);
              }
            }
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Validate URL before navigation
 */
export function validateNavigationUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS schemes
    if (parsedUrl.protocol !== 'https:') {
      console.warn('Blocked non-HTTPS navigation:', url);
      return false;
    }

    // Check against allowed domains
    const isAllowedDomain = ALLOWED_DOMAINS.some(domain =>
      parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowedDomain) {
      console.warn('Blocked navigation to unauthorized domain:', url);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('Invalid URL for navigation:', url);
    return false;
  }
}

/**
 * Sanitize user-generated content
 */
export function sanitizeUserContent(content: string): string {
  if (!content) return content;

  // Remove potentially dangerous HTML elements
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:(?!image\/)/gi,
    /on\w+\s*=/gi, // Event handlers
  ];

  let sanitized = content;
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
}

/**
 * WebView Security Monitor
 */
export class WebViewSecurityMonitor {
  private static instance: WebViewSecurityMonitor;
  private securityChecks: (() => void)[] = [];

  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): WebViewSecurityMonitor {
    if (!WebViewSecurityMonitor.instance) {
      WebViewSecurityMonitor.instance = new WebViewSecurityMonitor();
    }
    return WebViewSecurityMonitor.instance;
  }

  addSecurityCheck(check: () => void): void {
    this.securityChecks.push(check);
  }

  private startMonitoring(): void {
    // Check for security violations every 5 seconds
    setInterval(() => {
      this.securityChecks.forEach(check => {
        try {
          check();
        } catch (error) {
          console.error('Security check failed:', error);
        }
      });
    }, 5000);
  }
}

// Initialize security features
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeWebViewSecurity();
    WebViewSecurityMonitor.getInstance();
  });
}