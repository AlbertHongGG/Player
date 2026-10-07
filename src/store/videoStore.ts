import { create } from "zustand";
import { StoryboardTrack } from "../types/bindings";
import { StoryboardEngine } from "../components/player/preview/StoryboardEngine";
import {
  clampSpeed,
  stepSpeed,
  toggleNormalSpeed,
  NORMAL_PLAYBACK_SPEED,
} from "../utils/playbackSpeed";

interface VideoStore {
  // Ephemeral media session states (per-episode)
  videoUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  seekToTime: number | null;
  isLoadingStream: boolean;
  storyboard: StoryboardTrack | null;

  // Player preferences (preserved across episodes)
  volume: number;
  playbackRate: number;
  previousPlaybackRate: number;
  isFullscreen: boolean;

  // Actions
  setVideoUrl: (url: string | null, storyboard?: StoryboardTrack | null) => void;
  setStoryboard: (storyboard: StoryboardTrack | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setPreviousPlaybackRate: (rate: number) => void;
  stepPlaybackRate: (delta: number) => void;
  toggleNormalPlaybackRate: () => void;
  setSeekToTime: (time: number | null) => void;
  setIsFullscreen: (isFullscreen: boolean) => void;
  setIsLoadingStream: (isLoading: boolean) => void;
  reset: () => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  videoUrl: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: NORMAL_PLAYBACK_SPEED,
  previousPlaybackRate: NORMAL_PLAYBACK_SPEED,
  seekToTime: null,
  isFullscreen: false,
  isLoadingStream: false,
  storyboard: null,

  setVideoUrl: (url, storyboard = null) => {
    if (storyboard?.sprite_url) {
      StoryboardEngine.preload(storyboard.sprite_url);
    }
    // Crucial: preserve user's playback preferences (volume, playbackRate, previousPlaybackRate) across episodes
    set({
      videoUrl: url,
      storyboard,
      currentTime: 0,
      isPlaying: false,
      seekToTime: null,
      isLoadingStream: false,
    });
  },
  setStoryboard: (storyboard) => {
    if (storyboard?.sprite_url) {
      StoryboardEngine.preload(storyboard.sprite_url);
    }
    set({ storyboard });
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setPlaybackRate: (playbackRate) => set({ playbackRate: clampSpeed(playbackRate) }),
  setPreviousPlaybackRate: (previousPlaybackRate) =>
    set({ previousPlaybackRate: clampSpeed(previousPlaybackRate) }),
  stepPlaybackRate: (delta) =>
    set((state) => ({ playbackRate: stepSpeed(state.playbackRate, delta) })),
  toggleNormalPlaybackRate: () =>
    set((state) => {
      const { nextRate, nextPreviousRate } = toggleNormalSpeed(
        state.playbackRate,
        state.previousPlaybackRate
      );
      return {
        playbackRate: nextRate,
        previousPlaybackRate: nextPreviousRate,
      };
    }),
  setSeekToTime: (seekToTime) => set({ seekToTime }),
  setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
  setIsLoadingStream: (isLoadingStream) => set({ isLoadingStream }),
  reset: () =>
    set({
      videoUrl: null,
      storyboard: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      seekToTime: null,
      isFullscreen: false,
      isLoadingStream: false,
    }),
}));
