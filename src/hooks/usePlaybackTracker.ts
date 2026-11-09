import { useEffect, useRef } from "react";
import { useVideoStore } from "../store/videoStore.ts";
import { usePlaylistStore, selectCurrentEpisode } from "../store/playlistStore.ts";
import { useHistoryStore } from "../store/historyStore.ts";
import { PlayableUrl } from "../domain/url/PlayableUrl.ts";

const THROTTLE_INTERVAL_MS = 5000;

interface UsePlaybackTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function usePlaybackTracker({ videoRef }: UsePlaybackTrackerProps) {
  const lastSaveTimeRef = useRef<number>(0);
  const { isPlaying } = useVideoStore();
  const playlist = usePlaylistStore((s) => s.playlist);
  const selectedEpisodeId = usePlaylistStore((s) => s.selectedEpisodeId);

  const saveCurrentProgress = () => {
    const video = videoRef.current;
    if (!video || !playlist || !selectedEpisodeId) return;

    const currentEp = selectCurrentEpisode(usePlaylistStore.getState());
    if (!currentEp) return;

    const currentTime = video.currentTime;
    const duration = video.duration;
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
  };

  // 1. Throttled interval during active playback
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      saveCurrentProgress();
    }, THROTTLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isPlaying, playlist, selectedEpisodeId]);

  // 2. Event listeners on video element: pause, seeked, ended
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePause = () => {
      saveCurrentProgress();
    };

    const handleSeeked = () => {
      saveCurrentProgress();
    };

    const handleEnded = () => {
      const currentEp = selectCurrentEpisode(usePlaylistStore.getState());
      if (currentEp && playlist) {
        const canonicalUrl = PlayableUrl.parse(playlist.url).wireUrl;
        const duration = video.duration || 0;
        useHistoryStore.getState().updateProgress(
          canonicalUrl,
          currentEp.id,
          currentEp.title,
          duration,
          duration
        );
      }
    };

    video.addEventListener("pause", handlePause);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoRef, playlist, selectedEpisodeId]);

  // 3. Window unload / visibilitychange safety flush
  useEffect(() => {
    const handleUnloadOrHide = () => {
      saveCurrentProgress();
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
  }, [playlist, selectedEpisodeId]);
}
