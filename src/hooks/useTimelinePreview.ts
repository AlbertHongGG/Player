import { useState, useRef, useCallback } from "react";
import { useSettingsStore } from "../store/settingsStore";
import { useVideoStore } from "../store/videoStore";
import { StoryboardEngine } from "../components/player/preview/StoryboardEngine";

interface UseTimelinePreviewOptions {
  duration: number;
}

/**
 * High-Performance 60fps Native Storyboard Timeline Hover Hook.
 * Calculates exact clamped coordinates and provides active storyboard track.
 */
export function useTimelinePreview({ duration }: UseTimelinePreviewOptions) {
  const isEnabled = useSettingsStore((state) => state.enableTimelineHoverPreview);
  const storyboard = useVideoStore((state) => state.storyboard);

  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [anchorX, setAnchorX] = useState(0);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const updateCoordinates = useCallback(
    (clientX: number) => {
      if (!trackRef.current || !duration || duration <= 0) return;

      const trackRect = trackRef.current.getBoundingClientRect();
      const containerRect = containerRef.current
        ? containerRef.current.getBoundingClientRect()
        : null;

      const { targetTime, clampedAnchorX } = StoryboardEngine.calculateCoordinates({
        clientX,
        trackRect,
        containerRect,
        duration,
        previewWidth: isEnabled ? 160 : 70,
        safeMargin: 12,
      });

      setAnchorX(clampedAnchorX);
      setHoverTime(targetTime);
    },
    [duration, isEnabled]
  );

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration || duration <= 0) return;
      setIsHovering(true);
      updateCoordinates(e.clientX);
    },
    [duration, updateCoordinates]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration || duration <= 0) return;
      updateCoordinates(e.clientX);
    },
    [duration, updateCoordinates]
  );

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
  }, []);

  return {
    trackRef,
    containerRef,
    isHovering,
    hoverTime,
    anchorX,
    storyboard,
    isEnabled,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
  };
}
