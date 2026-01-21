import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface Modal {
  id: string;
  isOpen: boolean;
  data?: unknown;
}

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Modals
  modals: Record<string, Modal>;
  openModal: (id: string, data?: unknown) => void;
  closeModal: (id: string) => void;
  isModalOpen: (id: string) => boolean;
  getModalData: <T = unknown>(id: string) => T | undefined;

  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Loading states
  globalLoading: boolean;
  setGlobalLoading: (loading: boolean) => void;

  // Theme (for future dark mode)
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Sidebar state
      sidebarOpen: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

      // Modals state
      modals: {},
      openModal: (id: string, data?: unknown) =>
        set((state) => ({
          modals: {
            ...state.modals,
            [id]: { id, isOpen: true, data },
          },
        })),
      closeModal: (id: string) =>
        set((state) => {
          const existingModal = state.modals[id];
          return {
            modals: {
              ...state.modals,
              [id]: {
                id,
                isOpen: false,
                data: existingModal?.data,
              },
            },
          };
        }),
      isModalOpen: (id: string) => {
        const modal = get().modals[id];
        return modal?.isOpen ?? false;
      },
      getModalData: <T = unknown>(id: string): T | undefined => {
        const modal = get().modals[id];
        return modal?.data as T | undefined;
      },

      // Notifications state
      notifications: [],
      addNotification: (notification) => {
        const id = Math.random().toString(36).substring(7);
        const newNotification = { ...notification, id };

        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        // Auto-remove notification after duration
        const duration = notification.duration ?? 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, duration);
        }
      },
      removeNotification: (id: string) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearNotifications: () => set({ notifications: [] }),

      // Global loading state
      globalLoading: false,
      setGlobalLoading: (loading: boolean) => set({ globalLoading: loading }),

      // Theme state
      theme: 'light',
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),
      setTheme: (theme: 'light' | 'dark') => set({ theme }),
    }),
    { name: 'UIStore' }
  )
);
