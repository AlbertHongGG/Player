import { create } from "zustand";

interface UiStore {
  isNearTop: boolean;
  isNearBottom: boolean;
  isTopHovered: boolean;
  isBottomHovered: boolean;
  isCursorHidden: boolean;
  setIsNearTop: (val: boolean) => void;
  setIsNearBottom: (val: boolean) => void;
  setIsTopHovered: (val: boolean) => void;
  setIsBottomHovered: (val: boolean) => void;
  setIsCursorHidden: (val: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  isNearTop: false,
  isNearBottom: false,
  isTopHovered: false,
  isBottomHovered: false,
  isCursorHidden: false,

  setIsNearTop: (isNearTop) => set({ isNearTop }),
  setIsNearBottom: (isNearBottom) => set({ isNearBottom }),
  setIsTopHovered: (isTopHovered) => set({ isTopHovered }),
  setIsBottomHovered: (isBottomHovered) => set({ isBottomHovered }),
  setIsCursorHidden: (isCursorHidden) => set({ isCursorHidden }),
}));
