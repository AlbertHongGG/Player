import { create } from "zustand";
import { useSettingsStore } from "./settingsStore";

interface UiStore {
  isSidebarOpen: boolean;
  isImmersive: boolean;
  isNearTop: boolean;
  isNearBottom: boolean;
  isTopHovered: boolean;
  isBottomHovered: boolean;
  isCursorHidden: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleImmersive: () => void;
  setIsImmersive: (isImmersive: boolean) => void;
  setIsNearTop: (val: boolean) => void;
  setIsNearBottom: (val: boolean) => void;
  setIsTopHovered: (val: boolean) => void;
  setIsBottomHovered: (val: boolean) => void;
  setIsCursorHidden: (val: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  isSidebarOpen: false,
  isImmersive: useSettingsStore.getState().defaultImmersive ?? false,
  isNearTop: false,
  isNearBottom: false,
  isTopHovered: false,
  isBottomHovered: false,
  isCursorHidden: false,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  toggleImmersive: () => set((state) => ({ isImmersive: !state.isImmersive })),
  setIsImmersive: (isImmersive) => set({ isImmersive }),
  setIsNearTop: (isNearTop) => set({ isNearTop }),
  setIsNearBottom: (isNearBottom) => set({ isNearBottom }),
  setIsTopHovered: (isTopHovered) => set({ isTopHovered }),
  setIsBottomHovered: (isBottomHovered) => set({ isBottomHovered }),
  setIsCursorHidden: (isCursorHidden) => set({ isCursorHidden }),
}));

if (typeof window !== "undefined") {
  useSettingsStore.persist.onFinishHydration((state) => {
    useUiStore.setState({ isImmersive: state.defaultImmersive });
  });
}
