import { create } from "zustand";
import type { Playlist, Episode } from "../types/bindings";
export type { Episode };

interface PlaylistStore {
  targetUrl: string;
  playlist: Playlist | null;
  selectedEpisodeId: string | null;
  isSidebarOpen: boolean;
  isParsing: boolean;
  error: string | null;

  setTargetUrl: (url: string) => void;
  setPlaylist: (playlist: Playlist | null) => void;
  selectEpisode: (episodeId: string | null) => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setIsParsing: (isParsing: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePlaylistStore = create<PlaylistStore>((set) => ({
  targetUrl: "",
  playlist: null,
  selectedEpisodeId: null,
  isSidebarOpen: false,
  isParsing: false,
  error: null,

  setTargetUrl: (targetUrl) => set({ targetUrl }),
  setPlaylist: (playlist) => set({ playlist, error: null }),
  selectEpisode: (selectedEpisodeId) => set({ selectedEpisodeId }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setIsParsing: (isParsing) => set({ isParsing }),
  setError: (error) => set({ error }),
}));
