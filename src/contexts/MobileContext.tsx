import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Property } from '@/types';

export type MobileViewType = 'search' | 'browse' | 'favorites' | 'profile' | 'map';
export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

interface MobileContextType {
  // View management
  currentView: MobileViewType;
  setCurrentView: (view: MobileViewType) => void;
  previousView: MobileViewType | null;

  // Property browsing
  browseIndex: number;
  setBrowseIndex: (index: number) => void;
  swipeHistory: Array<{ propertyId: string; direction: SwipeDirection; timestamp: number }>;

  // Favorites
  favoriteProperties: Set<string>;
  toggleFavorite: (propertyId: string) => void;
  isFavorite: (propertyId: string) => boolean;

  // Search state
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchHistory: string[];
  addToSearchHistory: (query: string) => void;

  // Swipe interface
  isSwipeMode: boolean;
  setIsSwipeMode: (enabled: boolean) => void;
  swipeQueue: Property[];
  setSwipeQueue: (properties: Property[]) => void;

  // Bottom sheets
  activeBottomSheet: string | null;
  openBottomSheet: (sheetId: string) => void;
  closeBottomSheet: () => void;

  // Quick actions
  quickActions: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    action: () => void;
  }>;
  addQuickAction: (action: any) => void;

  // Notifications
  notificationCount: number;
  setNotificationCount: (count: number) => void;

  // Gestures
  lastSwipeAction: { direction: SwipeDirection; timestamp: number } | null;
  recordSwipeAction: (direction: SwipeDirection) => void;
}

const STORAGE_KEY = 'mon-toit-mobile-state';

const MobileContext = createContext<MobileContextType | undefined>(undefined);

export const MobileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // View management
  const [currentView, setCurrentViewState] = useState<MobileViewType>('search');
  const [previousView, setPreviousView] = useState<MobileViewType | null>(null);

  // Property browsing
  const [browseIndex, setBrowseIndex] = useState(0);
  const [swipeHistory, setSwipeHistory] = useState<Array<{ propertyId: string; direction: SwipeDirection; timestamp: number }>>([]);

  // Favorites
  const [favoriteProperties, setFavoriteProperties] = useState<Set<string>>(new Set());

  // Search state
  const [searchQuery, setSearchQueryState] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Swipe interface
  const [isSwipeMode, setIsSwipeModeState] = useState(false);
  const [swipeQueue, setSwipeQueueState] = useState<Property[]>([]);

  // Bottom sheets
  const [activeBottomSheet, setActiveBottomSheet] = useState<string | null>(null);

  // Quick actions
  const [quickActions, setQuickActions] = useState<Array<any>>([]);

  // Notifications
  const [notificationCount, setNotificationCountState] = useState(0);

  // Gestures
  const [lastSwipeAction, setLastSwipeAction] = useState<{ direction: SwipeDirection; timestamp: number } | null>(null);

  // Load state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFavoriteProperties(new Set(parsed.favoriteProperties || []));
        setSearchHistory(parsed.searchHistory || []);
        setNotificationCountState(parsed.notificationCount || 0);
      }
    } catch (error) {
      console.debug('Failed to load mobile state:', error);
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    try {
      const stateToSave = {
        favoriteProperties: Array.from(favoriteProperties),
        searchHistory,
        notificationCount
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.debug('Failed to save mobile state:', error);
    }
  }, [favoriteProperties, searchHistory, notificationCount]);

  // View management
  const setCurrentView = useCallback((view: MobileViewType) => {
    setPreviousView(currentView);
    setCurrentViewState(view);
  }, [currentView]);

  // Favorites management
  const toggleFavorite = useCallback((propertyId: string) => {
    setFavoriteProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });
  }, []);

  const isFavorite = useCallback((propertyId: string) => {
    return favoriteProperties.has(propertyId);
  }, [favoriteProperties]);

  // Search management
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
    if (query.trim() && !searchHistory.includes(query.trim())) {
      addToSearchHistory(query.trim());
    }
  }, [searchHistory]);

  const addToSearchHistory = useCallback((query: string) => {
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item !== query);
      return [query, ...filtered].slice(0, 10); // Keep last 10 searches
    });
  }, []);

  // Swipe interface
  const setIsSwipeMode = useCallback((enabled: boolean) => {
    setIsSwipeModeState(enabled);
    if (enabled) {
      setCurrentView('browse');
    }
  }, [setCurrentView]);

  const setSwipeQueue = useCallback((properties: Property[]) => {
    setSwipeQueueState(properties);
    setBrowseIndex(0);
  }, []);

  // Bottom sheets
  const openBottomSheet = useCallback((sheetId: string) => {
    setActiveBottomSheet(sheetId);
  }, []);

  const closeBottomSheet = useCallback(() => {
    setActiveBottomSheet(null);
  }, []);

  // Quick actions
  const addQuickAction = useCallback((action: any) => {
    setQuickActions(prev => [...prev, action]);
  }, []);

  // Gestures
  const recordSwipeAction = useCallback((direction: SwipeDirection) => {
    setLastSwipeAction({
      direction,
      timestamp: Date.now()
    });

    if (swipeQueue[browseIndex]) {
      setSwipeHistory(prev => [
        {
          propertyId: swipeQueue[browseIndex].id,
          direction,
          timestamp: Date.now()
        },
        ...prev.slice(0, 49) // Keep last 50 actions
      ]);
    }
  }, [swipeQueue, browseIndex]);

  const value: MobileContextType = {
    // View management
    currentView,
    setCurrentView,
    previousView,

    // Property browsing
    browseIndex,
    setBrowseIndex,
    swipeHistory,

    // Favorites
    favoriteProperties,
    toggleFavorite,
    isFavorite,

    // Search state
    searchQuery,
    setSearchQuery,
    searchHistory,
    addToSearchHistory,

    // Swipe interface
    isSwipeMode,
    setIsSwipeMode,
    swipeQueue,
    setSwipeQueue,

    // Bottom sheets
    activeBottomSheet,
    openBottomSheet,
    closeBottomSheet,

    // Quick actions
    quickActions,
    addQuickAction,

    // Notifications
    notificationCount,
    setNotificationCount,

    // Gestures
    lastSwipeAction,
    recordSwipeAction
  };

  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobile = () => {
  const context = useContext(MobileContext);
  if (context === undefined) {
    throw new Error('useMobile must be used within a MobileProvider');
  }
  return context;
};

