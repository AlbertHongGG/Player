export interface EpisodeProgressRecord {
  readonly episodeId: string;
  readonly episodeTitle: string;
  readonly position: number;       // Current playback time in seconds
  readonly duration: number;       // Total video duration in seconds
  readonly percentage: number;     // Integer 0-100 precomputed
  readonly isCompleted: boolean;   // True if >= 90% or remaining <= 30s
  readonly updatedAt: number;      // Timestamp
}

export interface AnimeHistoryRecord {
  readonly canonicalUrl: string;   // Unique normalized URL (Primary Key)
  readonly displayUrl: string;     // Human-readable Unicode representation
  readonly title: string;          // Anime title
  readonly providerId: string;     // Provider identifier e.g. "anime1"
  readonly totalEpisodes: number;  // Total count of episodes
  readonly lastEpisodeId: string;  // Last played episode ID
  readonly lastEpisodeTitle: string;
  readonly lastWatchedAt: number;  // Epoch timestamp (ms) for LRU sorting
  readonly episodeProgressMap: Readonly<Record<string, EpisodeProgressRecord>>;
}
