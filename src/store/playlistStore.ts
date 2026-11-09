import { create } from "zustand";
import type { Playlist, Episode } from "../types/bindings";
import { commands } from "../types/bindings";
import { useVideoStore } from "./videoStore";
import { useNotifyStore } from "./notifyStore";
import { useHistoryStore, getHistoryItemSync } from "./historyStore";
import { getResumeTime } from "../domain/history/rules.ts";
import { PlayableUrl } from "../domain/url/PlayableUrl.ts";
import { formatTime } from "../utils/time.ts";

export type { Episode };

export interface LoadPlaylistOptions {
  episodeId?: string;
}

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
  loadPlaylist: (url: PlayableUrl | string, options?: LoadPlaylistOptions) => Promise<boolean>;
  playEpisode: (episode: Episode) => Promise<void>;
  playNextEpisode: () => Promise<boolean>;
}

export const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  targetUrl: "",
  playlist: null,
  selectedEpisodeId: null,
  isParsing: false,
  error: null,

  setTargetUrl: (targetUrl) => {
    const clean = PlayableUrl.parse(targetUrl).displayUrl;
    set({ targetUrl: clean });
  },
  setPlaylist: (playlist) => set({ playlist, error: null }),
  selectEpisode: (selectedEpisodeId) => set({ selectedEpisodeId }),
  setIsParsing: (isParsing) => set({ isParsing }),
  setError: (error) => set({ error }),

  loadPlaylist: async (url: PlayableUrl | string, options?: LoadPlaylistOptions) => {
    const playable = url instanceof PlayableUrl ? url : PlayableUrl.parse(url);
    if (!playable.isValid && playable.isEmpty()) {
      useNotifyStore.getState().show("Please enter an Anime1 URL", "warning");
      return false;
    }

    set({ isParsing: true, error: null });
    try {
      // Wire URL ensures standard RFC-3986 format over IPC & network
      const wire = playable.toWireString();
      const res = await commands.parseUrl(wire);

      if (res.status === "ok") {
        const playlistData = res.data;
        const canonicalUrl = PlayableUrl.parse(playlistData.url).wireUrl;

        set({
          targetUrl: playable.displayUrl,
          playlist: playlistData,
          isParsing: false,
        });

        // Record playlist in history (O(1) write)
        useHistoryStore.getState().recordPlaylistLoaded(
          canonicalUrl,
          playable.displayUrl,
          playlistData.title,
          playlistData.provider_id,
          playlistData.episodes.length
        );

        useNotifyStore
          .getState()
          .show(`Loaded "${playlistData.title}" (${playlistData.episodes.length} episodes)`, "success");

        // Determine which episode to select and play
        if (playlistData.episodes.length > 0) {
          let targetEp: Episode | undefined;

          // 1. Explicit episode requested (e.g. from history click)
          if (options?.episodeId) {
            targetEp = playlistData.episodes.find((e) => e.id === options.episodeId);
          }

          // 2. Intelligent resume from history
          if (!targetEp) {
            const historyEntry = getHistoryItemSync(canonicalUrl);
            if (historyEntry && historyEntry.lastEpisodeId) {
              const matchedEp = playlistData.episodes.find((e) => e.id === historyEntry.lastEpisodeId);
              if (matchedEp) {
                const epProgress = historyEntry.episodeProgressMap[matchedEp.id];
                // If previous episode was completed, auto-advance to next episode if available
                if (epProgress?.isCompleted) {
                  const currIdx = playlistData.episodes.findIndex((e) => e.id === matchedEp.id);
                  if (currIdx !== -1 && currIdx < playlistData.episodes.length - 1) {
                    targetEp = playlistData.episodes[currIdx + 1];
                  } else {
                    targetEp = matchedEp;
                  }
                } else {
                  targetEp = matchedEp;
                }
              }
            }
          }

          // 3. Fallback to first episode
          if (!targetEp) {
            targetEp = playlistData.episodes[0];
          }

          await get().playEpisode(targetEp);
        }
        return true;
      } else {
        set({ error: res.error, isParsing: false });
        useNotifyStore.getState().show(`Failed to parse URL: ${res.error}`, "error");
        return false;
      }
    } catch (e) {
      const errStr = String(e);
      set({ error: errStr, isParsing: false });
      console.error("Parse URL error:", e);
      useNotifyStore.getState().show(`Error parsing URL: ${errStr}`, "error");
      return false;
    }
  },

  playEpisode: async (episode: Episode) => {
    set({ selectedEpisodeId: episode.id });
    const videoStore = useVideoStore.getState();
    videoStore.setIsLoadingStream(true);

    const playlist = get().playlist;
    if (playlist) {
      const canonicalUrl = PlayableUrl.parse(playlist.url).wireUrl;
      useHistoryStore.getState().recordEpisodePlayed(canonicalUrl, episode.id, episode.title);
    }

    try {
      const res = await commands.resolveEpisode(episode.provider_id, episode.id);
      if (res.status === "ok") {
        // Precedence Cascade:
        // 1. Stream dynamic storyboard override (if provided by streaming session)
        // 2. Fallback to Episode metadata base storyboard
        const effectiveStoryboard = res.data.storyboard ?? episode.storyboard;

        videoStore.setVideoUrl(res.data.stream_url, effectiveStoryboard);
        videoStore.setIsPlaying(true);

        // Resume playback if progress exists in history
        if (playlist) {
          const canonicalUrl = PlayableUrl.parse(playlist.url).wireUrl;
          const historyEntry = getHistoryItemSync(canonicalUrl);
          const progress = historyEntry?.episodeProgressMap[episode.id];
          const resumeTime = getResumeTime(progress);

          if (resumeTime !== null && resumeTime !== undefined && resumeTime > 0) {
            videoStore.setSeekToTime(resumeTime);
            useNotifyStore.getState().show(`恢復至上次觀看進度: ${formatTime(resumeTime)}`, "info");
          }
        }
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
