/**
 * Mobile Browser Service for Mon Toit Real Estate App
 *
 * This file provides browser functionality for opening external links,
  * property websites, maps, and other web content within the mobile app.
 */

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Share } from '@capacitor/share';

export interface BrowserOptions {
  toolbarColor?: string;
  presentationStyle?: 'fullscreen' | 'popover';
  closeButton?: {
    position?: 'leading' | 'trailing';
    color?: string;
  };
  dismissButtonStyle?: 'close' | 'done' | 'cancel';
  enableBackButton?: boolean;
  enableUrlBarHiding?: boolean;
  enableDefaultShare?: boolean;
  enableZoomControls?: boolean;
  enforceSameOriginPolicy?: boolean;
  enterpriseAuthentication?: {
    username?: string;
    password?: string;
  };
}

export interface ExternalLink {
  id: string;
  title: string;
  url: string;
  type: 'property' | 'agency' | 'map' | 'document' | 'social' | 'website' | 'other';
  metadata?: {
    propertyId?: string;
    agencyId?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    source?: string;
  };
}

export class MobileBrowserService {
  private static instance: MobileBrowserService;
  private isOpen = false;
  private currentUrl: string | null = null;
  private browserHistory: string[] = [];

  private constructor() {}

  static getInstance(): MobileBrowserService {
    if (!MobileBrowserService.instance) {
      MobileBrowserService.instance = new MobileBrowserService();
    }
    return MobileBrowserService.instance;
  }

  /**
   * Open URL in browser
   */
  async openUrl(
    url: string,
    options?: BrowserOptions
  ): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      // Fallback to opening in new tab for web
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (this.isOpen) {
      console.warn('Browser is already open');
      return;
    }

