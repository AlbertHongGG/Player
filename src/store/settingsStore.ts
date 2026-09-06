import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listen } from "@tauri-apps/api/event";

export interface SettingsStore {
  autoPlayNext: boolean;
  isImmersive: boolean;
  showTooltips: boolean;
  setAutoPlayNext: (val: boolean) => void;
  setIsImmersive: (val: boolean) => void;
  toggleImmersive: () => void;
  setShowTooltips: (val: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      autoPlayNext: true,
      isImmersive: false,
      showTooltips: true,
      setAutoPlayNext: (autoPlayNext) => set({ autoPlayNext }),
      setIsImmersive: (isImmersive) => set({ isImmersive }),
      toggleImmersive: () => set((state) => ({ isImmersive: !state.isImmersive })),
      setShowTooltips: (showTooltips) => set({ showTooltips }),
    }),
    {
      name: "anime_player_settings",
    }
  )
);

// Cross-window multi-view synchronization
if (typeof window !== "undefined") {
  // Sync on native storage changes
  window.addEventListener("storage", (e) => {
    if (e.key === "anime_player_settings") {
      useSettingsStore.persist.rehydrate();
    }
  });

  // Sync on Tauri IPC event across webviews
  listen("setting-changed", () => {
    useSettingsStore.persist.rehydrate();
  }).catch((err) => {
    console.warn("Could not register setting-changed listener:", err);
  });
}
