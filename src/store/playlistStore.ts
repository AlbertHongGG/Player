import { create } from "zustand";
import type { Playlist, Episode } from "../types/bindings";
import { commands } from "../types/bindings";
import { useVideoStore } from "./videoStore";
import { useNotifyStore } from "./notifyStore";

export type { Episode };

interface PlaylistStore {
  targetUrl: string;
  playlist: Playlist | null;
  selectedEpisodeId: string | null;
  isParsing: boolean;
  error: string | null;

  setTargetUrl: (url: string) => void;
  setPlaylist: (playlist: Playlist | null) => void;
  selectEpisode: (episodeId: string | null) => void;
  setIsParsing: (isParsing: boolean) => void;
  setError: (error: string | null) => void;
  playEpisode: (episode: Episode) => Promise<void>;
  playNextEpisode: () => Promise<boolean>;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  targetUrl: "",
  playlist: null,
  selectedEpisodeId: null,
  isParsing: false,
  error: null,

  setTargetUrl: (targetUrl) => set({ targetUrl }),
  setPlaylist: (playlist) => set({ playlist, error: null }),
  selectEpisode: (selectedEpisodeId) => set({ selectedEpisodeId }),
  setIsParsing: (isParsing) => set({ isParsing }),
  setError: (error) => set({ error }),

  playEpisode: async (episode: Episode) => {
    set({ selectedEpisodeId: episode.id });
    const videoStore = useVideoStore.getState();
    videoStore.setIsLoadingStream(true);

    try {
      const res = await commands.resolveEpisode(episode.provider_id, episode.id);
      if (res.status === "ok") {
        // Precedence Cascade:
        // 1. Stream dynamic storyboard override (if provided by streaming session)
        // 2. Fallback to Episode metadata base storyboard
        const effectiveStoryboard = res.data.storyboard ?? episode.storyboard;

        videoStore.setVideoUrl(res.data.stream_url, effectiveStoryboard);
        videoStore.setIsPlaying(true);
      } else {
        useNotifyStore.getState().show(`Failed to resolve episode: ${res.error}`, "error");
        videoStore.setIsLoadingStream(false);
      }
    } catch (e) {
      console.error("Resolve episode error:", e);
      useNotifyStore.getState().show(`Error resolving episode: ${e}`, "error");
      videoStore.setIsLoadingStream(false);
    }
  },

  playNextEpisode: async () => {
    const state = get();
    if (!state.playlist || !state.selectedEpisodeId) return false;
    const currentIndex = state.playlist.episodes.findIndex((ep) => ep.id === state.selectedEpisodeId);
    if (currentIndex !== -1 && currentIndex < state.playlist.episodes.length - 1) {
      const nextEpisode = state.playlist.episodes[currentIndex + 1];
      useNotifyStore.getState().show(`Auto-playing next: ${nextEpisode.title}`, "info");
      await state.playEpisode(nextEpisode);
      return true;
    }
    return false;
  },
}));

export const selectCurrentEpisode = (state: PlaylistStore): Episode | null => {
  if (!state.playlist || !state.selectedEpisodeId) return null;
  return state.playlist.episodes.find((ep) => ep.id === state.selectedEpisodeId) ?? null;
};
