import { useEffect } from "react";
import { usePlaylistStore } from "../store/playlistStore";
import { useSettingsStore } from "../store/settingsStore";

/**
 * Global application-level keyboard shortcuts.
 * Mounted at the root App component to guarantee availability regardless of player or route state.
 */
export function useGlobalHotkeys() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when focused inside text input/textarea/select
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // 'P' or 'p': Toggle playlist drawer / sidebar
      if ((e.key === "p" || e.key === "P") && !e.repeat) {
        e.preventDefault();
        usePlaylistStore.getState().toggleSidebar();
        return;
      }

      // 'I' or 'i': Toggle immersive mode
      if ((e.key === "i" || e.key === "I") && !e.repeat) {
        e.preventDefault();
        useSettingsStore.getState().toggleImmersive();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
