/**
 * Mobile Navigation Handler for Mon Toit App
 *
 * This file contains utilities for handling mobile-specific navigation,
 * back button management, and action buttons in the Capacitor environment.
 */

import { Capacitor, App as CapacitorApp } from '@capacitor/app';
import { StatusBar } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';

export interface NavigationState {
  canGoBack: boolean;
  currentRoute: string;
  previousRoute: string | null;
  navigationHistory: string[];
  isModalOpen: boolean;
  isKeyboardVisible: boolean;
}

export interface MobileNavigationConfig {
  enableHaptics: boolean;
  enableBackButton: boolean;
  enableSwipeGestures: boolean;
  customBackButtonHandler?: (route: string) => boolean;
}

/**
 * Mobile Navigation Hook
 */
export function useMobileNavigation(config: MobileNavigationConfig = {
  enableHaptics: true,
  enableBackButton: true,
  enableSwipeGestures: true,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [navigationState, setNavigationState] = useState<NavigationState>({
    canGoBack: false,
    currentRoute: location.pathname,
    previousRoute: null,
    navigationHistory: [location.pathname],
    isModalOpen: false,
    isKeyboardVisible: false,
  });

  /**
   * Trigger haptic feedback
   */
  const triggerHaptics = useCallback(async (style: ImpactStyle = ImpactStyle.Light) => {
    if (config.enableHaptics && Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    }
  }, [config.enableHaptics]);

  /**
   * Handle back button press
   */
  const handleBackButton = useCallback(async () => {
    if (!config.enableBackButton || !Capacitor.isNativePlatform()) {
      return false;
    }

    const currentState = navigationState;

    // Handle custom back button handler first
    if (config.customBackButtonHandler) {
      const handled = config.customBackButtonHandler(currentState.currentRoute);
      if (handled) {
        await triggerHaptics(ImpactStyle.Medium);
        return true;
      }
    }

    // Handle modal states
    if (currentState.isModalOpen) {
      // Close modal first
      setNavigationState(prev => ({ ...prev, isModalOpen: false }));
      await triggerHaptics(ImpactStyle.Light);
      return true;
    }

    // Handle keyboard visibility
    if (currentState.isKeyboardVisible) {
      try {
        await Keyboard.hide();
        setNavigationState(prev => ({ ...prev, isKeyboardVisible: false }));
        await triggerHaptics(ImpactStyle.Light);
        return true;
      } catch (error) {
        console.warn('Failed to hide keyboard:', error);
      }
    }

    // Handle navigation history
    if (currentState.navigationHistory.length > 1) {
      // Go back to previous route
      const history = [...currentState.navigationHistory];
      history.pop(); // Remove current route
      const previousRoute = history[history.length - 1];

      navigate(previousRoute);
      await triggerHaptics(ImpactStyle.Medium);
      return true;
    }

    // If at root, try to exit app
    if (currentState.currentRoute === '/' || currentState.currentRoute === '/accueil') {
      try {
        await CapacitorApp.exitApp();
        return true;
      } catch (error) {
        console.warn('Failed to exit app:', error);
      }
    }

    return false;
  }, [navigationState, config, navigate, triggerHaptics]);

  /**
   * Navigate to a new route
   */
  const mobileNavigate = useCallback(async (to: string, options?: {
    replace?: boolean;
    state?: any;
    triggerHaptics?: boolean;
  }) => {
    const currentRoute = location.pathname;

    // Update navigation state
    setNavigationState(prev => {
      const newHistory = options?.replace
        ? [...prev.navigationHistory.slice(0, -1), to]
        : [...prev.navigationHistory, to];

      return {
        ...prev,
        currentRoute: to,
        previousRoute: currentRoute,
        navigationHistory: newHistory,
        canGoBack: newHistory.length > 1,
      };
    });

    // Navigate
    if (options?.replace) {
      navigate(to, { replace: true, state: options.state });
    } else {
      navigate(to, { state: options.state });
    }

    // Trigger haptics if enabled
    if (options?.triggerHaptics !== false) {
      await triggerHaptics(ImpactStyle.Light);
    }
  }, [location.pathname, navigate, triggerHaptics]);

  /**
   * Go back programmatically
   */
  const goBack = useCallback(async () => {
    await handleBackButton();
  }, [handleBackButton]);

  /**
   * Reset navigation history
   */
  const resetNavigation = useCallback(() => {
    setNavigationState({
      canGoBack: false,
      currentRoute: location.pathname,
      previousRoute: null,
      navigationHistory: [location.pathname],
      isModalOpen: false,
      isKeyboardVisible: false,
    });
  }, [location.pathname]);

  /**
   * Set modal state
   */
  const setModalOpen = useCallback((isOpen: boolean) => {
    setNavigationState(prev => ({ ...prev, isModalOpen: isOpen }));
  }, []);

  // Initialize event listeners
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Handle back button
    const backButtonListener = CapacitorApp.addListener('backButton', async (event) => {
      const handled = await handleBackButton();
      if (!handled) {
        // Let default behavior happen
        event.preventDefault = false;
      }
    });

    // Handle app state changes
    const appStateChangeListeners = [
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          // App came to foreground
          console.log('App is active');
        } else {
          // App went to background
          console.log('App is inactive');
        }
      }),
      CapacitorApp.addListener('urlOpen', ({ url }) => {
        console.log('App opened with URL:', url);
        // Handle deep linking
        if (url.includes('montoit')) {
          const path = url.replace(/^[^:]*:\/\//, '').replace(/^montoit\/?/, '');
          mobileNavigate('/' + path, { triggerHaptics: true });
        }
      }),
    ];

    // Handle keyboard events
    const keyboardListeners = [
      Keyboard.addListener('keyboardWillShow', () => {
        setNavigationState(prev => ({ ...prev, isKeyboardVisible: true }));
      }),
      Keyboard.addListener('keyboardWillHide', () => {
        setNavigationState(prev => ({ ...prev, isKeyboardVisible: false }));
      }),
    ];

    // Cleanup listeners
    return () => {
      backButtonListener.remove();
      appStateChangeListeners.forEach(listener => listener.remove());
      keyboardListeners.forEach(listener => listener.remove());
    };
  }, [handleBackButton, mobileNavigate]);

  // Update navigation state when location changes
  useEffect(() => {
    setNavigationState(prev => ({
      ...prev,
      currentRoute: location.pathname,
      canGoBack: prev.navigationHistory.length > 1,
    }));
  }, [location.pathname]);

  return {
    navigationState,
    mobileNavigate,
    goBack,
    resetNavigation,
    setModalOpen,
    triggerHaptics,
  };
}

