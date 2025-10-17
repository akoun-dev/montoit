/**
 * WCAG 2.2 Accessibility Utilities
 * Helper functions for enhanced accessibility compliance
 */

/**
 * Focus management utilities
 */
export class FocusManager {
  /**
   * Trap focus within a container element
   */
  static trapFocus(element: HTMLElement): () => void {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    element.addEventListener('keydown', handleTabKey);
    firstElement.focus();

    return () => {
      element.removeEventListener('keydown', handleTabKey);
    };
  }

  /**
   * Announce message to screen readers
   */
  static announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;

    document.body.appendChild(announcer);

    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }

  /**
   * Set focus to element with proper scroll management
   */
  static setFocusWithScroll(element: HTMLElement): void {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });

    setTimeout(() => {
      element.focus();
    }, 100);
  }
}

/**
 * Keyboard navigation utilities
 */
export class KeyboardNavigation {
  /**
   * Handle escape key press
   */
  static onEscape(callback: () => void): () => void {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }

  /**
   * Handle keyboard shortcuts
   */
  static registerShortcuts(shortcuts: Record<string, () => void>): () => void {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const alt = e.altKey;
      const shift = e.shiftKey;

      const shortcutKey = [
        ctrl && 'ctrl',
        alt && 'alt',
        shift && 'shift',
        key
      ].filter(Boolean).join('+');

      if (shortcuts[shortcutKey]) {
        e.preventDefault();
        shortcuts[shortcutKey]();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }
}

/**
 * Color contrast utilities
 */
export class ColorContrast {
  /**
   * Calculate relative luminance of a color
   */
  static getLuminance(hex: string): number {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;

    const [r, g, b] = rgb.map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Calculate contrast ratio between two colors
   */
  static getContrastRatio(color1: string, color2: string): number {
    const lum1 = this.getLuminance(color1);
    const lum2 = this.getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Check if contrast meets WCAG AA standards
   */
  static meetsWCAG_AA(foreground: string, background: string, large: boolean = false): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return ratio >= (large ? 3 : 4.5);
  }

  /**
   * Check if contrast meets WCAG AAA standards
   */
  static meetsWCAG_AAA(foreground: string, background: string, large: boolean = false): boolean {
    const ratio = this.getContrastRatio(foreground, background);
    return ratio >= (large ? 4.5 : 7);
  }

  /**
   * Convert hex color to RGB
   */
  private static hexToRgb(hex: string): [number, number, number] | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  }
}

/**
 * Form accessibility utilities
 */
export class FormAccessibility {
  /**
   * Generate unique ID for form elements
   */
  static generateId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup error message for form field
   */
  static setupFieldError(input: HTMLInputElement, message: string): void {
    const id = this.generateId('error');
    const errorElement = document.createElement('div');
    errorElement.id = id;
    errorElement.className = 'error-message';
    errorElement.setAttribute('role', 'alert');
    errorElement.textContent = message;

    input.setAttribute('aria-describedby', id);
    input.setAttribute('aria-invalid', 'true');

    input.parentNode?.insertBefore(errorElement, input.nextSibling);
  }

  /**
   * Clear field error
   */
  static clearFieldError(input: HTMLInputElement): void {
    const describedBy = input.getAttribute('aria-describedby');
    if (describedBy) {
      const errorElement = document.getElementById(describedBy);
      if (errorElement) {
        errorElement.remove();
      }
    }

    input.removeAttribute('aria-describedby');
    input.removeAttribute('aria-invalid');
  }

  /**
   * Setup field description
   */
  static setupFieldDescription(input: HTMLInputElement, description: string): void {
    const id = this.generateId('desc');
    const descElement = document.createElement('div');
    descElement.id = id;
    descElement.className = 'sr-only';
    descElement.textContent = description;

    input.setAttribute('aria-describedby', id);

    input.parentNode?.insertBefore(descElement, input);
  }
}

/**
 * Screen reader utilities
 */
export class ScreenReader {
  /**
   * Create live region for dynamic content announcements
   */
  static createLiveRegion(priority: 'polite' | 'assertive' = 'polite'): HTMLElement {
    const region = document.createElement('div');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    return region;
  }

  /**
   * Announce page changes to screen readers
   */
  static announcePageChange(title: string): void {
    // Update page title
    document.title = title;

    // Announce to screen readers
    FocusManager.announceToScreenReader(`Page changed: ${title}`);
  }

