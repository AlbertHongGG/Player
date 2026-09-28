import { create } from 'zustand';
import { StoryboardTrack } from '../types/bindings';
import { StoryboardEngine } from '../components/player/preview/StoryboardEngine';

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
  storyboard: StoryboardTrack | null;

  setVideoUrl: (url: string | null, title?: string | null, storyboard?: StoryboardTrack | null) => void;
  setStoryboard: (storyboard: StoryboardTrack | null) => void;
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
  storyboard: null,

  setVideoUrl: (url, title = null, storyboard = null) => {
    if (storyboard?.sprite_url) {
      StoryboardEngine.preload(storyboard.sprite_url);
    }
    set({
      videoUrl: url,
      videoTitle: title,
      storyboard,
      currentTime: 0,
      isPlaying: false,
      seekToTime: null,
      playbackRate: 1,
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
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setPreviousPlaybackRate: (previousPlaybackRate) => set({ previousPlaybackRate }),
  setSeekToTime: (seekToTime) => set({ seekToTime }),
  setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
  setIsLoadingStream: (isLoadingStream) => set({ isLoadingStream }),
  reset: () =>
    set({
      videoUrl: null,
      videoTitle: null,
      storyboard: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      seekToTime: null,
      playbackRate: 1,
      isFullscreen: false,
      isLoadingStream: false,
    }),
}));