/**
 * Bottom Navigation Component Hook
 */
export function useBottomNavigation() {
  const [isVisible, setIsVisible] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const showBottomNavigation = useCallback(() => {
    setIsVisible(true);
  }, []);

  const hideBottomNavigation = useCallback(() => {
    setIsVisible(false);
  }, []);

  const setActiveTabWithHaptics = useCallback(async (tabIndex: number) => {
    setActiveTab(tabIndex);

    if (Capacitor.isNativePlatform()) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.warn('Haptics not available:', error);
      }
    }
  }, []);

  return {
    isVisible,
    activeTab,
    showBottomNavigation,
    hideBottomNavigation,
    setActiveTab: setActiveTabWithHaptics,
  };
}

/**
 * Mobile Action Button Hook
 */
export function useMobileActionButtons() {
  const [actions, setActions] = useState<Array<{
    id: string;
    label: string;
    icon: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>>([]);

  const addAction = useCallback((action: {
    id: string;
    label: string;
    icon: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }) => {
    setActions(prev => [...prev.filter(a => a.id !== action.id), action]);
  }, []);

  const removeAction = useCallback((id: string) => {
    setActions(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearActions = useCallback(() => {
    setActions([]);
  }, []);

  return {
    actions,
    addAction,
    removeAction,
    clearActions,
  };
}

/**
 * Swipe Gesture Hook for mobile navigation
 */
export function useSwipeGestures(onSwipeLeft?: () => void, onSwipeRight?: () => void) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart.x - touchEnd.x;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }

    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  }, [touchStart, touchEnd, minSwipeDistance, onSwipeLeft, onSwipeRight]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}

/**
 * Mobile Navigation Provider Component
 */
export function MobileNavigationProvider({
  children,
  config
}: {
  children: React.ReactNode;
  config?: MobileNavigationConfig;
}) {
  const navigation = useMobileNavigation(config);

  return (
    <div className="mobile-navigation-container">
      {children}
    </div>
  );
}