  /**
   * Announce loading state
   */
  static announceLoading(isLoading: boolean): void {
    const message = isLoading ? 'Loading content' : 'Content loaded';
    FocusManager.announceToScreenReader(message);
  }

  /**
   * Announce form validation errors
   */
  static announceFormErrors(errors: string[]): void {
    if (errors.length === 0) return;

    const message = `Form validation errors: ${errors.join(', ')}`;
    FocusManager.announceToScreenReader(message, 'assertive');
  }
}

/**
 * Motion preferences utilities
 */
export class MotionPreferences {
  /**
   * Check if user prefers reduced motion
   */
  static prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Check if user prefers high contrast
   */
  static prefersHighContrast(): boolean {
    return window.matchMedia('(prefers-contrast: high)').matches;
  }

  /**
   * Get user's preferred color scheme
   */
  static prefersColorScheme(): 'light' | 'dark' | 'no-preference' {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'no-preference';
  }

  /**
   * Listen for preference changes
   */
  static listenForChanges(callback: () => void): () => void {
    const mediaQueries = [
      '(prefers-reduced-motion: reduce)',
      '(prefers-contrast: high)',
      '(prefers-color-scheme: dark)',
      '(prefers-color-scheme: light)'
    ];

    const handlers = mediaQueries.map(mq => {
      const mediaQuery = window.matchMedia(mq);
      mediaQuery.addEventListener('change', callback);
      return () => mediaQuery.removeEventListener('change', callback);
    });

    return () => handlers.forEach(handler => handler());
  }
}

/**
 * Skip links utilities
 */
export class SkipLinks {
  /**
   * Create skip links for keyboard navigation
   */
  static createSkipLinks(links: Array<{ href: string; text: string }>): HTMLElement {
    const container = document.createElement('div');
    container.className = 'skip-links';
    container.setAttribute('role', 'navigation');
    container.setAttribute('aria-label', 'Skip navigation links');

    links.forEach(link => {
      const skipLink = document.createElement('a');
      skipLink.href = link.href;
      skipLink.textContent = link.text;
      skipLink.className = 'skip-to-main';
      container.appendChild(skipLink);
    });

    return container;
  }

  /**
   * Add skip links to page
   */
  static addToPage(links: Array<{ href: string; text: string }>): void {
    const skipLinks = this.createSkipLinks(links);
    document.body.insertBefore(skipLinks, document.body.firstChild);
  }
}

/**
 * ARIA utilities
 */
export class ARIAUtils {
  /**
   * Setup ARIA attributes for dynamic content
   */
  static setupDynamicContent(element: HTMLElement, isLive: boolean = false): void {
    if (isLive) {
      element.setAttribute('aria-live', 'polite');
      element.setAttribute('aria-atomic', 'true');
    }

    element.setAttribute('role', 'region');
    element.setAttribute('aria-label', 'Dynamic content');
  }

  /**
   * Setup ARIA for progress indicators
   */
  static setupProgress(element: HTMLElement, value: number, max: number = 100): void {
    element.setAttribute('role', 'progressbar');
    element.setAttribute('aria-valuenow', value.toString());
    element.setAttribute('aria-valuemin', '0');
    element.setAttribute('aria-valuemax', max.toString());
    element.setAttribute('aria-label', `Progress: ${value}%`);
  }

  /**
   * Setup ARIA for tabs
   */
  static setupTabs(tabList: HTMLElement, tabPanels: HTMLElement[]): void {
    tabList.setAttribute('role', 'tablist');

    const tabs = tabList.querySelectorAll('[role="tab"]') as NodeListOf<HTMLElement>;
    tabs.forEach((tab, index) => {
      tab.setAttribute('aria-controls', tabPanels[index].id);
      tabPanels[index].setAttribute('role', 'tabpanel');
      tabPanels[index].setAttribute('aria-labelledby', tab.id);
    });
  }

  /**
   * Setup ARIA for modals
   */
  static setupModal(modal: HTMLElement, trigger: HTMLElement): void {
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', `${modal.id}-title`);

    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-expanded', 'false');
  }
}

// Export default accessibility manager
export default {
  FocusManager,
  KeyboardNavigation,
  ColorContrast,
  FormAccessibility,
  ScreenReader,
  MotionPreferences,
  SkipLinks,
  ARIAUtils
};