    try {
      await Haptics.impact({ style: ImpactStyle.Light });

      const browserOptions: BrowserOptions = {
        toolbarColor: '#667eea',
        presentationStyle: 'fullscreen',
        closeButton: {
          position: 'trailing',
          color: '#ffffff',
        },
        dismissButtonStyle: 'close',
        enableBackButton: true,
        enableUrlBarHiding: false,
        enableDefaultShare: true,
        enableZoomControls: true,
        enforceSameOriginPolicy: true,
        ...options,
      };

      await Browser.open({
        url: this.validateUrl(url),
        ...browserOptions,
      });

      this.isOpen = true;
      this.currentUrl = url;
      this.browserHistory.push(url);

      console.log('🌐 Browser opened:', url);
    } catch (error) {
      console.error('Error opening browser:', error);
      throw new Error('Impossible d\'ouvrir le navigateur: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (!this.isOpen || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await Browser.close();
      this.isOpen = false;
      this.currentUrl = null;

      await Haptics.impact({ style: ImpactStyle.Light });

      console.log('🌐 Browser closed');
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }

  /**
   * Open property website
   */
  async openPropertyWebsite(
    propertyUrl: string,
    propertyId?: string
  ): Promise<void> {
    const options: BrowserOptions = {
      toolbarColor: '#FF8F00',
      enableDefaultShare: true,
      enableBackButton: true,
    };

    await this.openUrl(propertyUrl, options);

    // Log property view (for analytics)
    if (propertyId) {
      console.log('🏠 Property website viewed:', propertyId);
      // Analytics tracking would go here
    }
  }

  /**
   * Open agency website
   */
  async openAgencyWebsite(
    agencyUrl: string,
    agencyId?: string
  ): Promise<void> {
    const options: BrowserOptions = {
      toolbarColor: '#FF8F00',
      enableDefaultShare: true,
      enableBackButton: true,
    };

    await this.openUrl(agencyUrl, options);

    // Log agency view (for analytics)
    if (agencyId) {
      console.log('🏢 Agency website viewed:', agencyId);
      // Analytics tracking would go here
    }
  }

  /**
   * Open map location
   */
  async openMapLocation(
    latitude: number,
    longitude: number,
    address?: string
  ): Promise<void> {
    let mapUrl: string;

    // Try to open in Google Maps first
    if (Capacitor.getPlatform() === 'android') {
      mapUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
    } else {
      // iOS - use Apple Maps or Google Maps
      mapUrl = `maps://maps.google.com/maps?q=${latitude},${longitude}`;
    }

    // Add address to URL if provided
    if (address) {
      mapUrl += `&query=${encodeURIComponent(address)}`;
    }

    const options: BrowserOptions = {
      toolbarColor: '#FF8F00',
      enableDefaultShare: true,
      enableZoomControls: true,
    };

    await this.openUrl(mapUrl, options);
    console.log('🗺️ Map location opened:', { latitude, longitude, address });
  }

  /**
   * Open document viewer
   */
  async openDocument(
    documentUrl: string,
    documentName?: string
  ): Promise<void> {
    const options: BrowserOptions = {
      toolbarColor: '#667eea',
      presentationStyle: 'fullscreen',
      enableDefaultShare: true,
      enableBackButton: true,
      enableZoomControls: true,
    };

    await this.openUrl(documentUrl, options);
    console.log('📄 Document opened:', documentName || documentUrl);
  }

  /**
   * Open social media link
   */
  async openSocialLink(
    platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin',
    username: string
  ): Promise<void> {
    const socialUrls = {
      facebook: `https://www.facebook.com/${username}`,
      twitter: `https://twitter.com/${username}`,
      instagram: `https://www.instagram.com/${username}`,
      linkedin: `https://www.linkedin.com/in/${username}`,
    };

    const url = socialUrls[platform];
    const options: BrowserOptions = {
      toolbarColor: platform === 'twitter' ? '#1DA1F2' : '#4267B2',
      enableDefaultShare: true,
    };

    await this.openUrl(url, options);
    console.log(`📱 ${platform} profile opened: @${username}`);
  }

  /**
   * Share current page
   */
  async shareCurrentPage(): Promise<boolean> {
    if (!this.currentUrl) {
      return false;
    }

    try {
      await Share.share({
        title: 'Lien partagé depuis Mon Toit',
        text: 'Découvrez ce lien sur Mon Toit',
        url: this.currentUrl,
      });

      await Haptics.notification({ type: 'success' });
      return true;
    } catch (error) {
      console.error('Error sharing page:', error);
      return false;
    }
  }

  /**
   * Get browser history
   */
  getHistory(): string[] {
    return [...this.browserHistory];
  }

  /**
   * Clear browser history
   */
  clearHistory(): void {
    this.browserHistory = [];
  }

  /**
   * Check if browser is open
   */
  isBrowserOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  /**
   * Validate and sanitize URL
   */
  private validateUrl(url: string): string {
    if (!url) {
      throw new Error('URL is required');
    }

    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    return url;
  }

  /**
   * Create external link object
   */
  createExternalLink(
    title: string,
    url: string,
    type: ExternalLink['type'],
    metadata?: ExternalLink['metadata']
  ): ExternalLink {
    return {
      id: this.generateId(),
      title,
      url: this.validateUrl(url),
      type,
      metadata,
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

/**
 * React hook for browser functionality
 */
export function useMobileBrowser() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [currentUrl, setCurrentUrl] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<string[]>([]);

  const browserService = MobileBrowserService.getInstance();

  React.useEffect(() => {
    const checkBrowserStatus = () => {
      setIsOpen(browserService.isBrowserOpen());
      setCurrentUrl(browserService.getCurrentUrl());
      setHistory(browserService.getHistory());
    };

    // Check status periodically
    const interval = setInterval(checkBrowserStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  const openUrl = async (url: string, options?: BrowserOptions) => {
    await browserService.openUrl(url, options);
    setIsOpen(true);
    setCurrentUrl(url);
    setHistory(browserService.getHistory());
  };

  const close = async () => {
    await browserService.close();
    setIsOpen(false);
    setCurrentUrl(null);
  };

  const openPropertyWebsite = async (propertyUrl: string, propertyId?: string) => {
    await browserService.openPropertyWebsite(propertyUrl, propertyId);
    setIsOpen(true);
    setCurrentUrl(propertyUrl);
    setHistory(browserService.getHistory());
  };

  const openAgencyWebsite = async (agencyUrl: string, agencyId?: string) => {
    await browserService.openAgencyWebsite(agencyUrl, agencyId);
    setIsOpen(true);
    setCurrentUrl(agencyUrl);
    setHistory(browserService.getHistory());
  };

  const openMapLocation = async (latitude: number, longitude: number, address?: string) => {
    const mapUrl = `geo:${latitude},${longitude}`;
    await browserService.openMapLocation(latitude, longitude, address);
    setIsOpen(true);
    setCurrentUrl(mapUrl);
    setHistory(browserService.getHistory());
  };

  const openDocument = async (documentUrl: string, documentName?: string) => {
    await browserService.openDocument(documentUrl, documentName);
    setIsOpen(true);
    setCurrentUrl(documentUrl);
    setHistory(browserService.getHistory());
  };

  const openSocialLink = async (platform: 'facebook' | 'twitter' | 'instagram' | 'linkedin', username: string) => {
    await browserService.openSocialLink(platform, username);
    setIsOpen(true);
    const socialUrls = {
      facebook: `https://www.facebook.com/${username}`,
      twitter: `https://twitter.com/${username}`,
      instagram: `https://www.instagram.com/${username}`,
      linkedin: `https://www.linkedin.com/in/${username}`,
    };
    setCurrentUrl(socialUrls[platform]);
    setHistory(browserService.getHistory());
  };

  const shareCurrentPage = async () => {
    return await browserService.shareCurrentPage();
  };

  const clearHistory = () => {
    browserService.clearHistory();
    setHistory([]);
  };

  const createExternalLink = (
    title: string,
    url: string,
    type: ExternalLink['type'],
    metadata?: ExternalLink['metadata']
  ) => {
    return browserService.createExternalLink(title, url, type, metadata);
  };

  return {
    isOpen,
    currentUrl,
    history,
    openUrl,
    close,
    openPropertyWebsite,
    openAgencyWebsite,
    openMapLocation,
    openDocument,
    openSocialLink,
    shareCurrentPage,
    clearHistory,
    createExternalLink,
  };
}