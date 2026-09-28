import React, { useRef, useEffect } from "react";
import { useVideoStore } from "../../store/videoStore";
import { usePlaylistStore } from "../../store/playlistStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useUiStore } from "../../store/uiStore";
import { useVideoHotkeys } from "../../hooks/useVideoHotkeys";
import { VideoControls } from "./VideoControls";
import { VideoEmptyState } from "./VideoEmptyState";
import { Loader2 } from "lucide-react";

export const VideoPlayer: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);

  const {
    isCursorHidden,
    isNearBottom,
    isBottomHovered,
    setIsBottomHovered,
    isSidebarOpen,
    isImmersive,
  } = useUiStore();

  const {
    videoUrl,
    isPlaying,
    volume,
    playbackRate,
    seekToTime,
    isFullscreen,
    isLoadingStream,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setSeekToTime,
  } = useVideoStore();

  const { playNextEpisode } = usePlaylistStore();
  const { autoPlayNext } = useSettingsStore();

  const isControlsVisible = (!isImmersive && !isFullscreen) || isNearBottom || isBottomHovered;

  // Attach global keyboard shortcuts
  useVideoHotkeys({ videoRef, playerWrapperRef });

  // Handle seeking
  useEffect(() => {
    if (videoRef.current && seekToTime !== null) {
      videoRef.current.currentTime = seekToTime;
      setCurrentTime(seekToTime);
      setSeekToTime(null);
    }
  }, [seekToTime, setSeekToTime, setCurrentTime]);

  // Handle play/pause sync
  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.play().catch((err) => {
        console.warn("Autoplay / Play prevented:", err);
        setIsPlaying(false);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Handle volume sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume]);

  // Handle playback rate sync
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      if (isPlaying) {
        videoRef.current.play().catch(console.warn);
      }
    }
  };

  const handleVideoEnded = async () => {
    setIsPlaying(false);

    // Auto-play next episode if enabled via centralized playlist dispatcher
    if (autoPlayNext) {
      await playNextEpisode();
    }
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerWrapperRef.current?.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  return (
    <div
      ref={playerWrapperRef}
      className={
        isFullscreen
          ? `fixed inset-0 z-[9999] bg-[#0a0a0a] flex flex-col overflow-hidden select-none ${
              isCursorHidden ? "cursor-none" : ""
            }`
          : `w-full h-full flex flex-col bg-[#0a0a0a] overflow-hidden select-none ${
              isCursorHidden ? "cursor-none" : ""
            }`
      }
    >
      {videoUrl ? (
        <>
          <div className="flex-1 min-h-0 relative w-full flex flex-col bg-black items-center justify-center">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain cursor-pointer"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleVideoEnded}
              onClick={togglePlay}
              onDoubleClick={toggleFullscreen}
              preload="auto"
              playsInline
            />

            {/* Buffering / Loading Overlay */}
            {isLoadingStream && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-30 pointer-events-none">
                <Loader2 size={36} className="animate-spin text-[#facc15]" />
                <span className="text-xs font-semibold text-gray-300 tracking-wider uppercase">
                  Resolving & Buffering Stream...
                </span>
              </div>
            )}
          </div>

          {/* Controls Bar */}
          {isFullscreen || isImmersive ? (
            <div
              className={`absolute bottom-0 left-0 z-40 transition-transform duration-300 ease-out ${
                isSidebarOpen && isImmersive ? "right-[340px]" : "w-full"
              } ${
                isControlsVisible
                  ? "translate-y-0 opacity-100 pointer-events-auto"
                  : "translate-y-full opacity-0 pointer-events-none"
              }`}
              onMouseEnter={() => setIsBottomHovered(true)}
              onMouseLeave={() => setIsBottomHovered(false)}
            >
              <VideoControls />
            </div>
          ) : (
            <div className="shrink-0 z-30 bg-black">
              <VideoControls />
            </div>
          )}
        </>
      ) : (
        <VideoEmptyState />
      )}
    </div>
  );
};
