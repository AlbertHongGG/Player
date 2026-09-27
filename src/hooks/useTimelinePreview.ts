import { useState, useEffect, useRef, useCallback } from "react";
import { TimelinePreviewEngine, PreviewFrame } from "../components/player/preview/TimelinePreviewEngine";
import { useSettingsStore } from "../store/settingsStore";

interface UseTimelinePreviewOptions {
  videoUrl: string | null;
  duration: number;
}

interface CalculateCoordinatesParams {
  clientX: number;
  trackRect: DOMRect;
  containerRect: DOMRect | null;
  duration: number;
  previewWidth: number;
  safeMargin?: number;
}

/**
 * Pure mathematical boundary clamping for timeline hover preview.
 */
function calculateTimelineCoordinates({
  clientX,
  trackRect,
  containerRect,
  duration,
  previewWidth,
  safeMargin = 12,
}: CalculateCoordinatesParams) {
  const rawX = clientX - trackRect.left;
  const ratio = Math.max(0, Math.min(1, rawX / trackRect.width));
  const targetTime = ratio * duration;

  const halfWidth = previewWidth / 2;
  const minAnchorX = containerRect
    ? containerRect.left - trackRect.left + halfWidth + safeMargin
    : halfWidth + safeMargin;
  const maxAnchorX = containerRect
    ? containerRect.right - trackRect.left - halfWidth - safeMargin
    : trackRect.width - halfWidth - safeMargin;

  const clampedAnchorX = Math.max(minAnchorX, Math.min(maxAnchorX, rawX));

  return { targetTime, clampedAnchorX };
}

/**
 * YouTube-style Frame-Hold Timeline Hover Hook.
 * Implements persistent frame buffering to eliminate loading indicators and flicker during scrubbing.
 */
export function useTimelinePreview({ videoUrl, duration }: UseTimelinePreviewOptions) {
  const isEnabled = useSettingsStore((state) => state.enableTimelineHoverPreview);

  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [anchorX, setAnchorX] = useState(0);
  // Holds the active frame across moves; atomically swaps when new frame arrives
  const [previewFrame, setPreviewFrame] = useState<PreviewFrame | null>(null);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engine = TimelinePreviewEngine.getInstance();

  // Load video into preview engine when URL changes & reset frame buffer
  useEffect(() => {
    setPreviewFrame(null);
    if (videoUrl && isEnabled) {
      engine.loadVideo(videoUrl).catch(console.error);
    }
  }, [videoUrl, isEnabled]);

  // Clean up pending requests on unmount
  useEffect(() => {
    return () => {
      engine.cancel();
    };
  }, []);

  const updateCoordinates = useCallback(
    (clientX: number) => {
      if (!trackRef.current || !duration || duration <= 0) return;

      const trackRect = trackRef.current.getBoundingClientRect();
      const containerRect = containerRef.current
        ? containerRef.current.getBoundingClientRect()
        : null;

      const { targetTime, clampedAnchorX } = calculateTimelineCoordinates({
        clientX,
        trackRect,
        containerRect,
        duration,
        previewWidth: isEnabled ? 160 : 70,
        safeMargin: 12,
      });

      // Synchronous 60fps telemetry update for time and position
      setAnchorX(clampedAnchorX);
      setHoverTime(targetTime);

      if (isEnabled && videoUrl) {
        engine.requestFrame(targetTime, (frame) => {
          setPreviewFrame(frame);
        });
      }
    },
    [duration, isEnabled, videoUrl]
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
    engine.cancel();
  }, []);

  return {
    trackRef,
    containerRef,
    isHovering,
    hoverTime,
    anchorX,
    previewFrame,
    isEnabled,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
  };
}
