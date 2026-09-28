import { create } from "zustand";
import { persist } from "zustand/middleware";
import { listen } from "@tauri-apps/api/event";

export interface SettingsStore {
  autoPlayNext: boolean;
  defaultImmersive: boolean;
  showTooltips: boolean;
  enableTimelineHoverPreview: boolean;
  setAutoPlayNext: (val: boolean) => void;
  setDefaultImmersive: (val: boolean) => void;
  setShowTooltips: (val: boolean) => void;
  setEnableTimelineHoverPreview: (val: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      autoPlayNext: true,
      defaultImmersive: false,
      showTooltips: true,
      enableTimelineHoverPreview: true,
      setAutoPlayNext: (autoPlayNext) => set({ autoPlayNext }),
      setDefaultImmersive: (defaultImmersive) => set({ defaultImmersive }),
      setShowTooltips: (showTooltips) => set({ showTooltips }),
      setEnableTimelineHoverPreview: (enableTimelineHoverPreview) => set({ enableTimelineHoverPreview }),
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
