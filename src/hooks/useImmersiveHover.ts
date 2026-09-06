import { useState, useEffect, useRef, useCallback } from "react";
import { useVideoStore } from "../store/videoStore";
import { useSettingsStore } from "../store/settingsStore";

interface UseImmersiveHoverReturn {
  isNearTop: boolean;
  isNearBottom: boolean;
  isIdle: boolean;
  isCursorHidden: boolean;
  setIsTopHovered: (val: boolean) => void;
  setIsBottomHovered: (val: boolean) => void;
}

export function useImmersiveHover(): UseImmersiveHoverReturn {
  const { isImmersive } = useSettingsStore();
  const { isPlaying, isFullscreen } = useVideoStore();

  const [mouseNearTop, setMouseNearTop] = useState(false);
  const [mouseNearBottom, setMouseNearBottom] = useState(false);
  const [isDirectTopHovered, setIsDirectTopHovered] = useState(false);
  const [isDirectBottomHovered, setIsDirectBottomHovered] = useState(false);
  const [isIdle, setIsIdle] = useState(false);

  const idleTimerRef = useRef<number | null>(null);

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }
    // Only auto-hide cursor/overlays when video is actively playing and in immersive or fullscreen mode
    if (isPlaying && (isImmersive || isFullscreen)) {
      idleTimerRef.current = window.setTimeout(() => {
        setIsIdle(true);
      }, 2500);
    }
  }, [isPlaying, isImmersive, isFullscreen]);

  useEffect(() => {
    if (!isImmersive && !isFullscreen) {
      setMouseNearTop(false);
      setMouseNearBottom(false);
      setIsIdle(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const topBoundary = 56;
      const bottomBoundary = window.innerHeight - 90;

      setMouseNearTop(e.clientY <= topBoundary);
      setMouseNearBottom(e.clientY >= bottomBoundary);
      resetIdleTimer();
    };

    const handleMouseLeave = () => {
      setMouseNearTop(false);
      setMouseNearBottom(false);
      setIsIdle(true);
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
  }, [isImmersive, isFullscreen, resetIdleTimer]);

  const isNearTop = (mouseNearTop || isDirectTopHovered) && !isIdle;
  const isNearBottom = (mouseNearBottom || isDirectBottomHovered) && !isIdle;
  const isCursorHidden = isIdle && !isNearTop && !isNearBottom && isPlaying;

  return {
    isNearTop,
    isNearBottom,
    isIdle,
    isCursorHidden,
    setIsTopHovered: setIsDirectTopHovered,
    setIsBottomHovered: setIsDirectBottomHovered,
  };
}
