import { useEffect, useRef } from "react";
import { useVideoStore } from "../store/videoStore";

interface UseVideoHotkeysProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  playerWrapperRef: React.RefObject<HTMLDivElement | null>;
}

export function useVideoHotkeys({ videoRef, playerWrapperRef }: UseVideoHotkeysProps) {
  const { isPlaying, setIsPlaying, setCurrentTime } = useVideoStore();

  const scrubTargetTime = useRef<number | null>(null);
  const scrubAnimationFrame = useRef<number | null>(null);
  const lastSyncTime = useRef(0);

  // Sync fullscreen state with HTML5 fullscreen API
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      useVideoStore.getState().setIsFullscreen(isFs);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when focused inside input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      // --- Fullscreen Toggle (Player container level) ---
      if (e.key === "Enter") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          playerWrapperRef.current?.requestFullscreen().catch(console.error);
        } else {
          document.exitFullscreen().catch(console.error);
        }
        return;
      }

      if (e.key === "Escape" && document.fullscreenElement) {
        e.preventDefault();
        document.exitFullscreen().catch(console.error);
        return;
      }

      // --- 2. Video Playback Shortcuts (Require mounted <video>) ---
      if (!videoRef.current) return;

      const state = useVideoStore.getState();

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(!state.isPlaying);
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        const step = e.ctrlKey || e.metaKey ? 5 : 1;
        const newTime = Math.max(0, videoRef.current.currentTime - step);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const step = e.ctrlKey || e.metaKey ? 5 : 1;
        const maxDuration = state.duration || videoRef.current.duration || 0;
        const newTime = Math.min(maxDuration, videoRef.current.currentTime + step);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        return;
      }

      if (e.key === "a" || e.key === "A") {
        const newRate = Math.max(0.1, state.playbackRate - 0.1);
        state.setPlaybackRate(Number(newRate.toFixed(1)));
        return;
      }

      if (e.key === "d" || e.key === "D") {
        const newRate = Math.min(16.0, state.playbackRate + 0.1);
        state.setPlaybackRate(Number(newRate.toFixed(1)));
        return;
      }

      if ((e.key === "s" || e.key === "S") && !e.repeat) {
        if (state.playbackRate !== 1) {
          state.setPreviousPlaybackRate(state.playbackRate);
          state.setPlaybackRate(1);
        } else {
          state.setPlaybackRate(state.previousPlaybackRate);
        }
        return;
      }

      // Frame-by-frame scrubbing
      if (e.key === "," || e.key === "<" || e.key === "." || e.key === ">") {
        if (isPlaying) {
          setIsPlaying(false);
        }

        if (scrubTargetTime.current === null) {
          scrubTargetTime.current = videoRef.current.currentTime;
        }

        if (e.key === "," || e.key === "<") {
          scrubTargetTime.current = Math.max(0, scrubTargetTime.current - 1 / 30);
        } else {
          scrubTargetTime.current = Math.min(
            videoRef.current.duration,
            scrubTargetTime.current + 1 / 30
          );
        }

        if (scrubAnimationFrame.current === null) {
          scrubAnimationFrame.current = requestAnimationFrame(() => {
            if (videoRef.current && scrubTargetTime.current !== null) {
              const target = scrubTargetTime.current;
              videoRef.current.currentTime = target;

              const now = performance.now();
              if (now - lastSyncTime.current > 100) {
                setCurrentTime(target);
                lastSyncTime.current = now;
              }
            }
            scrubAnimationFrame.current = null;
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "," || e.key === "<" || e.key === "." || e.key === ">") {
        scrubTargetTime.current = null;
        if (scrubAnimationFrame.current !== null) {
          cancelAnimationFrame(scrubAnimationFrame.current);
          scrubAnimationFrame.current = null;
        }
        if (videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPlaying, setIsPlaying, setCurrentTime, videoRef, playerWrapperRef]);
}