// Hook for managing mobile swipe interface
export const useMobileSwipe = (properties: Property[]) => {
  const {
    browseIndex,
    setBrowseIndex,
    swipeQueue,
    setSwipeQueue,
    recordSwipeAction,
    toggleFavorite,
    isFavorite
  } = useMobile();

  // Initialize queue when properties change
  useEffect(() => {
    if (properties && properties.length > 0) {
      setSwipeQueue(properties);
    }
  }, [properties, setSwipeQueue]);

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    recordSwipeAction(direction);

    switch (direction) {
      case 'left':
        // Add to favorites
        if (swipeQueue[browseIndex]) {
          toggleFavorite(swipeQueue[browseIndex].id);
        }
        // fall through to next property
      case 'right':
        // Next property
        if (browseIndex < swipeQueue.length - 1) {
          setBrowseIndex(browseIndex + 1);
        }
        break;
      case 'up':
        // Super like (add to favorites and next)
        if (swipeQueue[browseIndex]) {
          toggleFavorite(swipeQueue[browseIndex].id);
        }
        if (browseIndex < swipeQueue.length - 1) {
          setBrowseIndex(browseIndex + 1);
        }
        break;
      case 'down':
        // Previous property (if available)
        if (browseIndex > 0) {
          setBrowseIndex(browseIndex - 1);
        }
        break;
    }
  }, [browseIndex, swipeQueue, recordSwipeAction, toggleFavorite, setBrowseIndex]);

  const currentProperty = swipeQueue[browseIndex] || null;
  const hasMore = browseIndex < swipeQueue.length - 1;
  const canGoBack = browseIndex > 0;

  return {
    currentProperty,
    currentIndex: browseIndex,
    total: swipeQueue.length,
    hasMore,
    canGoBack,
    handleSwipe,
    isFavorite: currentProperty ? isFavorite(currentProperty.id) : false
  };
};

export default MobileContext;