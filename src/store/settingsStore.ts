import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  autoPlayNext: boolean;
  isImmersive: boolean;
  setAutoPlayNext: (val: boolean) => void;
  setIsImmersive: (val: boolean) => void;
  toggleImmersive: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      autoPlayNext: true,
      isImmersive: false,
      setAutoPlayNext: (autoPlayNext) => set({ autoPlayNext }),
      setIsImmersive: (isImmersive) => set({ isImmersive }),
      toggleImmersive: () => set((state) => ({ isImmersive: !state.isImmersive })),
    }),
    {
      name: "anime_player_settings",
    }
  )
);
