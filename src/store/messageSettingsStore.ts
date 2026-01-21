import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MessageSettingsState {
  soundEnabled: boolean;
  soundVolume: number;

  setSoundEnabled: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  toggleSound: () => void;
}

export const useMessageSettingsStore = create<MessageSettingsState>()(
  persist(
    (set) => ({
      soundEnabled: true,
      soundVolume: 0.7,

      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setSoundVolume: (volume) => set({ soundVolume: Math.max(0, Math.min(1, volume)) }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
    }),
    {
      name: 'message-settings',
    }
  )
);
