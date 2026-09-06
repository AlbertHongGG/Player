import { useEffect, useRef, useCallback } from "react";
import { useVideoStore } from "../store/videoStore";
import { useSettingsStore } from "../store/settingsStore";
import { usePlaylistStore } from "../store/playlistStore";
import { useUiStore } from "../store/uiStore";

export function useImmersiveHover(): void {
  const { isImmersive } = useSettingsStore();
  const { isPlaying, isFullscreen } = useVideoStore();
  const { setIsNearTop, setIsNearBottom, setIsCursorHidden } = useUiStore();

  const idleTimerRef = useRef<number | null>(null);

  const resetIdleTimer = useCallback(() => {
    setIsCursorHidden(false);
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }
    // Auto-hide cursor when video is actively playing and in immersive or fullscreen mode
    if (isPlaying && (isImmersive || isFullscreen)) {
      idleTimerRef.current = window.setTimeout(() => {
        const uiState = useUiStore.getState();
        // If user is actively hovering on the TitleBar or VideoControls, keep them visible
        if (!uiState.isTopHovered && !uiState.isBottomHovered) {
          setIsCursorHidden(true);
          setIsNearTop(false);
          setIsNearBottom(false);
        }
      }, 2500);
    }
  }, [isPlaying, isImmersive, isFullscreen, setIsCursorHidden, setIsNearTop, setIsNearBottom]);

  useEffect(() => {
    if (!isImmersive && !isFullscreen) {
      setIsNearTop(false);
      setIsNearBottom(false);
      setIsCursorHidden(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Expanded proximity zones: top TitleBar (48px + ~52px buffer), bottom VideoControls (72px + ~58px buffer)
      const topBoundary = 100;
      const bottomBoundary = window.innerHeight - 130;

      const isSidebarOpen = usePlaylistStore.getState().isSidebarOpen;
      const isInsideSidebar = isSidebarOpen && e.clientX >= window.innerWidth - 340;

      // When mouse is inside the playlist sidebar on the right, DO NOT trigger bottom controls
      setIsNearTop(e.clientY <= topBoundary && !isInsideSidebar);
      setIsNearBottom(e.clientY >= bottomBoundary && !isInsideSidebar);
      resetIdleTimer();
    };

    const handleMouseLeave = () => {
      setIsNearTop(false);
      setIsNearBottom(false);
      setIsCursorHidden(true);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);

    resetIdleTimer();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.documentElement.removeEventListener("mouseleave", handleMouseLeave);
      if (idleTimerRef.current !== null) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [isImmersive, isFullscreen, resetIdleTimer, setIsNearTop, setIsNearBottom, setIsCursorHidden]);
}
