import type { EpisodeProgressRecord } from "./types.ts";

export const MIN_RECORD_SECONDS = 15;
export const COMPLETION_RATIO = 0.90;
export const REMAINING_THRESHOLD_SECONDS = 30;
export const MAX_HISTORY_ENTRIES = 100;

/**
 * Pure calculation function for single-episode playback progress.
 * Precomputes percentage and isCompleted immediately at write-time.
 */
export function calculateProgress(
  episodeId: string,
  episodeTitle: string,
  position: number,
  duration: number,
  updatedAt: number = Date.now()
): EpisodeProgressRecord {
  const safePos = Math.max(0, isNaN(position) ? 0 : position);
  const safeDur = Math.max(0, isNaN(duration) ? 0 : duration);

  let percentage = 0;
  if (safeDur > 0) {
    percentage = Math.min(100, Math.max(0, Math.round((safePos / safeDur) * 100)));
  }

  let isCompleted = false;
  if (safeDur > 0) {
    if (safePos / safeDur >= COMPLETION_RATIO) {
      isCompleted = true;
    } else if (
      safeDur > REMAINING_THRESHOLD_SECONDS &&
      safeDur - safePos <= REMAINING_THRESHOLD_SECONDS
    ) {
      isCompleted = true;
    }
  }

  return {
    episodeId,
    episodeTitle,
    position: safePos,
    duration: safeDur,
    percentage,
    isCompleted,
    updatedAt,
  };
}

/**
 * Returns valid resume time in seconds, or null if ignored (< 15s) or completed.
 */
export function getResumeTime(record?: EpisodeProgressRecord | null): number | null {
  if (!record) return null;
  if (record.position < MIN_RECORD_SECONDS) return null;
  if (record.isCompleted) return null;
  return record.position;
}
