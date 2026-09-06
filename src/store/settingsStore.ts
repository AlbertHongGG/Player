import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SettingsStore {
  autoPlayNext: boolean;
  setAutoPlayNext: (val: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      autoPlayNext: true,
      setAutoPlayNext: (autoPlayNext) => set({ autoPlayNext }),
    }),
    {
      name: "anime_player_settings",
    }
  )
);
