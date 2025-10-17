import { useCallback, useRef, useEffect, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useMobile, SwipeDirection } from '@/contexts/MobileContext';
import { triggerHapticFeedback } from '@/utils/haptics';

interface UseMobileGesturesOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onLongPress?: () => void;
  threshold?: number;
  preventDefaultTouchmoveEvent?: boolean;
  trackMouse?: boolean;
}

/**
 * Hook for managing mobile gestures with haptic feedback
 */
export const useMobileGestures = (options: UseMobileGesturesOptions = {}) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onLongPress,
    threshold = 50,
    preventDefaultTouchmoveEvent = false,
    trackMouse = false
  } = options;

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressing = useRef(false);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (onSwipeLeft) {
        triggerHapticFeedback('medium');
        onSwipeLeft();
      }
    },
    onSwipedRight: () => {
      if (onSwipeRight) {
        triggerHapticFeedback('medium');
        onSwipeRight();
      }
    },
    onSwipedUp: () => {
      if (onSwipeUp) {
        triggerHapticFeedback('medium');
        onSwipeUp();
      }
    },
    onSwipedDown: () => {
      if (onSwipeDown) {
        triggerHapticFeedback('medium');
        onSwipeDown();
      }
    },
    onTap: () => {
      if (onTap && !isLongPressing.current) {
        triggerHapticFeedback('light');
        onTap();
      }
    },
    onTouchStartOrOnMouseDown: (e) => {
      if (onLongPress) {
        isLongPressing.current = false;
        longPressTimer.current = setTimeout(() => {
          isLongPressing.current = true;
          triggerHapticFeedback('heavy');
          onLongPress();
        }, 500); // 500ms for long press
      }
    },
    onTouchEndOrOnMouseUp: () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    },
    delta: threshold,
    preventDefaultTouchmoveEvent,
    trackMouse
  });

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, []);

  return {
    handlers,
    isLongPressing: () => isLongPressing.current
  };
};

/**
 * Hook for pull-to-refresh functionality
 */
export const usePullToRefresh = (onRefresh: () => Promise<void> | void) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const currentY = useRef(0);
  const pullDistance = useRef(0);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isPulling && window.scrollY === 0) {
      currentY.current = e.touches[0].clientY;
      pullDistance.current = currentY.current - startY.current;

      if (pullDistance.current > 0) {
        e.preventDefault();
        const threshold = 80;

        // Add visual feedback based on pull distance
        if (pullDistance.current > threshold) {
          triggerHapticFeedback('light');
        }
      }
    }
  }, [isPulling]);

  const handleTouchEnd = useCallback(async () => {
    if (isPulling) {
      const threshold = 80;

      if (pullDistance.current > threshold && !isRefreshing) {
        setIsRefreshing(true);
        triggerHapticFeedback('medium');

        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }

      // Reset
      pullDistance.current = 0;
      setIsPulling(false);
    }
  }, [isPulling, isRefreshing, onRefresh]);

  useEffect(() => {
    const element = document.documentElement;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isPulling,
    isRefreshing,
    pullDistance: pullDistance.current
  };
};

/**
 * Hook for swipe navigation between pages/sections
 */
export const useSwipeNavigation = (pages: string[], currentPage: string, onPageChange: (page: string) => void) => {
  const currentIndex = pages.indexOf(currentPage);

  const handleSwipeLeft = useCallback(() => {
    if (currentIndex < pages.length - 1) {
      const nextPage = pages[currentIndex + 1];
      onPageChange(nextPage);
    }
  }, [currentIndex, pages, onPageChange]);

  const handleSwipeRight = useCallback(() => {
    if (currentIndex > 0) {
      const prevPage = pages[currentIndex - 1];
      onPageChange(prevPage);
    }
  }, [currentIndex, pages, onPageChange]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: handleSwipeLeft,
    onSwipedRight: handleSwipeRight,
    preventDefaultTouchmoveEvent: true,
    trackMouse: false,
    delta: 50
  });

  return {
    swipeHandlers,
    canSwipeLeft: currentIndex < pages.length - 1,
    canSwipeRight: currentIndex > 0
  };
};

/**
 * Hook for property-specific gestures
 */
export const usePropertyGestures = (propertyId: string, propertyIndex: number) => {
  const {
    recordSwipeAction,
    toggleFavorite,
    isFavorite,
    setIsSwipeMode,
    openBottomSheet
  } = useMobile();

  const handleSwipeLeft = useCallback(() => {
    recordSwipeAction('left');
    toggleFavorite(propertyId);
  }, [recordSwipeAction, toggleFavorite, propertyId]);

  const handleSwipeRight = useCallback(() => {
    recordSwipeAction('right');
    // Navigate to next property or handle pass
  }, [recordSwipeAction]);

  const handleSwipeUp = useCallback(() => {
    recordSwipeAction('up');
    toggleFavorite(propertyId); // Super-like
    openBottomSheet('property-actions');
  }, [recordSwipeAction, toggleFavorite, propertyId, openBottomSheet]);

  const handleLongPress = useCallback(() => {
    openBottomSheet('property-preview');
  }, [openBottomSheet]);

  const swipeHandlers = useMobileGestures({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    onSwipeUp: handleSwipeUp,
    onLongPress: handleLongPress,
    threshold: 100
  });

  return {
    ...swipeHandlers,
    isFavorite: isFavorite(propertyId),
    propertyIndex
  };
};

export default useMobileGestures;