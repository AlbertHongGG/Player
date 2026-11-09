import { useEffect, useRef, useCallback } from "react";
import { useVideoStore } from "../store/videoStore.ts";
import { usePlaylistStore, selectCurrentEpisode } from "../store/playlistStore.ts";
import { useHistoryStore } from "../store/historyStore.ts";
import { PlayableUrl } from "../domain/url/PlayableUrl.ts";

const THROTTLE_INTERVAL_MS = 5000;

interface UsePlaybackTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export interface PlaybackTrackerHandlers {
  onPause: () => void;
  onSeeked: () => void;
  onEnded: () => void;
  onTimeUpdate: () => void;
  saveNow: () => void;
}

export function usePlaybackTracker({ videoRef }: UsePlaybackTrackerProps): PlaybackTrackerHandlers {
  const lastSaveTimeRef = useRef<number>(0);
  const { setCurrentTime } = useVideoStore();

  const saveCurrentProgress = useCallback(
    (explicitPos?: number, explicitDur?: number) => {
      const video = videoRef.current;
      const playlist = usePlaylistStore.getState().playlist;
      const selectedEpisodeId = usePlaylistStore.getState().selectedEpisodeId;
      if (!video || !playlist || !selectedEpisodeId) return;

      const currentEp = selectCurrentEpisode(usePlaylistStore.getState());
      if (!currentEp) return;

      const currentTime = explicitPos !== undefined ? explicitPos : video.currentTime;
      const duration = explicitDur !== undefined ? explicitDur : video.duration;
      if (isNaN(duration) || duration <= 0) return;

      const canonicalUrl = PlayableUrl.parse(playlist.url).wireUrl;
      useHistoryStore.getState().updateProgress(
        canonicalUrl,
        currentEp.id,
        currentEp.title,
        currentTime,
        duration
      );
      lastSaveTimeRef.current = Date.now();
    },
    [videoRef]
  );

  const onPause = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      saveCurrentProgress(video.currentTime, video.duration);
    }
  }, [videoRef, saveCurrentProgress]);

  const onSeeked = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      saveCurrentProgress(video.currentTime, video.duration);
    }
  }, [videoRef, saveCurrentProgress]);

  const onEnded = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      saveCurrentProgress(video.duration, video.duration);
    }
  }, [videoRef, saveCurrentProgress]);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    // Throttled save every 5 seconds during active playback
    const now = Date.now();
    if (now - lastSaveTimeRef.current >= THROTTLE_INTERVAL_MS) {
      saveCurrentProgress(video.currentTime, video.duration);
    }
  }, [videoRef, setCurrentTime, saveCurrentProgress]);

  // Window unload / visibilitychange safety flush
  useEffect(() => {
    const handleUnloadOrHide = () => {
      const video = videoRef.current;
      if (video) {
        saveCurrentProgress(video.currentTime, video.duration);
      }
    };

    window.addEventListener("beforeunload", handleUnloadOrHide);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        handleUnloadOrHide();
      }
    });

    return () => {
      window.removeEventListener("beforeunload", handleUnloadOrHide);
    };
  }, [videoRef, saveCurrentProgress]);

  return {
    onPause,
    onSeeked,
    onEnded,
    onTimeUpdate,
    saveNow: () => saveCurrentProgress(),
  };
}
