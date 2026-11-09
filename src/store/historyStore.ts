import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnimeHistoryRecord } from "../domain/history/types.ts";
import { calculateProgress, MAX_HISTORY_ENTRIES } from "../domain/history/rules.ts";

export interface HistoryState {
  // Normalized state
  byId: Record<string, AnimeHistoryRecord>;
  allIds: string[]; // Stable array of canonicalUrls, sorted by lastWatchedAt DESC

  // Actions
  recordPlaylistLoaded: (
    canonicalUrl: string,
    displayUrl: string,
    title: string,
    providerId: string,
    totalEpisodes: number
  ) => void;

  recordEpisodePlayed: (
    canonicalUrl: string,
    episodeId: string,
    episodeTitle: string
  ) => void;

  updateProgress: (
    canonicalUrl: string,
    episodeId: string,
    episodeTitle: string,
    position: number,
    duration: number
  ) => void;

  removeEntry: (canonicalUrl: string) => void;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      byId: {},
      allIds: [],

      recordPlaylistLoaded: (
        canonicalUrl,
        displayUrl,
        title,
        providerId,
        totalEpisodes
      ) => {
        set((state) => {
          const existing = state.byId[canonicalUrl];
          const now = Date.now();

          let updatedRecord: AnimeHistoryRecord;
          if (existing) {
            updatedRecord = {
              ...existing,
              title: title || existing.title,
              displayUrl: displayUrl || existing.displayUrl,
              totalEpisodes: Math.max(existing.totalEpisodes, totalEpisodes),
            };
          } else {
            updatedRecord = {
              canonicalUrl,
              displayUrl,
              title,
              providerId,
              totalEpisodes,
              lastEpisodeId: "",
              lastEpisodeTitle: "",
              lastWatchedAt: now,
              episodeProgressMap: {},
            };
          }

          const nextById = { ...state.byId, [canonicalUrl]: updatedRecord };

          // Maintain allIds: if new, prepend; if existing, keep position until played
          let nextAllIds = state.allIds.includes(canonicalUrl)
            ? state.allIds
            : [canonicalUrl, ...state.allIds];

          // LRU Prune if exceeding MAX_HISTORY_ENTRIES
          if (nextAllIds.length > MAX_HISTORY_ENTRIES) {
            const prunedIds = nextAllIds.slice(0, MAX_HISTORY_ENTRIES);
            const prunedById: Record<string, AnimeHistoryRecord> = {};
            for (const id of prunedIds) {
              if (nextById[id]) prunedById[id] = nextById[id];
            }
            return { byId: prunedById, allIds: prunedIds };
          }

          return { byId: nextById, allIds: nextAllIds };
        });
      },

      recordEpisodePlayed: (canonicalUrl, episodeId, episodeTitle) => {
        set((state) => {
          const existing = state.byId[canonicalUrl];
          if (!existing) return state;

          const now = Date.now();
          const updatedRecord: AnimeHistoryRecord = {
            ...existing,
            lastEpisodeId: episodeId,
            lastEpisodeTitle: episodeTitle,
            lastWatchedAt: now,
          };

          const nextById = { ...state.byId, [canonicalUrl]: updatedRecord };

          // Move canonicalUrl to the top of allIds
          const remainingIds = state.allIds.filter((id) => id !== canonicalUrl);
          const nextAllIds = [canonicalUrl, ...remainingIds];

          return { byId: nextById, allIds: nextAllIds };
        });
      },

      updateProgress: (canonicalUrl, episodeId, episodeTitle, position, duration) => {
        set((state) => {
          const existing = state.byId[canonicalUrl];
          if (!existing) return state;

          const progress = calculateProgress(episodeId, episodeTitle, position, duration);
          const nextProgressMap = {
            ...existing.episodeProgressMap,
            [episodeId]: progress,
          };

          const updatedRecord: AnimeHistoryRecord = {
            ...existing,
            lastEpisodeId: episodeId,
            lastEpisodeTitle: episodeTitle,
            lastWatchedAt: progress.updatedAt,
            episodeProgressMap: nextProgressMap,
          };

          return {
            byId: {
              ...state.byId,
              [canonicalUrl]: updatedRecord,
            },
          };
        });
      },

      removeEntry: (canonicalUrl) => {
        set((state) => {
          if (!state.byId[canonicalUrl]) return state;

          const nextById = { ...state.byId };
          delete nextById[canonicalUrl];
          const nextAllIds = state.allIds.filter((id) => id !== canonicalUrl);

          return { byId: nextById, allIds: nextAllIds };
        });
      },

      clearAll: () => {
        set({ byId: {}, allIds: [] });
      },
    }),
    {
      name: "anime_player_history",
      // Migration from previous schema if any
      migrate: (persistedState: any) => {
        if (!persistedState) return { byId: {}, allIds: [] };
        // If persisted as array of entries:
        if (Array.isArray(persistedState.entries)) {
          const byId: Record<string, AnimeHistoryRecord> = {};
          const allIds: string[] = [];
          for (const item of persistedState.entries) {
            if (item && item.canonicalUrl) {
              byId[item.canonicalUrl] = {
                canonicalUrl: item.canonicalUrl,
                displayUrl: item.displayUrl || item.canonicalUrl,
                title: item.title || "",
                providerId: item.providerId || "anime1",
                totalEpisodes: item.totalEpisodes || 0,
                lastEpisodeId: item.lastEpisodeId || "",
                lastEpisodeTitle: item.lastEpisodeTitle || "",
                lastWatchedAt: item.lastWatchedAt || Date.now(),
                episodeProgressMap: item.episodeProgressMap || {},
              };
              allIds.push(item.canonicalUrl);
            }
          }
          return { byId, allIds };
        }
        return persistedState;
      },
    }
  )
);

// --- Stable Selectors Hooks (Zero Recreation, Zero Infinite Loops) ---

/**
 * Returns the stable array of history IDs (sorted by lastWatchedAt DESC).
 */
export const useHistoryIds = (): string[] => {
  return useHistoryStore((s) => s.allIds);
};

/**
 * Returns the count of history items.
 */
export const useHistoryCount = (): number => {
  return useHistoryStore((s) => s.allIds.length);
};

/**
 * Returns a specific history record by canonicalUrl with reference stability.
 */
export const useHistoryItem = (canonicalUrl: string | null | undefined): AnimeHistoryRecord | undefined => {
  return useHistoryStore((s) => (canonicalUrl ? s.byId[canonicalUrl] : undefined));
};

/**
 * Synchronous non-reactive getter.
 */
export const getHistoryItemSync = (canonicalUrl: string): AnimeHistoryRecord | undefined => {
  return useHistoryStore.getState().byId[canonicalUrl];
};

// Cross-window synchronization
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "anime_player_history") {
      useHistoryStore.persist.rehydrate();
    }
  });
}
