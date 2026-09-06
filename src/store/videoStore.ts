import { create } from 'zustand';

interface VideoStore {
  videoUrl: string | null;
  videoTitle: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  previousPlaybackRate: number;
  seekToTime: number | null;
  isFullscreen: boolean;
  isLoadingStream: boolean;

  setVideoUrl: (url: string | null, title?: string | null) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setPreviousPlaybackRate: (rate: number) => void;
  setSeekToTime: (time: number | null) => void;
  setIsFullscreen: (isFullscreen: boolean) => void;
  setIsLoadingStream: (isLoading: boolean) => void;
  reset: () => void;
}

export const useVideoStore = create<VideoStore>((set) => ({
  videoUrl: null,
  videoTitle: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  previousPlaybackRate: 1,
  seekToTime: null,
  isFullscreen: false,
  isLoadingStream: false,

  setVideoUrl: (url, title = null) =>
    set({
      videoUrl: url,
      videoTitle: title,
      currentTime: 0,
      isPlaying: false,
      seekToTime: null,
      playbackRate: 1,
      isLoadingStream: false,
    }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setPreviousPlaybackRate: (previousPlaybackRate) => set({ previousPlaybackRate }),
  setSeekToTime: (seekToTime) => set({ seekToTime }),
  setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
  setIsLoadingStream: (isLoadingStream) => set({ isLoadingStream }),
  reset: () =>
    set({
      videoUrl: null,
      videoTitle: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      seekToTime: null,
      playbackRate: 1,
      isFullscreen: false,
      isLoadingStream: false,
    }),
}));
